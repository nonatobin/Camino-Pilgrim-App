import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Wind,
  Eye,
  CheckCircle2,
  Heart,
  Coffee,
  Sparkles,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────
const WORK_DURATION = 30 * 60;      // 30 minutes in seconds
const BREAK_DURATION = 5 * 60;      // 5 minutes in seconds
const BREATHING_DURATION = 60;       // 1-minute guided breathing
const BREATHING_CYCLE_S = 12;        // 4s in, 4s hold, 4s out

// Encouraging messages — NEVER critical or punitive
const BREAK_MESSAGES = [
  "You've earned this rest. Your body will thank you.",
  "Great work. Time to give your eyes and back some love.",
  "30 minutes of focus — wonderful. Stretch it out.",
  "Your dedication is inspiring. Take a well-deserved pause.",
  "Halfway to the Camino, one focus session at a time.",
  "Rest is part of the journey. Enjoy these 5 minutes.",
];

const WORK_MESSAGES = [
  "Refreshed and ready. Let's keep going.",
  "Back at it — you've got this.",
  "Feeling good? Time for another productive session.",
  "Your commitment is amazing. Here we go.",
];

const BREATHING_PROMPTS = [
  "Breathe in deeply through your nose...",
  "Hold gently... feel the calm...",
  "Slowly breathe out through your mouth...",
];

