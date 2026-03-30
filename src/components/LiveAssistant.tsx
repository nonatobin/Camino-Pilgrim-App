import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { cn } from '../lib/utils';

interface LiveAssistantProps {
  user: any;
  profile: any;
  onClose: () => void;
}

/**
 * LiveAssistant — Gemini Live 2.0 voice interface for the Camino Pilgrim App.
 *
 * Architecture: Browser → WebSocket (via @google/genai SDK) → Gemini 3.1 Flash Live API
 * Audio: Mic capture at 16kHz PCM via AudioWorklet → Gemini → 24kHz PCM playback via Web Audio API
 * No relay server needed — the SDK connects directly to Google's WebSocket endpoint.
 */
export default function LiveAssistant({ user, profile, onClose }: LiveAssistantProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [agentTranscript, setAgentTranscript] = useState('');

  // Refs for audio infrastructure
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // Audio playback queue (PCM chunks from Gemini at 24kHz)
  const playbackQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const mutedRef = useRef(false);

  // Keep mutedRef in sync
  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  const buildSystemPrompt = useCallback(() => {
    return `You are the "Intelligent Trail Guide" for the Camino Pilgrim App.
You are an expert on the Camino de Santiago, specifically the routes in Spain and Portugal.

USER CONTEXT:
- Name: ${profile?.displayName || 'Pilgrim'}
- Age: ${profile?.age || 'Unknown'}
- Route: From ${profile?.startLocation || 'Unknown'} to ${profile?.endDestination || 'Santiago de Compostela'}
- Departure Date: ${profile?.departureDate || 'Unknown'}
- Current Fitness Baseline: ${profile?.physicalBaseline || 'Unknown'} km/day

YOUR ROLE:
1. App Navigation: Help the user find features like "Start Walk", "Training Plan", or "Family Sync".
2. Route Topography: Provide specific elevation and terrain details for their route.
3. Weather & Packing: Advise on historical weather for their departure month. Suggest gear.
4. Training Advice: Give pacing advice appropriate for their age and baseline.
5. Emergency & Medical: Provide exact protocols. If injured, tell them to look for "Farmacias" (green crosses) or call 112 in Spain.

TONE:
- Dignity-First: Respectful, encouraging, and clear.
- Conversational: Speak naturally, as if walking alongside them.
- Expert: Provide specific, actionable Camino knowledge.
- Keep responses concise — 2-3 sentences for simple questions.

If they mention a bug or feature request, acknowledge it and tell them you have logged it.`;
  }, [profile]);

  // --- Audio Playback (24kHz PCM from Gemini) ---
  const playNextChunk = useCallback(async () => {
    if (playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;

    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') {
      isPlayingRef.current = false;
      return;
    }

    // Resume AudioContext if suspended (Safari requires user gesture)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const base64Data = playbackQueueRef.current.shift()!;

    try {
      // Decode base64 to bytes
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Convert 16-bit PCM to Float32 for Web Audio API
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      // Gemini Live outputs 24kHz mono PCM
      const PLAYBACK_RATE = 24000;
      const audioBuffer = ctx.createBuffer(1, float32.length, PLAYBACK_RATE);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => playNextChunk();
      source.start();
    } catch (e) {
      console.error('Audio playback error:', e);
      playNextChunk(); // Skip bad chunk, continue
    }
  }, []);

  const enqueueAudio = useCallback((base64Data: string) => {
    if (mutedRef.current) return;
    playbackQueueRef.current.push(base64Data);
    if (!isPlayingRef.current) {
      playNextChunk();
    }
  }, [playNextChunk]);

  const clearPlayback = useCallback(() => {
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // --- Start Live Session ---
  const startSession = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your environment.');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setUserTranscript('');
    setAgentTranscript('');

    try {
      // Create AudioContext — must be triggered by user gesture on Safari
      // Use 16kHz for mic capture; we create a separate context for playback if needed
      // Actually, AudioContext can handle mixed rates via createBuffer
      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      // Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Create AudioWorklet for mic capture (Float32 → Int16 → base64)
      const workletCode = `
        class PcmCaptureProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0];
            if (input.length > 0 && input[0].length > 0) {
              const float32 = input[0];
              const int16 = new Int16Array(float32.length);
              for (let i = 0; i < float32.length; i++) {
                const s = Math.max(-1, Math.min(1, float32[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              this.port.postMessage(int16.buffer, [int16.buffer]);
            }
            return true;
          }
        }
        registerProcessor('pcm-capture', PcmCaptureProcessor);
      `;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const sourceNode = ctx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(ctx, 'pcm-capture');
      workletNodeRef.current = workletNode;

      // Connect Gemini Live session
      const ai = new GoogleGenAI({ apiKey });

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: () => {
            console.log('[LiveAssistant] Gemini session opened');
            setIsConnected(true);
            setIsConnecting(false);
          },
          onmessage: (message: any) => {
            // Handle audio response chunks
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  enqueueAudio(part.inlineData.data);
                }
              }
            }

            // Handle transcriptions
            if (message.serverContent?.inputTranscription?.text) {
              setUserTranscript(prev => prev + message.serverContent.inputTranscription.text);
            }
            if (message.serverContent?.outputTranscription?.text) {
              setAgentTranscript(prev => prev + message.serverContent.outputTranscription.text);
            }

            // Handle turn complete — reset partial transcripts for next turn
            if (message.serverContent?.turnComplete) {
              // Keep the last completed transcript visible
            }

            // Handle barge-in (user interrupted Gemini)
            if (message.serverContent?.interrupted) {
              clearPlayback();
            }
          },
          onerror: (e: any) => {
            console.error('[LiveAssistant] Session error:', e);
            setError('Connection error. Please try again.');
            setIsConnected(false);
            setIsConnecting(false);
          },
          onclose: (e: any) => {
            console.log('[LiveAssistant] Session closed:', e?.reason || '');
            setIsConnected(false);
            setIsConnecting(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
          systemInstruction: buildSystemPrompt(),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      sessionRef.current = session;

      // Wire up mic → Gemini
      workletNode.port.onmessage = (event: MessageEvent) => {
        if (sessionRef.current) {
          const pcmBuffer = new Uint8Array(event.data);
          // Convert to base64
          let binary = '';
          for (let i = 0; i < pcmBuffer.length; i++) {
            binary += String.fromCharCode(pcmBuffer[i]);
          }
          const base64 = btoa(binary);

          try {
            sessionRef.current.sendRealtimeInput({
              audio: {
                data: base64,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch (err) {
            // Session may have closed
            console.warn('[LiveAssistant] Send error:', err);
          }
        }
      };

      // Connect audio graph: mic → worklet → (nowhere, just capturing)
      sourceNode.connect(workletNode);
      // Don't connect workletNode to destination (we don't want to hear our own mic)

    } catch (err: any) {
      console.error('[LiveAssistant] Start failed:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow mic access in your browser settings.');
      } else {
        setError(err.message || 'Failed to start voice session.');
      }
      setIsConnecting(false);
      cleanup();
    }
  }, [buildSystemPrompt, enqueueAudio, clearPlayback]);

  // --- Cleanup ---
  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (_) {}
      sessionRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    clearPlayback();
    setIsConnected(false);
    setIsConnecting(false);
  }, [clearPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const handleToggle = () => {
    if (isConnected || isConnecting) {
      cleanup();
    } else {
      startSession();
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-x-4 bottom-28 z-[60] bg-white rounded-3xl shadow-2xl border border-[#5A5A40]/10 overflow-hidden flex flex-col max-h-[75vh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40]/10 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-[#5A5A40]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#5A5A40]">Trail Guide</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
              {isConnected ? 'Listening' : isConnecting ? 'Connecting...' : 'Tap mic to start'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            onClick={handleClose}
            className="p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors"
            aria-label="Close assistant"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Transcript Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-[120px]">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {!error && !isConnected && !isConnecting && (
          <div className="text-center text-gray-400 text-sm py-8">
            Tap the microphone to speak with your Trail Guide
          </div>
        )}

        {isConnecting && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-8">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce [animation-delay:0.15s]" />
              <div className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
            <span>Connecting to Gemini...</span>
          </div>
        )}

        {userTranscript && (
          <div className="bg-[#f0f0ea] px-4 py-3 rounded-2xl rounded-br-lg ml-8">
            <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/60 font-semibold mb-1">You</p>
            <p className="text-sm text-[#5A5A40]">{userTranscript}</p>
          </div>
        )}

        {agentTranscript && (
          <div className="bg-[#5A5A40]/5 px-4 py-3 rounded-2xl rounded-bl-lg mr-8">
            <p className="text-[10px] uppercase tracking-widest text-[#5A5A40]/60 font-semibold mb-1">Trail Guide</p>
            <p className="text-sm text-[#3A3A2A]">{agentTranscript}</p>
          </div>
        )}
      </div>

      {/* Mic Button */}
      <div className="flex items-center justify-center px-6 py-5 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={handleToggle}
          disabled={isConnecting}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg',
            isConnected
              ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95'
              : 'bg-[#5A5A40] text-white hover:bg-[#4A4A30] active:scale-95',
            isConnecting && 'opacity-60 cursor-wait'
          )}
          aria-label={isConnected ? 'Stop listening' : 'Start listening'}
        >
          {isConnected ? (
            <div className="relative">
              <MicOff size={24} />
              {/* Pulse ring when actively listening */}
              <div className="absolute inset-0 -m-3 border-2 border-red-300 rounded-full animate-ping opacity-50" />
            </div>
          ) : (
            <Mic size={24} />
          )}
        </button>
      </div>

      {/* Status Bar */}
      <div className="bg-[#5A5A40] px-4 py-2.5 flex items-center justify-center gap-3 text-white/50 text-[9px] font-semibold uppercase tracking-widest">
        <span className="flex items-center gap-1">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full',
            isConnected ? 'bg-green-400 animate-pulse' : 'bg-white/30'
          )} />
          Gemini Live
        </span>
        <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />
        <span>Native Voice</span>
        <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />
        <span>Beta</span>
      </div>
    </motion.div>
  );
}
