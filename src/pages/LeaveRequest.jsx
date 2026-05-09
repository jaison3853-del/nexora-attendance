import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LeaveRequest = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'Sick Leave'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'leaves'), {
        ...formData,
        userId: user.uid,
        userName: user.displayName || 'Staff',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('ലീവ് അപേക്ഷ സമർപ്പിച്ചു!');
      setFormData({ startDate: '', endDate: '', reason: '', type: 'Sick Leave' });
    } catch (error) {
      toast.error('അപേക്ഷിക്കുന്നതിൽ പിശക് സംഭവിച്ചു');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-slate-800 rounded-xl shadow-md mt-10">
      <h2 className="text-2xl font-bold text-white mb-6">Apply for Leave</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300">Leave Type</label>
          <select 
            className="w-full p-2 rounded bg-slate-700 text-white border border-slate-600"
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option>Sick Leave</option>
            <option>Casual Leave</option>
            <option>Other</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300">Start Date</label>
            <input type="date" required className="w-full p-2 rounded bg-slate-700 text-white" 
              onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-gray-300">End Date</label>
            <input type="date" required className="w-full p-2 rounded bg-slate-700 text-white" 
              onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-gray-300">Reason</label>
          <textarea required className="w-full p-2 rounded bg-slate-700 text-white" rows="3"
            onChange={(e) => setFormData({...formData, reason: e.target.value})}></textarea>
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">
          Submit Request
        </button>
      </form>
    </div>
  );
};

export default LeaveRequest;