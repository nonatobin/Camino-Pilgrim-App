import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Mic, Bug, Lightbulb, Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import { getLocalUser } from '../lib/localStore';

interface FixerAgentModalProps {
  onClose: () => void;
}

export default function FixerAgentModal({ onClose }: FixerAgentModalProps) {
  const [type, setType] = useState<'bug' | 'feature'>('bug');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Minor');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        setDescription((prev) => {
          // just overwrite while speaking or append? Overwrite is simpler for interim, but let's just use final
          return text; 
        });
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setDescription('');
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app we'd upload to S3/Cloudinary.
      // For this beta, we can convert to base64 or just indicate attachment. 
      // Notion currently doesn't easily accept raw Base64 files in its standard API without hosting them somewhere first.
      // As a workaround for Beta, we'll just note it, but let's try to convert to object URL to preview it.
      const url = URL.createObjectURL(file);
      setScreenshotUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;

    setIsSubmitting(true);
    const user = getLocalUser();

    // The user's environment
    const environment = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'iOS Safari' 
                      : /Android/.test(navigator.userAgent) ? 'Android Chrome' 
                      : 'Web';

    const payload = {
      title: `${type === 'bug' ? 'Bug' : 'Feature'} reported by ${user?.displayName || 'Beta Tester'}`,
      description: description,
      severity: type === 'bug' ? severity : undefined,
      priority: type === 'feature' ? severity : undefined, // Mapping minor/major to priorities roughly
      reporter: user?.email || user?.displayName || 'Anonymous',
      environment,
      hasScreenshot: !!screenshotUrl
    };

    try {
      const endpoint = type === 'bug' ? '/api/notion/bug' : '/api/notion/feature';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        console.error('Failed to submit');
      }
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full mx-auto text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send size={40} />
          </div>
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Report Sent!</h2>
          <p className="text-gray-600 text-lg">Thank you! The Fixer Agent is on it.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="bg-[#1a1a1a] text-white p-6 pb-8 relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-bold mb-2">Call Fixer Agent</h2>
          <p className="text-gray-400 text-lg">Tell me what's wrong or what you need.</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto -mt-4 bg-white rounded-t-[32px] flex flex-col gap-6">
          
          {/* Type Toggle */}
          <div className="bg-[#f5f5f0] p-1.5 rounded-2xl flex relative">
            <div className="absolute inset-y-1.5 w-1/2 bg-white rounded-xl shadow-sm transition-transform duration-300 pointer-events-none" 
                 style={{ transform: type === 'feature' ? 'translateX(calc(100% - 6px))' : 'translateX(0)' }} 
            />
            <button 
              onClick={() => setType('bug')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 relative z-10 transition-colors ${type === 'bug' ? 'text-[#1a1a1a]' : 'text-gray-500'}`}
            >
              <Bug size={20} /> Report Bug
            </button>
            <button 
              onClick={() => setType('feature')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 relative z-10 transition-colors ${type === 'feature' ? 'text-[#1a1a1a]' : 'text-gray-500'}`}
            >
              <Lightbulb size={20} /> Suggest Feature
            </button>
          </div>

          <div className="space-y-4">
            <label className="text-lg font-bold text-[#1a1a1a]">Describe the issue</label>
            
            <div className="relative">
              <textarea
                className="w-full bg-[#f5f5f0] rounded-2xl p-4 min-h-[120px] text-lg outline-none focus:ring-2 focus:ring-[#8B8B6B] resize-none pr-16"
                placeholder={isRecording ? "Listening..." : "Tap the microphone to speak..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <button 
                onClick={toggleRecording}
                className={`absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm
                  ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-[#5A5A40] border border-[#5A5A40]/10'}`}
              >
                <Mic size={24} />
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">{type === 'bug' ? 'Severity' : 'Priority'}</label>
              <select 
                className="w-full bg-[#f5f5f0] rounded-xl p-4 text-lg font-bold outline-none"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {type === 'bug' ? (
                  <>
                    <option value="Minor">Minor</option>
                    <option value="Major">Major</option>
                    <option value="Blocker">Blocker (Can't use app)</option>
                  </>
                ) : (
                  <>
                    <option value="P2">Nice to have</option>
                    <option value="P1">Important</option>
                    <option value="P0">Crucial</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Screenshot</label>
              <label className={`w-full ${screenshotUrl ? 'bg-[#5A5A40] text-white' : 'bg-[#f5f5f0] text-[#5A5A40]'} rounded-xl p-4 text-lg font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors`}>
                <ImageIcon size={24} />
                {screenshotUrl ? 'Attached!' : 'Add Photo'}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>
          
        </div>

        <div className="p-6 bg-white border-t border-gray-100">
          <button 
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
            className="w-full bg-[#1a1a1a] text-white py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
            {isSubmitting ? 'Sending to Fixer...' : 'Send to Fixer Agent'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
