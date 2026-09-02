import React, { useState } from 'react';
import { safeFetchJson } from '../lib/apiHelper';
import { Globe, X, Sparkles, Languages, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { CaptionSegment } from '../types';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  captions: CaptionSegment[];
  onUpdateCaptions: (c: CaptionSegment[]) => void;
  isLight: boolean;
}

const LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
];

export function TranslationModal({ isOpen, onClose, captions, onUpdateCaptions, isLight }: TranslationModalProps) {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTranslate = async () => {
    if (captions.length === 0) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const data = await safeFetchJson<{ translatedSegments?: Array<{ id: string; text: string }> }>(
        '/api/translate-captions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segments: captions,
            targetLanguage: selectedLang.code,
            targetLanguageName: selectedLang.name
          })
        }
      );

      const translatedMap = new Map<string, string>();
      (data.translatedSegments || []).forEach((item: { id: string; text: string }) => {
        translatedMap.set(item.id, item.text);
      });

      const updated = captions.map((c, idx) => {
        const newText = translatedMap.get(c.id) || c.text;
        return {
          ...c,
          text: newText
        };
      });

      onUpdateCaptions(updated);
      setSuccessMsg(`Successfully translated subtitles to ${selectedLang.name} while preserving emotion brackets!`);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to translate captions.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={cn(
        "w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col",
        isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-[#141416] border-white/10 text-white"
      )}>
        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between shrink-0",
          isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#1B1B1E] border-white/5"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-auralis/15 text-auralis flex items-center justify-center font-bold">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                Emotion-Preserved Translation
              </h3>
              <p className="text-xs text-zinc-400">Translates subtitles while maintaining emotion brackets like [angry] & [whispering]</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-auralis uppercase tracking-wider block">
              Select Target Language
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
              {LANGUAGES.map((lang) => {
                const isSelected = selectedLang.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLang(lang)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                      isSelected
                        ? "bg-auralis text-white border-auralis shadow-sm"
                        : isLight 
                          ? "bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100" 
                          : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={cn(
            "p-3 rounded-xl border text-xs leading-relaxed space-y-1",
            isLight ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-500/10 border-amber-500/20 text-amber-300"
          )}>
            <p className="font-bold">✨ Humanity & Global Accessibility Focus:</p>
            <p className="text-[11px] opacity-90">
              Unlike standard tools that erase acoustic markers, Auralis preserves non-verbal cues (e.g. <span className="font-mono">[angry]</span>, <span className="font-mono">[gasping]</span>) so DHH viewers in all countries receive identical emotional clarity.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          "px-6 py-3 border-t flex items-center justify-between shrink-0",
          isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#1B1B1E] border-white/5"
        )}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-zinc-300 dark:border-white/10 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleTranslate}
            disabled={isLoading || captions.length === 0}
            className="px-5 py-2 rounded-xl bg-auralis hover:bg-auralis/90 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Translating Subtitles...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Translate to {selectedLang.name}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
