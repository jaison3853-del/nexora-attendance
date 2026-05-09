// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, Filter, RefreshCw, Shield, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { getAllAttendance, getAllUsers, subscribeToAttendance, getAttendanceStats } from '../services/attendanceService';
import { format, subDays, startOfMonth, eachDayOfInterval } from 'date-fns';
import AttendanceTable from '../components/attendance/AttendanceTable';
import StatCard from '../components/ui/StatCard';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
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
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', date: '', month: '' });
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    (async () => {
      const [allUsers] = await Promise.all([getAllUsers()]);
      setUsers(allUsers);
    })();

    const unsub = subscribeToAttendance((data) => {
      setRecords(data);
      setFiltered(data);
      setLoading(false);
    });
    return unsub;
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

  // Chart data
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

  const pieData = [
    { name: 'Present', value: stats.present },
    { name: 'Absent', value: stats.absent },
    { name: 'Late', value: stats.late },
  ].filter(d => d.value > 0);

  const exportCSV = () => {
    if (!filtered.length) { toast.error('No data to export'); return; }
    const rows = [
      ['Name', 'Date', 'Status', 'Time', 'Location', 'Latitude', 'Longitude'],
      ...filtered.map(r => [r.name, r.date, r.status, r.time, r.locationName, r.latitude, r.longitude])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nexora-attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  if (loading) return <Loader />;

  const paginated = filtered.slice(0, page * PER_PAGE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-violet-400" />
            <span className="text-xs text-violet-400 font-mono uppercase tracking-widest">Admin Panel</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">Analytics Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">Real-time attendance insights — {users.length} staff members</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
            <Activity size={12} className="text-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-mono">Live</span>
          </div>
          <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 text-sm">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Records" value={stats.total} color="violet" delay={0} />
        <StatCard icon={CheckCircle} label="Present" value={stats.present} color="emerald" delay={0.05} />
        <StatCard icon={Clock} label="Late" value={stats.late} color="amber" delay={0.1} />
        <StatCard icon={XCircle} label="Absent" value={stats.absent} color="rose" delay={0.15} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5 lg:col-span-2"
        >
          <h3 className="text-sm font-semibold text-text-bright mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-cyan-400" />
            Last 7 Days Attendance
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,37,53,0.6)" />
              <XAxis dataKey="day" tick={{ fill: '#6b8aad', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b8aad', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Present" fill="#34d399" radius={[4,4,0,0]} />
              <Bar dataKey="Late" fill="#fbbf24" radius={[4,4,0,0]} />
              <Bar dataKey="Absent" fill="#fb7185" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-text-bright mb-4">Status Distribution</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-text-muted">{d.name}</span>
                    </div>
                    <span className="font-mono font-semibold text-text-base">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No data yet" subtitle="Attendance records will appear here" />
          )}
        </motion.div>
      </div>

      {/* Filters + Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="input-field pl-9"
            />
          </div>
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="input-field sm:w-36">
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
          <input type="date" value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value })} className="input-field sm:w-40" />
          <button onClick={() => setFilters({ search: '', status: '', date: '', month: '' })} className="btn-ghost flex items-center gap-1.5 text-sm">
            <RefreshCw size={12} />
            Reset
          </button>
        </div>

        <p className="text-xs text-text-muted mb-3 font-mono">{filtered.length} records</p>
        <AttendanceTable records={paginated} showUser />
        {paginated.length < filtered.length && (
          <div className="text-center mt-4">
            <button onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm">Load More</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
