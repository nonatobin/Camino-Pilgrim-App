import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, ArrowRightLeft, Volume2, Copy, Check, Mic, MicOff, Camera } from 'lucide-react';

interface TranslatePanelProps {
  currentPosition?: { lat: number; lng: number } | null;
}

interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: 'ð¬ð§' },
  { code: 'es', name: 'Spanish', flag: 'ðªð¸' },
  { code: 'pt', name: 'Portuguese', flag: 'ðµð¹' },
  { code: 'fr', name: 'French', flag: 'ð«ð·' },
  { code: 'de', name: 'German', flag: 'ð©ðª' },
  { code: 'it', name: 'Italian', flag: 'ð®ð¹' },
  { code: 'ko', name: 'Korean', flag: 'ð°ð·' },
  { code: 'ja', name: 'Japanese', flag: 'ð¯ðµ' },
  { code: 'zh', name: 'Chinese', flag: 'ð¨ð³' },
];

const PILGRIM_PHRASES = [
  { es: 'Buen Camino', en: 'Good Way / Good journey', category: 'greeting' },
  { es: 'Albergue', en: 'Pilgrim hostel', category: 'lodging' },
  { es: 'Credencial del peregrino', en: 'Pilgrim passport', category: 'documents' },
  { es: 'Sello', en: 'Stamp (for credential)', category: 'documents' },
  { es: 'Farmacia', en: 'Pharmacy', category: 'health' },
  { es: 'Tengo ampollas', en: 'I have blisters', category: 'health' },
  { es: 'Necesito un medico', en: 'I need a doctor', category: 'health' },
  { es: 'La cuenta, por favor', en: 'The check, please', category: 'food' },
  { es: 'Menu del peregrino', en: 'Pilgrim menu (set meal)', category: 'food' },
  { es: 'Agua potable', en: 'Drinking water', category: 'essentials' },
  { es: 'Donde esta el camino?', en: 'Where is the Way?', category: 'navigation' },
  { es: 'Flecha amarilla', en: 'Yellow arrow (trail marker)', category: 'navigation' },
  { es: 'Quedan camas?', en: 'Are there beds available?', category: 'lodging' },
  { es: 'A que hora abren?', en: 'What time do you open?', category: 'essentials' },
  { es: 'Socorro / Ayuda', en: 'Help!', category: 'emergency' },
  { es: 'Llamar a emergencias', en: 'Call emergency services', category: 'emergency' },
];

