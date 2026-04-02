import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Languages, Volume2, ExternalLink } from 'lucide-react';

interface TranslatePanelProps {
  currentPosition?: { lat: number; lng: number } | null;
}

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
  const [phraseFilter, setPhraseFilter] = useState<string | null>(null);

  const speakText = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'en' ? 'en-US' : 'es-ES';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
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
      className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-[#5A5A40]/5 flex flex-col h-full"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#5A5A40] to-[#7A7A60] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Languages size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-serif">Pilgrim Phrasebook</h3>
              <p className="text-white/60 text-xs font-medium">Essential phrases for your journey</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col space-y-6">
        
        {/* Quick launch to Google Translate */}
        <a 
          href="https://translate.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#f5f5f0] border-2 border-[#5A5A40]/10 hover:border-[#5A5A40]/30 hover:bg-[#5A5A40]/5 transition-all rounded-2xl p-4 flex items-center justify-between group cursor-pointer"
        >
          <div>
            <h4 className="text-lg font-bold text-[#5A5A40]">Open Google Translate</h4>
            <p className="text-sm text-[#5A5A40]/60">Full translation app with speech support</p>
          </div>
          <div className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center text-[#5A5A40] group-hover:scale-110 transition-transform">
            <ExternalLink size={18} />
          </div>
        </a>

        {/* Phrase Book */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40]">Essential Phrases</h4>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setPhraseFilter(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
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
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  phraseFilter === cat
                    ? 'bg-[#5A5A40] text-white'
                    : 'bg-[#f5f5f0] text-[#5A5A40]/60 hover:bg-[#5A5A40]/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-2 pb-4">
            {filteredPhrases.map((phrase, i) => (
              <button
                key={i}
                onClick={() => speakText(phrase.es, 'es')}
                className="w-full flex items-center justify-between p-4 bg-[#f5f5f0] rounded-2xl hover:bg-[#5A5A40]/10 transition-all group text-left"
              >
                <div>
                  <p className="text-base font-bold text-[#5A5A40] mb-1">{phrase.es}</p>
                  <p className="text-sm text-[#5A5A40]/60">{phrase.en}</p>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#5A5A40]/40 group-hover:text-[#5A5A40] shadow-sm transition-all flex-shrink-0">
                  <Volume2 size={18} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
