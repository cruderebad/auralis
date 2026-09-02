import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store';
import { CaptionSegment, AccessibilityCaptionMode, AnimationStyle } from '../../types';
import { 
  Search, LayoutList, AlignLeft, ChevronDown, Sparkles, Smile, Volume2, 
  Activity, Zap, Play, Plus, Trash2, Copy, Download, Wand2, Clock, 
  Tag, MoreVertical, Check, X, FileText, Sliders, ArrowRightLeft, Split,
  VolumeX, User, Edit3, Globe, Brain, Eye, Scissors, Replace, Users,
  Type, Palette, SlidersHorizontal, ChevronRight
} from 'lucide-react';
import { getFormattedCaptionsForMode, formatEmotionBracket, MODE_DEFAULT_WORDS_PER_SEGMENT } from '../../lib/captionFormatter';
import { CognitiveSummaryModal } from '../CognitiveSummaryModal';
import { TranslationModal } from '../TranslationModal';
import { getSpeakerColor } from '../../lib/speakerColors';
import { FONT_FAMILIES } from '../../constants';

interface CaptionsListPanelProps {
  captions: CaptionSegment[];
  onUpdateCaptions: (captions: CaptionSegment[]) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
}

const EMOTION_OPTIONS = [
  { id: 'neutral', label: 'Neutral', icon: '😐', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  { id: 'angry', label: 'Angry [angry]', icon: '🤬', color: 'bg-red-500/15 text-red-500 border-red-500/30' },
  { id: 'happy', label: 'Happy [happy]', icon: '😊', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  { id: 'whispering', label: 'Whisper [whispering]', icon: '🤫', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { id: 'excited', label: 'Excited [excited]', icon: '🤩', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  { id: 'sad', label: 'Sad [sad]', icon: '😢', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { id: 'shocked', label: 'Shocked [shocked]', icon: '😲', color: 'bg-pink-500/15 text-pink-400 border-pink-500/30' },
  { id: 'scared', label: 'Scared [scared]', icon: '😨', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  { id: 'hesitating', label: 'Hesitant [hesitating]', icon: '🤔', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
];

const QUICK_PRESETS: { id: string; label: string; style: { animationStyle: AnimationStyle; wordsPerSegment?: number; maxLines?: number; textColor?: string; highlightColor?: string; highlightBoxColor?: string; followUpStretch?: boolean } }[] = [
  { id: 'kinetic', label: 'Kinetic', style: { animationStyle: 'kinetic', wordsPerSegment: 7, maxLines: 1 } },
  { id: 'pop-up', label: 'Pop Up', style: { animationStyle: 'pop-up', wordsPerSegment: 5, maxLines: 1, highlightColor: '#FFD700' } },
  { id: 'follow-up', label: 'Follow Up', style: { animationStyle: 'follow-up', wordsPerSegment: 5, followUpStretch: true } },
  { id: 'word-by-word', label: 'Word by Word', style: { animationStyle: 'word-by-word', wordsPerSegment: 5 } },
  { id: 'word-highlight-box', label: 'Highlight Box', style: { animationStyle: 'word-highlight-box', highlightBoxColor: '#FFCC00', textColor: '#000000' } },
  { id: 'word-highlight-color', label: 'Highlight Color', style: { animationStyle: 'word-highlight-color', highlightColor: '#FFD700' } },
  { id: 'karaoke', label: 'Karaoke', style: { animationStyle: 'karaoke', highlightColor: '#FF6F61' } },
  { id: 'fade-in-word', label: 'Fade In', style: { animationStyle: 'fade-in-word' } },
  { id: 'aesthetic', label: 'Aesthetic', style: { animationStyle: 'aesthetic', highlightColor: '#FFD700' } },
  { id: 'typewriter', label: 'Typewriter', style: { animationStyle: 'typewriter', textColor: '#00FF66', highlightColor: '#00FF66' } },
  { id: 'flat', label: 'Clean Flat', style: { animationStyle: 'flat', textColor: '#FFFFFF' } },
];

interface CaptionItemProps {
  caption: CaptionSegment;
  index: number;
  isLight: boolean;
  onUpdateText: (id: string, text: string) => void;
  onUpdateEmotion: (id: string, emotion: string) => void;
  onUpdateTiming: (id: string, start: number, end: number) => void;
  onUpdateSpeaker: (id: string, speaker: string | null) => void;
  onDelete: (id: string) => void;
  onInsertAfter: (id: string) => void;
  onMergeNext: (id: string) => void;
  onSplit: (id: string) => void;
  onSeek: (time: number) => void;
  searchTerm?: string;
}

const CaptionItem = React.memo(function CaptionItem({ 
  caption, 
  index, 
  isLight, 
  onUpdateText, 
  onUpdateEmotion,
  onUpdateTiming,
  onUpdateSpeaker,
  onDelete,
  onInsertAfter,
  onMergeNext,
  onSplit,
  onSeek,
  searchTerm
}: CaptionItemProps) {
  const isActive = useStore(useCallback(state => state.currentTime >= caption.start && state.currentTime <= caption.end, [caption.start, caption.end]));
  const [isEditingEmotion, setIsEditingEmotion] = useState(false);
  const [isEditingSpeaker, setIsEditingSpeaker] = useState(false);
  const [customSpeakerInput, setCustomSpeakerInput] = useState(caption.speaker || '');
  const [isEditingTiming, setIsEditingTiming] = useState(false);
  const [startTimeInput, setStartTimeInput] = useState(caption.start.toFixed(2));
  const [endTimeInput, setEndTimeInput] = useState(caption.end.toFixed(2));

  useEffect(() => {
    setStartTimeInput(caption.start.toFixed(2));
    setEndTimeInput(caption.end.toFixed(2));
  }, [caption.start, caption.end]);

  const duration = Math.max(0.1, caption.end - caption.start);

  const handleTimingBlur = () => {
    const s = parseFloat(startTimeInput);
    const e = parseFloat(endTimeInput);
    if (!isNaN(s) && !isNaN(e) && e > s) {
      onUpdateTiming(caption.id, s, e);
    } else {
      setStartTimeInput(caption.start.toFixed(2));
      setEndTimeInput(caption.end.toFixed(2));
    }
    setIsEditingTiming(false);
  };

  return (
    <div 
      data-caption-id={caption.id}
      data-active={isActive}
      className={cn(
        "group relative flex flex-col rounded-2xl border transition-all duration-200 p-3.5 space-y-2.5",
        isActive 
          ? "border-auralis bg-auralis/10 shadow-md ring-1 ring-auralis/30 scale-[1.005]" 
          : isLight 
            ? "border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs" 
            : "border-white/10 bg-[#151518] hover:border-white/20 hover:shadow-xs"
      )}
    >
      {/* Top Header of Card */}
      <div className="flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Index Pill & Jump to Playhead */}
          <button
            onClick={() => onSeek(caption.start)}
            title="Seek to caption start"
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0",
              isActive 
                ? "bg-auralis text-white shadow-xs" 
                : isLight 
                  ? "bg-zinc-100 text-zinc-700 hover:bg-auralis/20 hover:text-auralis" 
                  : "bg-white/10 text-zinc-300 hover:bg-auralis/20 hover:text-auralis"
            )}
          >
            <Play size={10} className="fill-current" />
            <span>#{index + 1}</span>
          </button>

          {/* Speaker Tag & Selector */}
          <div className="relative shrink-0">
            {caption.speaker ? (() => {
              const col = getSpeakerColor(caption.speaker);
              return (
                <button
                  onClick={() => setIsEditingSpeaker(!isEditingSpeaker)}
                  title="Click to change speaker"
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 cursor-pointer transition-transform hover:scale-105",
                    col.bg, col.text, col.border
                  )}
                >
                  <User size={10} />
                  <span>{caption.speaker}</span>
                </button>
              );
            })() : (
              <button
                onClick={() => setIsEditingSpeaker(!isEditingSpeaker)}
                title="Assign speaker to this segment"
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-md border inline-flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer",
                  isLight ? "border-dashed border-zinc-300 text-zinc-500 hover:bg-zinc-100" : "border-dashed border-white/20 text-zinc-400 hover:bg-white/5"
                )}
              >
                <User size={9} />
                <span>+ Speaker</span>
              </button>
            )}

            {isEditingSpeaker && (
              <div className={cn(
                "absolute left-0 top-full mt-1.5 w-48 rounded-xl border shadow-xl z-50 p-2 space-y-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150",
                isLight ? "bg-white/95 border-zinc-200 text-zinc-800" : "bg-[#1C1C20]/95 border-white/10 text-white"
              )}>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  <span>Assign Speaker</span>
                  <button onClick={() => setIsEditingSpeaker(false)} className="hover:text-zinc-600 dark:hover:text-zinc-200">
                    <X size={11} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {['Speaker 1', 'Speaker 2', 'Speaker 3', 'Host', 'Guest'].map((spk) => {
                    const col = getSpeakerColor(spk);
                    return (
                      <button
                        key={spk}
                        onClick={() => {
                          onUpdateSpeaker(caption.id, spk);
                          setIsEditingSpeaker(false);
                        }}
                        className={cn(
                          "px-2 py-1 text-[10.5px] font-bold rounded-lg border text-left truncate cursor-pointer transition-all",
                          col.bg, col.text, col.border,
                          caption.speaker === spk ? "ring-2 ring-auralis" : "hover:scale-105"
                        )}
                      >
                        {spk}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-1.5 border-t border-black/5 dark:border-white/5 flex gap-1">
                  <input
                    type="text"
                    placeholder="Custom name..."
                    value={customSpeakerInput}
                    onChange={(e) => setCustomSpeakerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUpdateSpeaker(caption.id, customSpeakerInput.trim() || null);
                        setIsEditingSpeaker(false);
                      }
                    }}
                    className={cn(
                      "flex-1 px-2 py-1 text-xs rounded-lg border outline-none",
                      isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900" : "bg-black/20 border-white/10 text-white"
                    )}
                  />
                  <button
                    onClick={() => {
                      onUpdateSpeaker(caption.id, customSpeakerInput.trim() || null);
                      setIsEditingSpeaker(false);
                    }}
                    className="px-2 py-1 rounded-lg bg-auralis text-white text-xs font-bold hover:opacity-90 cursor-pointer"
                  >
                    Set
                  </button>
                </div>
                {caption.speaker && (
                  <button
                    onClick={() => {
                      onUpdateSpeaker(caption.id, null);
                      setIsEditingSpeaker(false);
                    }}
                    className="w-full text-center text-[10px] text-red-400 hover:underline pt-1 cursor-pointer"
                  >
                    Remove Speaker
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Timestamps */}
          {isEditingTiming ? (
            <div className="flex items-center gap-1 text-[11px] shrink-0">
              <input 
                type="number"
                step="0.1"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                className="w-14 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 text-center font-mono outline-none"
              />
              <span className="text-zinc-400">→</span>
              <input 
                type="number"
                step="0.1"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                className="w-14 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 text-center font-mono outline-none"
              />
              <button 
                onClick={handleTimingBlur}
                className="p-1 rounded bg-auralis text-white hover:opacity-90 cursor-pointer"
              >
                <Check size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTiming(true)}
              className="flex items-center gap-1 text-[10.5px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0"
              title="Click to edit timestamps"
            >
              <Clock size={11} />
              <span>{formatTime(caption.start)} → {formatTime(caption.end)}</span>
              <span className="text-[9.5px] px-1 py-0.2 rounded bg-black/5 dark:bg-white/5 font-sans font-semibold text-zinc-500">
                {duration.toFixed(1)}s
              </span>
            </button>
          )}
        </div>

        {/* Emotion Selector / Badges & Action Menu */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Emotion Badge Selector */}
          <div className="relative">
            <button
              onClick={() => setIsEditingEmotion(!isEditingEmotion)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer",
                caption.emotion && caption.emotion !== 'neutral'
                  ? "bg-auralis/15 border-auralis/30 text-auralis"
                  : isLight ? "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200" : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
              )}
            >
              <Smile size={11} />
              <span>{caption.emotion && caption.emotion !== 'neutral' ? `[${caption.emotion}]` : '+ Emotion'}</span>
              <ChevronDown size={10} className="opacity-60" />
            </button>

            {isEditingEmotion && (
              <div className={cn(
                "absolute right-0 top-full mt-1.5 w-48 rounded-xl border shadow-xl z-50 p-1.5 space-y-0.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150",
                isLight ? "bg-white/95 border-zinc-200 text-zinc-800" : "bg-[#1C1C20]/95 border-white/10 text-white"
              )}>
                <div className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 text-zinc-400">
                  Select Emotion Tag
                </div>
                {EMOTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onUpdateEmotion(caption.id, opt.id);
                      setIsEditingEmotion(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left cursor-pointer",
                      caption.emotion === opt.id 
                        ? "bg-auralis text-white font-bold" 
                        : "hover:bg-black/5 dark:hover:bg-white/10"
                    )}
                  >
                    <span>{opt.icon}</span>
                    <span className="flex-1">{opt.label}</span>
                    {caption.emotion === opt.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Split Segment */}
          <button
            onClick={() => onSplit(caption.id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Split caption into two segments"
          >
            <Scissors size={13} />
          </button>

          {/* Quick Insert Below */}
          <button
            onClick={() => onInsertAfter(caption.id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Insert new caption below"
          >
            <Plus size={13} />
          </button>

          {/* Merge Next */}
          <button
            onClick={() => onMergeNext(caption.id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Merge with next caption"
          >
            <Split size={13} />
          </button>

          {/* Delete Caption */}
          <button
            onClick={() => onDelete(caption.id)}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Delete caption"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Main Text Field */}
      <textarea
        value={caption.text}
        onChange={(e) => onUpdateText(caption.id, e.target.value)}
        placeholder="Type caption text or [emotion] bracket here..."
        className={cn(
          "w-full bg-transparent resize-none outline-none text-sm font-semibold leading-relaxed transition-colors",
          isActive 
            ? (isLight ? "text-zinc-900 font-bold" : "text-white font-bold") 
            : (isLight ? "text-zinc-800" : "text-zinc-200")
        )}
        rows={Math.max(1, caption.text.split('\n').length)}
        spellCheck={false}
      />
    </div>
  );
});

export const CaptionsListPanel = React.memo(function CaptionsListPanel({ captions, onUpdateCaptions }: CaptionsListPanelProps) {
  const isLight = useStore(state => state.theme === 'light');
  const captionMode = useStore(state => state.captionMode || 'standard');
  const setCaptionMode = useStore(state => state.setCaptionMode);
  const customConfig = useStore(state => state.customAccessibilityConfig);
  const semanticTimeline = useStore(state => state.semanticTimeline);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [isSpeakerBatchOpen, setIsSpeakerBatchOpen] = useState(false);
  const [batchSpeakerName, setBatchSpeakerName] = useState('Speaker 1');

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const style = useStore(state => state.style);
  const setStyle = useStore(state => state.setStyle);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const setIsPlaying = useStore(state => state.setIsPlaying);
  const setCurrentTime = useStore(state => state.setCurrentTime);

  const handleSeek = useCallback((time: number) => {
    setIsPlaying(false);
    setCurrentTime(time);
  }, [setIsPlaying, setCurrentTime]);

  const updateCaptionText = useCallback((id: string, text: string) => {
    const newCaptions = captions.map(c => c.id === id ? { ...c, text, words: undefined } : c);
    onUpdateCaptions(newCaptions);
  }, [captions, onUpdateCaptions]);

  const updateCaptionEmotion = useCallback((id: string, emotionId: string) => {
    const newCaptions = captions.map(c => {
      if (c.id !== id) return c;
      const bracket = emotionId !== 'neutral' ? `[${emotionId}]` : null;
      let cleanText = c.text.replace(/^\[[^\]]+\]\s*/, '').trim();
      const newText = bracket ? `${bracket} ${cleanText}` : cleanText;
      return {
        ...c,
        emotion: emotionId,
        text: newText,
        bracketLabel: bracket
      };
    });
    onUpdateCaptions(newCaptions);
  }, [captions, onUpdateCaptions]);

  const updateCaptionTiming = useCallback((id: string, start: number, end: number) => {
    const newCaptions = captions.map(c => c.id === id ? { ...c, start, end } : c);
    onUpdateCaptions(newCaptions.sort((a, b) => a.start - b.start));
  }, [captions, onUpdateCaptions]);

  const updateCaptionSpeaker = useCallback((id: string, speaker: string | null) => {
    const newCaptions = captions.map(c => c.id === id ? { ...c, speaker: speaker || undefined } : c);
    onUpdateCaptions(newCaptions);
  }, [captions, onUpdateCaptions]);

  const handleDeleteCaption = useCallback((id: string) => {
    const newCaptions = captions.filter(c => c.id !== id);
    onUpdateCaptions(newCaptions);
  }, [captions, onUpdateCaptions]);

  const handleInsertAfter = useCallback((id: string) => {
    const index = captions.findIndex(c => c.id === id);
    if (index === -1) return;
    const current = captions[index];
    const nextStart = current.end + 0.1;
    const nextEnd = nextStart + 2.0;

    const newSegment: CaptionSegment = {
      id: `caption-${Date.now()}`,
      start: nextStart,
      end: nextEnd,
      text: 'New subtitle phrase...',
      emotion: 'neutral',
      speechStyle: 'normal',
      speaker: current.speaker
    };

    const newCaptions = [...captions];
    newCaptions.splice(index + 1, 0, newSegment);
    onUpdateCaptions(newCaptions);
  }, [captions, onUpdateCaptions]);

  const handleMergeNext = useCallback((id: string) => {
    const index = captions.findIndex(c => c.id === id);
    if (index === -1 || index >= captions.length - 1) return;
    const current = captions[index];
    const next = captions[index + 1];

    const mergedSegment: CaptionSegment = {
      ...current,
      end: next.end,
      text: `${current.text} ${next.text}`,
      words: current.words && next.words ? [...current.words, ...next.words] : undefined
    };

    const newCaptions = captions.filter((_, i) => i !== index + 1).map((c, i) => i === index ? mergedSegment : c);
    onUpdateCaptions(newCaptions);
  }, [captions, onUpdateCaptions]);

  const handleSplitCaption = useCallback((id: string) => {
    const index = captions.findIndex(c => c.id === id);
    if (index === -1) return;
    const current = captions[index];
    const words = current.text.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return;

    const midWordIndex = Math.ceil(words.length / 2);
    const text1 = words.slice(0, midWordIndex).join(' ');
    const text2 = words.slice(midWordIndex).join(' ');

    const midTime = current.start + (current.end - current.start) / 2;

    const seg1: CaptionSegment = {
      ...current,
      end: midTime,
      text: text1,
      words: undefined
    };

    const seg2: CaptionSegment = {
      id: `caption-${Date.now()}`,
      start: midTime + 0.05,
      end: current.end,
      text: text2,
      emotion: current.emotion,
      speechStyle: current.speechStyle,
      speaker: current.speaker,
      words: undefined
    };

    const newCaptions = [...captions];
    newCaptions.splice(index, 1, seg1, seg2);
    onUpdateCaptions(newCaptions);
  }, [captions, onUpdateCaptions]);

  const handleModeChange = useCallback((mode: AccessibilityCaptionMode, wordsPerSegOverride?: number) => {
    setCaptionMode(mode);
    const targetWords = wordsPerSegOverride || MODE_DEFAULT_WORDS_PER_SEGMENT[mode] || 5;
    setStyle({ wordsPerSegment: targetWords, textAlign: 'center', positionX: 50 });

    const source = semanticTimeline?.segments && semanticTimeline.segments.length > 0 
      ? semanticTimeline.segments 
      : captions;
    const soundEvents = semanticTimeline?.soundEvents || [];

    const formatted = getFormattedCaptionsForMode(
      source,
      soundEvents,
      mode,
      customConfig,
      targetWords
    );

    const updated: CaptionSegment[] = formatted.map((item, idx) => ({
      id: item.id || `cap-${idx}`,
      start: item.start,
      end: item.end,
      text: item.displayText,
      emotion: item.emotion || 'neutral',
      speechStyle: item.speechStyle || 'normal',
      speaker: item.speaker,
      bracketLabel: item.emotionLabel || item.soundLabel,
      words: item.words,
    }));

    onUpdateCaptions(updated);
  }, [setCaptionMode, setStyle, semanticTimeline, captions, customConfig, onUpdateCaptions]);

  // Search & Replace Handlers
  const handleReplaceSingle = useCallback(() => {
    if (!searchTerm) return;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

    let replaced = false;
    const newCaptions = captions.map(c => {
      if (!replaced && regex.test(c.text)) {
        replaced = true;
        return {
          ...c,
          text: c.text.replace(regex, replaceTerm),
          words: undefined
        };
      }
      return c;
    });

    if (replaced) {
      onUpdateCaptions(newCaptions);
    }
  }, [searchTerm, replaceTerm, matchCase, captions, onUpdateCaptions]);

  const handleReplaceAll = useCallback(() => {
    if (!searchTerm) return;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

    const newCaptions = captions.map(c => {
      if (regex.test(c.text)) {
        return {
          ...c,
          text: c.text.replace(regex, replaceTerm),
          words: undefined
        };
      }
      return c;
    });

    onUpdateCaptions(newCaptions);
  }, [searchTerm, replaceTerm, matchCase, captions, onUpdateCaptions]);

  const handleBatchAssignSpeaker = useCallback((speakerName: string, onlyMatching: boolean) => {
    const newCaptions = captions.map(c => {
      if (onlyMatching && searchTerm) {
        const matches = matchCase 
          ? c.text.includes(searchTerm)
          : c.text.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matches) return c;
      }
      return {
        ...c,
        speaker: speakerName || undefined
      };
    });
    onUpdateCaptions(newCaptions);
    setIsSpeakerBatchOpen(false);
  }, [captions, searchTerm, matchCase, onUpdateCaptions]);

  const filteredCaptions = useMemo(() => {
    if (!searchTerm) return captions;
    const term = matchCase ? searchTerm : searchTerm.toLowerCase();
    return captions.filter(c => {
      const txt = matchCase ? c.text : c.text.toLowerCase();
      const emo = matchCase ? (c.emotion || '') : (c.emotion || '').toLowerCase();
      const spk = matchCase ? (c.speaker || '') : (c.speaker || '').toLowerCase();
      return txt.includes(term) || emo.includes(term) || spk.includes(term);
    });
  }, [captions, searchTerm, matchCase]);

  const matchCount = useMemo(() => {
    if (!searchTerm) return 0;
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    return captions.reduce((count, c) => count + (c.text.match(regex)?.length || 0), 0);
  }, [captions, searchTerm, matchCase]);

  const activeCaptionId = useStore(state => {
    const current = state.currentTime;
    return captions.find(c => current >= c.start && current <= c.end)?.id;
  });

  useEffect(() => {
    if (!searchTerm && scrollContainerRef.current && activeCaptionId) {
      const activeElement = scrollContainerRef.current.querySelector(`[data-caption-id="${activeCaptionId}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeCaptionId, searchTerm]);

  const totalWords = useMemo(() => {
    return captions.reduce((sum, c) => sum + c.text.split(/\s+/).filter(Boolean).length, 0);
  }, [captions]);

  const totalDuration = useMemo(() => {
    if (captions.length === 0) return 0;
    return Math.max(...captions.map(c => c.end));
  }, [captions]);

  const MODE_PILLS: { id: AccessibilityCaptionMode; label: string; icon: any }[] = [
    { id: 'standard', label: 'Standard', icon: FileText },
    { id: 'emotion', label: 'Emotion [😊]', icon: Smile },
    { id: 'sounds', label: 'Sound [🔊]', icon: Volume2 },
    { id: 'emotion_sounds', label: 'Emotion + Sound', icon: Activity },
    { id: 'adaptive', label: 'Adaptive Emphasis', icon: Zap },
    { id: 'full', label: 'Full Access', icon: Sparkles },
  ];

  return (
    <div className={cn(
      "w-full h-full flex flex-col transition-colors duration-200",
      isLight ? "bg-[#F8F9FA] text-zinc-900" : "bg-[#0F0F12] text-zinc-100"
    )}>
      {/* Top Main Header */}
      <div className={cn(
        "flex flex-col gap-3 px-5 py-4 border-b shrink-0 transition-colors",
        isLight ? "border-zinc-200/80 bg-white" : "border-white/5 bg-[#121215]"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold tracking-tight">Captions</h2>
            <span className={cn(
              "text-[11px] font-extrabold px-2 py-0.5 rounded-full border",
              isLight ? "bg-zinc-100 border-zinc-200 text-zinc-600" : "bg-white/10 border-white/10 text-zinc-300"
            )}>
              {captions.length} Segments
            </span>
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
              ({formatTime(totalDuration)})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Search & Replace Toggle */}
            <button 
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) {
                  setIsReplaceOpen(false);
                  setSearchTerm('');
                }
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer",
                isSearchOpen 
                  ? "bg-auralis/15 border-auralis text-auralis" 
                  : isLight ? "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700" : "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              )}
              title="Search & Replace in Captions (Ctrl+F)"
            >
              <Search size={13} />
              <span className="hidden sm:inline">Search</span>
            </button>

            {/* Batch Speaker Manager */}
            <button
              onClick={() => setIsSpeakerBatchOpen(!isSpeakerBatchOpen)}
              className={cn(
                "px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer",
                isSpeakerBatchOpen
                  ? "bg-auralis/15 border-auralis text-auralis"
                  : isLight ? "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700" : "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              )}
              title="Batch assign speaker names"
            >
              <Users size={13} />
              <span className="hidden md:inline">Speakers</span>
            </button>

            {/* Bionic Reading Quick Toggle */}
            <button
              onClick={() => setStyle({ bionicReadingEnabled: !style.bionicReadingEnabled })}
              className={cn(
                "px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer",
                style.bionicReadingEnabled
                  ? "bg-auralis/15 border-auralis text-auralis shadow-xs"
                  : isLight 
                    ? "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700" 
                    : "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              )}
              title="Toggle Bionic Reading Mode (bolds word prefixes for ADHD/focus)"
            >
              <Eye size={13} className={style.bionicReadingEnabled ? "text-auralis" : ""} />
              <span className="hidden lg:inline">Bionic</span>
            </button>

            {/* Speaker Badges Toggle */}
            <button
              onClick={() => setStyle({ showSpeakerBadges: !style.showSpeakerBadges })}
              className={cn(
                "px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer",
                style.showSpeakerBadges
                  ? "bg-auralis/15 border-auralis text-auralis shadow-xs"
                  : isLight 
                    ? "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700" 
                    : "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              )}
              title="Toggle on-screen speaker badges on active captions"
            >
              <User size={13} className={style.showSpeakerBadges ? "text-auralis" : ""} />
              <span className="hidden lg:inline">Badges</span>
            </button>

            {/* Translate Button */}
            <button
              onClick={() => setIsTranslateOpen(true)}
              className={cn(
                "px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer",
                isLight 
                  ? "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700" 
                  : "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              )}
              title="Translate Subtitles while preserving emotion brackets"
            >
              <Globe size={13} className="text-auralis" />
              <span className="hidden md:inline">Translate</span>
            </button>

            {/* AI Summary Card Button */}
            <button
              onClick={() => setIsSummaryOpen(true)}
              className={cn(
                "px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer",
                isLight 
                  ? "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700" 
                  : "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              )}
              title="Generate accessible plain-language cognitive summary card"
            >
              <Brain size={13} className="text-auralis" />
              <span className="hidden md:inline">Summary</span>
            </button>

            {/* Quick Add Caption Button */}
            <button
              onClick={() => {
                const last = captions[captions.length - 1];
                const start = last ? last.end + 0.1 : 0;
                const end = start + 2.0;
                const newCap: CaptionSegment = {
                  id: `cap-${Date.now()}`,
                  start,
                  end,
                  text: 'New subtitle phrase...',
                  emotion: 'neutral',
                  speechStyle: 'normal'
                };
                onUpdateCaptions([...captions, newCap]);
              }}
              className="px-3 py-1.5 rounded-xl bg-auralis hover:bg-auralis/90 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Plus size={14} />
              <span>Add Caption</span>
            </button>
          </div>
        </div>

        {/* Search & Replace Expanded Bar */}
        {isSearchOpen && (
          <div className={cn(
            "p-3 rounded-2xl border space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150",
            isLight ? "bg-zinc-50/80 border-zinc-200" : "bg-[#18181C] border-white/10"
          )}>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Find in captions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "w-full pl-8 pr-7 py-1.5 text-xs rounded-xl outline-none border transition-all",
                    isLight ? "bg-white border-zinc-200 text-zinc-900 focus:border-auralis" : "bg-[#121215] border-white/10 text-white focus:border-auralis"
                  )}
                  autoFocus
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Replace Input */}
              <div className="relative flex-1 min-w-[180px]">
                <Replace size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  className={cn(
                    "w-full pl-8 pr-3 py-1.5 text-xs rounded-xl outline-none border transition-all",
                    isLight ? "bg-white border-zinc-200 text-zinc-900 focus:border-auralis" : "bg-[#121215] border-white/10 text-white focus:border-auralis"
                  )}
                />
              </div>

              {/* Match Case */}
              <button
                onClick={() => setMatchCase(!matchCase)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                  matchCase ? "bg-auralis text-white border-auralis" : isLight ? "bg-white border-zinc-200 text-zinc-600" : "bg-white/5 border-white/10 text-zinc-400"
                )}
                title="Match case sensitive"
              >
                Aa
              </button>

              {/* Replace Actions */}
              <button
                onClick={handleReplaceSingle}
                disabled={!searchTerm}
                className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/20 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                disabled={!searchTerm}
                className="px-3 py-1.5 rounded-xl bg-auralis hover:bg-auralis/90 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-xs"
              >
                Replace All
              </button>
            </div>

            {searchTerm && (
              <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 font-medium">
                <span>{matchCount} match{matchCount !== 1 ? 'es' : ''} found in {filteredCaptions.length} segments</span>
                <span>Press Enter or Replace All to apply changes</span>
              </div>
            )}
          </div>
        )}

        {/* Batch Speaker Manager Drawer */}
        {isSpeakerBatchOpen && (
          <div className={cn(
            "p-3.5 rounded-2xl border space-y-3 animate-in fade-in slide-in-from-top-2 duration-150",
            isLight ? "bg-zinc-50/80 border-zinc-200" : "bg-[#18181C] border-white/10"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-auralis">
                <Users size={13} /> Batch Assign Speaker
              </span>
              <button onClick={() => setIsSpeakerBatchOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={13} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Speaker name (e.g. Speaker 1, John)..."
                value={batchSpeakerName}
                onChange={(e) => setBatchSpeakerName(e.target.value)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs rounded-xl border outline-none",
                  isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-[#121215] border-white/10 text-white"
                )}
              />
              <button
                onClick={() => handleBatchAssignSpeaker(batchSpeakerName, true)}
                disabled={!searchTerm}
                className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/20 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                title="Assign only to segments matching search term"
              >
                Apply to Filtered ({filteredCaptions.length})
              </button>
              <button
                onClick={() => handleBatchAssignSpeaker(batchSpeakerName, false)}
                className="px-3 py-1.5 rounded-xl bg-auralis hover:bg-auralis/90 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Apply to All ({captions.length})
              </button>
            </div>
          </div>
        )}

        {/* Caption Mode Switcher Pills & Presets Bar */}
        <div className="space-y-2">
          {/* Mode Selector Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 shrink-0 mr-1">
              Mode:
            </span>
            {MODE_PILLS.map((pill) => {
              const Icon = pill.icon;
              const isSelected = captionMode === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => handleModeChange(pill.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all shrink-0 cursor-pointer",
                    isSelected
                      ? "bg-auralis text-white border-auralis shadow-xs"
                      : isLight 
                        ? "bg-zinc-100/80 border-zinc-200/80 text-zinc-700 hover:bg-zinc-200" 
                        : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  )}
                >
                  <Icon size={12} />
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Presets Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-auralis shrink-0 mr-1 flex items-center gap-1">
              <Sparkles size={11} /> Style Preset:
            </span>
            {QUICK_PRESETS.map((preset) => {
              const isSelected = style.animationStyle === preset.style.animationStyle;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setStyle(preset.style);
                    if (!captionMode || captionMode === 'standard') {
                      setCaptionMode('emotion_sounds');
                    }
                  }}
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border transition-all shrink-0 cursor-pointer",
                    isSelected
                      ? "bg-auralis/20 text-auralis border-auralis font-extrabold"
                      : isLight 
                        ? "bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300" 
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Granular Quick Styles Row (Font, Size, Words per segment) */}
          <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar py-1 px-2.5 rounded-xl border border-dashed border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-xs">
            {/* Font Family Quick Select */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Type size={12} className="text-zinc-400" />
              <select
                value={style.fontFamily || 'Montserrat'}
                onChange={(e) => setStyle({ fontFamily: e.target.value })}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-semibold rounded-lg border outline-none cursor-pointer",
                  isLight ? "bg-white border-zinc-200 text-zinc-800" : "bg-[#18181C] border-white/10 text-white"
                )}
              >
                {FONT_FAMILIES.slice(0, 16).map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Font Size Quick Slider */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-zinc-400">Size:</span>
              <span className="text-[11px] font-mono font-bold text-auralis w-6">{style.fontSize}</span>
              <input
                type="range"
                min="18"
                max="96"
                value={style.fontSize || 64}
                onChange={(e) => setStyle({ fontSize: parseInt(e.target.value) })}
                className="w-16 h-1 accent-auralis cursor-pointer"
              />
            </div>

            {/* Words Per Segment Quick Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-zinc-400">Words/line:</span>
              <div className="flex items-center gap-0.5">
                {[1, 3, 5, 7, 10].map(w => (
                  <button
                    key={w}
                    onClick={() => {
                      setStyle({ wordsPerSegment: w });
                      handleModeChange(captionMode, w);
                    }}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                      style.wordsPerSegment === w
                        ? "bg-auralis text-white font-extrabold"
                        : isLight ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" : "bg-white/10 text-zinc-400 hover:bg-white/20"
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Lines Quick Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-zinc-400">Lines:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map(l => (
                  <button
                    key={l}
                    onClick={() => setStyle({ maxLines: l })}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer",
                      style.maxLines === l
                        ? "bg-auralis text-white font-extrabold"
                        : isLight ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" : "bg-white/10 text-zinc-400 hover:bg-white/20"
                    )}
                  >
                    {l}L
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Captions List Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5 scroll-smooth">
        {filteredCaptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border",
              isLight ? "bg-zinc-100 border-zinc-200 text-zinc-400" : "bg-white/5 border-white/10 text-zinc-500"
            )}>
              <AlignLeft size={24} />
            </div>
            <div>
              <p className="text-sm font-bold">No captions found</p>
              <p className="text-xs text-zinc-400 mt-1">
                {searchTerm ? `No segments match "${searchTerm}"` : 'Upload a video or add your first subtitle line to get started.'}
              </p>
            </div>
          </div>
        ) : (
          filteredCaptions.map((caption, index) => (
            <CaptionItem
              key={caption.id}
              caption={caption}
              index={index}
              isLight={isLight}
              onUpdateText={updateCaptionText}
              onUpdateEmotion={updateCaptionEmotion}
              onUpdateTiming={updateCaptionTiming}
              onUpdateSpeaker={updateCaptionSpeaker}
              onDelete={handleDeleteCaption}
              onInsertAfter={handleInsertAfter}
              onMergeNext={handleMergeNext}
              onSplit={handleSplitCaption}
              onSeek={handleSeek}
              searchTerm={searchTerm}
            />
          ))
        )}
      </div>

      {/* Bottom Footer Status Bar */}
      <div className={cn(
        "px-5 py-2.5 border-t shrink-0 flex items-center justify-between text-[11px] font-medium transition-colors",
        isLight ? "border-zinc-200 bg-white text-zinc-500" : "border-white/5 bg-[#121215] text-zinc-400"
      )}>
        <div className="flex items-center gap-3">
          <span>Words: <strong className={isLight ? "text-zinc-800" : "text-white"}>{totalWords}</strong></span>
          <span>•</span>
          <span>Duration: <strong className={isLight ? "text-zinc-800" : "text-white"}>{totalDuration.toFixed(1)}s</strong></span>
          <span>•</span>
          <span>Font: <strong className={isLight ? "text-zinc-800" : "text-white"}>{style.fontFamily || 'Montserrat'}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="capitalize font-semibold text-auralis">
            Mode: {captionMode.replace('_', ' + ')}
          </span>
        </div>
      </div>

      {/* Modals for Translation & Cognitive Summary */}
      <TranslationModal
        isOpen={isTranslateOpen}
        onClose={() => setIsTranslateOpen(false)}
        captions={captions}
        onUpdateCaptions={onUpdateCaptions}
        isLight={isLight}
      />

      <CognitiveSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        captions={captions}
        isLight={isLight}
      />
    </div>
  );
});
