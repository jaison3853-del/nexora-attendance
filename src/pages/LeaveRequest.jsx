import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, Clock, Send, ShieldCheck, AlertCircle, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function LeaveRequest() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [formData, setFormData] = useState({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    const q = query(collection(db, 'leaves'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsub();
  }, [user.uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'leaves'), {
        userId: user.uid,
        userName: user.displayName || 'Staff',
        userEmail: user.email,
        ...formData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Mission Briefing Sent to Admin! 🚀');
      setFormData({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      toast.error('System Failure: Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500 tracking-tighter">LEAVE OPERATIONS</h1>
        <p className="text-text-muted text-xs font-mono mt-2 uppercase tracking-[0.2em]">Request Time Off / Manage Schedule</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Form */}
        <motion.form 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSubmit}
          className="glass p-8 rounded-3xl border border-cyan-500/20 bg-[#020617]/50"
        >
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 block">Leave Type</label>
              <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-cyan-500 transition-all">
                <option className="bg-slate-900">Casual Leave</option>
                <option className="bg-slate-900">Sick Leave</option>
                <option className="bg-slate-900">Emergency Leave</option>
                <option className="bg-slate-900">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 block">Start Date</label>
                <input required type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 block">End Date</label>
                <input required type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2 block">Reason (Brief)</label>
              <textarea required rows="3" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-cyan-500 resize-none" placeholder="Reason for leave..." />
            </div>
            <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={20} /> Deploy Request</>}
            </button>
          </div>
        </motion.form>

        {/* History / Timeline */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="glass p-8 rounded-3xl border border-white/5 bg-white/5"
        >
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Clock className="text-amber-400" size={20} /> Request Log</h3>
          <div className="space-y-4">
            {leaves.length === 0 && <p className="text-text-muted text-sm italic">No recent requests.</p>}
            {leaves.map((leave) => (
              <div key={leave.id} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-white">{leave.type}</p>
                  <p className="text-[10px] text-text-muted">{leave.startDate} to {leave.endDate}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                  leave.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                  leave.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
                  'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {leave.status}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}