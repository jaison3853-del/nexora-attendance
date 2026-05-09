// src/components/ui/Modal.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="relative w-full max-w-lg glass rounded-2xl shadow-card border border-border-bright/40 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <h3 className="font-display font-semibold text-text-bright">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-border/40 text-muted hover:text-text-base transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
