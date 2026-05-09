// src/pages/StaffDashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, TrendingUp, Calendar, MapPin, Zap, FileText } from 'lucide-react';
import { Link } from 'react-router-dom'; // ലിങ്ക് ഇംപോർട്ട് ചെയ്തു
import { useAuth } from '../context/AuthContext';
import { useClock } from '../hooks/useClock';
import { getTodayAttendance, getUserAttendance, getAttendanceStats } from '../services/attendanceService';
import MarkAttendance from '../components/attendance/MarkAttendance';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Loader from '../components/ui/Loader';
import AttendanceTable from '../components/attendance/AttendanceTable';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { date, dateKey } = useClock();
  const [todayRecord, setTodayRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [today, all] = await Promise.all([
        getTodayAttendance(user.uid, dateKey),
        getUserAttendance(user.uid),
      ]);
      setTodayRecord(today);
      setRecords(all);
      setStats(getAttendanceStats(all));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.uid, dateKey]);

  const handleMarked = (record) => {
    setTodayRecord(record);
    load();
  };

  if (loading) return <Loader />;

  const recentRecords = records.slice(0, 7);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-cyan-400" />
            <span className="text-xs text-cyan-400 font-mono uppercase tracking-widest">Staff Portal</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},{' '}
            <span className="text-gradient-cyan">{user.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-text-muted mt-1 font-mono">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          {todayRecord && <StatusBadge status={todayRecord.status} />}
          <span className="text-xs text-text-muted">Today's Status</span>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Total Days" value={stats.total} color="cyan" delay={0} />
        <StatCard icon={CheckCircle} label="Present" value={stats.present} color="emerald" delay={0.05} />
        <StatCard icon={Clock} label="Late" value={stats.late} color="amber" delay={0.1} />
        <StatCard icon={XCircle} label="Absent" value={stats.absent} color="rose" delay={0.15} />
      </div>

      {/* Attendance % banner & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-5 md:col-span-2"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-violet-400" />
              <span className="text-sm font-semibold text-text-bright">Attendance Rate</span>
            </div>
            <span className="font-display font-bold text-2xl text-gradient-cyan">{stats.percentage}%</span>
          </div>
          <div className="h-2 bg-border/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.percentage}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full"
            />
          </div>
          <p className="text-xs text-text-muted mt-2 font-mono">{stats.present + stats.late} of {stats.total} working days attended</p>
        </motion.div>

        {/* Apply Leave Button Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link 
            to="/leave-request"
            className="glass rounded-2xl p-5 h-full flex flex-col justify-center items-center gap-3 hover:bg-white/5 transition-all border border-violet-500/20 group"
          >
            <div className="p-3 rounded-full bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
              <FileText className="text-violet-400" size={24} />
            </div>
            <div className="text-center">
              <span className="block text-sm font-bold text-text-bright">Apply for Leave</span>
              <span className="text-[10px] text-text-muted uppercase tracking-tighter">Submit Request</span>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Mark Attendance */}
      <MarkAttendance onMarked={handleMarked} alreadyMarked={!!todayRecord} />

      {/* Today's record detail */}
      {todayRecord && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-text-bright">Today's Record</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Clock, label: 'Time', value: todayRecord.time, color: 'text-cyan-400' },
              { icon: CheckCircle, label: 'Status', value: todayRecord.status, color: 'text-emerald-400', cap: true },
              { icon: MapPin, label: 'Location', value: todayRecord.locationName || 'N/A', color: 'text-violet-400', truncate: true },
            ].map(({ icon: Icon, label, value, color, cap, truncate }) => (
              <div key={label} className="bg-border/30 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={11} className={color} />
                  <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
                </div>
                <p className={`text-sm font-mono font-semibold text-text-base ${truncate ? 'truncate' : ''} ${cap ? 'capitalize' : ''}`}>{value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent history */}
      {recentRecords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-text-bright mb-4">Recent Attendance</h3>
          <AttendanceTable records={recentRecords} />
        </motion.div>
      )}
    </div>
  );
}