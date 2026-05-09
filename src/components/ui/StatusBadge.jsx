// src/components/ui/StatusBadge.jsx
const configs = {
  present: { label: 'Present', className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', dot: 'bg-emerald-400' },
  absent: { label: 'Absent', className: 'bg-rose-400/10 text-rose-400 border-rose-400/20', dot: 'bg-rose-400' },
  late: { label: 'Late', className: 'bg-amber-400/10 text-amber-400 border-amber-400/20', dot: 'bg-amber-400' },
  default: { label: '—', className: 'bg-muted/10 text-muted border-muted/20', dot: 'bg-muted' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = configs[status] || configs.default;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border font-mono uppercase tracking-wide ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
