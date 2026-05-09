// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Clock, Shield, User, LogOut, X, Hexagon, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['staff', 'admin'] },
  { to: '/history', icon: Clock, label: 'History', roles: ['staff', 'admin'] },
  { to: '/admin', icon: Shield, label: 'Admin Panel', roles: ['admin'] },
  { to: '/profile', icon: User, label: 'Profile', roles: ['staff', 'admin'] },
];

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const filtered = navItems.filter(i => i.roles.includes(user?.role));

  return (
    <div className="flex flex-col h-full w-64 glass border-r border-border/50 relative">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-glow-cyan">
              <Hexagon size={18} className="text-white" fill="white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-surface animate-pulse" />
          </div>
          <div>
            <p className="font-display font-800 text-sm text-text-bright tracking-widest uppercase">Nexora</p>
            <p className="text-[10px] text-text-muted font-mono tracking-widest uppercase">SM v1.0</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-text-base md:hidden p-1 rounded-lg hover:bg-border/40 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filtered.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <NavLink
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/10 to-violet-500/10 text-text-bright border border-cyan-500/20 shadow-glow-cyan/20'
                    : 'text-text-muted hover:text-text-base hover:bg-border/40'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={16}
                    className={isActive ? 'text-cyan-400' : 'text-muted group-hover:text-text-dim transition-colors'}
                  />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-glow-cyan"
                    />
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* User profile */}
      <div className="px-3 pb-4 border-t border-border/50 pt-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-border/30 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-bright truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-muted capitalize font-mono">{user?.role}</p>
          </div>
          <Activity size={12} className="text-emerald-400 shrink-0 animate-pulse" />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm text-muted hover:text-rose-400 hover:bg-rose-400/10 transition-all duration-200"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
