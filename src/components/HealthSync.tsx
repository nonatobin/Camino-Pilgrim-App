import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, CheckCircle2, RefreshCw, ChevronRight, Smartphone, Heart, Activity, Settings } from 'lucide-react';
import { saveToVault, getFromVault, syncHealthData, HealthData } from '../services/healthSync';
import { cn } from '../lib/utils';

interface HealthSyncProps {
  user: any;
  onSyncComplete?: (data: HealthData) => void;
}

export default function HealthSync({ user, onSyncComplete }: HealthSyncProps) {
  const [step, setStep] = useState<'initial' | 'connecting' | 'connected'>('initial');
  const [activeProvider, setActiveProvider] = useState<'apple' | 'google' | 'samsung' | 'fitbit' | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if any provider is already connected
    const checkConnections = async () => {
      const providers: ('apple' | 'google' | 'samsung' | 'fitbit')[] = ['apple', 'google', 'samsung', 'fitbit'];
      for (const p of providers) {
        const token = await getFromVault(`${p}_token`);
        if (token) {
          setActiveProvider(p);
          setStep('connected');
          try {
            const data = await syncHealthData(p);
            setHealthData(data);
            if (onSyncComplete) onSyncComplete(data);
          } catch (e) {
            console.error('Failed to sync existing connection', e);
          }
          break;
        }
      }
    };
    checkConnections();
  }, [onSyncComplete]);

  const handleConnect = async (provider: 'apple' | 'google' | 'samsung' | 'fitbit') => {
    setActiveProvider(provider);
    setStep('connecting');
    setError(null);

    try {
      // CloudBridge Logic: Hide OAuth menus behind a simple "Connecting" state
      // In a real app, this would trigger the actual OAuth popup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Secure Vault: Store token encrypted
      await saveToVault(`${provider}_token`, `mock_token_${Date.now()}`);
      
      const data = await syncHealthData(provider);
      setHealthData(data);
      setStep('connected');
      if (onSyncComplete) onSyncComplete(data);
    } catch (e) {
      setError('Connection failed. Please try again.');
      setStep('initial');
    }
  };

  const providers = [
    { id: 'apple', name: 'Apple Health', icon: Smartphone, color: 'bg-black' },
    { id: 'google', name: 'Google Fit', icon: Activity, color: 'bg-blue-600' },
    { id: 'samsung', name: 'Samsung Health', icon: Heart, color: 'bg-blue-400' },
    { id: 'fitbit', name: 'Fitbit', icon: RefreshCw, color: 'bg-teal-500' },
  ] as const;

  return (
    <div className="bg-white rounded-[40px] p-8 shadow-xl border border-[#5A5A40]/5 overflow-hidden relative">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A5A40]/5 rounded-xl flex items-center justify-center text-[#5A5A40]">
              <Shield size={20} />
            </div>
            <h3 className="text-xl font-bold text-[#5A5A40] font-serif">Health Ecosystem Sync</h3>
          </div>
          {step === 'connected' && (
            <button 
              onClick={() => setStep('initial')}
              className="text-xs text-gray-400 hover:text-[#5A5A40] flex items-center gap-1 uppercase tracking-widest font-bold"
            >
              <Settings size={14} /> Manage
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {step === 'initial' && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-gray-500 italic mb-6">Connect your health apps for zero-friction training updates.</p>
              <div className="grid grid-cols-1 gap-3">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleConnect(p.id)}
                    className="flex items-center justify-between p-5 rounded-3xl border border-gray-100 hover:border-[#5A5A40]/20 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", p.color)}>
                        <p.icon size={24} />
                      </div>
                      <span className="font-bold text-[#1a1a1a]">{p.name}</span>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-[#5A5A40] transition-colors" size={20} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-[#5A5A40]/10 border-t-[#5A5A40] rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-[#5A5A40]">
                  {activeProvider && providers.find(p => p.id === activeProvider)?.icon({ size: 24 })}
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-[#5A5A40] font-serif">Connecting Securely</h4>
                <p className="text-gray-400 italic">Establishing CloudBridge to {providers.find(p => p.id === activeProvider)?.name}...</p>
              </div>
            </motion.div>
          )}

          {step === 'connected' && healthData && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl text-green-700">
                <CheckCircle2 size={20} />
                <span className="font-bold text-sm uppercase tracking-widest">Zero-HITL Sync Active</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f5f5f0] p-6 rounded-3xl space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Daily Steps</span>
                  <p className="text-2xl font-bold text-[#5A5A40]">{healthData.steps.toLocaleString()}</p>
                </div>
                <div className="bg-[#f5f5f0] p-6 rounded-3xl space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Heart Rate</span>
                  <p className="text-2xl font-bold text-[#5A5A40]">{healthData.heartRate} <span className="text-xs">BPM</span></p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-gray-400 px-2">
                <span>Last Ingested: {new Date(healthData.lastSync).toLocaleTimeString()}</span>
                <span className="flex items-center gap-1 text-green-600">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" /> Live
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background Pattern */}
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#5A5A40]/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
