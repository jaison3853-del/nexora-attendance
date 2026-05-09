// src/services/attendanceService.js
import {
  collection, addDoc, query, where, orderBy, getDocs,
  onSnapshot, serverTimestamp, doc, getDoc, limit, startAfter,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';

export const markAttendance = async ({ uid, name, status, latitude, longitude, locationName }) => {
  const now = new Date();
  const date = format(now, 'yyyy-MM-dd');
  const time = format(now, 'HH:mm:ss');

  // Check if already marked today
  const existing = await getTodayAttendance(uid, date);
  if (existing) throw new Error('Attendance already marked for today');

  const docRef = await addDoc(collection(db, 'attendance'), {
    uid,
    name,
    status,
    date,
    time,
    timestamp: now.toISOString(),
    latitude: latitude || null,
    longitude: longitude || null,
    locationName: locationName || 'Unknown',
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, uid, name, status, date, time, latitude, longitude, locationName };
};

export const getTodayAttendance = async (uid, date) => {
  const q = query(
    collection(db, 'attendance'),
    where('uid', '==', uid),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const getUserAttendance = async (uid, filters = {}) => {
  let q = query(
    collection(db, 'attendance'),
    where('uid', '==', uid),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filters.date) records = records.filter(r => r.date === filters.date);
  if (filters.status) records = records.filter(r => r.status === filters.status);
  if (filters.month) records = records.filter(r => r.date?.startsWith(filters.month));

  return records;
};

export const getAllAttendance = async (filters = {}) => {
  let q = query(collection(db, 'attendance'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filters.uid) records = records.filter(r => r.uid === filters.uid);
  if (filters.date) records = records.filter(r => r.date === filters.date);
  if (filters.status) records = records.filter(r => r.status === filters.status);
  if (filters.month) records = records.filter(r => r.date?.startsWith(filters.month));

  return records;
};

export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToAttendance = (callback) => {
  const q = query(collection(db, 'attendance'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(records);
  });
};

export const getAttendanceStats = (records) => {
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const late = records.filter(r => r.status === 'late').length;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
  return { total, present, absent, late, percentage };
};
