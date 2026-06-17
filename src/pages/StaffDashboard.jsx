import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle, Clock, XCircle, Zap, Activity, Shield, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClock } from '../hooks/useClock';
import { getTodayAttendance, getUserAttendance } from '../services/attendanceService';
import { format, startOfMonth, eachDayOfInterval, isSunday } from 'date-fns'; 

// 🚀 നമ്മൾ പുതിയതായി ഉണ്ടാക്കിയ 24/7 ലൈവ് ട്രാക്കർ ഇംപോർട്ട് ചെയ്യുന്നു
import { useLiveTracking } from '../hooks/useLiveTracking'; 

import MarkAttendance from '../components/attendance/MarkAttendance';
import StatusBadge from '../components/ui/StatusBadge';
import AttendanceTable from '../components/attendance/AttendanceTable';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { date, time, dateKey } = useClock();
  const [todayRecord, setTodayRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🚀 24/7 ലൈവ് ട്രാക്കിംഗ് എഞ്ചിൻ ഇവിടെ സ്റ്റാർട്ട് ചെയ്യുന്നു (ലോഗിൻ ചെയ്താൽ തനിയെ വർക്ക് ആകും)
  useLiveTracking(user);

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

  // --- 🚀 SMART STATS CALCULATION ---
  const stats = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const days = eachDayOfInterval({ start, end: now });

    let present = 0; let absent = 0; let late = 0; let total = 0;

    days.forEach(day => {
      if (isSunday(day)) return; 
      total++; 
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = records.find(r => r.date === dateStr);

      if (record) {
        if (record.status === 'late') late++;
        present++; 
      } else {
        absent++; 
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
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-[0.4em]">
            NEXORA SM
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ഫ്രെയിമർ മോഷൻ ആനിമേഷൻ വേരിയന്റുകൾ
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-screen bg-[#020617] overflow-hidden pb-20">
      
      {/* --- 🌟 AMBIENT BACKGROUND GLOWS --- */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        
        {/* --- DASHBOARD HEADER --- */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] backdrop-blur-xl shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-cyan-400" />
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Workspace Portal</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{user.displayName?.split(' ')[0] || 'Team'}</span>
            </h1>
            <div className="flex items-center gap-3 mt-3 text-text-muted font-mono text-sm">
              <Calendar size={14} className="text-violet-400" /> {date}
              <span className="text-white/20">|</span>
              <Clock size={14} className="text-emerald-400" /> {time}
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-2">
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Current Status</span>
            {todayRecord ? (
              <StatusBadge status={todayRecord.status} />
            ) : (
              <span className="px-4 py-2 rounded-full bg-slate-800 text-slate-300 text-xs font-bold font-mono border border-white/10 flex items-center gap-2">
                <Activity size={14} /> PENDING PUNCH
              </span>
            )}
          </div>
        </motion.div>

        {/* --- CORE: MARK ATTENDANCE BUTTON --- */}
        <motion.div variants={itemVariants}>
          <MarkAttendance onMarked={setTodayRecord} todayRecord={todayRecord} />
        </motion.div>

        {/* --- HUD STATS GRID --- */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          
          <div className="relative overflow-hidden group bg-gradient-to-br from-slate-900 to-slate-900/50 p-6 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar size={48} className="text-cyan-400" /></div>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4 border border-cyan-500/20"><Calendar size={18} className="text-cyan-400" /></div>
            <p className="text-3xl font-black text-white mb-1">{stats.total}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Total Days</p>
          </div>

          <div className="relative overflow-hidden group bg-gradient-to-br from-slate-900 to-slate-900/50 p-6 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle size={48} className="text-emerald-400" /></div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20"><CheckCircle size={18} className="text-emerald-400" /></div>
            <p className="text-3xl font-black text-white mb-1">{stats.present}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Present</p>
          </div>

          <div className="relative overflow-hidden group bg-gradient-to-br from-slate-900 to-slate-900/50 p-6 rounded-3xl border border-white/5 hover:border-amber-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={48} className="text-amber-400" /></div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4 border border-amber-500/20"><Clock size={18} className="text-amber-400" /></div>
            <p className="text-3xl font-black text-white mb-1">{stats.late}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Late</p>
          </div>

          <div className="relative overflow-hidden group bg-gradient-to-br from-slate-900 to-slate-900/50 p-6 rounded-3xl border border-white/5 hover:border-rose-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><XCircle size={48} className="text-rose-400" /></div>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20"><XCircle size={18} className="text-rose-400" /></div>
            <p className="text-3xl font-black text-white mb-1">{stats.absent}</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Absent</p>
          </div>

        </motion.div>

        {/* --- ATTENDANCE RATE PROGRESS BAR --- */}
        <motion.div variants={itemVariants} className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Zap size={14} className="text-cyan-400" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">Performance Rate</h2>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-4xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">{stats.percentage}</span>
              <span className="text-cyan-400 font-bold">%</span>
            </div>
          </div>
          
          <div className="relative h-4 bg-[#0f172a] rounded-full overflow-hidden border border-white/5 shadow-inner">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${stats.percentage}%` }} 
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 rounded-full"
            />
            <motion.div 
              animate={{ x: ['-100%', '200%'] }} 
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          </div>
        </motion.div>

        {/* --- RECENT RECORDS TABLE --- */}
        <motion.div variants={itemVariants} className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6">
            <Layers size={18} className="text-violet-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">Recent Activity</h3>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/5">
            <AttendanceTable records={records.slice(0, 5)} />
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}