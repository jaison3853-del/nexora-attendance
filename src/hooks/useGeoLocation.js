// src/hooks/useGeoLocation.js
import { useState, useCallback } from 'react';

export const useGeoLocation = () => {
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      setLocLoading(true);
      setLocError(null);

      if (!navigator.geolocation) {
        setLocError('Geolocation not supported');
        setLocLoading(false);
        reject('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ latitude, longitude });

          // Reverse geocode
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await res.json();
            const name = data.display_name?.split(',').slice(0, 3).join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocationName(name);
            setLocLoading(false);
            resolve({ latitude, longitude, locationName: name });
          } catch {
            const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocationName(fallback);
            setLocLoading(false);
            resolve({ latitude, longitude, locationName: fallback });
          }
        },
        (err) => {
          setLocError(err.message);
          setLocLoading(false);
          reject(err.message);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }, []);

  return { location, locationName, locLoading, locError, getLocation };
};
