// src/pages/ProfileSettings.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Calendar, Hexagon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ProfileSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const fields = [
    { icon: User, label: 'Full Name', value: user?.name },
    { icon: Mail, label: 'Email Address', value: user?.email },
    { icon: Shield, label: 'Role', value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '' },
    { icon: Hexagon, label: 'User ID', value: user?.uid, mono: true, truncate: true },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-text-bright">Profile Settings</h1>
        <p className="text-sm text-text-muted mt-1">Your account information</p>
      </div>

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 flex items-center gap-5"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-3xl font-bold text-white shadow-glow-cyan">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-surface" />
        </div>
        <div>
          <p className="text-lg font-display font-bold text-text-bright">{user?.name}</p>
          <p className="text-sm text-text-muted">{user?.email}</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs bg-violet-400/10 text-violet-400 border border-violet-400/20 font-mono uppercase">
            {user?.role}
          </span>
        </div>
      </motion.div>

      {/* Fields */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6 space-y-4"
      >
        <h3 className="text-sm font-semibold text-text-bright mb-4">Account Details</h3>
        {fields.map(({ icon: Icon, label, value, mono, truncate }) => (
          <div key={label} className="flex items-center gap-4 py-3 border-b border-border/40 last:border-0">
            <div className="w-8 h-8 rounded-lg bg-border/40 flex items-center justify-center shrink-0">
              <Icon size={14} className="text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">{label}</p>
              <p className={`text-sm text-text-base ${mono ? 'font-mono' : ''} ${truncate ? 'truncate' : ''}`}>{value || '—'}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border border-rose-400/30 text-rose-400 hover:bg-rose-400/10 transition-all duration-200 text-sm font-semibold"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
