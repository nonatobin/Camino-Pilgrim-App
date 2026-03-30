import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Phone, Users, MapPin, CheckCircle2, X } from 'lucide-react';
// Emergency alerts stored locally for beta

interface EmergencyOverlayProps {
  user: any;
  location: { lat: number; lng: number } | null;
  onClose: () => void;
}

export default function EmergencyOverlay({ user, location, onClose }: EmergencyOverlayProps) {
  const [alertSent, setAlertSent] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isAutoAlerting, setIsAutoAlerting] = useState(true);

  useEffect(() => {
    if (countdown > 0 && isAutoAlerting) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isAutoAlerting) {
      handleAlertFamily();
    }
  }, [countdown, isAutoAlerting]);

  const handleAlertFamily = async () => {
    setIsAutoAlerting(false);
    try {
      const alerts = JSON.parse(localStorage.getItem('camino_alerts') || '[]');
      alerts.push({
        userName: user.displayName || 'Pilgrim',
        text: `EMERGENCY: Fall detected at ${location ? `${location.lat}, ${location.lng}` : 'unknown location'}.`,
        type: 'emergency',
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('camino_alerts', JSON.stringify(alerts));
      setAlertSent(true);
    } catch (e) {
      console.error('Failed to send emergency alert', e);
    }
  };

  const handleCallEmergency = () => {
    window.location.href = 'tel:911'; // In a real app, this would call local emergency services
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-red-600 flex items-center justify-center p-6 text-white"
    >
      <div className="max-w-md w-full space-y-10 text-center">
        <div className="space-y-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-32 h-32 bg-white/20 rounded-full mx-auto flex items-center justify-center"
          >
            <ShieldAlert size={64} className="text-white" />
          </motion.div>
          <h2 className="text-5xl font-bold font-serif leading-tight">Fall Detected</h2>
          <p className="text-2xl text-white/80 italic">We've detected a sudden impact. Are you okay?</p>
        </div>

        <div className="space-y-4">
          {!alertSent ? (
            <>
              <button
                onClick={handleCallEmergency}
                className="w-full py-8 bg-white text-red-600 rounded-full text-3xl font-bold flex items-center justify-center gap-4 shadow-2xl active:scale-[0.98] transition-all"
              >
                <Phone size={32} fill="currentColor" />
                Call Emergency
              </button>
              
              <button
                onClick={handleAlertFamily}
                className="w-full py-8 bg-white/20 text-white rounded-full text-3xl font-bold flex items-center justify-center gap-4 hover:bg-white/30 active:scale-[0.98] transition-all"
              >
                <Users size={32} />
                Alert Family
              </button>

              {isAutoAlerting && (
                <p className="text-xl font-bold uppercase tracking-widest text-white/60">
                  Auto-alerting family in {countdown}s...
                </p>
              )}
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/20 p-10 rounded-[48px] space-y-6"
            >
              <CheckCircle2 size={64} className="mx-auto text-white" />
              <div className="space-y-2">
                <h3 className="text-3xl font-bold">Alert Sent</h3>
                <p className="text-xl text-white/80">Your family and the leaderboard have been notified of your location.</p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 text-white/60 font-bold uppercase tracking-widest text-sm">
          <MapPin size={20} />
          {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Locating...'}
        </div>

        <button
          onClick={onClose}
          className="px-10 py-4 bg-white/10 hover:bg-white/20 rounded-full text-xl font-bold transition-all flex items-center justify-center gap-2 mx-auto"
        >
          <X size={24} /> I'm Okay
        </button>
      </div>

      {/* Background Pulse */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-white/5 rounded-full animate-pulse" />
      </div>
    </motion.div>
  );
}