export default function TranslatePanel({ currentPosition }: TranslatePanelProps) {
  const [sourceLang, setSourceLang] = useState('es');
  const [targetLang, setTargetLang] = useState('en');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showPhrases, setShowPhrases] = useState(true);
  const [phraseFilter, setPhraseFilter] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey = (import.meta as any).env.VITE_GOOGLE_TRANSLATE_API_KEY ||
                 (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;

  // Auto-translate with debounce
  useEffect(() => {
    if (!inputText.trim()) {
      setTranslatedText('');
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      translateText(inputText);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText, sourceLang, targetLang]);

  const translateText = async (text: string) => {
    if (!text.trim()) return;

    if (!apiKey) {
      // Fallback: use Gemini for translation if no Translate API key
      await translateWithGemini(text);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
            format: 'text',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      const result = data.data?.translations?.[0];

      if (result) {
        setTranslatedText(result.translatedText);
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      // Fallback to Gemini if Cloud Translation fails
      await translateWithGemini(text);
    } finally {
      setIsTranslating(false);
    }
  };

  const translateWithGemini = async (text: string) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      setError('Translation API not configured');
      setIsTranslating(false);
      return;
    }

    try {
      setIsTranslating(true);
      const sourceName = LANGUAGES.find(l => l.code === sourceLang)?.name || sourceLang;
      const targetName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Translate the following text from ${sourceName} to ${targetName}. Return ONLY the translation, no explanations:\n\n"${text}"`,
        config: { temperature: 0.1 },
      });

      const result = response.text?.trim();
      if (result) {
        setTranslatedText(result.replace(/^["']|["']$/g, ''));
      }
    } catch (err) {
      console.error('Gemini translation fallback failed:', err);
      setError('Translation unavailable');
    } finally {
      setIsTranslating(false);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const speakText = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-PT' : lang;
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = sourceLang === 'en' ? 'en-US' : sourceLang === 'es' ? 'es-ES' : sourceLang === 'pt' ? 'pt-PT' : sourceLang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      setInputText(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const categories = [...new Set(PILGRIM_PHRASES.map(p => p.category))];
  const filteredPhrases = phraseFilter
    ? PILGRIM_PHRASES.filter(p => p.category === phraseFilter)
    : PILGRIM_PHRASES;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-[#5A5A40]/5"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#5A5A40] to-[#7A7A60] p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Languages size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-serif">Pilgrim Translator</h3>
            <p className="text-white/60 text-xs font-medium">Speak or type in any language</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Language Selector */}
        <div className="flex items-center gap-3">
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="flex-1 bg-[#f5f5f0] rounded-2xl px-4 py-3 text-sm font-medium text-[#5A5A40] border-none focus:ring-2 focus:ring-[#5A5A40]/20 appearance-none cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>

          <button
            onClick={swapLanguages}
            className="w-10 h-10 bg-[#5A5A40] rounded-full flex items-center justify-center text-white hover:bg-[#4A4A30] transition-all flex-shrink-0"
          >
            <ArrowRightLeft size={16} />
          </button>

          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="flex-1 bg-[#f5f5f0] rounded-2xl px-4 py-3 text-sm font-medium text-[#5A5A40] border-none focus:ring-2 focus:ring-[#5A5A40]/20 appearance-none cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Input Area */}
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Type or speak in ${LANGUAGES.find(l => l.code === sourceLang)?.name || 'source language'}...`}
            className="w-full bg-[#f5f5f0] rounded-2xl px-4 py-3 pr-24 text-sm text-[#5A5A40] border-none focus:ring-2 focus:ring-[#5A5A40]/20 resize-none min-h-[80px]"
            rows={3}
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              onClick={toggleVoiceInput}
              className={`p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-[#5A5A40]/10 text-[#5A5A40] hover:bg-[#5A5A40]/20'
              }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            {inputText && (
              <button
                onClick={() => speakText(inputText, sourceLang)}
                className="p-2 bg-[#5A5A40]/10 rounded-xl text-[#5A5A40] hover:bg-[#5A5A40]/20 transition-all"
              >
                <Volume2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Translation Output */}
        <AnimatePresence mode="wait">
          {(translatedText || isTranslating) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative bg-[#5A5A40]/5 rounded-2xl p-4 border border-[#5A5A40]/10"
            >
              {isTranslating ? (
                <div className="flex items-center gap-2 text-[#5A5A40]/50">
                  <div className="w-4 h-4 border-2 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full animate-spin" />
                  <span className="text-sm">Translating...</span>
                </div>
              ) : (
                <>
                  <p className="text-[#5A5A40] font-medium pr-16">{translatedText}</p>
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button
                      onClick={() => speakText(translatedText, targetLang)}
                      className="p-2 bg-white rounded-xl text-[#5A5A40] hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <Volume2 size={14} />
                    </button>
                    <button
                      onClick={() => copyToClipboard(translatedText)}
                      className="p-2 bg-white rounded-xl text-[#5A5A40] hover:bg-gray-50 transition-all shadow-sm"
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-red-500 text-xs text-center">{error}</p>
        )}

        {/* Pilgrim Phrase Book */}
        <div className="pt-2">
          <button
            onClick={() => setShowPhrases(!showPhrases)}
            className="w-full flex items-center justify-between px-2 py-2"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]">
              Pilgrim Phrase Book
            </span>
            <span className="text-[#5A5A40]/40 text-xs">
              {showPhrases ? 'Hide' : 'Show'}
            </span>
          </button>

          <AnimatePresence>
            {showPhrases && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {/* Category filters */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setPhraseFilter(null)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                      !phraseFilter
                        ? 'bg-[#5A5A40] text-white'
                        : 'bg-[#f5f5f0] text-[#5A5A40]/60 hover:bg-[#5A5A40]/10'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPhraseFilter(phraseFilter === cat ? null : cat)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                        phraseFilter === cat
                          ? 'bg-[#5A5A40] text-white'
                          : 'bg-[#f5f5f0] text-[#5A5A40]/60 hover:bg-[#5A5A40]/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Phrases */}
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {filteredPhrases.map((phrase, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSourceLang('es');
                        setTargetLang('en');
                        setInputText(phrase.es);
                        setTranslatedText(phrase.en);
                        speakText(phrase.es, 'es');
                      }}
                      className="w-full flex items-center justify-between p-3 bg-[#f5f5f0] rounded-2xl hover:bg-[#5A5A40]/10 transition-all group text-left"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#5A5A40]">{phrase.es}</p>
                        <p className="text-xs text-gray-500">{phrase.en}</p>
                      </div>
                      <Volume2
                        size={14}
                        className="text-[#5A5A40]/30 group-hover:text-[#5A5A40] transition-all flex-shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
