// src/pages/LeaveRequest.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';

export default function LeaveRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Firebase-ലേക്ക് ലീവ് റിക്വസ്റ്റ് സേവ് ചെയ്യുന്നു
      await addDoc(collection(db, 'leaves'), {
        userId: user.uid,
        userName: user.name,
        userEmail: user.email || 'staff@nexora.com',
        ...formData,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2. രണ്ട് അഡ്മിൻമാർക്കും മെയിൽ നോട്ടിഫിക്കേഷൻ അയക്കുന്നു
      // EmailJS വഴി ശരത്തിനും ജെയ്‌സണിനും ഒരേപോലെ മെയിൽ പോകും
      await emailjs.send(
        'service_p8pt4hr',      // Service ID
        'template_fgbhpoa',     // നിങ്ങളുടെ പുതിയ Template ID
        {
          staff_name: user.name,
          leave_type: formData.type,
          from_date: formData.startDate,
          to_date: formData.endDate,
          reason: formData.reason,
          admin_email: 'jaison3853@gmail.com, sarathmurali33@gmail.com' 
        },
        'YCJDmchHr727bPTJE'     // നിങ്ങളുടെ Public Key
      );

      toast.success('Leave applied! Admins notified.');
      navigate('/dashboard');
    } catch (err) {
      console.error("Email/Firebase Error:", err);
      toast.error('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 border border-white/5 shadow-2xl">
        <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
          <div className="p-3 rounded-2xl bg-violet-500/20 text-violet-400">
            <FileText size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-text-bright">Apply for Leave</h1>
            <p className="text-sm text-text-muted">Notification will be sent to both Admins</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-text-muted ml-1">Leave Type</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="input-field w-full"
                required
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Loss of Pay">Loss of Pay</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-text-muted ml-1">Start Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input 
                  type="date" 
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="input-field pl-10 w-full" 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-text-muted ml-1">End Date</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input 
                  type="date" 
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="input-field pl-10 w-full" 
                  required 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-text-muted ml-1">Reason for Leave</label>
            <textarea 
              rows="4"
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              className="input-field w-full py-3 resize-none"
              placeholder="Why do you need leave?"
              required
            ></textarea>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              className="btn-ghost flex-1 py-4 rounded-2xl border border-white/5 font-bold"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-cyan-500/20"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {loading ? 'Sending...' : 'Apply Now'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}