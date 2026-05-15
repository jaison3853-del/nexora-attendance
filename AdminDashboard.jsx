import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, RefreshCw, Shield, FileText, Check, X, Calendar, User, 
  PlaneTakeoff, Trophy, Award, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { subscribeToAttendance, getAllUsers } from '../services/attendanceService';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { format, subDays, getDaysInMonth, isAfter, startOfDay, isWithinInterval, endOfDay, parseISO } from 'date-fns';
import AttendanceTable from '../components/attendance/AttendanceTable';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444']; 

export default function AdminDashboard() {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    search: '', status: '', date: format(new Date(), 'yyyy-MM-dd'), month: ''
  });

  useEffect(() => {
    getAllUsers().then(setUsers);
    const unsubAttendance = subscribeToAttendance((data) => { 
      setRecords(data); 
      setLoading(false); 
    });
    const qLeaves = query(collection(db, 'leaves'), orderBy('createdAt', 'desc'));
    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
      setLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubAttendance(); unsubLeaves(); };
  }, []);

  // ഡാറ്റാബേസിൽ ഫീൽഡ് പേര് എന്തായാലും കണ്ടുപിടിക്കാനുള്ള സ്മാർട്ട് ഫങ്ക്ഷൻ
  const getInTime = (r) => r?.punchIn || r?.checkIn || r?.timeIn || r?.inTime || null;
  const getOutTime = (r) => r?.punchOut || r?.checkOut || r?.timeOut || r?.outTime || null;

  // --- 1. SUPER SMART LEADERBOARD (Bulletproof Time Parser) ---
  const leaderboard = useMemo(() => {
    const currentMonth = filters.month || format(new Date(), 'yyyy-MM');
    const now = new Date();
    const todayDateStr = format(now, 'yyyy-MM-dd');
    const currentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    
    // സമയം എന്ത് ഫോർമാറ്റിലാണെങ്കിലും സെക്കൻഡിലേക്ക് മാറ്റുന്ന ഫങ്ക്ഷൻ
    const parseTime = (val) => {
      if (!val) return null;
      // 1. Firebase Timestamp ആണെങ്കിൽ
      if (typeof val.toDate === 'function') {
        const d = val.toDate();
        return (d.getHours() * 3600) + (d.getMinutes() * 60) + d.getSeconds();
      }
      // 2. JavaScript Date Object ആണെങ്കിൽ
      if (val instanceof Date) {
        return (val.getHours() * 3600) + (val.getMinutes() * 60) + val.getSeconds();
      }
      // 3. String (Text) ആണെങ്കിൽ
      const str = String(val);
      const timeMatch = str.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        let m = parseInt(timeMatch[2], 10);
        let s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
        const lowerStr = str.toLowerCase();
        if (lowerStr.includes('pm') && h < 12) h += 12;
        if (lowerStr.includes('am') && h === 12) h = 0;
        return (h * 3600) + (m * 60) + s;
      }
      return null;
    };

    const monthStats = users.map(user => {
      const userRecords = records.filter(r => 
        r.uid === user.uid && 
        r.date?.startsWith(currentMonth) && 
        (r.status?.toLowerCase() === 'present' || r.status?.toLowerCase() === 'late')
      );
      
      let totalWorkingSeconds = 0;
      let presentDays = userRecords.length;

      userRecords.forEach(r => {
        const inVal = getInTime(r);
        let outVal = getOutTime(r);

        let inSec = parseTime(inVal);
        let outSec = parseTime(outVal);

        // LIVE TRACKING: ഇന്ന് വർക്കിങ് ആണെങ്കിൽ ഇതുവരെയുള്ള സമയം എടുക്കും
        if ((!outVal || String(outVal).toLowerCase().includes('work')) && r.date === todayDateStr) {
          outSec = currentSecs;
        }

        // കറക്റ്റ് ആയി കാൽക്കുലേറ്റ് ചെയ്യുന്നു
        if (inSec !== null && outSec !== null && !isNaN(inSec) && !isNaN(outSec)) {
          let diff = outSec - inSec;
          if (diff < 0) diff += 24 * 3600; // നൈറ്റ് ഷിഫ്റ്റ് വരികയാണെങ്കിൽ
          totalWorkingSeconds += diff;
        }
      });
      
      // മൊത്തം സമയത്തിനെ മണിക്കൂറും മിനിറ്റും ആക്കുന്നു
      const totalHours = Math.floor(totalWorkingSeconds / 3600);
      const totalMinutes = Math.floor((totalWorkingSeconds % 3600) / 60);
      const workTimeStr = `${totalHours}h ${totalMinutes}m`;

      return { name: user.name, uid: user.uid, totalWorkingSeconds, workTimeStr, presentDays };
    });

    return monthStats.sort((a, b) => b.totalWorkingSeconds - a.totalWorkingSeconds).slice(0, 3);
  }, [records, users, filters.month]);

  // --- 2. SMART COMBINED RECORDS ---
  const finalRecords = useMemo(() => {
    let currentRecords = records;
    if (filters.date) currentRecords = records.filter(r => r.date === filters.date);
    else if (filters.month) currentRecords = records.filter(r => r.date?.startsWith(filters.month));

    const selectedDate = startOfDay(parseISO(filters.date || format(new Date(), 'yyyy-MM-dd')));
    const now = new Date();
    const isToday = format(now, 'yyyy-MM-dd') === filters.date;
    const isPast11AM = now.getHours() >= 11;
    const isPast9PM = now.getHours() >= 21;

    const leaveEntries = [];

    if (filters.date && selectedDate.getDay() !== 0) {
      users.forEach(user => {
        const punchRecord = currentRecords.find(r => r.uid === user.uid);
        if (!punchRecord && (!isToday || isPast11AM)) {
          const activeLeave = leaves.find(l => 
            l.userId === user.uid && l.status === 'approved' &&
            isWithinInterval(selectedDate, { start: startOfDay(parseISO(l.startDate)), end: endOfDay(parseISO(l.endDate)) })
          );
          if (activeLeave) {
            leaveEntries.push({
              id: `leave-${user.uid}`, uid: user.uid, name: user.name, date: filters.date,
              status: 'leave', timeIn: 'ON LEAVE', checkIn: 'ON LEAVE', punchIn: 'ON LEAVE', 
              timeOut: activeLeave.type, checkOut: activeLeave.type, punchOut: activeLeave.type, location: 'Approved Leave'
            });
          }
        }
      });
    }

    const combined = [...currentRecords, ...leaveEntries];

    return combined.filter(r => r.name?.toLowerCase().includes(filters.search.toLowerCase()))
      .map(record => {
        const outVal = getOutTime(record);
        const isPastDay = record.date !== format(now, 'yyyy-MM-dd');
        
        let newStatus = record.status;
        let newOutVal = outVal;

        // Auto-Miss Logic
        if ((!outVal || String(outVal).toLowerCase().includes('work')) && (isPast9PM || isPastDay)) {
          newStatus = 'Forgot Out';
          newOutVal = 'AUTO-MISS';
        }

        return { 
          ...record, 
          status: newStatus, 
          timeOut: newOutVal, checkOut: newOutVal, punchOut: newOutVal 
        };
      });
  }, [records, leaves, users, filters]);

  // --- 3. EXPECTED LEAVES ---
  const todaysApprovedLeaves = useMemo(() => {
    if (!filters.date) return [];
    const selectedDate = startOfDay(parseISO(filters.date));
    return users.filter(user => {
      const hasPunchedIn = records.find(r => r.uid === user.uid && r.date === filters.date);
      if (hasPunchedIn) return false;
      return leaves.find(l => l.userId === user.uid && l.status === 'approved' && isWithinInterval(selectedDate, { start: startOfDay(parseISO(l.startDate)), end: endOfDay(parseISO(l.endDate)) }));
    });
  }, [leaves, users, records, filters.date]);

  // --- 4. MONTHLY CALENDAR GRID LOGIC ---
  const getFullMonthReport = (staffId, selectedMonth) => {
    if (!staffId || !selectedMonth) return [];
    const [year, month] = selectedMonth.split('-');
    const daysCount = getDaysInMonth(new Date(parseInt(year), parseInt(month) - 1));
    const staffRecords = records.filter(r => r.uid === staffId && r.date.startsWith(selectedMonth));
    const today = startOfDay(new Date());
    const report = [];

    const formatTimeForCalendar = (val) => {
      if (!val) return '--:--';
      if (typeof val.toDate === 'function') return format(val.toDate(), 'HH:mm:ss');
      if (val instanceof Date) return format(val, 'HH:mm:ss');
      return String(val);
    };

    for (let i = 1; i <= daysCount; i++) {
      const currentDate = new Date(parseInt(year), parseInt(month) - 1, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const record = staffRecords.find(r => r.date === dateStr);
      let status = record ? record.status : 'absent';
      const approvedLeave = leaves.find(l => l.userId === staffId && l.status === 'approved' && isWithinInterval(currentDate, { start: startOfDay(parseISO(l.startDate)), end: endOfDay(parseISO(l.endDate)) }));
      
      if (approvedLeave && !record) status = 'leave';
      else if (isAfter(currentDate, today)) status = 'upcoming';
      else if (currentDate.getDay() === 0 && !record) status = 'holiday';
      
      const inVal = record ? formatTimeForCalendar(getInTime(record)) : '--:--';
      report.push({ date: dateStr, status: status, checkIn: inVal });
    }
    return report;
  };

  // --- 5. EXPORT & EMAIL LOGIC ---
  const exportMonthlySummary = () => {
    const currentMonth = filters.month || format(new Date(), 'yyyy-MM');
    const reportData = records.filter(r => r.date?.startsWith(currentMonth));
    if (!reportData.length) { toast.error('No data'); return; }
    const summaryMap = {};
    users.forEach(u => { summaryMap[u.uid] = { Name: u.name, Present: 0, Late: 0 }; });
    reportData.forEach(r => { if (summaryMap[r.uid]) { if (r.status?.toLowerCase() === 'present') summaryMap[r.uid].Present++; else if (r.status?.toLowerCase() === 'late') summaryMap[r.uid].Late++; } });
    const csv = ["Staff Name,Present Days,Late Entries", ...Object.values(summaryMap).map(s => `${s.Name},${s.Present},${s.Late}`)].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Nexora_Payroll_${currentMonth}.csv`;
    link.click();
  };

  const handleLeaveStatus = async (leave, newStatus) => {
    try {
      await updateDoc(doc(db, 'leaves', leave.id), { status: newStatus });
      toast.success(`Leave ${newStatus}`);
      emailjs.send('service_p8pt4hr', 'template_9rzi9fa', { to_name: leave.userName, to_email: leave.userEmail, status: newStatus.toUpperCase() }, 'YCJDmchHr727bPTJE');
    } catch (e) { toast.error('Error updating status'); }
  };

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    const trend = last7Days.map(date => ({ name: format(new Date(date), 'EEE'), present: records.filter(r => r.date === date).length }));
    const todayRecs = records.filter(r => r.date === format(new Date(), 'yyyy-MM-dd'));
    return { trend, distribution: [
      { name: 'On Time', value: todayRecs.filter(r => r.status?.toLowerCase() === 'present').length },
      { name: 'Late', value: todayRecs.filter(r => r.status?.toLowerCase() === 'late').length },
      { name: 'Absent', value: Math.max(0, users.length - todayRecs.length) }
    ]};
  }, [records, users]);

  const selectedStaffForReport = (filters.search.length >= 2 && filters.month) ? users.find(u => u.name?.toLowerCase().includes(filters.search.toLowerCase())) : null;

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-bright">Nexora Control Center</h1>
          <p className="text-text-muted">Hello Jaison, monitoring staff performance</p>
        </div>
        <button onClick={exportMonthlySummary} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 py-3 px-6 rounded-xl shadow-lg">
          <Download size={18} /> Payroll Excel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-3xl p-6 border border-white/5 h-[320px]">
          <h3 className="text-lg font-bold text-text-bright mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-cyan-400" /> Weekly Presence</h3>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.trend}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" fontSize={12} /><YAxis stroke="#94a3b8" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} /><Bar dataKey="present" fill="#22d3ee" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
        <div className="glass rounded-3xl p-6 border border-white/5 h-[320px] flex flex-col">
          <h3 className="text-lg font-bold text-text-bright mb-2 text-center">Today's Summary</h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">{chartData.distribution.map((_, i) => <Cell key={`c-${i}`} fill={PIE_COLORS[i]} />)}</Pie><Legend iconType="circle" /></PieChart></ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- SMART LEADERBOARD UI --- */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 glass rounded-3xl p-6 border border-yellow-500/20 bg-yellow-500/5">
          <h3 className="text-lg font-bold text-text-bright mb-4 flex items-center gap-2"><Trophy className="text-yellow-400" size={20} /> Top Performers</h3>
          <p className="text-[10px] text-text-muted mb-4 leading-tight">Ranked by Total Working Hours this month.</p>
          <div className="space-y-3">
            {leaderboard.map((staff, index) => (
              <div key={staff.uid} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/10'}`}>{index + 1}</div>
                  <span className="font-bold text-sm text-text-bright truncate max-w-[100px]">{staff.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-emerald-400">{staff.workTimeStr}</span>
                    {index === 0 && <Award size={16} className="text-yellow-400" />}
                  </div>
                  <span className="text-[9px] text-text-muted mt-0.5">{staff.presentDays} Days Present</span>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="text-sm text-text-muted text-center pt-4">No completed shifts yet.</p>}
          </div>
        </motion.div>

        <div className="lg:col-span-2 space-y-4">
          {finalRecords.some(r => r.checkOut === 'AUTO-MISS') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3">
              <AlertCircle className="text-rose-400" size={20} />
              <p className="text-sm text-rose-300 font-medium">System Alert: Some staff forgot to punch out. Marked as AUTO-MISS.</p>
            </motion.div>
          )}

          {todaysApprovedLeaves.length > 0 && filters.date === format(new Date(), 'yyyy-MM-dd') && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4">
              <PlaneTakeoff className="text-amber-400" size={20} />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-400">Expected on Leave Today:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {todaysApprovedLeaves.map(u => (<span key={u.uid} className="text-xs bg-amber-500/20 px-2 py-1 rounded-md text-text-bright border border-amber-500/30">{u.name}</span>))}
                </div>
              </div>
            </motion.div>
          )}

          {leaves.filter(l => l.status === 'pending').length > 0 && (
            <div className="glass rounded-3xl p-5 border border-amber-500/20 bg-amber-500/5">
              <h3 className="text-lg font-bold text-text-bright mb-3 flex items-center gap-2"><FileText size={18} className="text-amber-400" /> Pending Leaves</h3>
              <div className="grid grid-cols-1 gap-3">
                {leaves.filter(l => l.status === 'pending').map((leave) => (
                  <div key={leave.id} className="bg-white/5 rounded-2xl p-3 flex justify-between items-center border border-white/5">
                    <div><p className="font-bold text-sm text-text-bright">{leave.userName}</p><p className="text-[10px] text-text-muted">{leave.startDate} to {leave.endDate}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => handleLeaveStatus(leave, 'approved')} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Check size={16} /></button>
                      <button onClick={() => handleLeaveStatus(leave, 'rejected')} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg"><X size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedStaffForReport && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 border border-violet-500/20 bg-violet-500/5">
          <h3 className="text-lg font-bold text-text-bright mb-4 flex items-center gap-2"><Calendar size={20} className="text-violet-400" /> Calendar Summary: {selectedStaffForReport.name}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {getFullMonthReport(selectedStaffForReport.uid, filters.month).map((day) => {
              let color = day.status === 'absent' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : day.status === 'leave' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : day.status === 'holiday' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : day.status === 'upcoming' ? 'bg-white/5 text-text-muted border-white/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              return (
                <div key={day.date} className={`p-2 rounded-xl border ${color} transition-all`}>
                  <p className="text-[9px] opacity-60 font-mono">{day.date.split('-')[2]}/{day.date.split('-')[1]}</p>
                  <p className="text-[10px] font-bold uppercase mt-0.5 flex items-center gap-1">{day.status === 'leave' && <PlaneTakeoff size={10} />}{day.status === 'holiday' ? 'SUNDAY' : day.status}</p>
                  {(day.status?.toLowerCase() === 'present' || day.status?.toLowerCase() === 'late' || day.status === 'Forgot Out') && <p className="text-[8px] opacity-80 mt-0.5">{day.checkIn}</p>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="glass rounded-3xl p-6 border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} /><input type="text" placeholder="Search staff name..." className="input-field pl-10 w-full outline-none" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} /></div>
          <input type="date" className="input-field outline-none" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value, month: ''})} />
          <input type="month" className="input-field border-emerald-500/20 outline-none" value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value, date: ''})} />
        </div>
        <AttendanceTable records={finalRecords} showUser />
      </div>
    </div>
  );
}