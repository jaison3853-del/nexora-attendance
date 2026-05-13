import { motion } from 'framer-motion';
import StatusBadge from '../ui/StatusBadge';
import { MapPin, Clock, LogIn, LogOut } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

export default function AttendanceTable({ records = [], showUser = false }) {
  if (!records.length) return <EmptyState title="No attendance records" subtitle="Records will appear here once attendance is marked" />;

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full text-sm min-w-[800px]">
        <thead>
          <tr className="border-b border-border/50">
            {showUser && <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Employee</th>}
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Date & Status</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Punch In</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Punch Out</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Location (In/Out)</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec, i) => (
            <motion.tr key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b border-border/30 hover:bg-border/20 transition-colors group">
              
              {showUser && (
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/40 to-cyan-500/40 flex items-center justify-center text-xs font-bold text-text-bright shrink-0">
                      {rec.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-text-base font-medium truncate max-w-[120px]">{rec.name}</span>
                  </div>
                </td>
              )}
              
              <td className="py-3 px-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-text-dim text-xs">{rec.date}</span>
                  <StatusBadge status={rec.status} />
                </div>
              </td>
              
              <td className="py-3 px-4">
                <span className="flex items-center gap-1.5 text-xs text-text-muted font-mono whitespace-nowrap">
                  <LogIn size={12} className="text-emerald-400" />
                  {rec.time || '--:--'}
                </span>
              </td>
              
              <td className="py-3 px-4">
                <span className="flex items-center gap-1.5 text-xs text-text-muted font-mono whitespace-nowrap">
                  <LogOut size={12} className="text-rose-400" />
                  {rec.punchOutTime ? rec.punchOutTime : <span className="text-amber-500/70 italic text-[10px]">Working...</span>}
                </span>
              </td>
              
              <td className="py-3 px-4">
                <div className="flex flex-col gap-1 text-xs text-text-muted max-w-[200px]">
                  <span className="flex items-center gap-1.5 truncate" title={rec.locationName}>
                    <MapPin size={10} className="text-emerald-500/60 shrink-0" />
                    <span className="truncate">{rec.locationName || '—'}</span>
                  </span>
                  {rec.punchOutLocation && (
                    <span className="flex items-center gap-1.5 truncate" title={rec.punchOutLocation}>
                      <MapPin size={10} className="text-rose-500/60 shrink-0" />
                      <span className="truncate opacity-70">{rec.punchOutLocation}</span>
                    </span>
                  )}
                </div>
              </td>
              
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}