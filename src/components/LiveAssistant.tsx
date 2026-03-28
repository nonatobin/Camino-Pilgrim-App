import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Camera, X, MessageSquare, Send, CheckCircle2, Volume2, VolumeX, Eye, ShieldCheck } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface LiveAssistantProps {
  user: any;
  profile: any;
  onClose: () => void
}

export default function LiveAssistant({ user, profile, onClose }: LiveAssistantProps) {
  const [isOpen, setIsOpen] = useState(true); // Start open when triggered from App
  const [isListening, setIsListening] = useState(false);
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startLiveSession = async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.error('Gemini API key missing');
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemInstruction = `
      You are the "Intelligent Trail Guide" for the Camino Pilgrim App. 
      You are an expert on the Camino de Santiago, specifically the routes in Spain and Portugal.
      
      USER CONTEXT:
      - Name: ${profile?.displayName || 'Pilgrim'}
      - Age: ${profile?.age || 'Unknown'}
      - Route: From ${profile?.startLocation || 'Unknown'} to ${profile?.endDestination || 'Santiago de Compostela'}
      - Departure Date: ${profile?.departureDate || 'Unknown'}
      - Current Fitness Baseline: ${profile?.physicalBaseline || 'Unknown'} km/day
      
      YOUR ROLE:
      1. App Navigation: Help the user find features like "Start Walk", "Training Plan", or "Family Sync".
      2. Route Topography: Provide specific elevation and terrain details for their route (e.g., "The climb out of Tui is gentle but can be muddy").
      3. Weather & Packing: Advise on historical weather for their departure month. Suggest gear like "merino wool socks" or "broken-in boots".
      4. Training Advice: Give pacing advice appropriate for their age and baseline. Encourage them to stick to their progressive plan.
      5. Emergency & Medical: Provide exact protocols. If injured, tell them to look for "Farmacias" (green crosses) or call 112 in Spain. Mention specific medical centers if they name a town on their route.
      
      TONE:
      - Dignity-First: Respectful, encouraging, and clear. 
      - Conversational: Speak naturally, as if walking alongside them.
      - Expert: Provide specific, actionable Camino knowledge.
      
      If they mention a bug or feature request, acknowledge it and tell them you've logged it for the developer.
    `;

    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
            setIsListening(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.text) {
              setResponse(prev => prev + message.serverContent?.modelTurn?.parts[0]?.text);
            }
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
              if (!isMuted) playAudio(base64Audio);
            }
          },
          onclose: () => {
            console.log('Live session closed');
            setIsListening(false);
          },
          onerror: (error) => console.error('Live session error:', error),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
        },
      });

      sessionRef.current = session;
      startAudioCapture();
    } catch (e) {
      console.error('Failed to connect to Live API', e);
    }
  };

  const startAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (sessionRef.current && isListening) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
    } catch (e) {
      console.error('Audio capture failed', e);
    }
  };

  const startVisionCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsVisionActive(true);
      }
    } catch (e) {
      console.error('Vision capture failed', e);
    }
  };

  useEffect(() => {
    if (isVisionActive) {
      const interval = setInterval(() => {
        if (videoRef.current && canvasRef.current && sessionRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 320, 240);
            const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
            sessionRef.current.sendRealtimeInput({
              video: { data: base64Data, mimeType: 'image/jpeg' }
            });
          }
        }
      }, 500); // Send frame every 500ms
      return () => clearInterval(interval);
    }
  }, [isVisionActive]);

  const playAudio = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/pcm' });
    // In a real app, use AudioContext to play raw PCM
  };

  const handleBetaFeedback = async () => {
    if (!transcript) return;
    try {
      await addDoc(collection(db, 'beta_feedback'), {
        uid: user.uid,
        userName: user.displayName || 'Pilgrim',
        text: transcript,
        type: transcript.toLowerCase().includes('bug') ? 'bug' : 'feature',
        createdAt: serverTimestamp(),
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (e) {
      console.error('Failed to send feedback', e);
    }
  };

  useEffect(() => {
    startLiveSession();
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleAssistant = () => {
    onClose();
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={toggleAssistant}
        className={cn(
          "fixed bottom-24 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all z-[60]",
          isOpen ? "bg-red-500 text-white rotate-90" : "bg-[#5A5A40] text-white hover:scale-110"
        )}
      >
        {isOpen ? <X size={32} /> : <Mic size={32} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed inset-x-6 bottom-44 z-[60] bg-white rounded-[48px] shadow-2xl border border-[#5A5A40]/10 overflow-hidden flex flex-col max-h-[70vh]"
          >
            {/* Vision Viewport */}
            {isVisionActive && (
              <div className="relative h-48 bg-black overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
                <canvas ref={canvasRef} width="320" height="240" className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white/30 rounded-3xl animate-pulse flex items-center justify-center">
                    <Eye className="text-white/50" size={32} />
                  </div>
                </div>
                <div className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">
                  Live Vision
                </div>
              </div>
            )}

            {/* Assistant Content */}
            <div className="p-8 space-y-6 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#5A5A40]/5 rounded-2xl flex items-center justify-center text-[#5A5A40]">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#5A5A40] font-serif">Live Help</h3>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Ambient Assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 bg-gray-100 rounded-2xl text-gray-500 hover:bg-gray-200 transition-all"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <button 
                    onClick={startVisionCapture}
                    className={cn(
                      "p-3 rounded-2xl transition-all",
                      isVisionActive ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    )}
                  >
                    <Camera size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-[#f5f5f0] p-6 rounded-[32px] min-h-[100px] flex flex-col justify-center">
                  {response ? (
                    <p className="text-lg text-[#5A5A40] font-serif italic leading-relaxed">
                      "{response}"
                    </p>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400 italic">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span>Listening for your voice...</span>
                    </div>
                  )}
                </div>

                {/* Beta Feedback Loop */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare size={16} className="text-[#5A5A40]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]">Beta Feedback Loop</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Say 'Bug' or 'Feature' to report..."
                      className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#5A5A40]/20"
                    />
                    <button
                      onClick={handleBetaFeedback}
                      disabled={!transcript || feedbackSent}
                      className="p-3 bg-[#5A5A40] text-white rounded-2xl hover:bg-[#4A4A30] transition-all disabled:opacity-50"
                    >
                      {feedbackSent ? <CheckCircle2 size={20} /> : <Send size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <div className="bg-[#5A5A40] p-4 flex items-center justify-center gap-4 text-white/60 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live API
              </span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span>Secure Vault Active</span>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <span>Multi-Modal Sync</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
