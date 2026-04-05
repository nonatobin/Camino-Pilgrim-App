import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Volume2, VolumeX, ShieldCheck, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

import { addFavoriteRoute, saveCalendarSync, getLogs, getLocalUser } from '../lib/localStore';

interface FixerLiveAgentProps {
  onClose: () => void;
}

const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
// Use stable gemini-2.5-flash for Live API with function calling support
const MODEL = 'models/gemini-2.5-flash';

// We must use functionDeclarations inside a tools array for the initial setup.
const fixerTools = [
  {
    functionDeclarations: [
      {
        name: 'save_favorite_route',
        description: 'Saves the most recent tracked walk as a favorite route for the user.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'The semantic name for the route gathered from context, e.g. "Morning Henderson Walk"',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'connect_calendar',
        description: 'Dynamically links the users active local calendar to the application.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'escalate_to_manager',
        description: 'Triggered when the problem requires Nona or Anti-Gravity. Logs the bug payload explicitly to the Notion Database outlining the complex issue.',
        parameters: {
          type: 'OBJECT',
          properties: {
            summary: {
              type: 'STRING',
              description: 'Comprehensive description of the thorny issue or technical roadblock encountered.',
            },
            severity: {
              type: 'STRING',
              description: 'Determines the weight: Minor, Major, Blocker',
            },
          },
          required: ['summary', 'severity'],
        },
      },
    ],
  },
];

