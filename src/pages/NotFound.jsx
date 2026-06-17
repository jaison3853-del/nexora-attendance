// src/pages/NotFound.jsx
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hexagon, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative z-10"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-border/40 mb-6">
          <Hexagon size={32} className="text-muted" />
        </div>
        <p className="text-8xl font-display font-black text-gradient-cyan mb-4">404</p>
        <h1 className="text-xl font-display font-semibold text-text-bright mb-2">Page Not Found</h1>
        <p className="text-text-muted mb-8">The page you're looking for doesn't exist or was moved.</p>
        <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2">
          <Home size={16} />
          Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
