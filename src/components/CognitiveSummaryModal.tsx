import React, { useState } from 'react';
import { safeFetchJson } from '../lib/apiHelper';
import { Sparkles, X, BookOpen, Clock, Brain, Copy, Check, FileText, Lightbulb } from 'lucide-react';
import { cn } from '../lib/utils';
import { CaptionSegment } from '../types';

interface CognitiveSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  captions: CaptionSegment[];
  isLight: boolean;
}

export function CognitiveSummaryModal({ isOpen, onClose, captions, isLight }: CognitiveSummaryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    title?: string;
    oneSentenceSummary?: string;
    keyTakeaways?: string[];
    toneAndContext?: string;
    estimatedReadingTimeMinutes?: number;
    simplifiedGlossary?: Array<{ word: string; definition: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (captions.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const fullText = captions.map(c => c.text).join(' ');
      const data = await safeFetchJson<{ summary?: any }>(
        '/api/summarize-transcript',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcriptText: fullText, segments: captions })
        }
      );

      if (data.summary) {
        setSummaryData(data.summary);
      } else {
        throw new Error('No summary returned from the AI assistant.');
      }
    } catch (err: any) {
      setError(err.message || 'Error producing summary.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summaryData) return;
    const textToCopy = `Title: ${summaryData.title || 'Video Summary'}
Core Takeaway: ${summaryData.oneSentenceSummary}

Key Takeaways:
${(summaryData.keyTakeaways || []).map(k => `• ${k}`).join('\n')}

Vocal Tone & Context: ${summaryData.toneAndContext || 'N/A'}
Estimated Reading Time: ${summaryData.estimatedReadingTimeMinutes || 1} min`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={cn(
        "w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]",
        isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-[#141416] border-white/10 text-white"
      )}>
        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b flex items-center justify-between shrink-0",
          isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#1B1B1E] border-white/5"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-auralis/15 text-auralis flex items-center justify-center font-bold">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                Accessible Cognitive Summary
                <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-auralis/20 text-auralis">
                  Neurodivergent Ease
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Plain-language takeaways & reading assist powered by Gemini AI</p>
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
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {!summaryData && !isLoading && !error && (
            <div className="text-center py-10 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-auralis/10 text-auralis flex items-center justify-center mx-auto">
                <Lightbulb size={32} />
              </div>
              <h4 className="font-bold text-lg">Generate Plain-Language Video Card</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Creates a simplified, structured reading card designed for ADHD, autistic, dyslexic, and non-native viewers to quickly process key information.
              </p>
              <button
                onClick={handleGenerate}
                disabled={captions.length === 0}
                className="px-5 py-2.5 rounded-xl bg-auralis hover:bg-auralis/90 text-white font-bold text-xs flex items-center gap-2 mx-auto cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles size={16} />
                <span>Generate Cognitive Summary</span>
              </button>
            </div>
          )}

          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-auralis border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-sm">Analyzing transcript structure & tone...</p>
              <p className="text-xs text-zinc-400">Distilling plain-language takeaways for cognitive accessibility</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs space-y-2">
              <p className="font-bold">Summary Generation Failed</p>
              <p>{error}</p>
              <button 
                onClick={handleGenerate}
                className="px-3 py-1 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors cursor-pointer text-[11px]"
              >
                Retry
              </button>
            </div>
          )}

          {summaryData && (
            <div className="space-y-5 animate-slide-up">
              {/* Title & Reading Time Banner */}
              <div className={cn(
                "p-4 rounded-xl border flex items-center justify-between gap-4",
                isLight ? "bg-auralis/5 border-auralis/20" : "bg-auralis/10 border-auralis/30"
              )}>
                <div>
                  <h4 className="font-extrabold text-base text-auralis">{summaryData.title || 'Video Overview'}</h4>
                  <p className="text-xs font-semibold mt-0.5 text-zinc-300">{summaryData.oneSentenceSummary}</p>
                </div>
                {summaryData.estimatedReadingTimeMinutes && (
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <Clock size={12} /> Reading Time
                    </span>
                    <span className="text-sm font-extrabold text-auralis">
                      ~{summaryData.estimatedReadingTimeMinutes} min
                    </span>
                  </div>
                )}
              </div>

              {/* Key Takeaways */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-auralis uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} /> Key Takeaways
                </span>
                <div className="space-y-1.5">
                  {summaryData.keyTakeaways?.map((point, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5",
                        isLight ? "bg-zinc-50 border-zinc-200 text-zinc-800" : "bg-[#1A1A1E] border-white/5 text-zinc-200"
                      )}
                    >
                      <span className="w-5 h-5 rounded-md bg-auralis/15 text-auralis font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tone & Context */}
              {summaryData.toneAndContext && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-auralis uppercase tracking-wider">Vocal Tone & Context</span>
                  <div className={cn(
                    "p-3 rounded-xl border text-xs font-semibold",
                    isLight ? "bg-zinc-50 border-zinc-200 text-zinc-700" : "bg-[#1A1A1E] border-white/5 text-zinc-300"
                  )}>
                    🎭 {summaryData.toneAndContext}
                  </div>
                </div>
              )}

              {/* Simplified Vocabulary Glossary */}
              {summaryData.simplifiedGlossary && summaryData.simplifiedGlossary.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-auralis uppercase tracking-wider">Simplified Glossary</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {summaryData.simplifiedGlossary.map((g, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs",
                          isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#1A1A1E] border-white/5"
                        )}
                      >
                        <span className="font-bold text-auralis block">{g.word}</span>
                        <span className="text-zinc-400 text-[11px] leading-tight block mt-0.5">{g.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          "px-6 py-3 border-t flex items-center justify-between shrink-0",
          isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#1B1B1E] border-white/5"
        )}>
          {summaryData ? (
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Summary!' : 'Copy Summary'}</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-auralis text-white font-bold text-xs hover:bg-auralis/90 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
