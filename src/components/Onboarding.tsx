import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MapPin, Calendar, Activity, User as UserIcon, Mic, MicOff, Volume2, Sun, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { saveProfile } from '../lib/localStore';
import { generateTrainingPlan } from '../lib/trainingEngine';

interface OnboardingProps {
  user: any;
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'avatar',
    title: 'Choose your Pilgrim',
    subtitle: 'Pick an emoji to personalize your journey.',
    icon: <UserIcon size={40} />,
    type: 'emoji',
    options: ['🥾', '🤠', '🌞', '🐌', '🌻', '🎒', '🇪🇸', '🥖'],
    field: 'avatar',
    voiceHint: '',
  },
  {
    id: 'name',
    title: "What's your name?",
    subtitle: "So we know what to call you on the trail.",
    icon: <UserIcon size={40} />,
    type: 'text',
    placeholder: 'Your name',
    field: 'displayName',
    voiceHint: 'Say your name',
  },
  {
    id: 'age',
    title: "How old are you?",
    subtitle: "This helps us tailor the physical intensity of your plan.",
    icon: <UserIcon size={40} />,
    type: 'number',
    placeholder: 'Enter your age',
    field: 'age',
    voiceHint: 'Say your age',
  },
  {
    id: 'baseline',
    title: "How far can you walk today?",
    subtitle: "Your comfortable walking distance in miles.",
    icon: <Activity size={40} />,
    type: 'number',
    placeholder: 'Distance in miles',
    field: 'physicalBaseline',
    voiceHint: 'Say a number',
  },
  {
    id: 'departure',
    title: "When are you leaving?",
    subtitle: "Your scheduled departure date for the Camino.",
    icon: <Calendar size={40} />,
    type: 'date',
    placeholder: '',
    field: 'departureDate',
    voiceHint: 'Say a date',
  },
  {
    id: 'wakeup',
    title: "What time do you wake up?",
    subtitle: "We'll schedule your training around your morning routine.",
    icon: <Clock size={40} />,
    type: 'time',
    placeholder: '06:30',
    field: 'wakeUpTime',
    voiceHint: 'Say a time like 6:30 AM',
  },
  {
    id: 'start',
    title: "Where are you starting?",
    subtitle: "Common starts: Baiona, Tui, Porto, or Sarria.",
    icon: <MapPin size={40} />,
    type: 'text',
    placeholder: 'Starting location',
    field: 'startLocation',
    voiceHint: 'Say a city name',
  },
  {
    id: 'end',
    title: "Where is your destination?",
    subtitle: "Santiago de Compostela or Finisterre?",
    icon: <MapPin size={40} />,
    type: 'choice',
    options: ['Santiago de Compostela', 'Finisterre'],
    field: 'endDestination',
    voiceHint: 'Say Santiago or Finisterre',
  },
];

