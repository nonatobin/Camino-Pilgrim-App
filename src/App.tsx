import React, { useState, useCallback } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import ChromeRedirect from './components/ChromeRedirect';
import Layout from './components/Layout';
import ActiveTracking from './components/ActiveTracking';
import TrainingPlan from './components/TrainingPlan';
import FamilySync from './components/FamilySync';
import LiveAssistant from './components/LiveAssistant';
import TranslatePanel from './components/TranslatePanel';
import PomodoroTimer from './components/PomodoroTimer';
import Onboarding from './components/Onboarding';
import { featureFlags } from './config/environment';
import { Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getProfile, getLocalUser } from './lib/localStore';

export default function App() {
  const [profile, setProfile] = useState<any>(getProfile());
  const [activeTab, setActiveTab] = useState('plan');
  const [showAssistant, setShowAssistant] = useState(false);

  const user = getLocalUser();

  const handleOnboardingComplete = useCallback(() => {
    setProfile(getProfile());
  }, []);

  return (
    <ErrorBoundary>
      <ChromeRedirect>
        {/* Show onboarding if no profile */}
        {(!profile || !profile.onboardingCompleted) ? (
          <Onboarding user={user} onComplete={handleOnboardingComplete} />
        ) : (
          <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'plan' && <TrainingPlan user={user} profile={profile} />}
                {activeTab === 'track' && <ActiveTracking user={user} />}
                {activeTab === 'pomodoro' && <PomodoroTimer />}
                {activeTab === 'family' && featureFlags.familySyncEnabled && <FamilySync user={user} />}
                {activeTab === 'translate' && featureFlags.translateEnabled && <TranslatePanel />}
              </motion.div>
            </AnimatePresence>

            {featureFlags.voiceAssistantEnabled && (
              <button onClick={() => setShowAssistant(true)} className="fixed bottom-32 right-8 w-16 h-16 bg-[#5A5A40] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white">
                <Mic size={28} />
              </button>
            )}
            <AnimatePresence>
              {showAssistant && featureFlags.voiceAssistantEnabled && (
                <LiveAssistant user={user} profile={profile} onClose={() => setShowAssistant(false)} />
              )}
            </AnimatePresence>
          </Layout>
        )}
      </ChromeRedirect>
    </ErrorBoundary>
  );
}
