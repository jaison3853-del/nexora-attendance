import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle, Clock, XCircle, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClock } from '../hooks/useClock';
import { getTodayAttendance, getUserAttendance } from '../services/attendanceService';
// 🚀 പുതിയ തീയതി കാൽക്കുലേഷൻ ഫംഗ്ഷനുകൾ ചേർത്തു
import { format, startOfMonth, eachDayOfInterval, isSunday } from 'date-fns'; 
import MarkAttendance from '../components/attendance/MarkAttendance';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import AttendanceTable from '../components/attendance/AttendanceTable';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { date, dateKey } = useClock();
  const [todayRecord, setTodayRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const minLoadTime = new Promise(resolve => setTimeout(resolve, 1000));
        const [today, all, _] = await Promise.all([
          getTodayAttendance(user.uid, dateKey),
          getUserAttendance(user.uid),
          minLoadTime
        ]);
        
        setTodayRecord(today);
        setRecords(all);
      } catch (err) { 
        console.error("Attendance Error:", err); 
      }
      setLoading(false);
    };

    loadData();
  }, [user.uid, dateKey]);

  // --- 🚀 SMART STATS CALCULATION (Current Month Logic) ---
  const stats = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    
    // ഈ മാസം 1-ആം തീയതി മുതൽ ഇന്നത്തെ ദിവസം വരെയുള്ള ലിസ്റ്റ് എടുക്കുന്നു
    const days = eachDayOfInterval({ start, end: now });

    let present = 0;
    let absent = 0;
    let late = 0;
    let total = 0;

    days.forEach(day => {
      if (isSunday(day)) return; // ഞായറാഴ്ചകൾ കണക്കാക്കില്ല (Skip Sundays)
      
      total++; // ആകെ വർക്കിംഗ് ദിവസങ്ങൾ
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = records.find(r => r.date === dateStr);

      if (record) {
        if (record.status === 'late') late++;
        present++; // ലേറ്റ് ആയാലും വന്നതുകൊണ്ട് Present ആയി കൂട്ടും
      } else {
        absent++; // റെക്കോർഡ് ഇല്ലെങ്കിൽ ഓട്ടോമാറ്റിക് ആയി Absent!
      }
    });

    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return { total, present, absent, late, percentage };
  }, [records]);

  // --- 🚀 MINIMALIST PULSE LOADER ---
  if (loading) {
    return (
      <AnimatePresence mode="wait">
        <motion.div 
          key="minimal-intro"
          initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05, filter: "blur(5px)" }} transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden px-4"
        >
          <div className="flex flex-col items-center justify-center">
            <motion.div 
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-[0.3em]"
            >
              NEXORA SM
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="relative space-y-6 max-w-5xl mx-auto pb-10 px-4">
      
      {/* --- DASHBOARD HEADER --- */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-cyan-400" />
            <span className="text-xs text-cyan-400 font-mono uppercase tracking-widest">Staff Portal</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">
            Hi, <span className="text-gradient-cyan">{user.displayName?.split(' ')[0] || 'Team'}</span>
          </h1>
          <p className="text-sm text-text-muted mt-1 font-mono">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          {todayRecord && <StatusBadge status={todayRecord.status} />}
        </div>
      </motion.div>

      {/* --- CORE: MARK ATTENDANCE BUTTON --- */}
      <MarkAttendance onMarked={setTodayRecord} todayRecord={todayRecord} />

      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Total Days" value={stats.total} color="cyan" />
        <StatCard icon={CheckCircle} label="Present" value={stats.present} color="emerald" />
        <StatCard icon={Clock} label="Late" value={stats.late} color="amber" />
        <StatCard icon={XCircle} label="Absent" value={stats.absent} color="rose" />
      </div>

      {/* --- ATTENDANCE RATE PROGRESS BAR --- */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-text-bright">Attendance Rate</span>
          <span className="font-display font-bold text-2xl text-gradient-cyan">{stats.percentage}%</span>
        </div>
        <div className="h-2 bg-border/60 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${stats.percentage}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-violet-500" />
        </div>
      </div>

      {/* --- RECENT RECORDS TABLE --- */}
      <div className="glass rounded-2xl p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-text-bright mb-4">Recent Attendance</h3>
        <AttendanceTable records={records.slice(0, 5)} />
      </div>

    </div>
  );
}