function getRandomMessage(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Types ───────────────────────────────────────────────────────────────
type TimerMode = 'work' | 'break' | 'breathing';

interface SessionStats {
  completedSessions: number;
  totalFocusMinutes: number;
  breathingExercises: number;
  lastSessionDate: string;
}

function loadStats(): SessionStats {
  try {
    const raw = localStorage.getItem('camino_pomodoro_stats');
    return raw ? JSON.parse(raw) : {
      completedSessions: 0,
      totalFocusMinutes: 0,
      breathingExercises: 0,
      lastSessionDate: '',
    };
  } catch {
    return {
      completedSessions: 0,
      totalFocusMinutes: 0,
      breathingExercises: 0,
      lastSessionDate: '',
    };
  }
}

function saveStats(stats: SessionStats) {
  localStorage.setItem('camino_pomodoro_stats', JSON.stringify(stats));
}

// ─── Component ───────────────────────────────────────────────────────────
export default function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<SessionStats>(loadStats);
  const [motivationMsg, setMotivationMsg] = useState('');
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [breathCounter, setBreathCounter] = useState(0);
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // ─── Timer Logic ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode]);

  // ─── Breathing Exercise Timer ────────────────────────────────────────
  useEffect(() => {
    if (!showBreathing) return;

    const breathInterval = setInterval(() => {
      setBreathCounter((prev: number) => {
        const next = prev + 1;
        const phase = next % BREATHING_CYCLE_S;
        if (phase < 4) setBreathPhase('in');
        else if (phase < 8) setBreathPhase('hold');
        else setBreathPhase('out');

        // End after BREATHING_DURATION seconds
        if (next >= BREATHING_DURATION) {
          setShowBreathing(false);
          setBreathCounter(0);

          const updated = {
            ...stats,
            breathingExercises: stats.breathingExercises + 1,
            lastSessionDate: new Date().toISOString().split('T')[0],
          };
          setStats(updated);
          saveStats(updated);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(breathInterval);
  }, [showBreathing, stats]);

  // ─── Play a gentle chime ─────────────────────────────────────────────
  const playChime = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    } catch {
      // Audio not available — that's fine
    }
  }, []);

  // ─── Timer Complete Handler ──────────────────────────────────────────
  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    playChime();

    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300]);
    }

    if (mode === 'work') {
      // Completed a work session
      const updated = {
        ...stats,
        completedSessions: stats.completedSessions + 1,
        totalFocusMinutes: stats.totalFocusMinutes + 30,
        lastSessionDate: new Date().toISOString().split('T')[0],
      };
      setStats(updated);
      saveStats(updated);

      setMotivationMsg(getRandomMessage(BREAK_MESSAGES));
      setShowCompleteBanner(true);
      setTimeout(() => setShowCompleteBanner(false), 4000);

      // Auto-switch to break
      setMode('break');
      setTimeLeft(BREAK_DURATION);
    } else if (mode === 'break') {
      setMotivationMsg(getRandomMessage(WORK_MESSAGES));
      setShowCompleteBanner(true);
      setTimeout(() => setShowCompleteBanner(false), 4000);

      // Auto-switch to work
      setMode('work');
      setTimeLeft(WORK_DURATION);
    }
  }, [mode, stats, playChime]);

  // ─── Controls ────────────────────────────────────────────────────────
  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode('work');
    setTimeLeft(WORK_DURATION);
    setMotivationMsg('');
  };

  const startBreathing = () => {
    setShowBreathing(true);
    setBreathCounter(0);
    setBreathPhase('in');
  };

  // ─── Formatting ──────────────────────────────────────────────────────
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalDuration = mode === 'work' ? WORK_DURATION : BREAK_DURATION;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  const breathingProgress = showBreathing
    ? (breathCounter / BREATHING_DURATION) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* ─── Session Complete Banner ──────────────────────────────────── */}
      <AnimatePresence>
        {showCompleteBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 border border-green-200 rounded-3xl p-6 flex items-center gap-4"
          >
            <CheckCircle2 className="text-green-600 shrink-0" size={28} />
            <p className="text-green-800 text-lg font-serif italic">{motivationMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Timer Card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-[40px] p-10 shadow-xl border border-[#5A5A40]/5 relative overflow-hidden">
        {/* Mode indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              mode === 'work' ? "bg-[#5A5A40]/10 text-[#5A5A40]" : "bg-amber-50 text-amber-600"
            )}>
              {mode === 'work' ? <Timer size={24} /> : <Coffee size={24} />}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-[#5A5A40] font-serif">
                {mode === 'work' ? 'Focus Time' : 'Break Time'}
              </h2>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">
                {mode === 'work' ? '30-minute session' : '5-minute rest'}
              </p>
            </div>
          </div>

          {/* Session counter badge */}
          <div className="bg-[#f5f5f0] px-4 py-2 rounded-full">
            <span className="text-sm font-bold text-[#5A5A40]">
              Session {stats.completedSessions + (mode === 'work' ? 1 : 0)}
            </span>
          </div>
        </div>

        {/* Progress ring */}
        <div className="flex justify-center my-10">
          <div className="relative w-64 h-64">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="#f5f5f0"
                strokeWidth="8"
              />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={mode === 'work' ? '#5A5A40' : '#d97706'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-7xl font-bold text-[#5A5A40] tabular-nums leading-none">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-2">
                {isRunning ? 'running' : 'paused'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <button
            onClick={toggleTimer}
            className={cn(
              "flex-1 py-7 rounded-full text-2xl font-bold flex items-center justify-center gap-4 transition-all shadow-xl active:scale-[0.98]",
              isRunning
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : mode === 'work'
                  ? "bg-[#5A5A40] text-white hover:bg-[#4A4A30]"
                  : "bg-amber-500 text-white hover:bg-amber-600"
            )}
          >
            {isRunning ? (
              <><Pause size={28} fill="currentColor" /> Pause</>
            ) : (
              <><Play size={28} fill="currentColor" /> {timeLeft === totalDuration ? 'Start' : 'Resume'}</>
            )}
          </button>

          <button
            onClick={resetTimer}
            className="w-20 h-20 rounded-full bg-[#f5f5f0] text-[#5A5A40] flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95"
            aria-label="Reset timer"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        {/* Break activity suggestions (only during break) */}
        <AnimatePresence>
          {mode === 'break' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 space-y-4"
            >
              <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">
                Break activities
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={startBreathing}
                  className="flex items-center gap-3 bg-blue-50 text-blue-700 p-5 rounded-3xl hover:bg-blue-100 transition-all active:scale-[0.98]"
                >
                  <Wind size={22} />
                  <span className="font-bold text-lg">Breathing</span>
                </button>
                <div className="flex items-center gap-3 bg-green-50 text-green-700 p-5 rounded-3xl">
                  <Sparkles size={22} />
                  <span className="font-bold text-lg">Stretch Back</span>
                </div>
                <div className="flex items-center gap-3 bg-purple-50 text-purple-700 p-5 rounded-3xl">
                  <Eye size={22} />
                  <span className="font-bold text-lg">Rest Eyes</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Background decorative element */}
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#5A5A40]/[0.02] rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ─── Breathing Exercise Overlay ───────────────────────────────── */}
      <AnimatePresence>
        {showBreathing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#f5f5f0]/95 z-50 flex items-center justify-center p-6"
          >
            <div className="max-w-lg w-full text-center space-y-10">
              {/* Breathing circle animation */}
              <motion.div
                animate={{
                  scale: breathPhase === 'in' ? 1.4 : breathPhase === 'hold' ? 1.4 : 1,
                }}
                transition={{ duration: 4, ease: 'easeInOut' }}
                className="mx-auto w-48 h-48 rounded-full bg-gradient-to-br from-blue-200 to-blue-400 flex items-center justify-center shadow-2xl"
              >
                <Heart className="text-white" size={48} />
              </motion.div>

              {/* Phase text */}
              <div>
                <h3 className="text-4xl font-bold text-[#5A5A40] font-serif mb-3">
                  {breathPhase === 'in' && 'Breathe In'}
                  {breathPhase === 'hold' && 'Hold'}
                  {breathPhase === 'out' && 'Breathe Out'}
                </h3>
                <p className="text-xl text-gray-500 font-serif italic">
                  {BREATHING_PROMPTS[breathPhase === 'in' ? 0 : breathPhase === 'hold' ? 1 : 2]}
                </p>
              </div>

              {/* Progress */}
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${breathingProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-sm text-gray-400 font-medium">
                  {Math.ceil((BREATHING_DURATION - breathCounter) / 1)} seconds remaining
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => {
                  setShowBreathing(false);
                  setBreathCounter(0);
                }}
                className="px-8 py-4 rounded-full bg-white text-[#5A5A40] font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                End Early
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Quick Breathing Button (available during work too) ────────── */}
      {!showBreathing && mode === 'work' && (
        <button
          onClick={startBreathing}
          className="w-full bg-white p-6 rounded-[32px] border border-[#5A5A40]/10 flex items-center justify-between hover:bg-gray-50 transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Wind size={26} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-[#1a1a1a] text-lg">Quick Breathing Exercise</h4>
              <p className="text-sm text-gray-400">
                1-minute guided breathing — 4s in, 4s hold, 4s out
              </p>
            </div>
          </div>
          <span className="text-[#5A5A40] font-bold text-sm uppercase tracking-widest">Start</span>
        </button>
      )}

      {/* ─── Stats Card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#5A5A40]/5">
        <h3 className="text-xl font-bold text-[#5A5A40] mb-6">Your Focus Journey</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-[#5A5A40]">{stats.completedSessions}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Sessions</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-[#5A5A40]">{stats.totalFocusMinutes}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Focus Mins</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-[#5A5A40]">{stats.breathingExercises}</div>
            <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Breaths</div>
          </div>
        </div>
      </div>
    </div>
  );
}
