// src/pages/SignupPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Hexagon, Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { registerUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('All fields required'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
   if (form.role === 'admin') {
      const secretCode = prompt("Enter Admin Secret Code:");
      if (secretCode !== 'NEXORA2026') {
        toast.error("Invalid Admin Code!");
        return;
      }
    } 
    setLoading(true);
    try {
      const userData = await registerUser(form);
      setUser(userData);
      toast.success(`Account created! Welcome, ${userData.name}`);
      navigate(userData.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.message?.includes('email-already-in-use') ? 'Email already registered' : err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-20" />
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 mb-4 shadow-glow-violet">
            <Hexagon size={28} className="text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-text-bright">Join NEXORA SM</h1>
          <p className="text-sm text-text-muted mt-1">Create your account to get started</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="input-field pl-9" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" className="input-field pl-9" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 characters" className="input-field pl-9 pr-10" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text-base">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">Role</label>
              <div className="relative">
                <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input-field pl-9 appearance-none">
                  <option value="staff">Staff Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
