import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, RefreshCw, Shield, FileText, Check, X, Calendar, User, PlaneTakeoff
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

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#f59e0b']; 

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

  // --- NEW LOGIC: TIME BASED LEAVE DISPLAY ---
  const combinedRecords = useMemo(() => {
    if (!filters.date) return records;

    const currentRecords = records.filter(r => r.date === filters.date);
    const selectedDate = startOfDay(parseISO(filters.date));
    const now = new Date();
    
    // Cutoff time: 10:30 AM
    const isToday = format(now, 'yyyy-MM-dd') === filters.date;
    const isPastCutoff = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() >= 30);

    const leaveEntries = [];

    // Sunday allenkil maathram leave check chyyam
    if (selectedDate.getDay() !== 0) {
      users.forEach(user => {
        const hasAttendance = currentRecords.find(r => r.uid === user.uid);
        
        // Punch chyyathavarum, cutoff time kazhinjavarum maathram
        if (!hasAttendance && (!isToday || isPastCutoff)) {
          const activeLeave = leaves.find(l => 
            l.userId === user.uid && 
            l.status === 'approved' &&
            isWithinInterval(selectedDate, {
              start: startOfDay(parseISO(l.startDate)),
              end: endOfDay(parseISO(l.endDate))
            })
          );

          if (activeLeave) {
            leaveEntries.push({
              id: `leave-${user.uid}`,
              uid: user.uid,
              name: user.name,
              date: filters.date,
              status: 'leave',
              checkIn: 'ON LEAVE',
              checkOut: activeLeave.type,
              location: 'Remote'
            });
          }
        }
      });
    }

    return [...currentRecords, ...leaveEntries];
  }, [records, leaves, users, filters.date]);

  // Monthly Report and other logics...
  const getFullMonthReport = (staffId, selectedMonth) => {
    if (!staffId || !selectedMonth) return [];
    const [year, month] = selectedMonth.split('-');
    const daysCount = getDaysInMonth(new Date(parseInt(year), parseInt(month) - 1));
    const staffRecords = records.filter(r => r.uid === staffId && r.date.startsWith(selectedMonth));
    const today = startOfDay(new Date());
    const report = [];

    for (let i = 1; i <= daysCount; i++) {
      const currentDate = new Date(parseInt(year), parseInt(month) - 1, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const record = staffRecords.find(r => r.date === dateStr);
      let status = record ? record.status : 'absent';
      const approvedLeave = leaves.find(l => l.userId === staffId && l.status === 'approved' && isWithinInterval(currentDate, { start: startOfDay(parseISO(l.startDate)), end: endOfDay(parseISO(l.endDate)) }));
      if (approvedLeave) status = 'leave';
      else if (isAfter(currentDate, today)) status = 'upcoming';
      else if (currentDate.getDay() === 0 && !record) status = 'holiday';
      report.push({ date: dateStr, status: status, checkIn: record ? record.checkIn : '--:--', checkOut: record ? record.checkOut : '--:--' });
    }
    return report;
  };

  const exportMonthlySummary = () => {
    const currentMonth = filters.month || format(new Date(), 'yyyy-MM');
    const reportData = records.filter(r => r.date?.startsWith(currentMonth));
    if (!reportData.length) { toast.error('No data'); return; }
    const summaryMap = {};
    users.forEach(u => { summaryMap[u.uid] = { Name: u.name, Present: 0, Late: 0 }; });
    reportData.forEach(r => { if (summaryMap[r.uid]) { if (r.status === 'present') summaryMap[r.uid].Present++; else if (r.status === 'late') summaryMap[r.uid].Late++; } });
    const csv = ["Staff Name,Present Days,Late Entries", ...Object.values(summaryMap).map(s => `${s.Name},${s.Present},${s.Late}`)].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Payroll_${currentMonth}.csv`;
    link.click();
  };

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    const trend = last7Days.map(date => ({ name: format(new Date(date), 'EEE'), present: records.filter(r => r.date === date).length }));
    const todayRecs = records.filter(r => r.date === format(new Date(), 'yyyy-MM-dd'));
    return { trend, distribution: [
      { name: 'On Time', value: todayRecs.filter(r => r.status === 'present').length },
      { name: 'Late', value: todayRecs.filter(r => r.status === 'late').length },
      { name: 'Absent', value: Math.max(0, users.length - todayRecs.length) }
    ]};
  }, [records, users]);

  const handleLeaveStatus = async (leave, newStatus) => {
    try {
      await updateDoc(doc(db, 'leaves', leave.id), { status: newStatus });
      toast.success(`Leave ${newStatus}`);
      emailjs.send('service_p8pt4hr', 'template_9rzi9fa', { to_name: leave.userName, to_email: leave.userEmail, status: newStatus.toUpperCase() }, 'YCJDmchHr727bPTJE');
    } catch (e) { toast.error('Error'); }
  };

  const finalRecords = combinedRecords.filter(r => r.name?.toLowerCase().includes(filters.search.toLowerCase()));
  const selectedStaffForReport = (filters.search.length >= 2 && filters.month) ? users.find(u => u.name?.toLowerCase().includes(filters.search.toLowerCase())) : null;

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-bright">Nexora Control Center</h1>
          <p className="text-text-muted">Staff management & real-time status</p>
        </div>
        <button onClick={exportMonthlySummary} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 py-3 px-6 rounded-xl">
          <Download size={18} /> Payroll Excel
        </button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-3xl p-6 border border-white/5 h-[320px]">
          <h3 className="text-lg font-bold text-text-bright mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-cyan-400" /> Weekly Presence</h3>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.trend}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" fontSize={12} /><YAxis stroke="#94a3b8" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} /><Bar dataKey="present" fill="#22d3ee" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
        <div className="glass rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-text-bright mb-6 text-center">Today's Summary</h3>
          <ResponsiveContainer width="100%" height="200px"><PieChart><Pie data={chartData.distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">{chartData.distribution.map((_, i) => <Cell key={`c-${i}`} fill={PIE_COLORS[i]} />)}</Pie><Legend iconType="circle" /></PieChart></ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Calendar Section */}
      {selectedStaffForReport && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 border border-violet-500/20 bg-violet-500/5">
          <h3 className="text-lg font-bold text-text-bright mb-4 flex items-center gap-2"><Calendar size={20} /> Calendar: {selectedStaffForReport.name}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {getFullMonthReport(selectedStaffForReport.uid, filters.month).map((day) => {
              let color = day.status === 'absent' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : day.status === 'leave' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : day.status === 'holiday' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : day.status === 'upcoming' ? 'bg-white/5 text-text-muted border-white/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              return (
                <div key={day.date} className={`p-2 rounded-xl border ${color}`}>
                  <p className="text-[9px] opacity-50">{day.date.split('-')[2]}/{day.date.split('-')[1]}</p>
                  <p className="text-[10px] font-bold uppercase mt-0.5 flex items-center gap-1">{day.status === 'leave' && <PlaneTakeoff size={10} />}{day.status === 'holiday' ? 'SUNDAY' : day.status}</p>
                  {day.status === 'present' || day.status === 'late' ? <p className="text-[8px] opacity-70">{day.checkIn}</p> : null}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Filters & Table */}
      <div className="glass rounded-3xl p-6 border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} /><input type="text" placeholder="Search staff..." className="input-field pl-10 w-full outline-none" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} /></div>
          <input type="date" className="input-field outline-none" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value, month: ''})} />
          <input type="month" className="input-field border-emerald-500/20 outline-none" value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value, date: ''})} />
        </div>
        <AttendanceTable records={finalRecords} showUser />
      </div>
    </div>
  );
}