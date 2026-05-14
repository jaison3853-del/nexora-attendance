import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, RefreshCw, Shield, FileText, Check, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { subscribeToAttendance, getAllUsers, getAttendanceStats } from '../services/attendanceService';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import AttendanceTable from '../components/attendance/AttendanceTable';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Green, Amber, Red

export default function AdminDashboard() {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    search: '', status: '', date: format(new Date(), 'yyyy-MM-dd'), month: ''
  });

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

  // --- ചാർട്ടുകൾക്ക് വേണ്ടിയുള്ള ഡാറ്റ തയ്യാറാക്കുന്നു ---
  const chartData = useMemo(() => {
    // 1. Bar Chart Data (കഴിഞ്ഞ 7 ദിവസത്തെ ട്രെൻഡ്)
    const last7Days = [...Array(7)].map((_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
    const trend = last7Days.map(date => {
      const dayRecords = records.filter(r => r.date === date);
      return {
        name: format(new Date(date), 'EEE'),
        present: dayRecords.filter(r => r.status === 'present' || r.status === 'late').length,
        absent: users.length - dayRecords.length
      };
    });

    // 2. Pie Chart Data (ഇന്നത്തെ അവസ്ഥ)
    const todayRecords = records.filter(r => r.date === format(new Date(), 'yyyy-MM-dd'));
    const presentCount = todayRecords.filter(r => r.status === 'present').length;
    const lateCount = todayRecords.filter(r => r.status === 'late').length;
    const absentCount = Math.max(0, users.length - todayRecords.length);

    const distribution = [
      { name: 'On Time', value: presentCount },
      { name: 'Late', value: lateCount },
      { name: 'Absent', value: absentCount }
    ];

    return { trend, distribution };
  }, [records, users]);

  // Leave approval logic
  const handleLeaveStatus = async (leave, newStatus) => {
    try {
      await updateDoc(doc(db, 'leaves', leave.id), { status: newStatus });
      toast.success(`Leave ${newStatus}!`);
      
      emailjs.send(
        'service_p8pt4hr', 'template_9rzi9fa',
        {
          to_name: leave.userName,
          to_email: leave.userEmail,
          status: newStatus.toUpperCase(),
          message: `Your leave request from ${leave.startDate} to ${leave.endDate} has been ${newStatus}.`
        },
        'YCJDmchHr727bPTJE'
      );
    } catch (error) { toast.error('Error updating status'); }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDate = filters.date ? r.date === filters.date : true;
    const matchesMonth = filters.month ? r.date?.startsWith(filters.month) : true;
    return matchesSearch && matchesDate && matchesMonth;
  });

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-bright">Nexora Analytics</h1>
          <p className="text-text-muted">Visual insights and staff management</p>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setFilters({ ...filters, date: format(new Date(), 'yyyy-MM-dd'), month: '' })} className="btn-ghost text-sm py-2 px-4 rounded-xl border border-white/5 flex items-center gap-2">
            <RefreshCw size={14} /> Today
          </button>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Bar Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 glass rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-text-bright mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-cyan-400" /> Attendance Trend (Last 7 Days)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="present" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="absent" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Status Distribution Pie Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-3xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-text-bright mb-6">Today's Distribution</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Pending Leaves */}
      <AnimatePresence>
        {leaves.filter(l => l.status === 'pending').length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-3xl p-6 border border-amber-500/20 bg-amber-500/5">
            <h3 className="text-lg font-bold text-text-bright mb-4 flex items-center gap-2">
              <FileText size={20} className="text-amber-400" /> Pending Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaves.filter(l => l.status === 'pending').map((leave) => (
                <div key={leave.id} className="bg-white/5 rounded-2xl p-4 flex justify-between items-center border border-white/5">
                  <div>
                    <p className="font-bold text-text-bright">{leave.userName}</p>
                    <p className="text-xs text-text-muted">{leave.startDate} to {leave.endDate} • {leave.type}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleLeaveStatus(leave, 'approved')} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all"><Check size={18} /></button>
                    <button onClick={() => handleLeaveStatus(leave, 'rejected')} className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-all"><X size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Table & Filters */}
      <div className="glass rounded-3xl p-6 border border-white/5">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text" placeholder="Search staff name..." 
              className="input-field pl-10 w-full"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <input 
            type="date" className="input-field" 
            value={filters.date}
            onChange={(e) => setFilters({...filters, date: e.target.value})}
          />
        </div>
        
        <AttendanceTable records={filteredRecords} showUser />
      </div>
    </div>
  );
}