import { useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// 🚀 ഇതിൽ നിന്നും todayRecord നമ്മൾ ഒഴിവാക്കി, user മാത്രം മതി
export const useLiveTracking = (user) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    // യൂസർ ലോഗിൻ ചെയ്തിട്ടില്ലെങ്കിൽ ട്രാക്ക് ചെയ്യേണ്ട
    if (!user) return;

    const sendLocationToFirebase = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // പഞ്ച് സ്റ്റാറ്റസ് നോക്കാതെ എപ്പോഴും ലൊക്കേഷൻ സേവ് ചെയ്യുന്നു
            await setDoc(doc(db, 'live_locations', user.uid), {
              uid: user.uid,
              name: user.displayName || user.name || 'Staff Member',
              latitude,
              longitude,
              updatedAt: serverTimestamp(),
              isOnline: true
            }, { merge: true });
            
            console.log("📍 24/7 Location Synced: ", latitude, longitude);
          } catch (error) {
            console.error("Firebase Location Update Failed:", error);
          }
        },
        (error) => console.warn("GPS Error:", error.message),
        // High accuracy enable ചെയ്തു 
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    };

    // ട്രാക്കിംഗ് തുടങ്ങുന്നു (ആദ്യം ഉടനെ ഒന്ന് അപ്‌ഡേറ്റ് ചെയ്യുന്നു)
    sendLocationToFirebase();
    
    // അതിനുശേഷം കൃത്യം ഓരോ 5 മിനിറ്റിലും (300000 ms) ലൊക്കേഷൻ ബാക്ക്ഗ്രൗണ്ടിൽ അപ്‌ഡേറ്റ് ചെയ്യും
    intervalRef.current = setInterval(sendLocationToFirebase, 300000); 

    // ക്ലീൻ അപ്പ് (ആപ്പ് പൂർണ്ണമായും ക്ലോസ് ചെയ്താൽ മാത്രം)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDoc(doc(db, 'live_locations', user.uid), { isOnline: false }, { merge: true }).catch(e => {});
    };
  }, [user]); // user മാറുമ്പോൾ മാത്രം ഇത് വീണ്ടും റൺ ആകും
};