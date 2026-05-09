// src/components/ui/EmptyState.jsx
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No records found', subtitle = 'Nothing here yet', icon: Icon = Inbox }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-border/40 flex items-center justify-center mb-4">
        <Icon size={24} className="text-muted" />
      </div>
      <p className="font-semibold text-text-dim mb-1">{title}</p>
      <p className="text-sm text-muted">{subtitle}</p>
    </motion.div>
  );
}
