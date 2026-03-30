import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MapPin, Calendar, Activity, User as UserIcon, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { saveProfile } from '../lib/localStore';
import { generateTrainingPlan } from '../lib/trainingEngine';

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
  },
  {
    id: 'age',
    title: "How old are you?",
    subtitle: "This helps us tailor the physical intensity of your plan.",
    icon: <UserIcon size={40} />,
    type: 'number',
    placeholder: 'Enter your age',
    field: 'age',
  },
  {
    id: 'baseline',
    title: "How far can you walk today?",
    subtitle: "Your comfortable walking distance in miles.",
    icon: <Activity size={40} />,
    type: 'number',
    placeholder: 'Distance in miles',
    field: 'physicalBaseline',
  },
  {
    id: 'departure',
    title: "When are you leaving?",
    subtitle: "Your scheduled departure date for the Camino.",
    icon: <Calendar size={40} />,
    type: 'date',
    placeholder: '',
    field: 'departureDate',
  },
  {
    id: 'start',
    title: "Where are you starting?",
    subtitle: "Common starts: Baiona, Tui, Porto, or Sarria.",
    icon: <MapPin size={40} />,
    type: 'text',
    placeholder: 'Starting location',
    field: 'startLocation',
  },
  {
    id: 'end',
    title: "Where is your destination?",
    subtitle: "Santiago de Compostela or Finisterre?",
    icon: <MapPin size={40} />,
    type: 'choice',
    options: ['Santiago de Compostela', 'Finisterre'],
    field: 'endDestination',
  }
];

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = STEPS[currentStep];

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      try {
        const finalData = {
          ...formData,
          displayName: formData.displayName || 'Pilgrim',
          onboardingCompleted: true
        };
        saveProfile(finalData);

        // Generate initial training plan
        await generateTrainingPlan(user, finalData);

        onComplete();
      } catch (error) {
        console.error("Error saving onboarding data:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = step.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({ ...formData, [step.field]: value });
  };

  const isCurrentStepValid = formData[step.field] !== undefined && formData[step.field] !== '' && !isNaN(formData[step.field] as any) === false;
  // Simpler validity check
  const stepValue = formData[step.field];
  const isValid = stepValue !== undefined && stepValue !== '' && String(stepValue).trim() !== '';

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
            <h2 className="text-4xl font-bold text-[#5A5A40] mb-4 font-serif">
              {step.title}
            </h2>
            <p className="text-gray-500 text-xl mb-12 font-serif italic">
              {step.subtitle}
            </p>

            {/* Input area */}
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
                <input
                  type={step.type}
                  placeholder={step.placeholder}
                  value={formData[step.field] || ''}
                  onChange={handleInputChange}
                  className="w-full bg-[#f5f5f0] border-none rounded-3xl py-6 px-8 text-2xl text-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/20 transition-all font-serif"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isValid) handleNext();
                  }}
                />
              )}
            </div>

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
                  "flex-1 py-6 rounded-full font-bold text-xl flex items-center justify-center gap-4 transition-all shadow-lg",
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
