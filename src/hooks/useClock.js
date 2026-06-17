import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export const useClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return {
    rawTime: time,
    date: format(time, 'dd MMM yyyy'), // ഉദാഹരണത്തിന്: 04 Jun 2026
    dateKey: format(time, 'yyyy-MM-dd'),
    
    // 🚀 ഇവിടെയാണ് നമ്മൾ മാറ്റം വരുത്തിയത് (HH മാറി hh ആയി, കൂടെ a ഉം വന്നു)
    time: format(time, 'hh:mm:ss a') 
  };
};