import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, XCircle, Clock, TrendingUp, Calendar, MapPin, Zap, FileText, Info, Trophy, Award, QrCode, RefreshCcw, IdCard, X, Play, Code
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClock } from '../hooks/useClock';
import { getTodayAttendance, getUserAttendance, getAttendanceStats, subscribeToAttendance, getAllUsers } from '../services/attendanceService';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import MarkAttendance from '../components/attendance/MarkAttendance';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Loader from '../components/ui/Loader';
import AttendanceTable from '../components/attendance/AttendanceTable';
import welcomePoster from '../assets/poster.jpg'; 

export default function StaffDashboard() {
  const { user } = useAuth();
  const { date, dateKey } = useClock();
  const [todayRecord, setTodayRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  const [showWelcomePoster, setShowWelcomePoster] = useState(false);
  const [isIdFlipped, setIsIdFlipped] = useState(false);
  
  // സിനിമാറ്റിക് വീഡിയോ പ്ലേ ചെയ്യാനുള്ള സ്റ്റേറ്റ് 🎬
  const [showDirectorCut, setShowDirectorCut] = useState(false);

  const [allRecords, setAllRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

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
      } catch (err) { 
        console.error("Attendance Error:", err); 
      }
      setLoading(false);
    };

    loadData();
    getAllUsers().then(setAllUsers);
    const unsubAll = subscribeToAttendance((data) => setAllRecords(data));

    const q = query(collection(db, 'leaves'), where('userId', '==', user.uid));
    const unsubLeaves = onSnapshot(q, (snapshot) => {
      const leaveList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyLeaves(leaveList.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    const hasSeenPoster = sessionStorage.getItem('seenChallengePoster');
    if (!hasSeenPoster) {
      setTimeout(() => setShowWelcomePoster(true), 500); 
      sessionStorage.setItem('seenChallengePoster', 'true');
    }

    return () => { unsubLeaves(); if(unsubAll) unsubAll(); };
  }, [user.uid, dateKey]);

  const closeWelcomePoster = () => setShowWelcomePoster(false);

  const currentUserProfile = useMemo(() => {
    return allUsers.find(u => u.uid === user.uid) || user;
  }, [allUsers, user]);

  const leaderboard = useMemo(() => {
    // ... (നിങ്ങളുടെ പഴയ ലീഡർബോർഡ് ലോജിക് അതുപോലെ തന്നെ)
    const currentMonth = dateKey.substring(0, 7); 
    const now = new Date();
    const todayDateStr = format(now, 'yyyy-MM-dd');
    const currentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60);

    const getInTime = (r) => r?.punchIn || r?.checkIn || r?.timeIn || r?.inTime || r?.createdAt || null;
    const getOutTime = (r) => r?.punchOut || r?.checkOut || r?.timeOut || r?.outTime || null;

    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      try {
        if (typeof timeStr.toDate === 'function') {
           const d = timeStr.toDate();
           return (d.getHours() * 3600) + (d.getMinutes() * 60);
        }
        if (timeStr instanceof Date) {
           return (timeStr.getHours() * 3600) + (timeStr.getMinutes() * 60);
        }
        const str = String(timeStr).toLowerCase();
        const match = str.match(/(\d{1,2}):(\d{1,2})/); 
        if (!match) return null;
        let h = parseInt(match[1], 10);
        let m = parseInt(match[2], 10);
        if (str.includes('pm') && h < 12) h += 12;
        if (str.includes('am') && h === 12) h = 0;
        return (h * 3600) + (m * 60);
      } catch(e) {}
      return null;
    };

    const monthStats = allUsers.map(u => {
      const userRecords = allRecords.filter(r => r.uid === u.uid && r.date?.startsWith(currentMonth));
      let totalSecs = 0; let presentDays = 0;

      userRecords.forEach(r => {
        const inVal = getInTime(r);
        if (!inVal || String(inVal).includes('--') || String(inVal).includes('LEAVE')) return;
        const inSec = parseTime(inVal);
        if (inSec === null) return;
        presentDays++;
        
        const outVal = getOutTime(r);
        let outSec = parseTime(outVal);
        const isWorking = !outVal || String(outVal).toLowerCase().includes('work');
        if (isWorking) { outSec = (r.date === todayDateStr) ? currentSecs : 18 * 3600; }

        if (outSec !== null) {
          let diff = outSec - inSec;
          if (diff < 0) diff += 24 * 3600; 
          totalSecs += diff;
        }
      });
      
      const totalHours = Math.floor(totalSecs / 3600);
      const totalMinutes = Math.floor((totalSecs % 3600) / 60);
      return { 
        name: u.name, uid: u.uid, totalSecs, presentDays, photoURL: u.photoURL, designation: u.designation,
        workTimeStr: `${totalHours}h ${totalMinutes}m` 
      };
    });

    return monthStats.sort((a, b) => b.totalSecs - a.totalSecs).slice(0, 3);
  }, [allRecords, allUsers, dateKey]);

  if (loading) return <Loader />;

  return (
    <div className="relative space-y-6 max-w-5xl mx-auto pb-10 px-4">
      
      {/* --- CINEMATIC DIRECTOR'S CUT MODAL 🎬 --- */}
      <AnimatePresence>
        {showDirectorCut && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[9999]"
            onClick={() => setShowDirectorCut(false)}
          >
            <button 
              onClick={() => setShowDirectorCut(false)}
              className="absolute top-6 right-6 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
            >
              <X size={24} />
            </button>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ delay: 0.2 }}
              className="w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(34,211,238,0.2)] border border-white/10 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* വീഡിയോ ലിങ്ക് ഇവിടെ കൊടുക്കുക 👇 */}
              <video 
                src="https://www.w3schools.com/html/mov_bbb.mp4" /* YOUR_VIDEO_LINK_HERE */
                autoPlay controls controlsList="nodownload" className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                <Code size={14} className="text-cyan-400" />
                <span className="text-[10px] text-white font-mono uppercase tracking-widest">Director's Cut</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Poster Modal (Existing) */}
      <AnimatePresence>
        {showWelcomePoster && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[999] p-4" onClick={closeWelcomePoster}>
            <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 50, opacity: 0 }} className="bg-[#0f172a] border border-cyan-500/30 rounded-3xl max-w-md w-full relative overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.15)]" onClick={(e) => e.stopPropagation()}>
              <button onClick={closeWelcomePoster} className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-rose-500/80 rounded-full text-white/80 hover:text-white transition-all"><X size={20} /></button>
              <div className="p-1"><img src={welcomePoster} alt="Challenge" className="w-full h-auto rounded-2xl block"/></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-cyan-400" />
            <span className="text-xs text-cyan-400 font-mono uppercase tracking-widest">Staff Portal</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">Hi, <span className="text-gradient-cyan">{currentUserProfile.name?.split(' ')[0]}</span></h1>
          <p className="text-sm text-text-muted mt-1 font-mono">{date}</p>
        </div>
        <div className="flex items-center gap-2">{todayRecord && <StatusBadge status={todayRecord.status} />}</div>
      </motion.div>

      <MarkAttendance onMarked={setTodayRecord} todayRecord={todayRecord} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Total Days" value={stats.total} color="cyan" />
        <StatCard icon={CheckCircle} label="Present" value={stats.present} color="emerald" />
        <StatCard icon={Clock} label="Late" value={stats.late} color="amber" />
        <StatCard icon={XCircle} label="Absent" value={stats.absent} color="rose" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Progress Bar */}
        <div className="glass rounded-2xl p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-bright">Attendance Rate</span>
            <span className="font-display font-bold text-2xl text-gradient-cyan">{stats.percentage}%</span>
          </div>
          <div className="h-2 bg-border/60 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${stats.percentage}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-violet-500" /></div>
        </div>

        {/* Digital ID Card */}
        <div className="md:col-span-1 relative h-[140px] md:h-auto">
          <div className="glass w-full h-full rounded-2xl relative overflow-hidden cursor-pointer group shadow-xl border border-cyan-500/30" onClick={() => setIsIdFlipped(!isIdFlipped)}>
            <AnimatePresence mode="wait">
              {!isIdFlipped ? (
                <motion.div key="front" initial={{ opacity: 0, rotateY: -90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: 90 }} transition={{ duration: 0.3 }} className="absolute inset-0 p-4 flex flex-col justify-between bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-cyan-500 rounded flex items-center justify-center text-black font-bold text-[10px]">N</div><span className="text-[10px] font-bold text-text-bright tracking-widest">NEXORA SM</span></div>
                    <RefreshCcw size={12} className="text-text-muted opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-500 p-0.5 shadow-lg flex-shrink-0"><div className="w-full h-full bg-[#0f172a] rounded-full flex items-center justify-center font-bold text-xl text-white overflow-hidden border border-[#0f172a]">{currentUserProfile.photoURL ? <img src={currentUserProfile.photoURL} alt="Profile" className="w-full h-full object-cover" /> : currentUserProfile.name?.charAt(0).toUpperCase()}</div></div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-text-bright text-sm leading-tight truncate">{currentUserProfile.name}</h3>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">{currentUserProfile.designation || 'Nexora Team'}</p>
                      <p className="text-[9px] text-cyan-400 font-mono mt-1 bg-cyan-500/10 inline-block px-2 py-0.5 rounded border border-cyan-500/20">EMP-{currentUserProfile.uid?.substring(0,5).toUpperCase()}</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="back" initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: -90 }} transition={{ duration: 0.3 }} className="absolute inset-0 p-4 flex flex-col items-center justify-center bg-gradient-to-br from-[#020617] to-[#0f172a]">
                  <div className="bg-white p-1.5 rounded-lg mb-2 shadow-[0_0_15px_rgba(34,211,238,0.3)]"><QrCode size={48} className="text-black" /></div>
                  <p className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase">Scan to Verify</p>
                  <p className="text-[8px] text-text-muted/50 absolute bottom-2">Property of Nexora SM</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Link to="/leave-request" className="glass md:col-span-1 rounded-2xl p-5 flex flex-col justify-center items-center gap-2 hover:bg-white/5 border border-violet-500/20 transition-all group"><FileText className="text-violet-400" size={24} /><span className="text-sm font-bold text-text-bright">Apply Leave</span></Link>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
            <h3 className="text-lg font-bold text-text-bright flex items-center gap-2"><Trophy className="text-yellow-400" size={20} /> Top Performers</h3>
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-bold">Based on Working Hours</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaderboard.map((staff, index) => (
              <div key={staff.uid} className={`flex items-center gap-4 p-4 rounded-2xl border ${index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/5'}`}>
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center font-bold text-lg ${index === 0 ? 'border-yellow-400 bg-[#0f172a] text-white' : 'border-white/10 bg-[#0f172a] text-white'}`}>
                    {staff.photoURL ? <img src={staff.photoURL} alt={staff.name} className="w-full h-full object-cover" /> : staff.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'}`}>{index + 1}</div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-sm text-text-bright truncate">{staff.name}</p>
                  <p className="text-[10px] text-text-muted truncate">{staff.designation || 'Nexora Team'}</p>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">{staff.workTimeStr}</p>
                </div>
                {index === 0 && <Award size={24} className="text-yellow-400 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* History Table */}
      <div className="glass rounded-2xl p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-text-bright mb-4">Recent Attendance</h3>
        <AttendanceTable records={records.slice(0, 5)} />
      </div>

      {/* --- DEVELOPER SIGNATURE (Click to play mass video!) --- */}
      <div className="pt-8 pb-4 flex justify-center">
        <button 
          onClick={() => setShowDirectorCut(true)}
          className="group flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-all duration-500"
        >
          <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted uppercase tracking-[0.2em]">
            <span>System Architect</span>
            <div className="w-1 h-1 rounded-full bg-cyan-400 group-hover:animate-ping" />
            <span className="text-cyan-400 font-bold">Jaison Pious</span>
          </div>
          <div className="flex items-center gap-1.5 text-[8px] bg-white/5 px-3 py-1 rounded-full border border-white/10 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10 transition-all">
            <Play size={8} className="text-cyan-400 fill-cyan-400" />
            <span className="text-white">Click for Director's Cut</span>
          </div>
        </button>
      </div>

    </div>
  );
}