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

  // മെയിൻ ടേബിളിലേക്ക് അറ്റൻഡൻസും ലീവും കൂടി യോജിപ്പിക്കുന്നു
  const combinedRecords = useMemo(() => {
    if (!filters.date) return records;

    const currentRecords = records.filter(r => r.date === filters.date);
    const selectedDate = startOfDay(parseISO(filters.date));

    // ഇന്ന് അപ്രൂവ്ഡ് ലീവ് ഉള്ളവരെ കണ്ടുപിടിക്കുന്നു
    const leaveEntries = [];
    users.forEach(user => {
      // ഈ യൂസറിന് ഈ ദിവസം ഓൾറെഡി അറ്റൻഡൻസ് ഉണ്ടോ എന്ന് നോക്കുന്നു
      const hasAttendance = currentRecords.find(r => r.uid === user.uid);
      
      if (!hasAttendance) {
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

    return [...currentRecords, ...leaveEntries];
  }, [records, leaves, users, filters.date]);

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
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayRecs = records.filter(r => r.date === today);
    const distribution = [
      { name: 'On Time', value: todayRecs.filter(r => r.status === 'present').length },
      { name: 'Late', value: todayRecs.filter(r => r.status === 'late').length },
      { name: 'Absent', value: Math.max(0, users.length - todayRecs.length) }
    ];
    return { trend, distribution };
  }, [records, users]);

  const handleLeaveStatus = async (leave, newStatus) => {
    try {
      await updateDoc(doc(db, 'leaves', leave.id), { status: newStatus });
      toast.success(`Leave ${newStatus}`);
      emailjs.send('service_p8pt4hr', 'template_9rzi9fa', { to_name: leave.userName, to_email: leave.userEmail, status: newStatus.toUpperCase() }, 'YCJDmchHr727bPTJE');
    } catch (e) { toast.error('Error'); }
  };

  const finalRecords = combinedRecords.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(filters.search.toLowerCase());
    return matchesSearch;
  });

  const selectedStaffForReport = (filters.search.length >= 2 && filters.month)
    ? users.find(u => u.name?.toLowerCase().includes(filters.search.toLowerCase()))
    : null;

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-bright">Nexora Control Center</h1>
          <p className="text-text-muted">Staff management & real-time status</p>
        </div>
        <button onClick={exportMonthlySummary} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 py-3 px-6 rounded-xl shadow-lg">
          <Download size={18} /> Payroll Excel
        </button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-3xl p-6 border border-white/5 h-[320px]">
          <h3 className="text-lg font-bold text-text-bright mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-cyan-400" /> Weekly Presence</h3>
          <div className="h-full w-full pb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                <Bar dataKey="present" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-text-bright mb-6 text-center">Today's Summary</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  {chartData.distribution.map((_, i) => <Cell key={`c-${i}`} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Calendar Section */}
      {selectedStaffForReport && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="text-violet-400" size={20} />
            <h3 className="text-lg font-bold text-text-bright">Calendar: {selectedStaffForReport.name}</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {getFullMonthReport(selectedStaffForReport.uid, filters.month).map((day) => {
              const status = day.status;
              let bgColor = 'bg-emerald-500/10 border-emerald-500/20';
              let textColor = 'text-emerald-400';
              if (status === 'absent') { bgColor = 'bg-rose-500/10 border-rose-500/20'; textColor = 'text-rose-400'; }
              if (status === 'holiday') { bgColor = 'bg-blue-500/10 border-blue-500/20'; textColor = 'text-blue-400'; }
              if (status === 'upcoming') { bgColor = 'bg-white/5 border-white/10'; textColor = 'text-text-muted'; }
              if (status === 'leave') { bgColor = 'bg-amber-500/20 border-amber-500/40'; textColor = 'text-amber-400'; }
              return (
                <div key={day.date} className={`p-2 rounded-xl border transition-all ${bgColor}`}>
                  <p className="text-[9px] font-mono opacity-50">{day.date.split('-')[2]}/{day.date.split('-')[1]}</p>
                  <p className={`text-[10px] font-bold uppercase mt-0.5 ${textColor} flex items-center gap-1`}>
                    {status === 'leave' && <PlaneTakeoff size={10} />}
                    {status === 'holiday' ? 'SUNDAY' : status}
                  </p>
                  {status !== 'absent' && status !== 'holiday' && status !== 'upcoming' && status !== 'leave' && <p className="text-[8px] mt-0.5 opacity-70">{day.checkIn}</p>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Actionable Leaves */}
      <AnimatePresence>
        {leaves.filter(l => l.status === 'pending').length > 0 && (
          <div className="glass rounded-3xl p-6 border border-amber-500/20 bg-amber-500/5">
            <h3 className="text-lg font-bold text-text-bright mb-4 flex items-center gap-2"><FileText size={20} className="text-amber-400" /> Pending Leaves</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaves.filter(l => l.status === 'pending').map((leave) => (
                <div key={leave.id} className="bg-white/5 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                  <div>
                    <p className="font-bold text-text-bright">{leave.userName}</p>
                    <p className="text-xs text-text-muted">{leave.startDate} to {leave.endDate}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleLeaveStatus(leave, 'approved')} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Check size={18} /></button>
                    <button onClick={() => handleLeaveStatus(leave, 'rejected')} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg"><X size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Filters & Table */}
      <div className="glass rounded-3xl p-6 border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input type="text" placeholder="Search staff..." className="input-field pl-10 w-full outline-none" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
          </div>
          <input type="date" className="input-field outline-none" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value, month: ''})} />
          <input type="month" className="input-field border-emerald-500/20 outline-none" value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value, date: ''})} />
        </div>
        <AttendanceTable records={finalRecords} showUser />
      </div>
    </div>
  );
}