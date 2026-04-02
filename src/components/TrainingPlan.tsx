import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronRight, TrendingUp, RefreshCw, CheckCircle2, Bell, Download, AlertCircle, Check } from 'lucide-react';
import { format, differenceInDays, startOfToday, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { getPlans, getLogs, getCalendarSync, saveCalendarSync } from '../lib/localStore';

interface TrainingPlanProps {
  user: any;
  profile: any;
}

export default function TrainingPlan({ user, profile }: TrainingPlanProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncErrorMsg, setSyncErrorMsg] = useState("");
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const departureDate = profile?.departureDate ? parseISO(profile.departureDate) : new Date(2026, 3, 30);
  const today = startOfToday();
  const daysRemaining = differenceInDays(departureDate, today);
  
  useEffect(() => {
    const plans = getPlans();
    if (plans.length > 0) {
      setPlan(plans[plans.length - 1]);
    }
    setLogs(getLogs());

    const savedSync = getCalendarSync();
    if (savedSync?.connected) {
      setIsCalendarConnected(true);
      setLastSyncTime(savedSync.lastSyncTime);
    }
  }, []);

  const schedule = plan?.schedule || [];

  const handleGoogleSync = async () => {
    setSyncing(true);
    setSyncStatus('idle');
    try {
      const authResponse = await fetch('/api/auth/calendar/url');
      if (!authResponse.ok) throw new Error("Failed to get authorization URL");
      
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
            setSyncStatus('success');
            setIsCalendarConnected(true);
            const syncTime = new Date().toISOString();
            setLastSyncTime(syncTime);
            saveCalendarSync({ connected: true, lastSyncTime: syncTime });
            
            setTimeout(() => setSyncStatus('idle'), 5000);
          } else {
            const errorData = await syncResponse.json();
            setSyncStatus('error');
            setSyncErrorMsg(errorData.error || "Could not sync calendar.");
          }
        }
      };
      
      window.addEventListener('message', handleMessage);

      // Timeout for popup
      setTimeout(() => {
        if (syncing && syncStatus === 'idle') {
          setSyncing(false);
          setSyncStatus('error');
          setSyncErrorMsg('Authentication timed out. Please try again.');
          window.removeEventListener('message', handleMessage);
        }
      }, 60000);

    } catch (error: any) {
      setSyncStatus('error');
      setSyncErrorMsg(error.message || "Cannot reach sync server.");
    } finally {
      setTimeout(() => setSyncing(false), 1000);
    }
  };

  const handleDisconnect = () => {
    setIsCalendarConnected(false);
    setLastSyncTime(null);
    saveCalendarSync({ connected: false, lastSyncTime: null });
  };

  const downloadICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Camino Pilgrim App//EN\n";
    schedule.forEach((d: any) => {
      if (d.targetDistance >= 1) {
        const dtStart = d.date.replace(/-/g, '') + "T090000Z";
        const dtEnd = d.date.replace(/-/g, '') + "T110000Z";
        icsContent += `BEGIN:VEVENT\nUID:${crypto.randomUUID()}@caminopilgrim.app\nDTSTAMP:${dtStart}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nSUMMARY:Camino Training: ${d.targetDistance.toFixed(1)}mi Walk\nEND:VEVENT\n`;
      }
    });
    icsContent += "END:VCALENDAR";
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'camino_training.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Smart Reminders Logic
  useEffect(() => {
    if (!("Notification" in window)) return;

    if (Notification.permission === 'granted') {
      setRemindersEnabled(true);
    }

    const checkReminders = () => {
      const now = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayWalk = schedule.find((d: any) => d.date === todayStr);
      
      if (todayWalk) {
        const walkStartTime = new Date(todayStr + "T09:00:00");

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
        className="bg-[#5A5A40] text-white rounded-[40px] p-8 md:p-10 shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-white/60 uppercase tracking-widest font-bold text-sm">
              <Calendar size={16} /> Countdown to Camino
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isCalendarConnected ? (
                <>
                  <button 
                    onClick={handleGoogleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Connect Google Cal
                  </button>
                  <button 
                    onClick={downloadICS}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    <Download size={14} /> Apple Calendar (.ics)
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-green-500/20 text-green-300">
                    <Check size={14} /> Connected
                  </div>
                  <button 
                    onClick={handleGoogleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Sync Next 7 Days
                  </button>
                  <button 
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 text-white/50 hover:text-white px-2 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sync Status Feedback */}
          <AnimatePresence>
            {syncStatus === 'success' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-green-500/20 text-green-50 rounded-2xl flex items-center gap-3 border border-green-500/30">
                <CheckCircle2 size={24} className="text-green-400" />
                <div>
                  <h4 className="font-bold">Events added successfully!</h4>
                  <p className="text-sm opacity-80">Training calendar has been synchronized.</p>
                </div>
              </motion.div>
            )}
            
            {syncStatus === 'error' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-red-500/20 text-red-100 rounded-2xl flex items-start gap-3 border border-red-500/30">
                <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
                <div>
                  <h4 className="font-bold">Sync Error</h4>
                  <p className="text-sm opacity-90">{syncErrorMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

      {/* 30-Day Schedule (Suggested vs Accomplished) */}
      <div className="space-y-6">
        <div className="flex justify-between items-end px-2">
          <div>
            <h3 className="text-2xl font-bold text-[#5A5A40]">Training Logbook</h3>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-1">Suggested vs Accomplished</p>
          </div>
          <TrendingUp className="text-[#5A5A40]/30" size={32} />
        </div>

        <div className="space-y-3">
          {schedule.slice(0, 14).map((day: any, i: number) => {
            const dayDate = parseISO(day.date);
            const isRest = day.targetDistance < 1;
            
            // Accomplished model matching logic
            const dayLogs = logs.filter(l => l.date === day.date);
            const totalDistanceAccomplished = dayLogs.reduce((sum, l) => sum + (l.distance || 0), 0);
            const hasWalked = totalDistanceAccomplished > 0;
            const completedTarget = hasWalked && totalDistanceAccomplished >= (day.targetDistance * 0.9);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "group flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl border transition-all gap-4",
                  isRest && !hasWalked
                    ? "bg-gray-50 border-transparent opacity-70" 
                    : hasWalked 
                      ? "bg-[#5A5A40]/5 border-[#5A5A40]/20" 
                      : "bg-white border-[#5A5A40]/10 hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-6">
                  {hasWalked && !isRest ? (
                     <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20 shrink-0">
                       <CheckCircle2 size={32} />
                     </div>
                  ) : (
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0",
                      isRest ? "bg-gray-200 text-gray-500" : "bg-[#5A5A40] text-white shadow-lg"
                    )}>
                      <span className="text-xs uppercase leading-none mb-1 opacity-80">{format(dayDate, 'EEE')}</span>
                      <span className="text-xl leading-none">{format(dayDate, 'd')}</span>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-lg font-bold text-[#1a1a1a]">
                      {isRest ? "Rest Day" : `Target Walk`}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-400 font-medium uppercase tracking-widest mt-1">
                      {isRest ? (
                        <span>Suggested: Active stretching</span>
                      ) : (
                        <span>Suggested: <strong className="text-gray-600">{day.targetDistance.toFixed(1)} mi</strong></span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Accomplished Tag */}
                <div className="md:border-l md:border-gray-200 md:pl-6 flex items-center gap-4">
                  {hasWalked ? (
                    <div className="text-right">
                      <span className="block text-xs uppercase tracking-widest text-[#5A5A40] font-bold mb-1">Accomplished</span>
                      <span className={cn(
                        "text-xl font-bold rounded-lg px-3 py-1 bg-white border inline-block",
                        completedTarget ? "text-green-600 border-green-200" : "text-[#5A5A40] border-[#5A5A40]/20"
                      )}>
                        {totalDistanceAccomplished.toFixed(1)} mi
                      </span>
                    </div>
                  ) : (
                    <div className="text-left w-full md:text-right hidden md:block">
                       <span className="px-4 py-2 rounded-full border border-dashed border-gray-300 text-gray-400 text-xs font-bold uppercase tracking-widest">
                         Pending Log
                       </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
