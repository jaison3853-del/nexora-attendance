// src/pages/AttendanceHistory.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Calendar, Clock, Filter, Search } from 'lucide-react';
import AttendanceTable from '../components/attendance/AttendanceTable';
import Loader from '../components/ui/Loader';

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    if (!user?.uid) return;

    // ലോഗിൻ ചെയ്ത സ്റ്റാഫിന്റെ അറ്റൻഡൻസ് മാത്രം എടുക്കുന്നു
    const q = query(
      collection(db, 'attendance'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // മാനുവൽ ആയി ഡേറ്റ് അനുസരിച്ച് സോർട്ട് ചെയ്യുന്നു (Index എറർ ഒഴിവാക്കാൻ)
      const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setRecords(sortedData);
      setFiltered(sortedData);
      setLoading(false);
    }, (error) => {
      console.error("History Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  // ഫിൽട്ടർ ലോജിക്
  useEffect(() => {
    if (filterDate) {
      setFiltered(records.filter(r => r.date === filterDate));
    } else {
      setFiltered(records);
    }
  }, [filterDate, records]);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-bright flex items-center gap-2">
            <Calendar className="text-cyan-400" size={24} />
            My Attendance History
          </h1>
          <p className="text-sm text-text-muted mt-1">Check your past attendance records</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="input-field pl-9 w-full"
            />
          </div>
          {filterDate && (
            <button 
              onClick={() => setFilterDate('')}
              className="text-xs text-cyan-400 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5 overflow-x-auto"
      >
        {filtered.length > 0 ? (
          <AttendanceTable records={filtered} />
        ) : (
          <div className="text-center py-20 text-text-muted">
            <Clock size={40} className="mx-auto mb-3 opacity-20" />
            <p>No records found for this period.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}