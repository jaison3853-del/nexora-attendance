// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, RefreshCw, Shield, Activity, FileText, Check, X
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
  const [filters, setFilters] = useState({ search: '', status: '', date: '', month: format(new Date(), 'yyyy-MM') });
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    getAllUsers().then(setUsers);

    const unsubAttendance = subscribeToAttendance((data) => {
      setRecords(data);
      setFiltered(data);
      setLoading(false);
    });

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
    if (filters.status) f = f.filter(r => r.status === filters.status);
    if (filters.date) f = f.filter(r => r.date === filters.date);
    if (filters.month) f = f.filter(r => r.date?.startsWith(filters.month));
    setFiltered(f);
    setPage(1);
  }, [filters, records]);

  const stats = getAttendanceStats(records);

  const handleLeaveStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'leaves', id), { status: newStatus });
      toast.success(`Leave ${newStatus}!`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Monthly Summary Export Logic
  const exportMonthlySummary = () => {
    if (!filtered.length) {
      toast.error('No data found for the selected month');
      return;
    }

    const summaryMap = {};
    users.forEach(u => {
      summaryMap[u.uid] = { Name: u.name || 'Unknown', Present: 0, Late: 0, Absent: 0, Total: 0 };
    });

    filtered.forEach(r => {
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
    toast.success('Monthly Report Exported!');
  };

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const label = format(subDays(new Date(), 6 - i), 'EEE');
    const dayRecs = records.filter(r => r.date === d);
    return {
      day: label,
      Present: dayRecs.filter(r => r.status === 'present').length,
      Late: dayRecs.filter(r => r.status === 'late').length,
      Absent: dayRecs.filter(r => r.status === 'absent').length,
    };
  });

  const pieData = [{ name: 'Present', value: stats.present }, { name: 'Absent', value: stats.absent }, { name: 'Late', value: stats.late }].filter(d => d.value > 0);

  if (loading) return <Loader />;

  const paginated = filtered.slice(0, page * PER_PAGE);
  const pendingLeaves = leaves.filter(l => l.status === 'pending');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-violet-400" />
            <span className="text-xs text-violet-400 font-mono uppercase tracking-widest">Admin Panel</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">Analytics & Management</h1>
          <p className="text-sm text-text-muted mt-0.5">{users.length} staff members • {pendingLeaves.length} pending leaves</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportMonthlySummary} className="btn-primary flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-700">
            <Download size={14} />
            Monthly Summary
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Records" value={stats.total} color="violet" />
        <StatCard icon={CheckCircle} label="Present" value={stats.present} color="emerald" />
        <StatCard icon={Clock} label="Late" value={stats.late} color="amber" />
        <StatCard icon={XCircle} label="Absent" value={stats.absent} color="rose" />
      </div>

      {/* Leave Requests */}
      <AnimatePresence>
        {pendingLeaves.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass rounded-2xl p-5 border border-amber-500/20">
            <h3 className="text-sm font-semibold text-text-bright mb-4 flex items-center gap-2">
              <FileText size={14} className="text-amber-400" /> Pending Leaves
            </h3>
            <div className="grid gap-3">
              {pendingLeaves.map((leave) => (
                <div key={leave.id} className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/5">
                  <div className="text-left">
                    <p className="text-sm font-bold text-text-bright">{leave.userName}</p>
                    <p className="text-[10px] text-text-muted">{leave.startDate} to {leave.endDate} • {leave.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleLeaveStatus(leave.id, 'approved')} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"><Check size={16} /></button>
                    <button onClick={() => handleLeaveStatus(leave.id, 'rejected')} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30"><X size={16} /></button>
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
          <h3 className="text-sm font-semibold text-text-bright mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-cyan-400" /> Weekly Trends</h3>
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
          <h3 className="text-sm font-semibold text-text-bright mb-4 text-left">Status Ratio</h3>
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

      {/* Filters & Table */}
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="text" placeholder="Staff Name..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="input-field pl-9 w-full" />
          </div>
          <input type="month" value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })} className="input-field w-full sm:w-48" />
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="input-field w-full sm:w-36">
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
          <button onClick={() => setFilters({ search: '', status: '', date: '', month: format(new Date(), 'yyyy-MM') })} className="btn-ghost flex items-center gap-1.5 text-sm"><RefreshCw size={12} /> Reset</button>
        </div>
        <AttendanceTable records={paginated} showUser />
        {paginated.length < filtered.length && (
          <button onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm w-full mt-4">Load More</button>
        )}
      </div>
    </div>
  );
}