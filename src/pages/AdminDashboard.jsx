import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, RefreshCw, Shield, FileText, Check, X, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { subscribeToAttendance, getAllUsers, getAttendanceStats } from '../services/attendanceService';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
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

  // 1. പഴയ പേറോൾ എക്സൽ ഫങ്ക്ഷൻ (ഇത് ഇവിടെ തന്നെയുണ്ട്!)
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
    toast.success('Excel Downloaded!');
  };

  // 2. പുതിയ വിഷ്വൽ അനലിറ്റിക്സ് ഡാറ്റ
  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    const trend = last7Days.map(date => {
      const dayRecords = records.filter(r => r.date === date);
      return {
        name: format(new Date(date), 'EEE'),
        present: dayRecords.length,
        absent: Math.max(0, users.length - dayRecords.length)
      };
    });

    const todayRecords = records.filter(r => r.date === format(new Date(), 'yyyy-MM-dd'));
    const distribution = [
      { name: 'On Time', value: todayRecords.filter(r => r.status === 'present').length },
      { name: 'Late', value: todayRecords.filter(r => r.status === 'late').length },
      { name: 'Absent', value: Math.max(0, users.length - todayRecords.length) }
    ];
    return { trend, distribution };
  }, [records, users]);

  // 3. പഴയ ലീവ് അപ്രൂവൽ & ഇമെയിൽ ലോജിക് (ഇതും മാറ്റമില്ലാതെ ഉണ്ട്)
  const handleLeaveStatus = async (leave, newStatus) => {
    try {
      await updateDoc(doc(db, 'leaves', leave.id), { status: newStatus });
      toast.success(`Leave ${newStatus}!`);
      emailjs.send('service_p8pt4hr', 'template_9rzi9fa', {
        to_name: leave.userName,
        to_email: leave.userEmail,
        status: newStatus.toUpperCase(),
        message: `Your leave request has been ${newStatus}.`
      }, 'YCJDmchHr727bPTJE');
    } catch (error) { toast.error('Error updating status'); }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDate = filters.date ? r.date === filters.date : true;
    const matchesMonth = filters.month ? r.date?.startsWith(filters.month) : true;
    return matchesSearch && matchesDate && matchesMonth;
  });

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 px-4">
      {/* Header & Payroll Download Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-bright">Admin Control Center</h1>
          <p className="text-text-muted">Analytics, Payroll & Management</p>
        </div>
        <button onClick={exportMonthlySummary} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 py-3 px-6 rounded-xl shadow-lg">
          <Download size={18} /> Download Payroll Excel
        </button>
      </div>

      {/* Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-text-bright mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-cyan-400" /> Weekly Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                <Bar dataKey="present" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Present" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-text-bright mb-6 text-center">Today's Status</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {chartData.distribution.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />)}
                </Pie>
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pending Leaves List */}
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
                    <button onClick={() => handleLeaveStatus(leave, 'approved')} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"><Check size={18} /></button>
                    <button onClick={() => handleLeaveStatus(leave, 'rejected')} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30"><X size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Table & Filters */}
      <div className="glass rounded-3xl p-6 border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input type="text" placeholder="Search staff..." className="input-field pl-10 w-full" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
          </div>
          <input type="date" className="input-field" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value, month: ''})} />
          <input type="month" className="input-field border-emerald-500/30" value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value, date: ''})} />
        </div>
        <AttendanceTable records={filteredRecords} showUser />
      </div>
    </div>
  );
}