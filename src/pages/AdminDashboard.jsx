// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, RefreshCw, Shield, Activity, FileText, Check, X, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { subscribeToAttendance, getAllUsers, getAttendanceStats } from '../services/attendanceService';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import AttendanceTable from '../components/attendance/AttendanceTable';
import StatCard from '../components/ui/StatCard';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#34d399', '#fb7185', '#fbbf24'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs font-mono">
        <p className="text-text-muted mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({ 
    search: '', 
    status: '', 
    date: format(new Date(), 'yyyy-MM-dd'),
    month: format(new Date(), 'yyyy-MM')
  });

  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    getAllUsers().then(setUsers);

    // അറ്റൻഡൻസ് സബ്സ്ക്രിപ്ഷൻ
    const unsubAttendance = subscribeToAttendance((data) => {
      setRecords(data);
      setLoading(false);
    });

    // ലീവ് അപേക്ഷകൾ സബ്സ്ക്രിപ്ഷൻ
    const qLeaves = query(collection(db, 'leaves'), orderBy('createdAt', 'desc'));
    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
      setLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubAttendance();
      unsubLeaves();
    };
  }, []);

  useEffect(() => {
    let f = [...records];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      f = f.filter(r => r.name?.toLowerCase().includes(q) || r.uid?.includes(q));
    }
    
    // ഡെയ്‌ലി വ്യൂ അല്ലെങ്കിൽ മന്തിലി വ്യൂ ഫിൽട്ടർ
    if (filters.date && !filters.month) {
      f = f.filter(r => r.date === filters.date);
    } else if (filters.month) {
      f = f.filter(r => r.date?.startsWith(filters.month));
    }
    
    setFiltered(f);
    setPage(1);
  }, [filters, records]);

  // എക്സൽ റിപ്പോർട്ട് ഡൗൺലോഡ് ഫങ്ക്ഷൻ
  const exportMonthlySummary = () => {
    const reportData = records.filter(r => r.date?.startsWith(filters.month));
    if (!reportData.length) {
      toast.error('ഈ മാസത്തെ ഡാറ്റ ലഭ്യമല്ല');
      return;
    }

    const summaryMap = {};
    users.forEach(u => {
      summaryMap[u.uid] = { Name: u.name || 'Unknown', Present: 0, Late: 0, Absent: 0, Total: 0 };
    });

    reportData.forEach(r => {
      if (summaryMap[r.uid]) {
        summaryMap[r.uid].Total++;
        if (r.status === 'present') summaryMap[r.uid].Present++;
        else if (r.status === 'late') summaryMap[r.uid].Late++;
        else if (r.status === 'absent') summaryMap[r.uid].Absent++;
      }
    });

    const headers = ['Staff Name', 'Present Days', 'Late Entries', 'Absent Days', 'Total Records', 'Attendance %'];
    const rows = Object.values(summaryMap).map(s => {
      const percentage = s.Total > 0 ? ((s.Present + s.Late) / s.Total * 100).toFixed(1) : 0;
      return [s.Name, s.Present, s.Late, s.Absent, s.Total, percentage + '%'];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement("a"));
    link.href = url;
    link.download = `Nexora_Report_${filters.month}.csv`;
    link.click();
    document.body.removeChild(link);
    toast.success('റിപ്പോർട്ട് ഡൗൺലോഡ് ആയി!');
  };

  // ലീവ് അപ്രൂവ്/റിജക്ട് ഫങ്ക്ഷൻ
  const handleLeaveStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'leaves', id), { status: newStatus });
      toast.success(`Leave ${newStatus}!`);
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  const stats = getAttendanceStats(records);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const dayRecs = records.filter(r => r.date === d);
    return { day: format(subDays(new Date(), 6 - i), 'EEE'), Present: dayRecs.filter(r => r.status === 'present').length, Late: dayRecs.filter(r => r.status === 'late').length, Absent: dayRecs.filter(r => r.status === 'absent').length };
  });

  const pieData = [{ name: 'Present', value: stats.present }, { name: 'Absent', value: stats.absent }, { name: 'Late', value: stats.late }].filter(d => d.value > 0);

  if (loading) return <Loader />;

  const paginated = filtered.slice(0, page * PER_PAGE);
  const pendingLeaves = leaves.filter(l => l.status === 'pending');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4">
      {/* Header & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-violet-400" />
            <span className="text-xs text-violet-400 font-mono uppercase tracking-widest">Admin Panel</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">Nexora Management</h1>
          <p className="text-xs text-text-muted mt-1 italic">
             Showing: {filters.month ? format(new Date(filters.month), 'MMMM yyyy') : filters.date}
          </p>
        </div>
        <button onClick={exportMonthlySummary} className="btn-primary flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-700 py-2.5 px-4 rounded-xl">
          <Download size={14} />
          Monthly Summary (CSV)
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="Present" value={filtered.filter(r=>r.status==='present').length} color="emerald" />
        <StatCard icon={Clock} label="Late" value={filtered.filter(r=>r.status==='late').length} color="amber" />
        <StatCard icon={XCircle} label="Absent" value={filtered.filter(r=>r.status==='absent').length} color="rose" />
        <StatCard icon={Users} label="Total Staff" value={users.length} color="violet" />
      </div>

      {/* PENDING LEAVE REQUESTS - ഇതാ വന്നിട്ടുണ്ട്! */}
      <AnimatePresence>
        {pendingLeaves.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 border border-amber-500/20">
            <h3 className="text-sm font-semibold text-text-bright mb-4 flex items-center gap-2">
              <FileText size={14} className="text-amber-400" />
              Pending Leave Applications
            </h3>
            <div className="grid gap-3">
              {pendingLeaves.map((leave) => (
                <div key={leave.id} className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/5">
                  <div className="text-left">
                    <p className="text-sm font-bold text-text-bright">{leave.userName || 'Nexora Staff'}</p>
                    <p className="text-[10px] text-text-muted">{leave.startDate} to {leave.endDate} • {leave.type}</p>
                    <p className="text-xs text-text-base mt-1 italic">"{leave.reason}"</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleLeaveStatus(leave.id, 'approved')} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors" title="Approve"><Check size={18} /></button>
                    <button onClick={() => handleLeaveStatus(leave.id, 'rejected')} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-colors" title="Reject"><X size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-text-bright mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-cyan-400" /> Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#6b8aad', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b8aad', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Present" fill="#34d399" radius={[4,4,0,0]} />
              <Bar dataKey="Late" fill="#fbbf24" radius={[4,4,0,0]} />
              <Bar dataKey="Absent" fill="#fb7185" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-text-bright mb-4">Overall Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter & Attendance Table */}
      <div className="glass rounded-2xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 border-b border-white/5 pb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-mono text-muted ml-1 italic">Daily Filter</label>
            <input type="date" value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value, month: '' })} className="input-field w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-mono text-muted ml-1 italic">Monthly Filter</label>
            <input type="month" value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value, date: '' })} className="input-field w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-mono text-muted ml-1 italic">Search Staff</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" placeholder="Name..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="input-field pl-9 w-full" />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters({ search: '', status: '', date: format(new Date(), 'yyyy-MM-dd'), month: '' })} className="btn-ghost flex items-center justify-center gap-1.5 text-xs h-[42px] w-full border border-white/5 rounded-xl">
              <RefreshCw size={12} /> Today's Updates
            </button>
          </div>
        </div>

        <AttendanceTable records={paginated} showUser />
        
        {filtered.length === 0 && (
          <div className="py-20 text-center text-text-muted italic">No records found.</div>
        )}

        {paginated.length < filtered.length && (
          <button onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm w-full mt-4">Load More</button>
        )}
      </div>
    </div>
  );
}