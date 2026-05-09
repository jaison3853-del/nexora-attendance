import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Calendar, FileText, Send } from 'lucide-react';

const LeaveRequest = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'Casual Leave'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // ഇവിടെയാണ് മാറ്റം: user.name കൃത്യമായി എടുക്കുന്നു
      const staffName = user?.name || user?.displayName || 'Staff Member';

      await addDoc(collection(db, 'leaves'), {
        ...formData,
        userId: user.uid,
        userName: staffName, 
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('ലീവ് അപേക്ഷ സമർപ്പിച്ചു!');
      setFormData({ startDate: '', endDate: '', reason: '', type: 'Casual Leave' });
    } catch (error) {
      toast.error('അപേക്ഷിക്കുന്നതിൽ പിശക് സംഭവിച്ചു');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-xl mx-auto">
      <div className="glass rounded-2xl p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-violet-500/20 text-violet-400"><Calendar size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-text-bright">Apply for Leave</h2>
            <p className="text-xs text-text-muted">Fill in the details below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-muted tracking-widest">Leave Type</label>
            <select className="input-field w-full" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
              <option>Casual Leave</option>
              <option>Sick Leave</option>
              <option>Duty Leave</option>
              <option>Other</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-muted tracking-widest">Start Date</label>
              <input type="date" required className="input-field w-full" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-muted tracking-widest">End Date</label>
              <input type="date" required className="input-field w-full" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-muted tracking-widest">Reason</label>
            <textarea required className="input-field w-full min-h-[100px]" placeholder="Why do you need leave?" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})}></textarea>
          </div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Send size={18} /> Submit Application
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default LeaveRequest;