// src/components/layout/Navbar.jsx
import { Menu, Bell } from 'lucide-react';
import { useClock } from '../../hooks/useClock';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onMenuClick }) {
  const { date, time } = useClock();
  const { user } = useAuth();

  return (
    <header className="h-16 glass border-b border-border/50 flex items-center px-4 md:px-6 gap-4 shrink-0">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-xl hover:bg-border/40 transition-colors text-text-muted hover:text-text-base"
      >
        <Menu size={18} />
      </button>

      <div className="flex-1">
        <p className="text-xs text-text-muted font-mono hidden sm:block">{date}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-border/30">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-emerald-400">{time}</span>
        </div>

        <button className="p-2 rounded-xl hover:bg-border/40 transition-colors text-text-muted hover:text-text-base relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
        </button>

        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:shadow-glow-violet transition-shadow">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}