// Parse spoken text into the right value for each field type
function parseVoiceForField(transcript: string, step: typeof STEPS[0]): string | number | null {
  const raw = transcript.trim();
  if (!raw) return null;

  if (step.type === 'number') {
    const wordNumbers: Record<string, number> = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
      sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
      thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    };
    const directNum = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (!isNaN(directNum) && directNum > 0) return directNum;

    const words = raw.toLowerCase().split(/[\s-]+/);
    let total = 0;
    for (const w of words) {
      if (wordNumbers[w] !== undefined) total += wordNumbers[w];
    }
    if (total > 0) return total;

    return null;
  }

  if (step.type === 'date') {
    const dateStr = raw.replace(/(st|nd|rd|th)/gi, '').trim();
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  }

  if (step.type === 'time') {
    // Try to parse spoken time like "6:30 AM", "seven thirty", "0630"
    const timeMatch = raw.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      const ampm = (timeMatch[3] || '').toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return null;
  }

  if (step.type === 'choice' && step.options) {
    const lower = raw.toLowerCase();
    for (const option of step.options) {
      if (lower.includes(option.toLowerCase().split(' ')[0].toLowerCase())) {
        return option;
      }
    }
    if (lower.includes('santiago')) return 'Santiago de Compostela';
    if (lower.includes('finis') || lower.includes('fisterra')) return 'Finisterre';
    return null;
  }

  // Text fields — capitalize first letter of each word
  return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = useRef<any>(null);

  const step = STEPS[currentStep];

  // --- Speech Recognition ---
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setVoiceText(transcript);

      if (event.results[event.results.length - 1].isFinal) {
        const parsed = parseVoiceForField(transcript, step);
        if (parsed !== null) {
          setFormData((prev: any) => ({ ...prev, [step.field]: parsed }));
        }
        setIsListening(false);
        setVoiceText('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Onboarding] Speech error:', event.error);
      setIsListening(false);
      setVoiceText('');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
    setVoiceText('');
  }, [step]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setVoiceText('');
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const hasSpeechRecognition = typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const handleNext = async () => {
    stopListening();
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      try {
        const finalData = {
          ...formData,
          displayName: formData.displayName || 'Pilgrim',
          onboardingCompleted: true,
        };
        saveProfile(finalData);
        await generateTrainingPlan(user, finalData);
        onComplete();
      } catch (error) {
        console.error('Error saving onboarding data:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    stopListening();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = step.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({ ...formData, [step.field]: value });
  };

  const stepValue = formData[step.field];
  const isValid = stepValue !== undefined && stepValue !== '' && String(stepValue).trim() !== '';

  // ========================================================================
  // WELCOME SPLASH SCREEN
  // ========================================================================
  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #4A4A30 0%, #5A5A40 30%, #6B6B50 60%, #7A7A60 100%)',
        }}
      >
        {/* Ambient glow circles */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-yellow-400/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-amber-300/8 blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center text-center px-8 max-w-lg"
        >
          {/* Shell Icon */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-28 h-28 rounded-[32px] bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-10 shadow-2xl"
          >
            <span className="text-6xl">🐚</span>
          </motion.div>

          {/* Hero Text */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Buen Camino!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-xl md:text-2xl text-white/70 mb-3 leading-relaxed"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Your personal Camino de Santiago companion
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="text-base text-white/40 mb-12 max-w-sm leading-relaxed"
          >
            Personalized training, real-time trail guidance, weather, and voice AI — all in one place.
          </motion.p>

          {/* CTA Button */}
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowWelcome(false)}
            className="w-full max-w-xs bg-white text-[#5A5A40] py-5 px-8 rounded-full font-bold text-xl flex items-center justify-center gap-3 shadow-2xl shadow-black/20 hover:shadow-3xl transition-all"
          >
            <Sun size={22} />
            Customize for Me
            <ArrowRight size={20} />
          </motion.button>

          {/* Subtle footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="mt-10 text-xs text-white/25 uppercase tracking-[0.25em] font-semibold"
          >
            Train · Track · Thrive
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ========================================================================
  // ONBOARDING WIZARD
  // ========================================================================
  return (
    <div className="fixed inset-0 bg-[#f5f5f0] z-50 flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-xl w-full py-12">
        {/* Progress dots */}
        <div className="mb-12 flex justify-center gap-2">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-500 ${
                idx <= currentStep ? 'w-8 bg-[#5A5A40]' : 'w-2 bg-[#5A5A40]/20'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-[40px] p-12 shadow-xl border border-[#5A5A40]/5"
          >
            {/* Step icon */}
            <div className="w-20 h-20 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40] mb-8">
              {step.icon}
            </div>

            {/* Step title */}
            <h2 className="text-4xl font-bold text-[#5A5A40] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {step.title}
            </h2>
            <p className="text-gray-500 text-xl mb-8" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
              {step.subtitle}
            </p>

            {/* Input area */}
            <div className="relative mb-6">
              {step.type === 'emoji' ? (
                <div className="grid grid-cols-4 gap-4">
                  {step.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => setFormData({ ...formData, [step.field]: option })}
                      className={cn(
                        'aspect-square flex items-center justify-center text-5xl rounded-[24px] transition-all border-4',
                        formData[step.field] === option
                          ? 'bg-white border-[#5A5A40] shadow-lg scale-105'
                          : 'bg-[#f5f5f0] border-transparent hover:border-[#5A5A40]/20'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : step.type === 'choice' ? (
                <div className="grid grid-cols-1 gap-4">
                  {step.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => setFormData({ ...formData, [step.field]: option })}
                      className={cn(
                        'w-full py-8 px-8 rounded-3xl text-2xl transition-all border-2 text-left flex items-center justify-between',
                        formData[step.field] === option
                          ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-lg'
                          : 'bg-[#f5f5f0] text-[#5A5A40] border-transparent hover:border-[#5A5A40]/20'
                      )}
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {option}
                      {formData[step.field] === option && <Volume2 size={24} />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 items-center">
                  <input
                    type={step.type}
                    placeholder={step.placeholder}
                    value={formData[step.field] || ''}
                    onChange={handleInputChange}
                    className="flex-1 bg-[#f5f5f0] border-none rounded-3xl py-6 px-8 text-2xl text-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/20 transition-all"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isValid) handleNext();
                    }}
                  />
                  {/* Mic button inline with input */}
                  {hasSpeechRecognition && (
                    <button
                      onClick={toggleVoice}
                      className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center transition-all shrink-0 shadow-md',
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-[#5A5A40] text-white hover:bg-[#4A4A30] active:scale-95'
                      )}
                      aria-label={isListening ? 'Stop listening' : 'Speak your answer'}
                    >
                      {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Voice feedback */}
            {isListening && (
              <div className="mb-6 bg-[#5A5A40]/5 rounded-2xl px-5 py-3 flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
                <span className="text-sm text-[#5A5A40]">
                  {voiceText || step.voiceHint || 'Listening...'}
                </span>
              </div>
            )}

            {/* Mic button for choice step */}
            {step.type === 'choice' && hasSpeechRecognition && (
              <div className="mb-6 flex justify-center">
                <button
                  onClick={toggleVoice}
                  className={cn(
                    'flex items-center gap-3 px-6 py-3 rounded-full transition-all text-sm font-semibold',
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-[#5A5A40]/10 text-[#5A5A40] hover:bg-[#5A5A40]/20'
                  )}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  {isListening ? 'Stop' : 'Or say it'}
                </button>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-4">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="py-6 px-8 rounded-full font-bold text-xl text-[#5A5A40] bg-[#f5f5f0] hover:bg-[#e8e8e0] transition-all"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!isValid || isSubmitting}
                className={cn(
                  'flex-1 py-6 rounded-full font-bold text-xl flex items-center justify-center gap-4 transition-all shadow-lg',
                  isValid && !isSubmitting
                    ? 'bg-[#5A5A40] text-white hover:bg-[#4A4A30] active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                {isSubmitting ? 'Setting up your journey...' : currentStep === STEPS.length - 1 ? 'Start My Journey' : 'Continue'}
                <ArrowRight size={24} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
