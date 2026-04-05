import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, Upload, X, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface CameraVisionProps {
  onResult?: (result: string, imageUrl: string) => void;
  onClose: () => void;
}

export default function CameraVision({ onResult, onClose }: CameraVisionProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = (h / w) * maxDim;
            w = maxDim;
          } else {
            w = (w / h) * maxDim;
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImageDataUrl(dataUrl);
        setResult(null);
        setError(null);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const identifyImage = async () => {
    if (!imageDataUrl) return;

    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your environment.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extract base64 data (remove "data:image/jpeg;base64," prefix)
      const base64Data = imageDataUrl.split(',')[1];
      const mimeType = imageDataUrl.split(';')[0].split(':')[1];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a knowledgeable trail guide for the Camino de Santiago pilgrimage. Identify what's in this image. If it's a plant, flower, tree, landmark, building, church, trail marker, or anything commonly seen along the Camino, provide:

1. **Name**: What it is (common name + scientific name if applicable)
2. **Description**: A brief, interesting fact about it
3. **Camino Connection**: How it relates to the Camino de Santiago pilgrimage (if relevant)

Keep your response concise — 3-4 sentences max. Be warm and informative, like a friendly trail companion.`,
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        setResult(text);
      } else {
        setError('Could not identify this image. Try capturing a clearer photo.');
      }
    } catch (err: any) {
      console.error('[CameraVision] Error:', err);
      setError(err.message || 'Failed to identify image. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseResult = () => {
    if (result && imageDataUrl && onResult) {
      onResult(result, imageDataUrl);
    }
    onClose();
  };

  const reset = () => {
    setImageDataUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#1a1a1a]/95 z-[70] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Sparkles size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Trail Vision</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
              Powered by Gemini
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {!imageDataUrl ? (
          // Capture prompt
          <div className="text-center space-y-8 max-w-sm">
            <div className="text-8xl">🔍</div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-3 font-serif">
                What's That?
              </h3>
              <p className="text-white/50 leading-relaxed">
                Take a photo of any plant, flower, landmark, church, or trail marker — and AI will identify it for you.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 bg-purple-500 text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-3 hover:bg-purple-600 active:scale-[0.98] transition-all shadow-xl"
              >
                <Camera size={24} />
                Take Photo
              </button>
              <button
                onClick={() => {
                  // Create a separate input for gallery (no capture attribute)
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => handleCapture(e as any);
                  input.click();
                }}
                className="w-full py-4 bg-white/10 text-white/80 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
              >
                <Upload size={18} />
                Upload from Gallery
              </button>
            </div>
          </div>
        ) : (
          // Image preview + results
          <div className="w-full max-w-md space-y-6">
            {/* Image */}
            <div className="relative">
              <img
                src={imageDataUrl}
                alt="Captured"
                className="w-full rounded-3xl object-cover max-h-72 shadow-2xl"
              />
              <button
                onClick={reset}
                className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 size={24} className="text-purple-400 animate-spin" />
                <span className="text-white/60 font-medium">Identifying...</span>
              </div>
            ) : error ? (
              <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            ) : result ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur rounded-3xl p-6 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-purple-400" />
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Identified</span>
                </div>
                <p className="text-white/90 leading-relaxed text-sm whitespace-pre-wrap">{result}</p>
              </motion.div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!result && !loading && (
                <button
                  onClick={identifyImage}
                  className="flex-1 py-5 bg-purple-500 text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-3 hover:bg-purple-600 active:scale-[0.98] transition-all shadow-xl"
                >
                  <Sparkles size={22} />
                  Identify
                </button>
              )}
              {result && onResult && (
                <button
                  onClick={handleUseResult}
                  className="flex-1 py-5 bg-[#5A5A40] text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-3 hover:bg-[#4A4A30] active:scale-[0.98] transition-all shadow-xl"
                >
                  Add to Journal
                </button>
              )}
              {result && !onResult && (
                <button
                  onClick={onClose}
                  className="flex-1 py-5 bg-[#5A5A40] text-white rounded-2xl text-lg font-bold flex items-center justify-center gap-3 hover:bg-[#4A4A30] active:scale-[0.98] transition-all shadow-xl"
                >
                  Done
                </button>
              )}
              <button
                onClick={reset}
                className="w-16 h-16 bg-white/10 text-white/60 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0"
              >
                <RotateCcw size={22} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input for camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      {/* Status Bar */}
      <div className="bg-purple-900/50 px-4 py-2.5 flex items-center justify-center gap-3 text-white/40 text-[9px] font-semibold uppercase tracking-widest">
        <span>Gemini 2.0 Flash</span>
        <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />
        <span>Vision API</span>
        <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />
        <span>Beta</span>
      </div>
    </motion.div>
  );
}
