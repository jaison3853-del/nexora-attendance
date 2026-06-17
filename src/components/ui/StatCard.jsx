// src/components/ui/StatCard.jsx
import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, color = 'cyan', subtitle, delay = 0 }) {
  const colors = {
    cyan: { glow: 'shadow-glow-cyan', iconBg: 'from-cyan-500/20 to-cyan-500/5', iconColor: 'text-cyan-400', bar: 'bg-cyan-500' },
    violet: { glow: 'shadow-glow-violet', iconBg: 'from-violet-500/20 to-violet-500/5', iconColor: 'text-violet-400', bar: 'bg-violet-500' },
    emerald: { glow: 'shadow-glow-emerald', iconBg: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-400', bar: 'bg-emerald-500' },
    rose: { glow: '', iconBg: 'from-rose-500/20 to-rose-500/5', iconColor: 'text-rose-400', bar: 'bg-rose-500' },
    amber: { glow: '', iconBg: 'from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-400', bar: 'bg-amber-500' },
  };
  const c = colors[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`stat-card group relative overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${c.bar} rounded-l-2xl`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.iconBg} flex items-center justify-center`}>
          <Icon size={18} className={c.iconColor} />
        </div>
        {subtitle && (
          <span className="text-xs text-text-muted font-mono">{subtitle}</span>
        )}
      </div>
      <p className="text-3xl font-display font-bold text-text-bright mb-1">{value}</p>
      <p className="text-sm text-text-muted">{label}</p>
    </motion.div>
  );
}
