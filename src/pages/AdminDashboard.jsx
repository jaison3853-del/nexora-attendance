import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, RefreshCw, Shield, FileText, Check, X, Calendar, User, 
  PlaneTakeoff, Trophy, Award, AlertCircle, Radio, Navigation, MapPin
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { subscribeToAttendance, getAllUsers } from '../services/attendanceService';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { format, subDays, getDaysInMonth, startOfDay, isWithinInterval, endOfDay, parseISO } from 'date-fns';
import AttendanceTable from '../components/attendance/AttendanceTable';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444']; 

export default function AdminDashboard() {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    search: '', status: '', date: format(new Date(), 'yyyy-MM-dd'), month: ''
  });

  // 🗺️ GPS MAP TRACKING STATES
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    getAllUsers().then(setUsers);
    const unsubAttendance = subscribeToAttendance((data) => { 
      setRecords(data); 
      setLoading(false); 
    });
    const qLeaves = query(collection(db, 'leaves'), orderBy('createdAt', 'desc'));
    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
      setLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubAttendance(); unsubLeaves(); };
  }, []);

  const getInTime = (r) => r?.punchIn || r?.checkIn || r?.timeIn || r?.inTime || r?.time || r?.createdAt || null;
  const getOutTime = (r) => r?.punchOut || r?.punchOutTime || r?.checkOut || r?.timeOut || r?.outTime || null;

  // --- ⏰ TIME FORMATTER ---
  const formatTime12Hr = (val) => {
    if (!val || String(val).includes('--')) return '--:--';
    try {
      if (typeof val.toDate === 'function') return format(val.toDate(), 'hh:mm a');
      if (val instanceof Date) return format(val, 'hh:mm a');
      
      const str = String(val).toUpperCase();
      if (str.includes('AM') || str.includes('PM')) return str;
      
      const match = str.match(/(\d{1,2}):(\d{1,2})/);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
      }
    } catch (e) {}
    return String(val);
  };

  // --- 🏆 SMART LEADERBOARD ---
  const leaderboard = useMemo(() => {
    const currentMonth = filters.month || format(new Date(), 'yyyy-MM');
    const now = new Date();
    const todayDateStr = format(now, 'yyyy-MM-dd');
    const currentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60);

    const parseTime = (val) => {
      if (!val) return null;
      try {
        if (typeof val.toDate === 'function') { const d = val.toDate(); return (d.getHours() * 3600) + (d.getMinutes() * 60); }
        if (val instanceof Date) return (val.getHours() * 3600) + (val.getMinutes() * 60);
        const str = String(val).toLowerCase();
        const match = str.match(/(\d{1,2}):(\d{1,2})/); 
        if (match) {
          let h = parseInt(match[1], 10); let m = parseInt(match[2], 10);
          if (str.includes('pm') && h < 12) h += 12; if (str.includes('am') && h === 12) h = 0;
          return (h * 3600) + (m * 60);
        }
      } catch(e) {} return null;
    };

    const monthStats = users.map(user => {
      const userRecords = records.filter(r => r.uid === user.uid && r.date?.startsWith(currentMonth));
      let totalSecs = 0; let presentDays = 0;

      userRecords.forEach(r => {
        if (!r.status || (r.status.toLowerCase() !== 'present' && r.status.toLowerCase() !== 'late')) return;
        const inSec = parseTime(getInTime(r)); if (inSec === null) return;
        presentDays++;
        const outVal = getOutTime(r); let outSec = parseTime(outVal);
        const isWorking = !outVal || String(outVal).toLowerCase().includes('work');
        if (isWorking) {
          if (r.date === todayDateStr) { if (currentSecs < 21 * 3600) outSec = currentSecs; else outSec = 17.5 * 3600; }
          else outSec = 17.5 * 3600; 
        }
        if (outSec !== null) { let diff = outSec - inSec; if (diff < 0) diff += 24 * 3600; totalSecs += diff; }
      });
      
      const totalHours = Math.floor(totalSecs / 3600);
      const totalMinutes = Math.floor((totalSecs % 3600) / 60);
      return { name: user.name, uid: user.uid, totalSecs, workTimeStr: `${totalHours}h ${totalMinutes}m`, presentDays, photoURL: user.photoURL, designation: user.designation };
    });
    return monthStats.sort((a, b) => b.totalSecs - a.totalSecs).slice(0, 3);
  }, [records, users, filters.month]);

  // --- 📡 LIVE RADAR LOGIC ---
  const activeStaff = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return records.filter(r => {
      const outVal = getOutTime(r);
      const isWorking = !outVal || String(outVal).toLowerCase().includes('work');
      return r.date === today && isWorking;
    }).map(r => {
      const user = users.find(u => u.uid === r.uid);
      return { ...r, photoURL: user?.photoURL, name: user?.name || r.name };
    });
  }, [records, users]);

  // --- Real-time Map Update ---
  useEffect(() => {
    if (showMapModal && selectedLocation?.uid) {
      const activeRecord = activeStaff.find(s => s.uid === selectedLocation.uid);
      if (activeRecord && activeRecord.latitude && activeRecord.longitude) {
        if (activeRecord.latitude !== selectedLocation.lat || activeRecord.longitude !== selectedLocation.lng) {
          setSelectedLocation(prev => prev ? ({
            ...prev,
            lat: activeRecord.latitude,
            lng: activeRecord.longitude,
            locName: activeRecord.locationName || prev.locName
          }) : null);
        }
      }
    }
  }, [activeStaff, showMapModal]);

  // --- SMART RECORDS & CALENDAR LOGIC ---
  const finalRecords = useMemo(() => {
    let currentRecords = records;
    if (filters.date) currentRecords = records.filter(r => r.date === filters.date);
    const selectedDate = startOfDay(parseISO(filters.date || format(new Date(), 'yyyy-MM-dd')));
    const now = new Date();
    const isToday = format(now, 'yyyy-MM-dd') === filters.date;
    const isPast11AM = now.getHours() >= 11;
    const isPast9PM = now.getHours() >= 21;
    const leaveEntries = [];
    if (filters.date && selectedDate.getDay() !== 0) {
      users.forEach(user => {
        const punchRecord = currentRecords.find(r => r.uid === user.uid);
        if (!punchRecord && (!isToday || isPast11AM)) {
          const activeLeave = leaves.find(l => l.userId === user.uid && l.status === 'approved' && isWithinInterval(selectedDate, { start: startOfDay(parseISO(l.startDate)), end: endOfDay(parseISO(l.endDate)) }));
          if (activeLeave) leaveEntries.push({ id: `leave-${user.uid}`, uid: user.uid, name: user.name, date: filters.date, status: 'leave', checkIn: 'ON LEAVE', checkOut: activeLeave.type, location: 'Approved Leave' });
        }
      });
    }
    return [...currentRecords, ...leaveEntries].filter(r => r.name?.toLowerCase().includes(filters.search.toLowerCase())).map(record => {
      const isPastDay = record.date !== format(now, 'yyyy-MM-dd');
      const outVal = getOutTime(record);
      const isWorking = !outVal || String(outVal).toLowerCase().includes('work');
      let newOutVal = outVal;
      if (isWorking && (isPast9PM || isPastDay)) newOutVal = 'Forgot Out';
      return { ...record, checkOut: newOutVal };
    });
  }, [records, leaves, users, filters]);

  // --- 📅 FIXED DEEP ANALYTICS REPORT ---
  const getFullMonthReport = (staffId, selectedMonth) => {
    if (!staffId || !selectedMonth) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysCount = getDaysInMonth(new Date(year, month - 1));
    const staffRecords = records.filter(r => r.uid === staffId && r.date?.startsWith(selectedMonth));
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const report = [];

    for (let i = 1; i <= daysCount; i++) {
      const currentDate = new Date(year, month - 1, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayName = format(currentDate, 'EEE'); 
      const record = staffRecords.find(r => r.date === dateStr);
      
      let status = record ? (record.status || 'absent').toLowerCase() : 'absent';
      const approvedLeave = leaves.find(l => l.userId === staffId && l.status === 'approved' && dateStr >= l.startDate && dateStr <= l.endDate);
      
      if (!record || status === 'absent') {
        if (approvedLeave) status = 'leave';
        else if (dateStr > todayStr) status = 'upcoming';
        else if (currentDate.getDay() === 0) status = 'holiday';
      }

      let inTimeStr = '--:--';
      let outTimeStr = '--:--';
      
      if (record) {
         inTimeStr = formatTime12Hr(getInTime(record));
         outTimeStr = formatTime12Hr(getOutTime(record));
         
         const isPastDay = dateStr !== todayStr;
         const isPast9PM = new Date().getHours() >= 21;
         const outValRaw = getOutTime(record);
         const isWorking = !outValRaw || String(outValRaw).toLowerCase().includes('work');
         
         if (isWorking && (isPastDay || (dateStr === todayStr && isPast9PM))) {
             outTimeStr = 'Forgot Out';
         } else if (isWorking) {
             outTimeStr = 'Working';
         }
      }

      report.push({ 
        date: dateStr, 
        displayDate: `${format(currentDate, 'dd/MM')} ${dayName}`,
        status, 
        checkIn: inTimeStr,
        checkOut: outTimeStr,
        // Pass location coordinates for analytics calendar map trigger
        latitude: record?.latitude || null,
        longitude: record?.longitude || null,
        locationName: record?.locationName || 'Unknown'
      });
    }
    return report;
  };

  const exportMonthlySummary = () => {
    const currentMonth = filters.month || format(new Date(), 'yyyy-MM');
    const summaryMap = {};
    users.forEach(u => { summaryMap[u.uid] = { Name: u.name, Present: 0, Late: 0 }; });
    records.filter(r => r.date?.startsWith(currentMonth)).forEach(r => { if (summaryMap[r.uid]) { if (r.status?.toLowerCase() === 'present') summaryMap[r.uid].Present++; else if (r.status?.toLowerCase() === 'late') summaryMap[r.uid].Late++; } });
    const csv = ["Staff Name,Present Days,Late Entries", ...Object.values(summaryMap).map(s => `${s.Name},${s.Present},${s.Late}`)].join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `Nexora_Payroll_${currentMonth}.csv`; link.click();
  };

  const handleLeaveStatus = async (leave, newStatus) => {
    try {
      await updateDoc(doc(db, 'leaves', leave.id), { status: newStatus });
      toast.success(`Leave ${newStatus}`);
      emailjs.send('service_p8pt4hr', 'template_9rzi9fa', { to_name: leave.userName, to_email: leave.userEmail, status: newStatus.toUpperCase() }, 'YCJDmchHr727bPTJE');
    } catch (e) { toast.error('Error updating status'); }
  };

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    const trend = last7Days.map(date => ({ name: format(new Date(date), 'EEE'), present: records.filter(r => r.date === date).length }));
    const todayRecs = records.filter(r => r.date === format(new Date(), 'yyyy-MM-dd'));
    return { trend, distribution: [{ name: 'On Time', value: todayRecs.filter(r => r.status?.toLowerCase() === 'present').length }, { name: 'Late', value: todayRecs.filter(r => r.status?.toLowerCase() === 'late').length }, { name: 'Absent', value: Math.max(0, users.length - todayRecs.length) }]};
  }, [records, users]);

  const selectedStaffForReport = (filters.search.length >= 2 && filters.month) ? users.find(u => u.name?.toLowerCase().includes(filters.search.toLowerCase())) : null;

  const triggerMapModal = (staffRecord) => {
    if (staffRecord?.latitude && staffRecord?.longitude) {
      setSelectedLocation({
        uid: staffRecord.uid,
        name: staffRecord.name,
        lat: staffRecord.latitude,
        lng: staffRecord.longitude,
        locName: staffRecord.locationName || 'Office Premises'
      });
      setShowMapModal(true);
    } else {
      toast.error('No GPS coordinates found for this punch entry');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 px-4">
      
      {/* --- 🗺️ LIVE GPS TRACKING INSPECTOR MODAL --- */}
      <AnimatePresence>
        {showMapModal && selectedLocation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4" onClick={() => setShowMapModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30, opacity: 0 }} className="bg-[#0f172a] border border-cyan-500/30 rounded-[2.5rem] max-w-3xl w-full p-6 relative overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.2)]" onClick={e => e.stopPropagation()}>
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
                    <MapPin size={22} className="animate-bounce" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white font-display">{selectedLocation.name} - Punch Location</h2>
                    <p className="text-xs text-text-muted font-mono mt-0.5 flex items-center gap-1">
                      <Navigation size={12} className="text-cyan-400" /> {selectedLocation.locName}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowMapModal(false)} className="p-2 bg-white/5 hover:bg-rose-500/20 rounded-full text-white/50 hover:text-white transition-all"><X size={20} /></button>
              </div>

              {/* 🗺️ INTERACTIVE GOOGLE MAP IFRAME EMBED */}
              <div className="w-full h-[380px] rounded-2xl overflow-hidden border border-white/10 relative bg-slate-950">
                <iframe
                  title="GPS Live View"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://maps.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}&z=16&output=embed`}
                  className="filter invert-[90%] hue-rotate-[180deg] contrast-[100%]" // Sleek Dark Mode Map Theme
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[11px] text-text-muted">
                <div>LATITUDE: <span className="text-white font-bold">{selectedLocation.lat}</span></div>
                <div>LONGITUDE: <span className="text-white font-bold">{selectedLocation.lng}</span></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-bright flex items-center gap-3">
            <Shield className="text-cyan-400" /> Nexora Control Center
          </h1>
          <p className="text-text-muted">Commanding Nexora SM Operations | Jaison Pious</p>
        </div>
        <button onClick={exportMonthlySummary} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg flex items-center gap-2 transition-all">
          <Download size={18} /> Export Payroll
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- 📡 LIVE OFFICE RADAR WITH LOCATION CLICKS --- */}
        <div className="lg:col-span-1 glass rounded-[2rem] p-6 border border-cyan-500/20 bg-[#020617] relative overflow-hidden h-[450px] flex flex-col items-center">
          <div className="absolute top-4 left-6 z-10">
            <h3 className="text-sm font-black text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Radio size={16} className="animate-pulse" /> Live Radar
            </h3>
            <p className="text-[10px] text-text-muted font-mono mt-1">SCANNING OFFICE PREMISES...</p>
          </div>

          <div className="relative w-64 h-64 mt-12 md:w-72 md:h-72">
            <div className="absolute inset-0 border-2 border-cyan-500/10 rounded-full" />
            <div className="absolute inset-4 border border-cyan-500/10 rounded-full" />
            <div className="absolute inset-12 border border-cyan-500/10 rounded-full" />
            <div className="absolute inset-24 border border-cyan-500/10 rounded-full" />
            
            <motion.div 
              animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 to-transparent origin-center"
              style={{ clipPath: 'polygon(50% 50%, 100% 50%, 100% 0)' }}
            />

            <AnimatePresence>
              {activeStaff.map((staff, idx) => {
                const angle = (idx * 137.5) % 360; 
                const distance = 30 + (idx * 15) % 60;
                return (
                  <motion.div
                    key={staff.uid}
                    initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                    className="absolute z-20 group cursor-pointer"
                    style={{ top: `${50 + distance * Math.sin(angle * Math.PI / 180)}%`, left: `${50 + distance * Math.cos(angle * Math.PI / 180)}%` }}
                    onClick={() => triggerMapModal(staff)} // Open map view on radar bubble click
                  >
                    <div className="relative">
                      <div className={`w-8 h-8 rounded-full border-2 ${staff.latitude && staff.longitude ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'} p-0.5 bg-black overflow-hidden`}>
                        {staff.photoURL ? <img src={staff.photoURL} className="w-full h-full object-cover" /> : <User size={14} className={`m-auto ${staff.latitude && staff.longitude ? 'text-emerald-400' : 'text-cyan-400'}`} />}
                      </div>
                      {staff.latitude && staff.longitude && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 border border-black z-30 shadow-[0_0_10px_rgba(16,185,129,0.8)] flex items-center justify-center">
                          <MapPin size={8} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${staff.latitude && staff.longitude ? 'bg-emerald-500' : 'bg-cyan-500'} text-black text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 flex items-center gap-1`}>
                      {staff.name} {staff.latitude && staff.longitude && <MapPin size={10} />}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="mt-auto w-full text-center pb-2">
            <div className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">Total Active: <span className="text-white text-sm font-bold">{activeStaff.length}</span></div>
            <div className="flex justify-center gap-1 mt-2">{[0,1,2,3].map(i => <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }} className="w-1 h-1 bg-cyan-400 rounded-full" />)}</div>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="lg:col-span-2 glass rounded-[2rem] p-6 border border-white/5 h-[450px]">
          <h3 className="text-lg font-bold text-text-bright mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-cyan-400" /> Weekly Activity</h3>
          <ResponsiveContainer width="100%" height="80%"><BarChart data={chartData.trend}><CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" fontSize={12} /><YAxis stroke="#94a3b8" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }} /><Bar dataKey="present" fill="#22d3ee" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers Leaderboard */}
        <div className="lg:col-span-1 glass rounded-3xl p-6 border border-yellow-500/20 bg-yellow-500/5">
          <h3 className="text-lg font-bold text-text-bright mb-4 flex items-center gap-2"><Trophy className="text-yellow-400" size={20} /> Hall of Fame</h3>
          <div className="space-y-3">
            {leaderboard.map((staff, index) => (
              <div key={staff.uid} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 transition-transform hover:scale-[1.02]">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${index === 0 ? 'border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'border-white/10'}`}>
                      {staff.photoURL ? <img src={staff.photoURL} className="w-full h-full object-cover" /> : staff.name?.charAt(0)}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'}`}>{index+1}</span>
                  </div>
                  <div><p className="font-bold text-sm text-text-bright">{staff.name}</p><p className="text-[9px] text-text-muted">{staff.designation}</p></div>
                </div>
                <div className="text-right"><p className="text-xs font-bold text-emerald-400">{staff.workTimeStr}</p><p className="text-[8px] text-text-muted">{staff.presentDays} Days</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Summary & Leave Approvals */}
        <div className="lg:col-span-2 space-y-6">
           {leaves.filter(l => l.status === 'pending').length > 0 && (
            <div className="glass rounded-3xl p-6 border border-amber-500/30 bg-amber-500/5">
              <h3 className="text-lg font-bold text-text-bright mb-4 flex items-center gap-2"><Navigation className="text-amber-400" size={18} /> Leave Authorization Required</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leaves.filter(l => l.status === 'pending').map((leave) => (
                  <div key={leave.id} className="bg-black/40 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                    <div><p className="font-bold text-sm text-white">{leave.userName}</p><p className="text-[10px] text-text-muted">{leave.startDate} - {leave.endDate}</p></div>
                    <div className="flex gap-2">
                      <button onClick={() => handleLeaveStatus(leave, 'approved')} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors"><Check size={16} /></button>
                      <button onClick={() => handleLeaveStatus(leave, 'rejected')} className="p-2 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/30 transition-colors"><X size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
           )}

           <div className="glass rounded-3xl p-6 border border-white/5 h-[280px] flex items-center">
              <div className="flex-1">
                 <h3 className="text-lg font-bold text-text-bright">Daily Overview</h3>
                 <p className="text-xs text-text-muted mt-1">On Time vs Late vs Absent</p>
              </div>
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">{chartData.distribution.map((_, i) => <Cell key={`c-${i}`} fill={PIE_COLORS[i]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>

      {/* --- 📅 UPDATED CALENDAR UI WITH MAP CAPABILITY --- */}
      {selectedStaffForReport && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[2rem] p-8 border border-violet-500/20 bg-violet-500/5">
          <h3 className="text-xl font-bold text-text-bright mb-6 flex items-center gap-3"><Calendar className="text-violet-400" /> Deep Analytics: {selectedStaffForReport.name}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {getFullMonthReport(selectedStaffForReport.uid, filters.month).map((day) => {
              let color = day.status === 'absent' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : day.status === 'leave' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : day.status === 'holiday' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : day.status === 'upcoming' ? 'bg-white/5 text-text-muted border-white/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              const hasGPS = day.latitude && day.longitude;

              return (
                <div 
                  key={day.date} 
                  className={`p-3 rounded-2xl border ${color} transition-all flex flex-col justify-between relative group ${hasGPS ? 'cursor-pointer hover:border-cyan-400' : ''}`}
                  onClick={() => hasGPS && triggerMapModal({ name: selectedStaffForReport.name, latitude: day.latitude, longitude: day.longitude, locationName: day.locationName })}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] opacity-60 font-mono uppercase">{day.displayDate}</p>
                    {hasGPS && <MapPin size={10} className="text-cyan-400 opacity-60 group-hover:opacity-100" />}
                  </div>
                  <p className="text-xs font-black uppercase mt-1">{day.status === 'holiday' ? 'SUN' : day.status}</p>
                  
                  {/* IN & OUT Times Layout */}
                  {(day.status === 'present' || day.status === 'late') && (
                    <div className="mt-2 space-y-0.5 border-t border-current/10 pt-1">
                       <p className="text-[9px] font-mono opacity-90">IN: <span className="font-bold">{day.checkIn}</span></p>
                       <p className="text-[9px] font-mono opacity-90 text-amber-200/90">OUT: <span className="font-bold">{day.checkOut}</span></p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Records Table */}
      <div className="glass rounded-[2rem] p-8 border border-white/5">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} /><input type="text" placeholder="Search team member..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-cyan-500 transition-all text-white" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} /></div>
          <div className="flex gap-4">
            <input type="date" className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-cyan-500 text-white" value={filters.date} onChange={(e) => setFilters({...filters, date: e.target.value, month: ''})} />
            <input type="month" className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500 text-white" value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value, date: ''})} />
          </div>
        </div>
        
        {/* Pass custom row clicks or standard components */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-text-muted text-xs uppercase tracking-wider">
                <th className="py-4 px-2">Staff Member</th>
                <th className="py-4 px-2">Date</th>
                <th className="py-4 px-2">Status</th>
                <th className="py-4 px-2">Location Name</th>
                <th className="py-4 px-2 text-center">GPS Track</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5 text-text-bright">
              {finalRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-2 font-bold">{rec.name}</td>
                  <td className="py-4 px-2 font-mono text-xs">{rec.date}</td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      rec.status === 'present' ? 'bg-emerald-500/10 text-emerald-400' :
                      rec.status === 'late' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>{rec.status}</span>
                  </td>
                  <td className="py-4 px-2 text-text-muted truncate max-w-[180px]">{rec.locationName || 'Office Premises'}</td>
                  <td className="py-4 px-2 text-center">
                    {rec.latitude && rec.longitude ? (
                      <button 
                        onClick={() => triggerMapModal(rec)}
                        className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 transition-all"
                        title="Open Map View"
                      >
                        <MapPin size={14} />
                      </button>
                    ) : (
                      <span className="text-text-muted/30 text-xs">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}