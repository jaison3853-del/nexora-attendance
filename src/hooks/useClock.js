// src/hooks/useClock.js
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export const useClock = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    date: format(now, 'EEEE, MMMM d, yyyy'),
    time: format(now, 'HH:mm:ss'),
    dateKey: format(now, 'yyyy-MM-dd'),
    raw: now,
  };
};
