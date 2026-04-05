import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, X, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface LiveAssistantProps {
  user: any;
  profile: any;
  onClose: () => void;
}

/**
 * LiveAssistant — Gemini Live 2.0 voice interface for the Camino Pilgrim App.
 *
 * Architecture: Browser → raw WebSocket → Gemini 3.1 Flash Live API
 * Audio: Mic capture at 16kHz PCM via AudioWorklet → base64 JSON → Gemini
 *        Gemini → 24kHz PCM base64 → Web Audio API playback
 *
 * Uses raw WebSocket to wss://generativelanguage.googleapis.com directly
 * (the @google/genai SDK is server-side only for Live API).
 */

const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const MODEL = 'models/gemini-2.5-flash';

export default function LiveAssistant({ user, profile, onClose }: LiveAssistantProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [agentTranscript, setAgentTranscript] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio playback queue
  const playbackQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const mutedRef = useRef(false);

  useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);

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

    // Use a separate AudioContext at 24kHz for playback
    let ctx = playbackCtxRef.current;
    if (!ctx || ctx.state === 'closed') {
      try {
        ctx = new AudioContext({ sampleRate: 24000 });
        playbackCtxRef.current = ctx;
      } catch (e) {
        console.error('[LiveAssistant] Failed to create playback AudioContext:', e);
        isPlayingRef.current = false;
        return;
      }
    }
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const base64Data = playbackQueueRef.current.shift()!;

    try {
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => playNextChunk();
      source.start();
    } catch (e) {
      console.error('[LiveAssistant] Playback error:', e);
      playNextChunk();
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

  // --- WebSocket message handler ---
  const handleGeminiMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      // Setup complete acknowledgment
      if (msg.setupComplete) {
        console.log('[LiveAssistant] Setup complete — session is live');
        setIsConnected(true);
        setIsConnecting(false);
        return;
      }

      // Server content (audio, transcriptions, turn events)
      if (msg.serverContent) {
        const sc = msg.serverContent;

        // Audio response chunks
        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) {
              enqueueAudio(part.inlineData.data);
            }
          }
        }

        // Input transcription (what the user said)
        if (sc.inputTranscription?.text) {
          setUserTranscript(prev => prev + sc.inputTranscription.text);
        }

        // Output transcription (what Gemini said)
        if (sc.outputTranscription?.text) {
          setAgentTranscript(prev => prev + sc.outputTranscription.text);
        }

        // Turn complete — keep transcripts visible
        if (sc.turnComplete) {
          // Optionally clear for next turn
        }

        // Barge-in: user interrupted
        if (sc.interrupted) {
          clearPlayback();
        }
      }

      // Tool calls (not used yet, but handle gracefully)
      if (msg.toolCall) {
        console.log('[LiveAssistant] Tool call received (not implemented):', msg.toolCall);
      }
    } catch (e) {
      console.error('[LiveAssistant] Failed to parse message:', e);
    }
  }, [enqueueAudio, clearPlayback]);

  // --- Start Session ---
  const startSession = useCallback(async () => {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your environment.');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setUserTranscript('');
    setAgentTranscript('');

    try {
      // 1. Get mic access first (must be from user gesture on Safari)
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

      // 2. Create AudioContext for mic capture at 16kHz
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = captureCtx;

      // Also pre-create playback context (user gesture required on Safari)
      const playCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playCtx;

      // 3. Set up AudioWorklet for PCM capture
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
      await captureCtx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const srcNode = captureCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = srcNode;
      const workletNode = new AudioWorkletNode(captureCtx, 'pcm-capture');
      workletNodeRef.current = workletNode;

      // 4. Open WebSocket to Gemini Live API
      const wsUrl = `${GEMINI_WS_URL}?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[LiveAssistant] WebSocket connected, sending setup...');

        // Send session configuration as first message
        const setupMessage = {
          setup: {
            model: MODEL,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: buildSystemPrompt() }],
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        };
        ws.send(JSON.stringify(setupMessage));
      };

      ws.onmessage = handleGeminiMessage;

      ws.onerror = (e) => {
        console.error('[LiveAssistant] WebSocket error:', e);
        setError('Connection error. Check your API key and try again.');
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = (e) => {
        console.log('[LiveAssistant] WebSocket closed:', e.code, e.reason);
        setIsConnected(false);
        setIsConnecting(false);
        if (e.code !== 1000 && e.code !== 1005) {
          setError(`Connection closed: ${e.reason || 'Unknown error'} (code ${e.code})`);
        }
      };

      // 5. Wire mic audio → WebSocket (starts flowing once WS is open)
      workletNode.port.onmessage = (event: MessageEvent) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          const pcmBuffer = new Uint8Array(event.data);
          // Convert to base64
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < pcmBuffer.length; i += chunkSize) {
            const slice = pcmBuffer.subarray(i, Math.min(i + chunkSize, pcmBuffer.length));
            binary += String.fromCharCode.apply(null, Array.from(slice));
          }
          const base64 = btoa(binary);

          const audioMessage = {
            realtimeInput: {
              audio: {
                data: base64,
                mimeType: 'audio/pcm;rate=16000',
              },
            },
          };
          ws.send(JSON.stringify(audioMessage));
        }
      };

      // Connect audio graph: mic → worklet (don't connect to destination)
      srcNode.connect(workletNode);

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
  }, [buildSystemPrompt, handleGeminiMessage]);

  // --- Cleanup ---
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close(1000); } catch (_) {}
      wsRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (playbackCtxRef.current && playbackCtxRef.current.state !== 'closed') {
      playbackCtxRef.current.close();
      playbackCtxRef.current = null;
    }
    clearPlayback();
    setIsConnected(false);
    setIsConnecting(false);
  }, [clearPlayback]);

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