export default function FixerLiveAgent({ onClose }: FixerLiveAgentProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [agentTranscript, setAgentTranscript] = useState('');
  const [actionLog, setActionLog] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const playbackQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const mutedRef = useRef(false);
  const base64Screenshot = useRef<string | null>(null);

  useEffect(() => { mutedRef.current = isMuted; }, [isMuted]);

  const addLog = (log: string) => setActionLog(prev => [log, ...prev].slice(0, 4));

  const captureScreen = async () => {
    try {
      addLog('Capturing DOM visually...');
      const canvas = await html2canvas(document.body, { 
        useCORS: true, 
        logging: false,
        ignoreElements: (el) => {
          // Skip elements that might have unsupported CSS
          return el.tagName === 'VIDEO' || el.tagName === 'IFRAME';
        }
      });
      const b64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
      base64Screenshot.current = b64;
      addLog('DOM captured.');
    } catch (e) {
      // html2canvas can fail on modern CSS (oklab, oklch, etc.)
      // Continue without screenshot — voice still works
      console.warn('DOM capture skipped (CSS compatibility):', e);
      base64Screenshot.current = null;
      addLog('DOM capture skipped — connecting voice only.');
    }
  };

  const handleToolCall = async (functionCalls: any[]) => {
    const responses = [];

    for (const call of functionCalls) {
      addLog(`Executing: ${call.name}`);
      let resultObj: any = {};

      if (call.name === 'save_favorite_route') {
        const { name } = call.args;
        const logs = getLogs();
        if (logs.length > 0) {
          addFavoriteRoute({ ...logs[logs.length - 1], routeName: name });
          resultObj = { status: 'success', message: `${name} has been stored mapped to previous coordinates.` };
        } else {
          resultObj = { status: 'error', message: 'No active tracks available to save.' };
        }
      } 
      else if (call.name === 'connect_calendar') {
        saveCalendarSync({ connected: true, lastSyncTime: new Date().toISOString() });
        resultObj = { status: 'success', message: 'Calendar linked.' };
      } 
      else if (call.name === 'escalate_to_manager') {
        addLog('Escalating to Notion: ' + call.args.summary);
        
        // Emulate Phase 4 payload processing
        const payload = {
          title: 'Escalated by Live Agent',
          description: call.args.summary,
          severity: call.args.severity,
          reporter: getLocalUser()?.displayName || 'Beta Tester',
          environment: 'Fixer Live Agent',
          screenshotBase64: base64Screenshot.current ? `data:image/jpeg;base64,${base64Screenshot.current}` : null
        };

        try {
          // Fire and forget Notion post gracefully
          await fetch('/api/notion/bug', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          resultObj = { status: 'success', message: 'Notion ticket created implicitly.' };
        } catch {
          resultObj = { status: 'error', message: 'API unavailable to post to Notion.' };
        }
      }

      responses.push({
        id: call.id,
        name: call.name,
        response: resultObj
      });
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
    }
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!playbackCtxRef.current || mutedRef.current) return;
    try {
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const audioBuffer = playbackCtxRef.current.createBuffer(1, pcm16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }
      const source = playbackCtxRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackCtxRef.current.destination);
      
      return new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    } catch (e) {
      console.error('Audio playback error', e);
    }
  };

  const processAudioQueue = async () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    while (playbackQueueRef.current.length > 0) {
      const chunk = playbackQueueRef.current.shift();
      if (chunk) {
        await playAudioChunk(chunk);
      }
    }
    isPlayingRef.current = false;
  };

  const enqueueAudio = useCallback((base64Data: string) => {
    playbackQueueRef.current.push(base64Data);
    processAudioQueue();
  }, [processAudioQueue]);

  const clearPlayback = useCallback(() => {
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const handleGeminiMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.setupComplete) {
        setIsConnected(true);
        setIsConnecting(false);
        addLog('Gemini connected seamlessly.');
        return;
      }

      if (msg.serverContent) {
        const sc = msg.serverContent;

        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData?.data) {
              enqueueAudio(part.inlineData.data);
            }
          }
        }

        if (sc.interrupted) {
          clearPlayback();
        }
      }
      
      // Specifically target Tool Call operations payload natively
      if (msg.toolCall) {
        handleToolCall(msg.toolCall.functionCalls);
      }
    } catch (e) {
      console.error('Failed to parse websocket message:', e);
    }
  }, [enqueueAudio, clearPlayback]);

  const startSession = useCallback(async () => {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError('Gemini API key missing.');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setUserTranscript('');
    setAgentTranscript('');

    await captureScreen();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true },
      });
      mediaStreamRef.current = stream;

      const captureCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = captureCtx;

      const playCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playCtx;

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

      const workletNode = new AudioWorkletNode(captureCtx, 'pcm-capture');
      workletNodeRef.current = workletNode;
      const sourceNode = captureCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;
      sourceNode.connect(workletNode);
      workletNode.connect(captureCtx.destination);

      const wsUrl = `${GEMINI_WS_URL}?key=${apiKey}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Setup payload mapping our agent architecture
        const setupPayload = {
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
              parts: [{ text: `You are the Fixer Agent for the Camino Pilgrim test architecture. You sit explicitly on top of a web application and have vision representing the DOM screenshot. Help the user interactively by talking to them, but also utilize your TOOLS to invoke React state alterations natively.` }]
            },
            tools: fixerTools,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          }
        };
        ws.send(JSON.stringify(setupPayload));

        // Inject the screenshot context
        if (base64Screenshot.current) {
          const clientContent = {
            clientContent: {
              turns: [{
                role: 'user',
                parts: [{
                  inlineData: { mimeType: 'image/jpeg', data: base64Screenshot.current }
                }]
              }],
              turnComplete: true
            }
          };
          ws.send(JSON.stringify(clientContent));
        }

        workletNode.port.onmessage = (ev) => {
          if (ws.readyState === WebSocket.OPEN) {
            const rawBytes = new Uint8Array(ev.data);
            const base64Audio = btoa(String.fromCharCode(...rawBytes));
            ws.send(JSON.stringify({
              realtimeInput: { mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: base64Audio }] }
            }));
          }
        };
      };

      ws.onmessage = handleGeminiMessage;

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
      
      ws.onerror = (e) => {
        setError('WebSocket Connection forcefully aborted.');
      };

    } catch (e: any) {
      setError(e.message);
      setIsConnecting(false);
    }
  }, [handleGeminiMessage]);

  const stopSession = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
    if (workletNodeRef.current) workletNodeRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (playbackCtxRef.current) playbackCtxRef.current.close();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    clearPlayback();
    setIsConnected(false);
    setIsConnecting(false);
  }, [clearPlayback]);

  useEffect(() => {
    return () => { stopSession(); };
  }, [stopSession]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col pointer-events-auto"
      >
        <div className="bg-[#1a1a1a] p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white text-red-600 rounded-full flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-2xl font-bold">Fixer Live</h2>
          </div>
          <p className="text-gray-400 text-sm">Gemini Multimodal Agent</p>
        </div>

        <div className="p-6 bg-[#f5f5f0] space-y-4">
          <div className="h-24 bg-white rounded-xl p-4 shadow-inner overflow-y-auto font-mono text-xs text-gray-500">
            {actionLog.map((log, i) => (
               <div key={i}>&gt; {log}</div>
            ))}
            {actionLog.length === 0 && <div>&gt; Awaiting connection...</div>}
          </div>

          <div className="flex bg-white items-center p-2 rounded-2xl justify-between shadow-sm border border-gray-100">
            <button
               onClick={() => setIsMuted(!isMuted)}
               className={`p-3 rounded-xl transition-colors ${isMuted ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
               {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="text-sm font-bold flex-1 text-center text-gray-600">
               {isConnecting && 'Connecting...'}
               {!isConnecting && !isConnected && 'Disconnected'}
               {isConnected && 'Agent Active'}
            </div>
            {!isConnected && !isConnecting ? (
               <button
                 onClick={startSession}
                 className="p-3 bg-[#5A5A40] text-white rounded-xl hover:bg-[#4A4A30] transition-colors"
               >
                 <Mic size={20} />
               </button>
            ) : (
               <button
                 onClick={stopSession}
                 className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors animate-pulse"
               >
                 <MicOff size={20} />
               </button>
            )}
          </div>
          
          {error && <p className="text-xs text-red-600 text-center font-bold px-2">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
}
