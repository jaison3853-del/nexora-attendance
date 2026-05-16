import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, XCircle, Clock, TrendingUp, Calendar, MapPin, Zap, FileText, Info, Trophy, Award, QrCode, RefreshCcw, IdCard
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

export default function StaffDashboard() {
  const { user } = useAuth();
  const { date, dateKey } = useClock();
  const [todayRecord, setTodayRecord] = useState(null);
  const [records, setRecords] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  const [isIdFlipped, setIsIdFlipped] = useState(false);
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

    const q = query(
      collection(db, 'leaves'), 
      where('userId', '==', user.uid)
    );

    const unsubLeaves = onSnapshot(q, (snapshot) => {
      const leaveList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedLeaves = leaveList.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setMyLeaves(sortedLeaves);
    }, (error) => {
      console.error("Leave Firestore Error:", error);
    });

    return () => {
      unsubLeaves();
      if(unsubAll) unsubAll();
    };
  }, [user.uid, dateKey]);

  // ലോഗിൻ ചെയ്ത ആളുടെ ലൈവ് ഡാറ്റ (ഐഡി കാർഡിന് വേണ്ടി)
  const currentUserProfile = useMemo(() => {
    return allUsers.find(u => u.uid === user.uid) || user;
  }, [allUsers, user]);

  // --- LEADERBOARD LOGIC (ഫോട്ടോയും ഡെസിഗ്നേഷനും കൂടെ വലിച്ചെടുക്കുന്നു) ---
  const leaderboard = useMemo(() => {
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
      
      let totalSecs = 0;
      let presentDays = 0;

      userRecords.forEach(r => {
        const inVal = getInTime(r);
        if (!inVal || String(inVal).includes('--') || String(inVal).includes('LEAVE')) return;
        
        const inSec = parseTime(inVal);
        if (inSec === null) return;
        
        presentDays++;
        
        const outVal = getOutTime(r);
        let outSec = parseTime(outVal);
        const isWorking = !outVal || String(outVal).toLowerCase().includes('work');

        if (isWorking) {
          if (r.date === todayDateStr) outSec = currentSecs; 
          else outSec = 18 * 3600; 
        }

        if (outSec !== null) {
          let diff = outSec - inSec;
          if (diff < 0) diff += 24 * 3600; 
          totalSecs += diff;
        }
      });
      
      const totalHours = Math.floor(totalSecs / 3600);
      const totalMinutes = Math.floor((totalSecs % 3600) / 60);
      const workTimeStr = `${totalHours}h ${totalMinutes}m`;

      // ഇവിടെ യൂസറിന്റെ ഫോട്ടോയും പോസ്റ്റും കൂടെ പാസ്സ് ചെയ്യുന്നു!
      return { 
        name: u.name, 
        uid: u.uid, 
        totalSecs, 
        workTimeStr, 
        presentDays,
        photoURL: u.photoURL,
        designation: u.designation
      };
    });

    return monthStats.sort((a, b) => b.totalSecs - a.totalSecs).slice(0, 3);
  }, [allRecords, allUsers, dateKey]);

  const handleMarked = (record) => {
    setTodayRecord(record);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 px-4">
      {/* Header Section */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-cyan-400" />
            <span className="text-xs text-cyan-400 font-mono uppercase tracking-widest">Staff Portal</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">
            Hi, <span className="text-gradient-cyan">{currentUserProfile.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-text-muted mt-1 font-mono">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          {todayRecord && <StatusBadge status={todayRecord.status} />}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Total Days" value={stats.total} color="cyan" />
        <StatCard icon={CheckCircle} label="Present" value={stats.present} color="emerald" />
        <StatCard icon={Clock} label="Late" value={stats.late} color="amber" />
        <StatCard icon={XCircle} label="Absent" value={stats.absent} color="rose" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Progress Bar (2 Columns) */}
        <div className="glass rounded-2xl p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-bright">Attendance Rate</span>
            <span className="font-display font-bold text-2xl text-gradient-cyan">{stats.percentage}%</span>
          </div>
          <div className="h-2 bg-border/60 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.percentage}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-violet-500" />
          </div>
        </div>

        {/* --- DIGITAL SMART ID CARD (1 Column) --- */}
        <div className="md:col-span-1 relative h-[140px] md:h-auto">
          <div 
            className="glass w-full h-full rounded-2xl relative overflow-hidden cursor-pointer group shadow-xl border border-cyan-500/30" 
            onClick={() => setIsIdFlipped(!isIdFlipped)}
          >
            <AnimatePresence mode="wait">
              {!isIdFlipped ? (
                // FRONT OF ID CARD
                <motion.div 
                  key="front" 
                  initial={{ opacity: 0, rotateY: -90 }} 
                  animate={{ opacity: 1, rotateY: 0 }} 
                  exit={{ opacity: 0, rotateY: 90 }} 
                  transition={{ duration: 0.3 }} 
                  className="absolute inset-0 p-4 flex flex-col justify-between bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-cyan-500 rounded flex items-center justify-center text-black font-bold text-[10px]">N</div>
                      <span className="text-[10px] font-bold text-text-bright tracking-widest">NEXORA SM</span>
                    </div>
                    <RefreshCcw size={12} className="text-text-muted opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-500 p-0.5 shadow-lg flex-shrink-0">
                      <div className="w-full h-full bg-[#0f172a] rounded-full flex items-center justify-center font-bold text-xl text-white overflow-hidden border border-[#0f172a]">
                        {currentUserProfile.photoURL ? (
                          <img src={currentUserProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          currentUserProfile.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-text-bright text-sm leading-tight truncate">{currentUserProfile.name}</h3>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">
                        {currentUserProfile.designation || 'Nexora Team'}
                      </p>
                      <p className="text-[9px] text-cyan-400 font-mono mt-1 bg-cyan-500/10 inline-block px-2 py-0.5 rounded border border-cyan-500/20">
                        EMP-{currentUserProfile.uid?.substring(0,5).toUpperCase()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                // BACK OF ID CARD (QR CODE)
                <motion.div 
                  key="back" 
                  initial={{ opacity: 0, rotateY: 90 }} 
                  animate={{ opacity: 1, rotateY: 0 }} 
                  exit={{ opacity: 0, rotateY: -90 }} 
                  transition={{ duration: 0.3 }} 
                  className="absolute inset-0 p-4 flex flex-col items-center justify-center bg-gradient-to-br from-[#020617] to-[#0f172a]"
                >
                  <div className="bg-white p-1.5 rounded-lg mb-2 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                    <QrCode size={48} className="text-black" />
                  </div>
                  <p className="text-[9px] text-cyan-400 font-bold tracking-widest uppercase">Scan to Verify</p>
                  <p className="text-[8px] text-text-muted/50 absolute bottom-2">Property of Nexora SM</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Link (1 Column) */}
        <Link to="/leave-request" className="glass md:col-span-1 rounded-2xl p-5 flex flex-col justify-center items-center gap-2 hover:bg-white/5 border border-violet-500/20 transition-all group">
          <FileText className="text-violet-400" size={24} />
          <span className="text-sm font-bold text-text-bright">Apply Leave</span>
        </Link>
      </div>

      {/* --- LEADERBOARD UI WITH PHOTOS --- */}
      {leaderboard.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
            <h3 className="text-lg font-bold text-text-bright flex items-center gap-2">
              <Trophy className="text-yellow-400" size={20} /> 
              Top Performers This Month
            </h3>
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-bold">Based on Working Hours</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaderboard.map((staff, index) => (
              <div key={staff.uid} className={`flex items-center gap-4 p-4 rounded-2xl border ${index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/5'}`}>
                
                {/* Photo & Rank Badge */}
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center font-bold text-lg ${index === 0 ? 'border-yellow-400 bg-[#0f172a] text-white shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-white/10 bg-[#0f172a] text-white'}`}>
                    {staff.photoURL ? (
                      <img src={staff.photoURL} alt={staff.name} className="w-full h-full object-cover" />
                    ) : (
                      staff.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'}`}>
                    {index + 1}
                  </div>
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

      {/* Attendance Component (Punch In / Out) */}
      <MarkAttendance onMarked={handleMarked} todayRecord={todayRecord} />

      {/* Leave Status Display */}
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

      {/* History Table */}
      <div className="glass rounded-2xl p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-text-bright mb-4">Recent Attendance</h3>
        <AttendanceTable records={records.slice(0, 5)} />
      </div>
    </div>
  );
}