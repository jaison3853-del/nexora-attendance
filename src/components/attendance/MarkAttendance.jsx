// src/components/attendance/MarkAttendance.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, MapPin, Loader2, Navigation } from 'lucide-react';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { useClock } from '../../hooks/useClock';
import { markAttendance } from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', icon: CheckCircle, color: 'emerald', desc: 'On time & ready' },
  { value: 'late', label: 'Late', icon: Clock, color: 'amber', desc: 'Arrived late' },
  { value: 'absent', label: 'Absent', icon: XCircle, color: 'rose', desc: 'Not available today' },
];

const colorMap = {
  emerald: 'border-emerald-400/40 bg-emerald-400/5 text-emerald-400 ring-emerald-400/30',
  amber: 'border-amber-400/40 bg-amber-400/5 text-amber-400 ring-amber-400/30',
  rose: 'border-rose-400/40 bg-rose-400/5 text-rose-400 ring-rose-400/30',
};

export default function MarkAttendance({ onMarked, alreadyMarked }) {
  const { user } = useAuth();
  const { date, time } = useClock();
  const { location, locationName, locLoading, getLocation } = useGeoLocation();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGetLocation = async () => {
    try {
      await getLocation();
      toast.success('Location captured!');
    } catch {
      toast.error('Could not get location. Proceeding without GPS.');
    }
  };

  const handleMark = async () => {
    if (!selected) { toast.error('Please select a status'); return; }
    setLoading(true);
    try {
      let loc = location;
      let locName = locationName;
      if (!loc) {
        try { const res = await getLocation(); loc = res; locName = res.locationName; } catch { /* ok */ }
      }
      const record = await markAttendance({
        uid: user.uid,
        name: user.name,
        status: selected,
        latitude: loc?.latitude || null,
        longitude: loc?.longitude || null,
        locationName: locName || 'Location unavailable',
      });
      toast.success(`Attendance marked as ${selected}!`);
      onMarked?.(record);
    } catch (err) {
      toast.error(err.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  if (alreadyMarked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-6 border border-emerald-400/20 bg-emerald-400/5"
      >
        <div className="flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400" />
          <div>
            <p className="font-semibold text-text-bright">Attendance Marked</p>
            <p className="text-sm text-text-muted">You've already marked your attendance for today.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-text-bright">Mark Attendance</h3>
          <p className="text-xs text-text-muted mt-0.5 font-mono">{date}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-cyan-400">{time}</p>
          <p className="text-[10px] text-muted">Live clock</p>
        </div>
      </div>

      {/* Status selection */}
      <div className="grid grid-cols-3 gap-3">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
              selected === opt.value
                ? `${colorMap[opt.color]} ring-1`
                : 'border-border/60 hover:border-border-bright/60 text-text-muted hover:text-text-dim'
            }`}
          >
            <opt.icon size={20} />
            <span className="text-xs font-semibold">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Location */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-border/30">
        <MapPin size={14} className={locationName ? 'text-emerald-400' : 'text-muted'} />
        <p className="text-xs text-text-muted flex-1 truncate font-mono">
          {locationName || 'Location not captured'}
        </p>
        <button
          onClick={handleGetLocation}
          disabled={locLoading}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 shrink-0"
        >
          {locLoading ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
          {locLoading ? 'Getting...' : 'Capture'}
        </button>
      </div>

      <button
        onClick={handleMark}
        disabled={loading || !selected}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        {loading ? 'Marking...' : 'Confirm Attendance'}
      </button>
    </motion.div>
  );
}
