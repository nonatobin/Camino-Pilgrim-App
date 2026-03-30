import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronRight, MapPin, TrendingUp, RefreshCw, CheckCircle2, Bell } from 'lucide-react';
import { format, addDays, differenceInDays, isSameDay, startOfToday, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { getPlans } from '../lib/localStore';

interface TrainingPlanProps {
  user: any;
  profile: any;
}

export default function TrainingPlan({ user, profile }: TrainingPlanProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const departureDate = profile?.departureDate ? parseISO(profile.departureDate) : new Date(2026, 3, 30);
  const today = startOfToday();
  const daysRemaining = differenceInDays(departureDate, today);
  
  useEffect(() => {
    const plans = getPlans();
    if (plans.length > 0) {
      setPlan(plans[plans.length - 1]);
    }
  }, []);

  const schedule = plan?.schedule || [];

  const handleSync = async () => {
    setSyncing(true);
    try {
      const authResponse = await fetch('/api/auth/calendar/url');
      const { url } = await authResponse.json();
      
      const authWindow = window.open(url, 'calendar_auth', 'width=600,height=700');
      
      const handleMessage = async (event: MessageEvent) => {
        // Validate origin is from AI Studio preview or localhost
        const origin = event.origin;
        if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
          return;
        }

        if (event.data?.type === 'CALENDAR_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          
          const events = schedule.map((d: any) => ({
            summary: `Camino Training: ${d.targetDistance.toFixed(1)}mi Walk`,
            start: `${d.date}T09:00:00Z`,
            end: `${d.date}T11:00:00Z`,
          }));

          const syncResponse = await fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events }),
          });

          if (syncResponse.ok) {
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 3000);
          } else {
            const errorData = await syncResponse.json();
            console.error("Calendar sync failed:", errorData.error);
            alert(`Calendar sync failed: ${errorData.error}`);
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setSyncing(false);
    }
  };

  // Smart Reminders Logic
  useEffect(() => {
    if (!("Notification" in window)) return;

    const checkReminders = () => {
      const now = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayWalk = schedule.find((d: any) => d.date === todayStr);
      
      if (todayWalk) {
        const walkStartTime = new Date(today);
        walkStartTime.setHours(9, 0, 0); // Default 9 AM

        const tenMinsBefore = new Date(walkStartTime.getTime() - 10 * 60 * 1000);
        
        if (now.getTime() >= tenMinsBefore.getTime() && now.getTime() < tenMinsBefore.getTime() + 60000) {
          new Notification("Camino Training", {
            body: `Your ${todayWalk.targetDistance.toFixed(1)}mi walk starts in 10 minutes!`,
            icon: '/favicon.ico'
          });
        }

        if (now.getTime() >= walkStartTime.getTime() && now.getTime() < walkStartTime.getTime() + 60000) {
          new Notification("Camino Training", {
            body: "It's time to start your walk! Press 'Start Walk' in the app.",
            icon: '/favicon.ico'
          });
        }
      }
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [schedule, today]);

  const requestNotifications = () => {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") setRemindersEnabled(true);
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#5A5A40] text-white rounded-[40px] p-10 shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white/60 uppercase tracking-widest font-bold text-sm">
              <Calendar size={16} /> Countdown to Camino
            </div>
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
            >
              {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {syncSuccess ? "Synced!" : "Sync Calendar"}
            </button>
          </div>
          <div className="flex items-end gap-4 mb-8">
            <span className="text-8xl font-bold leading-none">{daysRemaining}</span>
            <span className="text-2xl font-medium mb-2">Days to Departure</span>
          </div>
          
          <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10">
            <div className="space-y-1">
              <span className="text-white/60 text-xs uppercase tracking-widest font-bold">Departure Date</span>
              <p className="text-xl font-serif italic">{format(departureDate, 'MMMM do, yyyy')}</p>
            </div>
            <div className="space-y-1">
              <span className="text-white/60 text-xs uppercase tracking-widest font-bold">Target Pace</span>
              <p className="text-xl font-serif italic">3.0 MPH</p>
            </div>
          </div>
        </div>
        
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      </motion.div>

      {/* Smart Reminders Toggle */}
      {!remindersEnabled && (
        <button 
          onClick={requestNotifications}
          className="w-full bg-white p-6 rounded-[32px] border border-[#5A5A40]/10 flex items-center justify-between hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#5A5A40]/5 rounded-2xl flex items-center justify-center text-[#5A5A40]">
              <Bell size={24} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-[#1a1a1a]">Enable Smart Reminders</h4>
              <p className="text-sm text-gray-400">Get notified 10 minutes before your walk.</p>
            </div>
          </div>
          <ChevronRight className="text-gray-300" size={20} />
        </button>
      )}

      {/* 30-Day Schedule */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-2xl font-bold text-[#5A5A40]">Your Personalized Training Schedule</h3>
          <TrendingUp className="text-[#5A5A40]/30" size={24} />
        </div>

        <div className="space-y-3">
          {schedule.slice(0, 14).map((day: any, i: number) => {
            const dayDate = parseISO(day.date);
            const isRest = day.targetDistance < 1;
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "group flex items-center justify-between p-6 rounded-3xl border transition-all cursor-pointer",
                  isRest 
                    ? "bg-gray-100 border-transparent opacity-60" 
                    : "bg-white border-[#5A5A40]/5 hover:border-[#5A5A40]/20 hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold",
                    isRest ? "bg-gray-200 text-gray-500" : "bg-[#f5f5f0] text-[#5A5A40]"
                  )}>
                    <span className="text-xs uppercase leading-none mb-1">{format(dayDate, 'EEE')}</span>
                    <span className="text-xl leading-none">{format(dayDate, 'd')}</span>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-bold text-[#1a1a1a]">
                      {isRest ? "Rest & Recovery" : `${day.targetDistance.toFixed(1)} mi Walk`}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-400 font-medium uppercase tracking-widest">
                      <span>{isRest ? "Active stretching" : `Start: 09:00 AM`}</span>
                      {!isRest && <span className="w-1 h-1 bg-gray-300 rounded-full" />}
                      {!isRest && <span>Progressive Load</span>}
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="text-gray-300 group-hover:text-[#5A5A40] transition-colors" size={20} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
