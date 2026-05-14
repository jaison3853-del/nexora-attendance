import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, RefreshCw, Shield, FileText, Check, X, Calendar, User
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { subscribeToAttendance, getAllUsers } from '../services/attendanceService';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { format, subDays, getDaysInMonth } from 'date-fns';
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

  // 1. Monthly Calendar Logic (ABSENT ദിവസങ്ങൾ കണ്ടുപിടിക്കുന്നു)
  const getFullMonthReport = (staffId, selectedMonth) => {
    if (!staffId || !selectedMonth) return [];
    const [year, month] = selectedMonth.split('-');
    const daysCount = getDaysInMonth(new Date(parseInt(year), parseInt(month) - 1));
    const staffRecords = records.filter(r => r.uid === staffId && r.date.startsWith(selectedMonth));
    
    const report = [];
    for (let i = 1; i <= daysCount; i++) {
      const dateStr = `${selectedMonth}-${i.toString().padStart(2, '0')}`;
      const record = staffRecords.find(r => r.date === dateStr);
      report.push({
        date: dateStr,
        status: record ? record.status : 'absent',
        checkIn: record ? record.checkIn : '--:--',
        checkOut: record ? record.checkOut : '--:--'
      });
    }
    return report;
  };

  // 2. Excel Export
  const exportMonthlySummary = () => {
    const currentMonth = filters.month || format(new Date(), 'yyyy-MM');
    const reportData = records.filter(r => r.date?.startsWith(currentMonth));
    if (!reportData.length) { toast.error('No data for this month'); return; }
    const summaryMap = {};
    users.forEach(u => { summaryMap[u.uid] = { Name: u.name || 'Unknown', Present: 0, Late: 0 }; });
    reportData.forEach(r => {
      if (summaryMap[r.uid]) {
        if (r.status === 'present') summaryMap[r.uid].Present++;
        else if (r.status === 'late') summaryMap[r.uid].Late++;
      }
    });
    const headers = ['Staff Name', 'Present Days', 'Late Entries'];
    const rows = Object.values(summaryMap).map(s => [s.Name, s.Present, s.Late]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Nexora_Payroll_${currentMonth}.csv`;
    link.click();
  };

  // 3. Analytics
  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    const trend = last7Days.map(date => ({
      name: format(new Date(date), 'EEE'),
      present: records.filter(r => r.date === date).length
    }));
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
      toast.success(`Leave ${newStatus}!`);
      emailjs.send('service_p8pt4hr', 'template_9rzi9fa', {
        to_name: leave.userName, to_email: leave.userEmail, status: newStatus.toUpperCase()
      }, 'YCJDmchHr727bPTJE');
    } catch (error) { toast.error('Error'); }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDate = filters.date ? r.date === filters.date : true;
    const matchesMonth = filters.month ? r.date?.startsWith(filters.month) : true;
    return matchesSearch && matchesDate && matchesMonth;
  });

  // --- FIX: കണ്ടീഷൻ കുറച്ചു (2 അക്ഷരം ആയാലും വർക്ക് ആകും) ---
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
          <p className="text-text-muted">Staff Analytics & Monthly Insights</p>
        </div>
        <button onClick={exportMonthlySummary} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 py-3 px-6 rounded-xl">
          <Download size={18} /> Download Payroll Excel
        </button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-text-bright mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-cyan-400" /> Weekly Presence</h3>
          <div className="h-[250px] w-full">
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

      {/* --- MONTHLY CALENDAR SECTION (ഇതാണ് വരാതിരുന്നത്) --- */}
      {selectedStaffForReport && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="text-violet-400" size={20} />
            <h3 className="text-lg font-bold text-text-bright">Monthly Calendar: {selectedStaffForReport.name}</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {getFullMonthReport(selectedStaffForReport.uid, filters.month).map((day) => (
              <div key={day.date} className={`p-2 rounded-xl border transition-all ${day.status === 'absent' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <p className="text-[9px] font-mono opacity-50">{day.date.split('-')[2]}/{day.date.split('-')[1]}</p>
                <p className={`text-[10px] font-bold uppercase mt-0.5 ${day.status === 'absent' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {day.status}
                </p>
                {day.status !== 'absent' && <p className="text-[8px] mt-0.5 opacity-70">{day.checkIn}</p>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Filters & Table */}
      <div className="glass rounded-3xl p-6 border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input type="text" placeholder="Search staff..." className="input-field pl-10 w-full" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
          </div>
          <input type="date" className="input-field" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value, month: ''})} />
          <input type="month" className="input-field border-emerald-500/20" value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value, date: ''})} />
        </div>
        <AttendanceTable records={filteredRecords} showUser />
      </div>
    </div>
  );
}