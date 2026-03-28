import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { OperationType } from '../types';
import { handleFirestoreError, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, MapPin, Activity, Clock, TrendingUp, CheckCircle2, ShieldAlert } from 'lucide-react';
import EmergencyOverlay from './EmergencyOverlay';

interface ActiveTrackingProps {
  user: any;
}

export default function ActiveTracking({ user }: ActiveTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [distance, setDistance] = useState(0); // in miles
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [currentPace, setCurrentPace] = useState(0); // in mph
  const [lastPosition, setLastPosition] = useState<GeolocationCoordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);

  const watchId = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fall Detection Logic
  useEffect(() => {
    if (!isTracking) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      const totalAcc = Math.sqrt(
        (acc.x || 0) ** 2 + 
        (acc.y || 0) ** 2 + 
        (acc.z || 0) ** 2
      );

      // Threshold for fall detection (approx 30m/s^2 for sudden impact)
      if (totalAcc > 30 && !fallDetected) {
        setFallDetected(true);
        setShowEmergency(true);
        
        // Vibrate if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isTracking, fallDetected]);

  // Haversine formula to calculate distance between two points in miles
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    // Request motion permissions for iOS
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            console.log('Motion permission granted');
          }
        })
        .catch(console.error);
    }

    setIsTracking(true);
    setStartTime(Date.now());
    setDistance(0);
    setElapsedTime(0);
    setLastPosition(null);
    setFallDetected(false);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        if (lastPosition) {
          const d = calculateDistance(
            lastPosition.latitude,
            lastPosition.longitude,
            position.coords.latitude,
            position.coords.longitude
          );
          // Filter out small jumps/noise
          if (d > 0.001) {
            setDistance(prev => prev + d);
          }
        }
        setLastPosition(position.coords);
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true }
    );

    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopTracking = async () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsTracking(false);
    setLoading(true);

    const pace = distance > 0 ? (distance / (elapsedTime / 3600)) : 0;
    const path = `users/${user.uid}/logs`;

    try {
      await addDoc(collection(db, path), {
        uid: user.uid,
        userName: user.displayName || 'Pilgrim',
        userPhoto: user.photoURL || null,
        date: new Date().toISOString().split('T')[0],
        distance: parseFloat(distance.toFixed(2)),
        speed: parseFloat(pace.toFixed(2)),
        duration: elapsedTime,
        createdAt: serverTimestamp(),
        type: 'automated'
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (elapsedTime > 0 && distance > 0) {
      const pace = distance / (elapsedTime / 3600);
      setCurrentPace(pace);
    }
  }, [elapsedTime, distance]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {showEmergency && (
          <EmergencyOverlay
            user={user}
            location={lastPosition ? { lat: lastPosition.latitude, lng: lastPosition.longitude } : null}
            onClose={() => {
              setShowEmergency(false);
              setFallDetected(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[40px] p-10 shadow-xl border border-[#5A5A40]/5 overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-4xl font-bold text-[#5A5A40] font-serif">Active Training</h2>
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
              <ShieldAlert size={12} /> Fall Detection Active
            </div>
          </div>
          <p className="text-gray-500 italic text-xl mb-10">Passive GPS tracking for your Camino preparation.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-[#f5f5f0] p-8 rounded-[32px] space-y-2">
              <div className="flex items-center gap-2 text-[#5A5A40]/60 uppercase tracking-widest font-bold text-xs">
                <Activity size={16} /> Distance
              </div>
              <div className="text-5xl font-bold text-[#5A5A40]">
                {distance.toFixed(2)} <span className="text-xl font-medium">mi</span>
              </div>
            </div>

            <div className="bg-[#f5f5f0] p-8 rounded-[32px] space-y-2">
              <div className="flex items-center gap-2 text-[#5A5A40]/60 uppercase tracking-widest font-bold text-xs">
                <Clock size={16} /> Time
              </div>
              <div className="text-5xl font-bold text-[#5A5A40]">
                {formatTime(elapsedTime)}
              </div>
            </div>

            <div className="bg-[#f5f5f0] p-8 rounded-[32px] space-y-2">
              <div className="flex items-center gap-2 text-[#5A5A40]/60 uppercase tracking-widest font-bold text-xs">
                <TrendingUp size={16} /> Pace
              </div>
              <div className="text-5xl font-bold text-[#5A5A40]">
                {currentPace.toFixed(1)} <span className="text-xl font-medium">mph</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {!isTracking ? (
              <button
                onClick={startTracking}
                className="w-full py-8 bg-[#5A5A40] text-white rounded-full text-3xl font-bold flex items-center justify-center gap-4 hover:bg-[#4A4A30] active:scale-[0.98] transition-all shadow-2xl"
              >
                <Play size={32} fill="currentColor" />
                Start Walk
              </button>
            ) : (
              <button
                onClick={stopTracking}
                disabled={loading}
                className="w-full py-8 bg-red-600 text-white rounded-full text-3xl font-bold flex items-center justify-center gap-4 hover:bg-red-700 active:scale-[0.98] transition-all shadow-2xl"
              >
                {loading ? (
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Square size={32} fill="currentColor" />
                    Stop & Save
                  </>
                )}
              </button>
            )}

            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 text-green-600 font-bold text-lg"
                >
                  <CheckCircle2 size={24} />
                  Walk saved to Family Leaderboard
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Background Map Placeholder (Visual only for beta) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="w-full h-full bg-[url('https://www.google.com/maps/vt/pb=!1m4!1m3!1i12!2i2048!3i2048!2m3!1e0!2sm!3i397117732!3m8!2sen!3sus!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!1e0')] bg-cover" />
        </div>
      </div>

      {/* Live Map View (Requires API Key) */}
      {(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY && (
        <div className="bg-white rounded-[40px] p-2 shadow-xl border border-[#5A5A40]/5 h-[300px] overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0, borderRadius: '32px' }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/view?key=${(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY}&center=${lastPosition?.latitude || 42.8125},${lastPosition?.longitude || -1.6458}&zoom=15`}
          ></iframe>
        </div>
      )}
    </div>
  );
}
