import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import ActiveTracking from './components/ActiveTracking';
import TrainingPlan from './components/TrainingPlan';
import FamilySync from './components/FamilySync';
import LiveAssistant from './components/LiveAssistant';
import Onboarding from './components/Onboarding';
import { Map as MapIcon, LogIn, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plan');
  const [showAssistant, setShowAssistant] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        // Listen to user profile changes
        const userRef = doc(db, 'users', authUser.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            // Create initial profile if it doesn't exist
            setDoc(userRef, {
              uid: authUser.uid,
              displayName: authUser.displayName,
              email: authUser.email,
              photoURL: authUser.photoURL,
              createdAt: serverTimestamp(),
              onboardingCompleted: false
            }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${authUser.uid}`));
          }
          setLoading(false);
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${authUser.uid}`));
        return () => unsubProfile();
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-[#5A5A40] rounded-full flex items-center justify-center text-white animate-pulse">
            <MapIcon size={32} />
          </div>
          <p className="text-[#5A5A40] font-serif italic text-xl">Preparing your journey...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[40px] p-12 shadow-xl text-center border border-[#5A5A40]/5"
        >
          <div className="w-20 h-20 bg-[#5A5A40] rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-lg">
            <MapIcon size={40} />
          </div>
          <h1 className="text-4xl font-bold text-[#5A5A40] mb-4 font-serif">Camino Pilgrim</h1>
          <p className="text-gray-500 text-xl mb-12 font-serif italic leading-relaxed">
            Your companion for the journey to Santiago de Compostela.
          </p>
          
          <button
            onClick={loginWithGoogle}
            className="w-full py-6 bg-[#5A5A40] text-white rounded-full font-bold text-xl flex items-center justify-center gap-4 hover:bg-[#4A4A30] active:scale-[0.98] transition-all shadow-lg"
          >
            <LogIn size={24} />
            Sign in with Google
          </button>
          
          <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest font-bold">
            Secure Multiplayer Training Sync
          </p>
        </motion.div>
      </div>
    );
  }

  if (profile && !profile.onboardingCompleted) {
    return <Onboarding user={user} onComplete={() => {}} />;
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
            {activeTab === 'family' && <FamilySync user={user} />}
          </motion.div>
        </AnimatePresence>

        {/* Floating Assistant Trigger */}
        <button
          onClick={() => setShowAssistant(true)}
          className="fixed bottom-32 right-8 w-20 h-20 bg-[#5A5A40] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 border-4 border-white"
        >
          <MessageSquare size={32} />
        </button>

        <AnimatePresence>
          {showAssistant && (
            <LiveAssistant user={user} profile={profile} onClose={() => setShowAssistant(false)} />
          )}
        </AnimatePresence>
      </Layout>
    </ErrorBoundary>
  );
}
