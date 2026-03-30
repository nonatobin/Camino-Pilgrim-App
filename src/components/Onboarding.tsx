import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MapPin, Calendar, Activity, User as UserIcon, Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { parseVoiceInput } from '../services/voiceParser';
import { saveProfile } from '../lib/localStore';

interface OnboardingProps {
  user: any;
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'name',
    title: "What's your name?",
    subtitle: "So we know what to call you on the trail.",
    icon: <UserIcon size={40} />,
    type: 'text',
    placeholder: 'Your name',
    field: 'displayName',
    voicePrompt: "What is your name?"
  },
  {
    id: 'age',
    title: "How old are you?",
    subtitle: "This helps us tailor the physical intensity of your plan.",
    icon: <UserIcon size={40} />,
    type: 'number',
    placeholder: 'Enter your age',
    field: 'age',
    voicePrompt: "How old are you? You can say your age or type it in."
  },
  {
    id: 'baseline',
    title: "What's your current baseline?",
    subtitle: "How many miles can you comfortably walk today?",
    icon: <Activity size={40} />,
    type: 'number',
    placeholder: 'Distance in miles',
    field: 'physicalBaseline',
    voicePrompt: "What is your current baseline? How many miles can you comfortably walk today?"
  },
  {
    id: 'departure',
    title: "When are you leaving?",
    subtitle: "Your exact scheduled departure date for the Camino.",
    icon: <Calendar size={40} />,
    type: 'date',
    placeholder: '',
    field: 'departureDate',
    voicePrompt: "When are you leaving? Please select your departure date."
  },
  {
    id: 'start',
    title: "Where are you starting?",
    subtitle: "Common starts: Baiona, Tui, Porto, or Sarria.",
    icon: <MapPin size={40} />,
    type: 'text',
    placeholder: 'Starting location',
    field: 'startLocation',
    voicePrompt: "Where are you starting your journey? For example, Baiona or Porto."
  },
  {
    id: 'end',
    title: "Where is your destination?",
    subtitle: "Is your destination Santiago de Compostela or Finisterre?",
    icon: <MapPin size={40} />,
    type: 'choice',
    options: ['Santiago de Compostela', 'Finisterre'],
    field: 'endDestination',
    voicePrompt: "Is your destination Santiago de Compostela or Finisterre?"
  }
];

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const handleVoiceInputRef = useRef<any>(null);
  const step = STEPS[currentStep];

  const handleVoiceInput = useCallback(async (transcript: string) => {
    const currentStepConfig = STEPS[currentStep];
    
    // Try Gemini parsing first
    try {
      const parsed = await parseVoiceInput(
        transcript, 
        currentStepConfig.type as any, 
        currentStepConfig.options
      );

      if (parsed !== null && parsed !== undefined) {
        setFormData((prev: any) => ({ ...prev, [currentStepConfig.field]: parsed }));
        return;
      }
    } catch (e) {
      // Gemini not available, fall through to basic parsing
    }

    // Fallback to basic parsing
    if (currentStepConfig.type === 'number') {
      const num = transcript.match(/\d+/);
      if (num) {
        setFormData((prev: any) => ({ ...prev, [currentStepConfig.field]: parseInt(num[0]) }));
      }
    } else if (currentStepConfig.type === 'choice') {
      const choice = currentStepConfig.options?.find(opt => 
        transcript.includes(opt.toLowerCase())
      );
      if (choice) {
        setFormData((prev: any) => ({ ...prev, [currentStepConfig.field]: choice }));
      }
    } else if (currentStepConfig.type === 'text') {
      setFormData((prev: any) => ({ ...prev, [currentStepConfig.field]: transcript }));
    }
  }, [currentStep]);

  useEffect(() => {
    handleVoiceInputRef.current = handleVoiceInput;
  }, [handleVoiceInput]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        if (handleVoiceInputRef.current) {
          handleVoiceInputRef.current(transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) recognitionRef.current.start();
      };
    }
  }, [isListening]);

  useEffect(() => {
    speak(STEPS[currentStep].voicePrompt);
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  }, [currentStep, speak]);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      try {
        const finalData = {
          ...formData,
          onboardingCompleted: true
        };
        // Save to localStorage instead of Firestore
        saveProfile(finalData);
        
        if (recognitionRef.current) recognitionRef.current.stop();
        onComplete();
      } catch (error) {
        console.error("Error saving onboarding data:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = step.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({ ...formData, [step.field]: value });
  };

  const isCurrentStepValid = formData[step.field] !== undefined && formData[step.field] !== '';

  return (
    <div className="fixed inset-0 bg-[#f5f5f0] z-50 flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-xl w-full py-12">
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
            className="bg-white rounded-[40px] p-12 shadow-xl border border-[#5A5A40]/5 relative"
          >
            <div className="absolute top-8 right-8 flex items-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isListening ? "bg-green-500 animate-pulse" : "bg-gray-300"
              )} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {isListening ? "Listening" : "Voice Off"}
              </span>
            </div>

            <div className="w-20 h-20 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40] mb-8">
              {step.icon}
            </div>
            
            <h2 className="text-4xl font-bold text-[#5A5A40] mb-4 font-serif">
              {step.title}
            </h2>
            <p className="text-gray-500 text-xl mb-12 font-serif italic">
              {step.subtitle}
            </p>

            <div className="relative mb-12">
              {step.type === 'choice' ? (
                <div className="grid grid-cols-1 gap-4">
                  {step.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => setFormData({ ...formData, [step.field]: option })}
                      className={cn(
                        "w-full py-8 px-8 rounded-3xl text-2xl font-serif transition-all border-2 text-left flex items-center justify-between",
                        formData[step.field] === option
                          ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-lg"
                          : "bg-[#f5f5f0] text-[#5A5A40] border-transparent hover:border-[#5A5A40]/20"
                      )}
                    >
                      {option}
                      {formData[step.field] === option && <Volume2 size={24} />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <input
                    type={step.type}
                    placeholder={step.placeholder}
                    value={formData[step.field] || ''}
                    onChange={handleInputChange}
                    className="w-full bg-[#f5f5f0] border-none rounded-3xl py-6 px-8 text-2xl text-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/20 transition-all font-serif"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isCurrentStepValid) handleNext();
                    }}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300">
                    {isListening && <Mic size={24} className="animate-pulse text-[#5A5A40]" />}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={handleNext}
                disabled={!isCurrentStepValid || isSubmitting}
                className={cn(
                  "w-full py-6 rounded-full font-bold text-xl flex items-center justify-center gap-4 transition-all shadow-lg",
                  isCurrentStepValid && !isSubmitting
                    ? 'bg-[#5A5A40] text-white hover:bg-[#4A4A30] active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                {isSubmitting ? 'Saving...' : currentStep === STEPS.length - 1 ? 'Start My Journey' : 'Continue'}
                <ArrowRight size={24} />
              </button>
              
              <button
                onClick={() => {
                  if (isListening) {
                    recognitionRef.current?.stop();
                    setIsListening(false);
                  } else {
                    recognitionRef.current?.start();
                    setIsListening(true);
                  }
                }}
                className="text-gray-400 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 py-2"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                {isListening ? "Disable Voice Input" : "Enable Voice Input"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
