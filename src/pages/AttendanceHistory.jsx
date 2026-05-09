// src/pages/AttendanceHistory.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Clock, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserAttendance, getAttendanceStats } from '../services/attendanceService';
import { format } from 'date-fns';
import AttendanceTable from '../components/attendance/AttendanceTable';
import StatCard from '../components/ui/StatCard';
import Loader from '../components/ui/Loader';
import { CheckCircle, XCircle } from 'lucide-react';

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i, 1);
  return { value: format(d, 'yyyy-MM').replace('2024', new Date().getFullYear().toString()), label: format(d, 'MMMM') };
});

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', month: '' });
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getUserAttendance(user.uid);
      setRecords(data);
      setFiltered(data);
      setLoading(false);
    })();
  }, [user.uid]);

  useEffect(() => {
    let f = [...records];
    if (filters.status) f = f.filter(r => r.status === filters.status);
    if (filters.month) f = f.filter(r => r.date?.startsWith(filters.month));
    setFiltered(f);
    setPage(1);
  }, [filters, records]);

  const stats = getAttendanceStats(filtered);
  const paginated = filtered.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < filtered.length;

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-bright">Attendance History</h1>
        <p className="text-sm text-text-muted mt-1">Your complete attendance log</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Total" value={stats.total} color="cyan" delay={0} />
        <StatCard icon={CheckCircle} label="Present" value={stats.present} color="emerald" delay={0.05} />
        <StatCard icon={Clock} label="Late" value={stats.late} color="amber" delay={0.1} />
        <StatCard icon={XCircle} label="Absent" value={stats.absent} color="rose" delay={0.15} />
      </div>

      {/* Attendance percentage */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-violet-400" />
            <span className="text-sm text-text-base font-semibold">Overall Rate</span>
          </div>
          <span className="font-mono font-bold text-xl text-gradient-cyan">{stats.percentage}%</span>
        </div>
        <div className="h-1.5 bg-border/60 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentage}%` }}
            transition={{ duration: 1 }}
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            className="input-field flex-1"
          >
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
          <select
            value={filters.month}
            onChange={e => setFilters({ ...filters, month: e.target.value })}
            className="input-field flex-1"
          >
            <option value="">All Months</option>
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label} {new Date().getFullYear()}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ search: '', status: '', month: '' })}
            className="btn-ghost text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl p-5">
        <p className="text-xs text-text-muted mb-4 font-mono">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
        <AttendanceTable records={paginated} />
        {hasMore && (
          <div className="text-center mt-4">
            <button onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
