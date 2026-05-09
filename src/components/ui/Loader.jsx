// src/components/ui/Loader.jsx
import { motion } from 'framer-motion';
import { Hexagon } from 'lucide-react';

export default function Loader({ fullscreen = false, size = 'md' }) {
  const sizes = { sm: 20, md: 32, lg: 48 };
  const s = sizes[size];

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Hexagon size={16} className="text-cyan-400" fill="currentColor" />
        </div>
      </div>
      <p className="text-xs text-text-muted font-mono tracking-widest animate-pulse">LOADING...</p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-void flex items-center justify-center z-50">
        <div className="fixed inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-20" />
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {spinner}
    </div>
  );
}
