// src/pages/StaffDashboard.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, XCircle, Clock, TrendingUp, Calendar, MapPin, Zap, FileText, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClock } from '../hooks/useClock';
import { getTodayAttendance, getUserAttendance, getAttendanceStats } from '../services/attendanceService';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
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
  const [myLeaves, setMyLeaves] = useState([]); // ലീവ് സ്റ്റാറ്റസ് സേവ് ചെയ്യാൻ
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [today, all] = await Promise.all([
          getTodayAttendance(user.uid, dateKey),
          getUserAttendance(user.uid),
        ]);
        setTodayRecord(today);
        setRecords(all);
        setStats(getAttendanceStats(all));
      } catch (err) { console.error(err); }
      setLoading(false);
    };

    loadData();

    // ലോഗിൻ ചെയ്ത സ്റ്റാഫിന്റെ ലീവ് അപേക്ഷകൾ മാത്രം എടുക്കുന്നു
    const q = query(
      collection(db, 'leaves'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubLeaves = onSnapshot(q, (snapshot) => {
      setMyLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubLeaves();
  }, [user.uid, dateKey]);

  const handleMarked = (record) => {
    setTodayRecord(record);
    // Reload stats
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header & Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-cyan-400" />
            <span className="text-xs text-cyan-400 font-mono uppercase tracking-widest">Staff Portal</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">
            Hi, <span className="text-gradient-cyan">{user.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-text-muted mt-1 font-mono">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          {todayRecord && <StatusBadge status={todayRecord.status} />}
        </div>
      </motion.div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Total Days" value={stats.total} color="cyan" />
        <StatCard icon={CheckCircle} label="Present" value={stats.present} color="emerald" />
        <StatCard icon={Clock} label="Late" value={stats.late} color="amber" />
        <StatCard icon={XCircle} label="Absent" value={stats.absent} color="rose" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Attendance Percentage */}
        <div className="glass rounded-2xl p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-bright">Attendance Rate</span>
            <span className="font-display font-bold text-2xl text-gradient-cyan">{stats.percentage}%</span>
          </div>
          <div className="h-2 bg-border/60 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.percentage}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-violet-500" />
          </div>
        </div>

        {/* Apply Leave Button */}
        <Link to="/leave-request" className="glass rounded-2xl p-5 flex flex-col justify-center items-center gap-2 hover:bg-white/5 border border-violet-500/20 group">
          <FileText className="text-violet-400" size={24} />
          <span className="text-sm font-bold text-text-bright">Apply for Leave</span>
        </Link>
      </div>

      {/* Leave Status Section (New) */}
      <AnimatePresence>
        {myLeaves.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 border border-white/5">
            <h3 className="text-sm font-semibold text-text-bright mb-4 flex items-center gap-2">
              <Info size={14} className="text-cyan-400" />
              My Leave Applications
            </h3>
            <div className="space-y-3">
              {myLeaves.slice(0, 3).map((leave) => (
                <div key={leave.id} className="bg-white/5 rounded-xl p-3 flex justify-between items-center border border-white/5">
                  <div>
                    <p className="text-xs font-bold text-text-bright">{leave.type}</p>
                    <p className="text-[10px] text-text-muted">{leave.startDate} to {leave.endDate}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    leave.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                    leave.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mark Attendance Component */}
      <MarkAttendance onMarked={handleMarked} alreadyMarked={!!todayRecord} />

      {/* Recent Attendance History */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-text-bright mb-4">Recent Attendance</h3>
        <AttendanceTable records={records.slice(0, 5)} />
      </div>
    </div>
  );
}