// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle, XCircle, Clock, TrendingUp, Download,
  Search, RefreshCw, Shield, Activity, FileText, Check, X, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { subscribeToAttendance, getAllUsers, getAttendanceStats } from '../services/attendanceService';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import AttendanceTable from '../components/attendance/AttendanceTable';
import StatCard from '../components/ui/StatCard';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#34d399', '#fb7185', '#fbbf24'];

export default function AdminDashboard() {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // DEFAULT FILTER INNETHE DATE AAKKIYITTUNDU
  const [filters, setFilters] = useState({ 
    search: '', 
    status: '', 
    date: format(new Date(), 'yyyy-MM-dd'), // Innethe date automatic aayi edukum
    month: '' 
  });

  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

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

    return () => {
      unsubAttendance();
      unsubLeaves();
    };
  }, []);

  useEffect(() => {
    let f = [...records];
    
    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      f = f.filter(r => r.name?.toLowerCase().includes(q) || r.uid?.includes(q));
    }
    
    // Status filter
    if (filters.status) f = f.filter(r => r.status === filters.status);
    
    // Date filter (Ithanu innethe update mathram kaanikkan sahayikkunnath)
    if (filters.date) {
      f = f.filter(r => r.date === filters.date);
    }
    
    // Month filter
    if (filters.month) f = f.filter(r => r.date?.startsWith(filters.month));
    
    setFiltered(f);
    setPage(1);
  }, [filters, records]);

  const stats = getAttendanceStats(records);

  const handleLeaveStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'leaves', id), { status: newStatus });
      toast.success(`Leave ${newStatus}!`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <Loader />;

  const paginated = filtered.slice(0, page * PER_PAGE);
  const pendingLeaves = leaves.filter(l => l.status === 'pending');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-violet-400" />
            <span className="text-xs text-violet-400 font-mono uppercase tracking-widest">Admin Panel</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">Nexora Daily Updates</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {filters.date === format(new Date(), 'yyyy-MM-dd') ? "Showing Today's Status" : `Records for ${filters.date}`}
          </p>
        </div>
      </div>

      {/* Daily Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="Present Today" value={filtered.filter(r=>r.status==='present').length} color="emerald" />
        <StatCard icon={Clock} label="Late Today" value={filtered.filter(r=>r.status==='late').length} color="amber" />
        <StatCard icon={XCircle} label="Absent Today" value={filtered.filter(r=>r.status==='absent').length} color="rose" />
        <StatCard icon={Users} label="Total Staff" value={users.length} color="violet" />
      </div>

      {/* Main List & Filters */}
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap gap-3 mb-5 border-b border-white/5 pb-5">
          {/* DATE PICKER - Ithanu main */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-mono text-muted ml-1">Select Date</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input 
                type="date" 
                value={filters.date} 
                onChange={e => setFilters({ ...filters, date: e.target.value, month: '' })} 
                className="input-field pl-9 w-full sm:w-48 border-cyan-500/20" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase font-mono text-muted ml-1">Search Staff</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" placeholder="Name or ID..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="input-field pl-9 w-full" />
            </div>
          </div>

          <div className="flex items-end">
            <button 
              onClick={() => setFilters({ search: '', status: '', date: format(new Date(), 'yyyy-MM-dd'), month: '' })} 
              className="btn-ghost flex items-center gap-1.5 text-xs h-[42px]"
            >
              <RefreshCw size={12} /> Today
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
           <h3 className="text-sm font-semibold text-text-bright flex items-center gap-2">
             <Activity size={14} className="text-emerald-400" />
             Attendance List ({filtered.length})
           </h3>
        </div>

        <AttendanceTable records={paginated} showUser />
        
        {filtered.length === 0 && (
          <div className="py-20 text-center text-text-muted italic">
            No records found for the selected date.
          </div>
        )}

        {paginated.length < filtered.length && (
          <button onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm w-full mt-4">Load More</button>
        )}
      </div>
    </div>
  );
}