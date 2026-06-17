// src/components/attendance/MarkAttendance.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, MapPin, Loader2, Navigation, LogOut, LogIn, ShieldAlert } from 'lucide-react';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { useClock } from '../../hooks/useClock';
import { markAttendance } from '../../services/attendanceService';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// --- Nexora SM Office Location (Updated) ---
const OFFICE_LOCATION = {
  latitude: 10.064768854505934,
  longitude: 76.61949577690218
};
const MAX_ALLOWED_DISTANCE = 50; // 50 മീറ്റർ പരിധി

// രണ്ട് ലൊക്കേഷനുകൾ തമ്മിലുള്ള ദൂരം മീറ്ററിൽ കണ്ടുപിടിക്കാനുള്ള ഇക്വേഷൻ
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
};

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', icon: CheckCircle, color: 'emerald' },
  { value: 'late', label: 'Late', icon: Clock, color: 'amber' },
  { value: 'absent', label: 'Absent', icon: XCircle, color: 'rose' },
];

const colorMap = {
  emerald: 'border-emerald-400/40 bg-emerald-400/5 text-emerald-400 ring-emerald-400/30',
  amber: 'border-amber-400/40 bg-amber-400/5 text-amber-400 ring-amber-400/30',
  rose: 'border-rose-400/40 bg-rose-400/5 text-rose-400 ring-rose-400/30',
};

export default function MarkAttendance({ onMarked, todayRecord }) {
  const { user } = useAuth();
  const { date, time } = useClock();
  const { location, locationName, locLoading, getLocation } = useGeoLocation();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const isCheckedIn = !!todayRecord;
  const isCheckedOut = todayRecord?.punchOutTime != null;

  const handleGetLocation = async () => {
    try {
      await getLocation();
      toast.success('Location captured!');
    } catch {
      toast.error('Could not get location. Turn on GPS.');
    }
  };

  // 1. PUNCH IN
  const handlePunchIn = async () => {
    if (!selected) { toast.error('Please select a status'); return; }
    setLoading(true);
    try {
      let loc = location;
      let locName = locationName;
      if (!loc) {
        try { const res = await getLocation(); loc = res; locName = res.locationName; } catch { /* ok */ }
      }

      if (!loc?.latitude || !loc?.longitude) {
        toast.error('Location is required for Geofencing!');
        setLoading(false); return;
      }

      // ദൂരം ചെക്ക് ചെയ്യുന്നു (Geofencing Logic)
      const distance = getDistanceInMeters(OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude, loc.latitude, loc.longitude);
      if (distance > MAX_ALLOWED_DISTANCE) {
        toast.error(`You are ${Math.round(distance)} meters away! You must be within ${MAX_ALLOWED_DISTANCE}m of the office.`, { duration: 5000, icon: '🛑' });
        setLoading(false); return;
      }

      const record = await markAttendance({
        uid: user.uid,
        name: user.name,
        status: selected,
        latitude: loc.latitude,
        longitude: loc.longitude,
        locationName: locName || 'Location unavailable',
        time: time, 
      });
      toast.success(`Punched In as ${selected}!`);
      onMarked?.(record);
    } catch (err) {
      toast.error(err.message || 'Failed to punch in');
    } finally {
      setLoading(false);
    }
  };

  // 2. PUNCH OUT
  const handlePunchOut = async () => {
    setLoading(true);
    try {
      let loc = location;
      let locName = locationName;
      if (!loc) {
        try { const res = await getLocation(); loc = res; locName = res.locationName; } catch { /* ok */ }
      }

      if (!loc?.latitude || !loc?.longitude) {
        toast.error('Location is required for Geofencing!');
        setLoading(false); return;
      }

      // ദൂരം ചെക്ക് ചെയ്യുന്നു (Geofencing Logic for Punch Out)
      const distance = getDistanceInMeters(OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude, loc.latitude, loc.longitude);
      if (distance > MAX_ALLOWED_DISTANCE) {
        toast.error(`You are ${Math.round(distance)} meters away! Please come back to the office to Punch Out.`, { duration: 5000, icon: '🛑' });
        setLoading(false); return;
      }
      
      const recordRef = doc(db, 'attendance', todayRecord.id);
      await updateDoc(recordRef, {
        punchOutTime: time,
        punchOutLocation: locName || 'Location unavailable',
      });
      
      toast.success('Successfully Punched Out!');
      onMarked?.({ ...todayRecord, punchOutTime: time, punchOutLocation: locName });
    } catch (err) {
      toast.error('Failed to punch out');
    } finally {
      setLoading(false);
    }
  };

  if (isCheckedOut) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-6 border border-emerald-400/20 bg-emerald-400/5">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-emerald-400" />
          <div>
            <p className="font-semibold text-text-bright">Shift Completed</p>
            <p className="text-sm text-text-muted">In: {todayRecord.time} | Out: {todayRecord.punchOutTime}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isCheckedIn) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-5 border border-amber-400/20 bg-amber-400/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-text-bright">Active Shift</h3>
            <p className="text-xs text-text-muted mt-0.5 font-mono">Punched In: {todayRecord.time}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-amber-400">{time}</p>
            <p className="text-[10px] text-muted">Geofenced 50m</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-xl bg-border/30">
          <MapPin size={14} className={locationName ? 'text-amber-400' : 'text-muted'} />
          <p className="text-xs text-text-muted flex-1 truncate font-mono">{locationName || 'Location required'}</p>
          <button onClick={handleGetLocation} disabled={locLoading} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors shrink-0">
            {locLoading ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
            {locLoading ? 'Getting...' : 'Capture GPS'}
          </button>
        </div>

        <button onClick={handlePunchOut} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 border-none">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          {loading ? 'Verifying Location...' : 'Punch Out Now'}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><ShieldAlert size={100} /></div>
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h3 className="font-display font-semibold text-text-bright">Punch In</h3>
          <p className="text-xs text-text-muted mt-0.5 font-mono">{date}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-cyan-400">{time}</p>
          <p className="text-[10px] text-emerald-400">Geofencing Active</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 relative z-10">
        {STATUS_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => setSelected(opt.value)} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${selected === opt.value ? `${colorMap[opt.color]} ring-1` : 'border-border/60 hover:border-border-bright/60 text-text-muted hover:text-text-dim'}`}>
            <opt.icon size={20} />
            <span className="text-xs font-semibold">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl bg-border/30 relative z-10">
        <MapPin size={14} className={locationName ? 'text-emerald-400' : 'text-muted'} />
        <p className="text-xs text-text-muted flex-1 truncate font-mono">{locationName || 'GPS Location required'}</p>
        <button onClick={handleGetLocation} disabled={locLoading} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors shrink-0">
          {locLoading ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
          {locLoading ? 'Getting...' : 'Capture GPS'}
        </button>
      </div>

      <button onClick={handlePunchIn} disabled={loading || !selected} className="btn-primary w-full flex items-center justify-center gap-2 relative z-10">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
        {loading ? 'Verifying Location...' : 'Confirm Punch In'}
      </button>
    </motion.div>
  );
}