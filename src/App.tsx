import React, { useState, useCallback } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import ActiveTracking from './components/ActiveTracking';
import TrainingPlan from './components/TrainingPlan';
import FamilySync from './components/FamilySync';
import LiveAssistant from './components/LiveAssistant';
import TranslatePanel from './components/TranslatePanel';
import Onboarding from './components/Onboarding';
import { featureFlags } from './config/environment';
import { Map as MapIcon, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getProfile, getLocalUser } from './lib/localStore';

export default function App() {
  const [profile, setProfile] = useState<any>(getProfile());
  const [activeTab, setActiveTab] = useState('plan');
  const [showAssistant, setShowAssistant] = useState(false);

  const user = getLocalUser();

  const handleOnboardingComplete = useCallback(() => {
    // Re-read profile from localStorage after onboarding saves it
    setProfile(getProfile());
  }, []);

  // Show onboarding if no profile or onboarding not completed
  if (!profile || !profile.onboardingCompleted) {
    return <Onboarding user={user} onComplete={handleOnboardingComplete} />;
  }

  return (
    <ErrorBoundary>
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
            {activeTab === 'family' && featureFlags.familySyncEnabled && <FamilySync user={user} />}
            {activeTab === 'translate' && featureFlags.translateEnabled && <TranslatePanel />}
          </motion.div>
        </AnimatePresence>

        {featureFlags.voiceAssistantEnabled && (
          <button onClick={() => setShowAssistant(true)} className="fixed bottom-32 right-8 w-20 h-20 bg-[#5A5A40] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white">
            <MessageSquare size={32} />
          </button>
        )}
        <AnimatePresence>
          {showAssistant && featureFlags.voiceAssistantEnabled && (
            <LiveAssistant user={user} profile={profile} onClose={() => setShowAssistant(false)} />
          )}
        </AnimatePresence>
      </Layout>
    </ErrorBoundary>
  );
}
