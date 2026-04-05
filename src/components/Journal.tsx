import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Plus,
  X,
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Sparkles,
  CalendarDays,
  Trash2,
  Eye,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { cn } from '../lib/utils';
import CameraVision from './CameraVision';

// ─── Types ──────────────────────────────────────────────────────────────────
interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: string;
  photoDataUrl?: string;
  visionResult?: string;
  location?: string;
}

// ─── Storage ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'camino_journal';

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// ─── Constants ──────────────────────────────────────────────────────────────
const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '🙏', label: 'Grateful' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '😌', label: 'Peaceful' },
  { emoji: '🥾', label: 'Adventurous' },
  { emoji: '😓', label: 'Tired' },
  { emoji: '🤕', label: 'Sore' },
  { emoji: '🌧️', label: 'Reflective' },
];

function formatEntryDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>(loadEntries);
  const [showComposer, setShowComposer] = useState(false);
  const [showVision, setShowVision] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

  // Composer state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState('😊');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [visionResult, setVisionResult] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  const resetComposer = () => {
    setTitle('');
    setBody('');
    setMood('😊');
    setPhotoDataUrl(null);
    setVisionResult(null);
    setShowComposer(false);
  };

  const handleSave = () => {
    if (!body.trim() && !title.trim()) return;

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      title: title.trim() || `${mood} ${formatEntryDate(new Date().toISOString().split('T')[0])}`,
      body: body.trim(),
      mood,
      photoDataUrl: photoDataUrl || undefined,
      visionResult: visionResult || undefined,
    };

    setEntries(prev => [entry, ...prev]);
    resetComposer();
  };

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    setViewingEntry(null);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      // Resize to max 800px for localStorage efficiency
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = (h / w) * maxDim;
            w = maxDim;
          } else {
            w = (w / h) * maxDim;
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        setPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleVisionResult = (result: string, imageUrl: string) => {
    setVisionResult(result);
    setPhotoDataUrl(imageUrl);
    setShowVision(false);
  };

  // Group entries by date
  const groupedEntries = entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
    const key = entry.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  // Mood summary for current month
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthEntries = entries.filter(e => e.date.startsWith(thisMonth));
  const moodCounts = monthEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.mood] = (acc[e.mood] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* Camera Vision Overlay */}
      <AnimatePresence>
        {showVision && (
          <CameraVision
            onResult={handleVisionResult}
            onClose={() => setShowVision(false)}
          />
        )}
      </AnimatePresence>

      {/* Entry Detail Overlay */}
      <AnimatePresence>
        {viewingEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setViewingEntry(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{viewingEntry.mood}</span>
                  <div>
                    <h3 className="text-xl font-bold text-[#5A5A40]">{viewingEntry.title}</h3>
                    <p className="text-sm text-gray-400">{formatEntryDate(viewingEntry.date)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingEntry(null)}
                  className="p-2 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              {viewingEntry.photoDataUrl && (
                <img
                  src={viewingEntry.photoDataUrl}
                  alt="Journal photo"
                  className="w-full rounded-2xl mb-6 object-cover max-h-64"
                />
              )}

              <p className="text-[#3A3A2A] leading-relaxed whitespace-pre-wrap">{viewingEntry.body}</p>

              {viewingEntry.visionResult && (
                <div className="mt-6 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-purple-600" />
                    <span className="text-xs font-bold text-purple-700 uppercase tracking-widest">AI Vision</span>
                  </div>
                  <p className="text-sm text-purple-800">{viewingEntry.visionResult}</p>
                </div>
              )}

              <button
                onClick={() => handleDelete(viewingEntry.id)}
                className="mt-8 w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
              >
                <Trash2 size={16} />
                Delete Entry
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#5A5A40] text-white rounded-[40px] p-8 md:p-10 shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/60 uppercase tracking-widest font-bold text-sm mb-4">
            <BookOpen size={16} /> Pilgrim Journal
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-4 font-serif">Your Story</h2>
          <p className="text-xl font-serif italic mb-8 max-w-lg opacity-90 leading-snug">
            Every step tells a story. Capture your journey — the highs, the blisters, and everything between.
          </p>

          <div className="flex items-end gap-3">
            <span className="text-6xl md:text-8xl font-bold leading-none">{entries.length}</span>
            <span className="text-xl md:text-2xl font-medium mb-1 md:mb-2">
              {entries.length === 1 ? 'Entry' : 'Entries'}
            </span>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </motion.div>

      {/* Mood Summary (if entries exist) */}
      {monthEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[32px] p-6 shadow-sm border border-[#5A5A40]/5"
        >
          <h4 className="text-sm font-bold text-[#5A5A40] uppercase tracking-widest mb-4">
            This Month's Moods
          </h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(moodCounts)
              .sort((a, b) => Number(b[1]) - Number(a[1]))
              .map(([emoji, count]) => (
                <div
                  key={emoji}
                  className="flex items-center gap-2 bg-[#f5f5f0] px-4 py-2 rounded-full"
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-sm font-bold text-[#5A5A40]">×{count}</span>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setShowComposer(true)}
          className="bg-[#5A5A40] text-white py-6 rounded-[24px] text-lg font-bold flex items-center justify-center gap-3 hover:bg-[#4A4A30] active:scale-[0.98] transition-all shadow-xl"
        >
          <Plus size={24} />
          New Entry
        </button>
        <button
          onClick={() => setShowVision(true)}
          className="bg-white text-[#5A5A40] border-2 border-[#5A5A40]/20 py-6 rounded-[24px] text-lg font-bold flex items-center justify-center gap-3 hover:bg-[#5A5A40]/5 active:scale-[0.98] transition-all"
        >
          <Camera size={24} />
          Identify
        </button>
      </div>

      {/* Composer Overlay */}
      <AnimatePresence>
        {showComposer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={resetComposer}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[#5A5A40] font-serif">New Entry</h3>
                <button
                  onClick={resetComposer}
                  className="p-2 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mood Picker */}
              <div className="mb-6">
                <label className="text-xs font-bold text-[#5A5A40] uppercase tracking-widest mb-3 block">
                  How are you feeling?
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.emoji}
                      onClick={() => setMood(m.emoji)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-full transition-all text-sm font-medium',
                        mood === m.emoji
                          ? 'bg-[#5A5A40] text-white shadow-lg scale-105'
                          : 'bg-[#f5f5f0] text-[#5A5A40] hover:bg-[#5A5A40]/10'
                      )}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="mb-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Entry title (optional)"
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#f5f5f0] border border-[#5A5A40]/10 text-[#3A3A2A] placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30"
                />
              </div>

              {/* Body */}
              <div className="mb-6">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write about your day, your walk, what you saw, how you feel..."
                  rows={6}
                  className="w-full px-5 py-4 rounded-2xl bg-[#f5f5f0] border border-[#5A5A40]/10 text-[#3A3A2A] placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/30 leading-relaxed"
                />
              </div>

              {/* Photo Section */}
              <div className="mb-6">
                {photoDataUrl ? (
                  <div className="relative">
                    <img
                      src={photoDataUrl}
                      alt="Attached photo"
                      className="w-full rounded-2xl object-cover max-h-48"
                    />
                    <button
                      onClick={() => { setPhotoDataUrl(null); setVisionResult(null); }}
                      className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                      <X size={16} />
                    </button>
                    {visionResult && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                        <div className="flex items-center gap-1 mb-1">
                          <Sparkles size={12} className="text-purple-600" />
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest">AI Identified</span>
                        </div>
                        <p className="text-xs text-purple-800">{visionResult}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#f5f5f0] rounded-2xl border-2 border-dashed border-[#5A5A40]/20 text-[#5A5A40]/60 font-medium hover:border-[#5A5A40]/40 transition-all"
                    >
                      <Camera size={20} />
                      Photo
                    </button>
                    <button
                      onClick={() => setShowVision(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-purple-50 rounded-2xl border-2 border-dashed border-purple-200 text-purple-600 font-medium hover:border-purple-300 transition-all"
                    >
                      <Sparkles size={20} />
                      Identify
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!body.trim() && !title.trim()}
                className={cn(
                  'w-full py-5 rounded-2xl text-lg font-bold transition-all shadow-xl',
                  body.trim() || title.trim()
                    ? 'bg-[#5A5A40] text-white hover:bg-[#4A4A30] active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                Save Entry
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry Timeline */}
      {sortedDates.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-[#5A5A40] flex items-center gap-3">
            <CalendarDays size={24} />
            Timeline
          </h3>

          {sortedDates.map((date) => (
            <div key={date}>
              <p className="text-xs font-bold text-[#5A5A40]/60 uppercase tracking-widest mb-3 pl-2">
                {formatEntryDate(date)}
              </p>
              <div className="space-y-3">
                {groupedEntries[date].map((entry, idx) => (
                  <motion.button
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setViewingEntry(entry)}
                    className="w-full bg-white p-5 rounded-[24px] border border-[#5A5A40]/5 shadow-sm hover:shadow-md transition-all text-left flex items-start gap-4 group"
                  >
                    <span className="text-3xl flex-shrink-0">{entry.mood}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#5A5A40] truncate">{entry.title}</h4>
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1">{entry.body}</p>
                    </div>
                    {entry.photoDataUrl && (
                      <img
                        src={entry.photoDataUrl}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      />
                    )}
                    <ChevronRight
                      size={18}
                      className="text-gray-300 group-hover:text-[#5A5A40] flex-shrink-0 mt-1 transition-colors"
                    />
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-[32px] p-12 text-center shadow-sm border border-[#5A5A40]/5"
        >
          <div className="text-6xl mb-4">📓</div>
          <h3 className="text-xl font-bold text-[#5A5A40] mb-2">Start Your Pilgrim Journal</h3>
          <p className="text-gray-400 max-w-sm mx-auto">
            Tap "New Entry" to record your first reflection. Your entries will be saved here and organized by date.
          </p>
        </motion.div>
      )}
    </div>
  );
}
