import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { GlobalStyle, AccessibilityProfile, AccessibilityCaptionMode, CustomAccessibilityConfig } from '../../types';
import { FONT_FAMILIES, DEFAULT_STYLE } from '../../constants';
import { Settings2, Monitor, Layers, FileText, Sparkles, Brain, Check, Volume2, Smile, Activity, Zap, RefreshCw, Sliders, Download, Eye, Tag } from 'lucide-react';
import { getFormattedCaptionsForMode, MODE_DEFAULT_WORDS_PER_SEGMENT, DEFAULT_CUSTOM_CONFIG } from '../../lib/captionFormatter';

import { CaptionSegment } from '../../types';
import { useStore } from '../../store';

interface CaptionAccessibilityPanelProps {
  currentStyle: GlobalStyle;
  updateStyle: (updates: Partial<GlobalStyle>) => void;
  accessibilitySettings: any;
  updateAccessibility: (updates: any) => void;
  isLight: boolean;
  captions: CaptionSegment[];
  onUpdateCaptions: (c: CaptionSegment[]) => void;
  session: any;
}

export function CaptionAccessibilityPanel({
  currentStyle,
  updateStyle,
  accessibilitySettings,
  updateAccessibility,
  isLight,
  captions,
  onUpdateCaptions,
  session
}: CaptionAccessibilityPanelProps) {
  const [activeSection, setActiveSection] = useState<string>('modes');
  const store = useStore();

  const captionMode = store.captionMode || 'standard';
  const customConfig = store.customAccessibilityConfig;
  const isAnalyzing = store.isAnalyzingSemantic;
  const analysisStep = store.semanticAnalysisStep;

  const handleModeSelect = (mode: AccessibilityCaptionMode) => {
    store.setCaptionMode(mode);
    const targetWords = MODE_DEFAULT_WORDS_PER_SEGMENT[mode] || 5;
    store.setStyle({ wordsPerSegment: targetWords });
    updateStyle({ wordsPerSegment: targetWords });

    if (captions && captions.length > 0 && onUpdateCaptions) {
      const semTimeline = store.semanticTimeline;
      const sourceSegments = (semTimeline?.segments && semTimeline.segments.length > 0)
        ? semTimeline.segments
        : captions;
      const soundEvents = semTimeline?.soundEvents || [];

      const formatted = getFormattedCaptionsForMode(
        sourceSegments,
        soundEvents,
        mode,
        store.customAccessibilityConfig,
        targetWords
      );

      const updatedCaptions: CaptionSegment[] = formatted.map((item, idx) => ({
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

      onUpdateCaptions(updatedCaptions);
    }
  };

  const handleCustomToggle = (key: keyof CustomAccessibilityConfig, value: boolean | number) => {
    store.setCustomAccessibilityConfig({ [key]: value });
  };

  const handleRunFullSemanticAnalysis = async () => {
    if (captions.length === 0) return;
    
    store.setIsAnalyzingSemantic(true);
    store.setSemanticAnalysisError(null);
    store.setSemanticAnalysisStep("1/3 Preparing analysis data...");

    try {
      let audioBase64: string | undefined = undefined;
      let mimeType: string | undefined = undefined;

      // Only convert to base64 if file is present; slice to max 5MB chunk to prevent RangeError: Invalid string length
      if (store.videoFile) {
        try {
          const maxChunk = 5 * 1024 * 1024;
          const fileChunk = store.videoFile.size > maxChunk
            ? store.videoFile.slice(0, maxChunk)
            : store.videoFile;
          mimeType = store.videoFile.type || 'audio/mp3';
          audioBase64 = await new Promise<string | undefined>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const res = reader.result as string;
                if (!res || typeof res !== 'string') return resolve(undefined);
                const base64 = res.includes(',') ? res.split(',')[1] : res;
                resolve(base64);
              } catch {
                resolve(undefined);
              }
            };
            reader.onerror = () => resolve(undefined);
            reader.readAsDataURL(fileChunk);
          });
        } catch (fErr) {
          console.warn("Could not read local video file for audio context:", fErr);
          audioBase64 = undefined;
        }
      }

      store.setSemanticAnalysisStep("1/3 Speech & emotion analysis with Gemini...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for multi-modal analysis

      let reqBody: string;
      try {
        reqBody = JSON.stringify({ 
          segments: captions.slice(0, 300),
          audioBase64,
          mediaUrl: !audioBase64 ? store.videoUrl : undefined,
          mimeType,
        });
      } catch {
        // Fallback without audioBase64 if stringifying fails due to size
        reqBody = JSON.stringify({
          segments: captions.slice(0, 300),
          mediaUrl: store.videoUrl,
          mimeType,
        });
      }

      let res: Response;
      try {
        res = await fetch("/api/analyze-auralis-semantic", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": session?.access_token ? `Bearer ${session.access_token}` : "Bearer guest"
          },
          signal: controller.signal,
          body: reqBody
        });
      } catch (fErr: any) {
        clearTimeout(timeoutId);
        if (fErr.name === 'AbortError') {
          throw new Error("Analysis timed out. Please try again with shorter media or fewer captions.");
        }
        throw new Error(fErr.message || "Network error during semantic analysis.");
      }

      clearTimeout(timeoutId);

      const responseText = await res.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        if (!res.ok) {
          if (responseText.includes('<!doctype') || responseText.includes('<html')) {
            throw new Error(`Semantic analysis service temporarily unavailable (${res.status}).`);
          }
          throw new Error(`Semantic analysis error (${res.status}): ${responseText.substring(0, 150)}`);
        }
        throw new Error('Received invalid response format from semantic analysis.');
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Semantic analysis request failed (${res.status}).`);
      }

      store.setSemanticAnalysisStep("2/3 Processing non-speech sound events...");

      if (data?.segments) {
        store.setSemanticAnalysisStep("3/3 Building semantic timeline...");
        store.setSemanticTimeline({
          segments: data.segments,
          soundEvents: data.soundEvents || [],
          analyzedAt: data.analyzedAt || new Date().toISOString()
        });
        onUpdateCaptions(data.segments);
      }
    } catch (err: any) {
      console.error("Auralis Semantic Engine Error:", err);
      store.setSemanticAnalysisError(err.message || "AI Analysis failed. Standard captions remain active.");
    } finally {
      store.setIsAnalyzingSemantic(false);
      store.setSemanticAnalysisStep("");
    }
  };

  const SECTIONS = [
    { id: 'modes', label: 'Caption Modes', icon: Sparkles },
    { id: 'bionic', label: 'Bionic & Focus', icon: Eye },
    { id: 'accessibility', label: 'Profiles', icon: Brain },
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'readability', label: 'Readability', icon: Layers },
    { id: 'preview', label: 'Preview', icon: Monitor },
  ];

  const CAPTION_MODES: { id: AccessibilityCaptionMode; label: string; desc: string; icon: any }[] = [
    { 
      id: 'standard', 
      label: 'Standard', 
      desc: 'Clean transcript text. No emotion labels or sound cues.',
      icon: FileText 
    },
    { 
      id: 'emotion', 
      label: 'Emotion', 
      desc: 'Shows emotional tone in concise square brackets e.g. [angry], [whispering].',
      icon: Smile 
    },
    { 
      id: 'sounds', 
      label: 'Sound', 
      desc: 'Shows non-speech environmental sound events e.g. [door slams], [applause].',
      icon: Volume2 
    },
    { 
      id: 'emotion_sounds', 
      label: 'Emotion + Sound', 
      desc: 'Combines both speech emotion cues and audio sound event labels.',
      icon: Activity 
    },
    { 
      id: 'adaptive', 
      label: 'Adaptive', 
      desc: 'Visually emphasizes key phrases and structures lines for optimal comprehension.',
      icon: Zap 
    },
    { 
      id: 'full', 
      label: 'Full Accessibility', 
      desc: 'Combines emotion cues, sound events, speaker names, and adaptive visual emphasis.',
      icon: Sparkles 
    },
    { 
      id: 'custom', 
      label: 'Custom', 
      desc: 'Fine-tune individual accessibility toggles and confidence thresholds.',
      icon: Sliders 
    },
  ];

  const ACCESSIBILITY_PROFILES = [
    { id: 'standard', label: 'Standard', desc: 'Default balanced caption experience.' },
    { id: 'dyslexia', label: 'Dyslexia-Friendly', desc: 'Optimized spacing, font, and predictability.' },
    { id: 'low-vision', label: 'Low Vision', desc: 'Maximized contrast, size, and stable positioning.' },
    { id: 'attention', label: 'Attention-Friendly', desc: 'Reduced cognitive load, clear phrase boundaries.' },
    { id: 'cognitive', label: 'Cognitive-Friendly', desc: 'Simplified structure, slower pacing.' },
    { id: 'hearing', label: 'Hearing-Friendly', desc: 'Includes speaker ID and key audio cues.' },
    { id: 'custom', label: 'Custom', desc: 'Fully personalized accessibility settings.' },
  ];

  const handleProfileChange = (profileId: string) => {
    updateAccessibility({ profile: profileId });
    if (profileId === 'standard') {
      const targetWords = MODE_DEFAULT_WORDS_PER_SEGMENT['standard'] || 5;
      const fullResetStyle: GlobalStyle = {
        ...DEFAULT_STYLE,
        wordsPerSegment: targetWords,
        depthEnabled: false,
        accessibilityPreset: undefined,
        bionicReadingEnabled: false,
        showSpeakerBadges: true,
      };
      store.setStyle(fullResetStyle);
      updateStyle(fullResetStyle);
      store.setCaptionMode('standard');
      store.setCustomAccessibilityConfig(DEFAULT_CUSTOM_CONFIG);
      updateAccessibility({ profile: 'standard', reduceMotion: false });

      if (captions && captions.length > 0 && onUpdateCaptions) {
        const semTimeline = store.semanticTimeline;
        const sourceSegments = (semTimeline?.segments && semTimeline.segments.length > 0)
          ? semTimeline.segments
          : captions;
        const soundEvents = semTimeline?.soundEvents || [];
        const formatted = getFormattedCaptionsForMode(
          sourceSegments,
          soundEvents,
          'standard',
          DEFAULT_CUSTOM_CONFIG,
          targetWords
        );
        const updatedCaptions: CaptionSegment[] = formatted.map((item, idx) => ({
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
        onUpdateCaptions(updatedCaptions);
      }
    } else if (profileId === 'dyslexia') {
      updateStyle({
        fontFamily: '"OpenDyslexic", sans-serif',
        fontSize: 32,
        fontWeight: '400',
        letterSpacing: 2,
        lineHeight: 1.5,
        maxLines: 2,
        wordsPerSegment: 5,
        accessibilityPreset: 'dyslexia',
        animationStyle: 'ai-reactive',
        animationEnabled: true,
        backgroundColor: '#000000',
        backgroundOpacity: 80,
      });
      updateAccessibility({ profile: 'dyslexia', reduceMotion: false });
    } else if (profileId === 'low-vision') {
      updateStyle({
        fontSize: 54,
        fontWeight: '800',
        textColor: '#FFFFFF',
        backgroundColor: '#000000',
        backgroundOpacity: 100,
        outlineEnabled: true,
        outlineColor: '#000000',
        outlineWidth: 4,
        shadowEnabled: true,
        shadowIntensity: 1,
        lineHeight: 1.4,
        animationEnabled: false,
        animationStyle: 'flat',
      });
      updateAccessibility({ profile: 'low-vision', reduceMotion: true });
    } else if (profileId === 'attention') {
      updateStyle({
        fontFamily: 'Atkinson Hyperlegible, sans-serif',
        fontSize: 48,
        fontWeight: '700',
        bionicReadingEnabled: true,
        bionicReadingStrength: 0.5,
        wordsPerSegment: 4,
        maxLines: 1,
        lineHeight: 1.3,
        animationEnabled: true,
        animationStyle: 'ai-reactive',
      });
      updateAccessibility({ profile: 'attention', reduceMotion: false });
    } else if (profileId === 'cognitive') {
      updateStyle({
        fontFamily: 'Lexend, sans-serif',
        fontSize: 44,
        fontWeight: '600',
        wordsPerSegment: 3,
        maxLines: 1,
        lineHeight: 1.4,
        letterSpacing: 1,
        animationEnabled: false,
        animationStyle: 'flat',
      });
      updateAccessibility({ profile: 'cognitive', reduceMotion: true });
    } else if (profileId === 'hearing') {
      updateStyle({
        showSpeakerBadges: true,
        accessibilityPreset: 'hearing',
        fontSize: 48,
        fontWeight: '800',
        wordsPerSegment: 5,
        maxLines: 1,
      });
      updateAccessibility({ profile: 'hearing', reduceMotion: false });
    }
  };

  const currentProfile = accessibilitySettings?.profile || 'standard';

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Tabs */}
      <div className={cn(
        "flex flex-wrap gap-1 border-b pb-2",
        isLight ? "border-zinc-200" : "border-zinc-800"
      )}>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-md transition-colors cursor-pointer",
                activeSection === s.id
                  ? "bg-auralis/10 text-auralis font-bold"
                  : isLight
                    ? "text-zinc-700 font-semibold hover:text-zinc-900 hover:bg-zinc-100"
                    : "text-zinc-400 hover:text-white dark:hover:text-zinc-200"
              )}
            >
              <Icon size={12} />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 pr-1 space-y-6">
        
        {/* Caption Modes Section */}
        {activeSection === 'modes' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className={cn(
                "text-xs font-bold uppercase tracking-wider mb-1",
                isLight ? "text-zinc-800" : "text-zinc-400"
              )}>Select Accessibility Mode</h3>
              <p className={cn(
                "text-[11px] mb-3",
                isLight ? "text-zinc-600 font-medium" : "text-zinc-400"
              )}>Choose how speech emotions, sound events, and visual structure are represented.</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {CAPTION_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = captionMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleModeSelect(mode.id)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all text-left relative overflow-hidden cursor-pointer",
                      isSelected
                        ? isLight
                          ? "border-auralis bg-auralis/10 shadow-xs"
                          : "border-auralis bg-auralis/10 shadow-xs"
                        : isLight
                          ? "border-zinc-200 bg-white hover:border-auralis/50 hover:bg-zinc-50 shadow-xs text-zinc-900"
                          : "border-white/10 hover:border-white/20 bg-white/5 text-white"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg shrink-0 mt-0.5",
                      isSelected 
                        ? "bg-auralis text-white" 
                        : isLight ? "bg-zinc-100 text-zinc-600" : "bg-white/10 text-zinc-400"
                    )}>
                      <Icon size={14} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs font-bold",
                          isSelected 
                            ? "text-auralis" 
                            : isLight ? "text-zinc-900" : "text-white"
                        )}>
                          {mode.label}
                        </span>
                        {isSelected && <Check size={14} className="text-auralis font-bold" />}
                      </div>
                      <p className={cn(
                        "text-[10px] mt-0.5 leading-snug",
                        isLight ? "text-zinc-600 font-medium" : "text-zinc-400"
                      )}>
                        {mode.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Settings Toggles (Shown when Custom Mode is selected) */}
            {captionMode === 'custom' && (
              <div className={cn(
                "p-3.5 rounded-xl border space-y-3 mt-4",
                isLight ? "bg-white border-zinc-200 shadow-xs" : "border-white/10 bg-white/5"
              )}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-auralis flex items-center gap-1.5">
                  <Sliders size={12} /> Custom Feature Toggles
                </h4>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={cn("font-medium", isLight ? "text-zinc-800" : "text-zinc-200")}>Show Emotion Brackets</span>
                    <input 
                      type="checkbox" 
                      checked={customConfig.showEmotions} 
                      onChange={(e) => handleCustomToggle('showEmotions', e.target.checked)} 
                      className="accent-auralis cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={cn("font-medium", isLight ? "text-zinc-800" : "text-zinc-200")}>Show Non-Speech Sound Events</span>
                    <input 
                      type="checkbox" 
                      checked={customConfig.showSounds} 
                      onChange={(e) => handleCustomToggle('showSounds', e.target.checked)} 
                      className="accent-auralis cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={cn("font-medium", isLight ? "text-zinc-800" : "text-zinc-200")}>Speech Emphasis</span>
                    <input 
                      type="checkbox" 
                      checked={customConfig.showSpeechEmphasis} 
                      onChange={(e) => handleCustomToggle('showSpeechEmphasis', e.target.checked)} 
                      className="accent-auralis cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={cn("font-medium", isLight ? "text-zinc-800" : "text-zinc-200")}>Speaker Names</span>
                    <input 
                      type="checkbox" 
                      checked={customConfig.showSpeakerNames} 
                      onChange={(e) => handleCustomToggle('showSpeakerNames', e.target.checked)} 
                      className="accent-auralis cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={cn("font-medium", isLight ? "text-zinc-800" : "text-zinc-200")}>Whispering Labels</span>
                    <input 
                      type="checkbox" 
                      checked={customConfig.showWhisperingLabels} 
                      onChange={(e) => handleCustomToggle('showWhisperingLabels', e.target.checked)} 
                      className="accent-auralis cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={cn("font-medium", isLight ? "text-zinc-800" : "text-zinc-200")}>Shouting Labels</span>
                    <input 
                      type="checkbox" 
                      checked={customConfig.showShoutingLabels} 
                      onChange={(e) => handleCustomToggle('showShoutingLabels', e.target.checked)} 
                      className="accent-auralis cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className={cn("font-medium", isLight ? "text-zinc-800" : "text-zinc-200")}>Adaptive Visual Emphasis</span>
                    <input 
                      type="checkbox" 
                      checked={customConfig.adaptiveVisualEmphasis} 
                      onChange={(e) => handleCustomToggle('adaptiveVisualEmphasis', e.target.checked)} 
                      className="accent-auralis cursor-pointer"
                    />
                  </label>
                </div>

                <div className={cn(
                  "pt-2 border-t space-y-3",
                  isLight ? "border-zinc-200" : "border-white/10"
                )}>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className={cn("font-semibold", isLight ? "text-zinc-700" : "text-zinc-400")}>Emotion Confidence Threshold</span>
                      <span className="font-mono text-auralis font-bold">{Math.round(customConfig.emotionThreshold * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.40"
                      max="0.95"
                      step="0.05"
                      value={customConfig.emotionThreshold}
                      onChange={(e) => handleCustomToggle('emotionThreshold', parseFloat(e.target.value))}
                      className="w-full accent-auralis h-1 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className={cn("font-semibold", isLight ? "text-zinc-700" : "text-zinc-400")}>Sound Confidence Threshold</span>
                      <span className="font-mono text-auralis font-bold">{Math.round(customConfig.soundThreshold * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.40"
                      max="0.95"
                      step="0.05"
                      value={customConfig.soundThreshold}
                      onChange={(e) => handleCustomToggle('soundThreshold', parseFloat(e.target.value))}
                      className="w-full accent-auralis h-1 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bionic Reading & Neuro Focus Section */}
        {activeSection === 'bionic' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-auralis mb-1 flex items-center gap-1.5">
                <Eye size={14} /> Neurodivergent Bionic Focus
              </h3>
              <p className={cn(
                "text-[11px]",
                isLight ? "text-zinc-600 font-medium" : "text-zinc-400"
              )}>
                Bolds word prefixes to guide eye movements, enhancing reading comprehension for ADHD and dyslexic viewers.
              </p>
            </div>

            {/* Bionic Toggle Card */}
            <div className={cn(
              "p-4 rounded-xl border flex items-center justify-between gap-3 transition-all",
              currentStyle.bionicReadingEnabled
                ? "bg-auralis/10 border-auralis shadow-xs"
                : isLight ? "bg-white border-zinc-200 shadow-xs" : "bg-white/5 border-white/10"
            )}>
              <div>
                <span className={cn(
                  "text-xs font-bold block",
                  isLight ? "text-zinc-900" : "text-white"
                )}>
                  Bionic Reading Mode
                </span>
                <span className={cn(
                  "text-[10px] block mt-0.5",
                  isLight ? "text-zinc-500 font-medium" : "text-zinc-400"
                )}>
                  Bolds first 40–50% of letters in each word
                </span>
              </div>
              <input
                type="checkbox"
                checked={currentStyle.bionicReadingEnabled || false}
                onChange={(e) => updateStyle({ bionicReadingEnabled: e.target.checked })}
                className="accent-auralis w-4 h-4 rounded cursor-pointer"
              />
            </div>

            {/* Bionic Strength Slider */}
            {currentStyle.bionicReadingEnabled && (
              <div className={cn(
                "p-3.5 rounded-xl border space-y-2",
                isLight ? "bg-white border-zinc-200 shadow-xs" : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10"
              )}>
                <div className="flex justify-between items-center text-xs">
                  <span className={cn("font-semibold", isLight ? "text-zinc-800" : "text-zinc-300")}>Bold Prefix Strength</span>
                  <span className="font-mono text-auralis font-bold">
                    {Math.round((currentStyle.bionicReadingStrength || 0.45) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="0.75"
                  step="0.05"
                  value={currentStyle.bionicReadingStrength || 0.45}
                  onChange={(e) => updateStyle({ bionicReadingStrength: parseFloat(e.target.value) })}
                  className="w-full accent-auralis h-1.5 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Speaker Diarization Badges Toggle */}
            <div className={cn(
              "p-4 rounded-xl border flex items-center justify-between gap-3",
              isLight ? "bg-white border-zinc-200 shadow-xs" : "bg-white/5 border-white/10"
            )}>
              <div>
                <span className={cn("text-xs font-bold block", isLight ? "text-zinc-900" : "text-white")}>
                  Speaker Diarization Badges
                </span>
                <span className={cn("text-[10px] block mt-0.5", isLight ? "text-zinc-500 font-medium" : "text-zinc-400")}>
                  Display color-coded badges for speakers [Speaker 1 • Cyan]
                </span>
              </div>
              <input
                type="checkbox"
                checked={currentStyle.showSpeakerBadges !== false}
                onChange={(e) => updateStyle({ showSpeakerBadges: e.target.checked })}
                className="accent-auralis w-4 h-4 rounded cursor-pointer"
              />
            </div>

            {/* Hyperlegible Font Quick Pick */}
            <div className={cn(
              "space-y-2 pt-2 border-t",
              isLight ? "border-zinc-200" : "border-white/10"
            )}>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider block",
                isLight ? "text-zinc-800" : "text-zinc-400"
              )}>
                Quick Dyslexia & Hyperlegible Fonts
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Atkinson Hyperlegible', font: 'Atkinson Hyperlegible, sans-serif' },
                  { name: 'OpenDyslexic', font: 'OpenDyslexic, sans-serif' },
                  { name: 'Lexend', font: 'Lexend, sans-serif' },
                  { name: 'Plus Jakarta', font: 'Plus Jakarta Sans, sans-serif' },
                ].map((f) => {
                  const isSelected = currentStyle.fontFamily?.includes(f.name);
                  return (
                    <button
                      key={f.name}
                      onClick={() => updateStyle({ fontFamily: f.font })}
                      className={cn(
                        "p-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-left truncate",
                        isSelected
                          ? "bg-auralis text-white border-auralis"
                          : isLight 
                            ? "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-100 hover:border-zinc-300"
                            : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                      )}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Profiles Section */}
        {activeSection === 'accessibility' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className={cn(
                "text-xs font-bold uppercase tracking-wider mb-1",
                isLight ? "text-zinc-800" : "text-zinc-400"
              )}>Accessibility Profiles</h3>
              <p className={cn(
                "text-[11px] mb-4",
                isLight ? "text-zinc-600 font-medium" : "text-zinc-400"
              )}>Choose a profile that best suits the viewer's visual needs.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {ACCESSIBILITY_PROFILES.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => handleProfileChange(profile.id)}
                  className={cn(
                    "flex flex-col text-left p-3 rounded-lg border transition-all relative overflow-hidden cursor-pointer",
                    currentProfile === profile.id
                      ? "border-auralis bg-auralis/10 ring-1 ring-auralis/30 shadow-xs"
                      : isLight 
                        ? "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 shadow-xs"
                        : "border-white/10 hover:border-white/20 bg-white/5"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={cn(
                      "text-[12px] font-bold",
                      currentProfile === profile.id ? "text-auralis" : isLight ? "text-zinc-900" : "text-white"
                    )}>
                      {profile.label}
                    </span>
                    {currentProfile === profile.id && (
                      <Check size={14} className="text-auralis font-bold" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] leading-relaxed",
                    isLight ? "text-zinc-600 font-medium" : "text-zinc-400"
                  )}>{profile.desc}</span>
                </button>
              ))}
            </div>

            <div className={cn(
              "pt-4 border-t mt-4",
              isLight ? "border-zinc-200" : "border-white/10"
            )}>
              <label className="flex items-center justify-between gap-3 cursor-pointer group">
                <div className="flex flex-col gap-0.5">
                  <span className={cn(
                    "text-[12px] font-semibold transition-colors group-hover:text-auralis",
                    isLight ? "text-zinc-900" : "text-white"
                  )}>Reduce Motion</span>
                  <span className={cn(
                    "text-[10px] leading-tight",
                    isLight ? "text-zinc-500 font-medium" : "text-zinc-400"
                  )}>Disable unnecessary animation and shaking effects.</span>
                </div>
                <div className={cn(
                  "relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out",
                  accessibilitySettings.reduceMotion ? "bg-auralis" : isLight ? "bg-zinc-300" : "bg-white/10"
                )}>
                  <span className={cn(
                    "pointer-events-none inline-block h-3 w-3 transform rounded-full shadow ring-0 transition duration-200 ease-in-out",
                    accessibilitySettings.reduceMotion ? "translate-x-3.5 bg-white" : "translate-x-0.5 bg-white"
                  )} />
                  <input type="checkbox" className="sr-only" checked={accessibilitySettings.reduceMotion} onChange={(e) => updateAccessibility({ reduceMotion: e.target.checked })} />
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Text Section */}
        {activeSection === 'text' && (
          <div className="space-y-5 animate-fade-in">
            <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-2", isLight ? "text-zinc-800" : "text-zinc-400")}>Text Layout</h3>
            
            <div className="space-y-1.5">
              <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Font Family</label>
              <select
                value={currentStyle.fontFamily}
                onChange={(e) => updateStyle({ fontFamily: e.target.value })}
                className={cn(
                  "w-full h-8 px-2 text-xs border rounded-md focus:border-auralis focus:ring-1 focus:ring-auralis outline-none transition-all cursor-pointer",
                  isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-white/5 border-white/10 text-white"
                )}
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font} value={font} className={isLight ? "text-zinc-900 bg-white" : "text-white bg-zinc-900"}>{font}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Size</label>
                  <span className="text-[10px] font-mono text-auralis font-bold">{currentStyle.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="120"
                  value={currentStyle.fontSize}
                  onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })}
                  className="w-full accent-auralis h-1 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-1.5">
                <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Weight</label>
                <select
                  value={currentStyle.fontWeight}
                  onChange={(e) => updateStyle({ fontWeight: e.target.value })}
                  className={cn(
                    "w-full h-8 px-2 text-xs border rounded-md focus:border-auralis focus:ring-1 focus:ring-auralis outline-none transition-all cursor-pointer",
                    isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-white/5 border-white/10 text-white"
                  )}
                >
                  <option value="300" className={isLight ? "text-zinc-900 bg-white" : "text-white bg-zinc-900"}>Light</option>
                  <option value="400" className={isLight ? "text-zinc-900 bg-white" : "text-white bg-zinc-900"}>Regular</option>
                  <option value="500" className={isLight ? "text-zinc-900 bg-white" : "text-white bg-zinc-900"}>Medium</option>
                  <option value="600" className={isLight ? "text-zinc-900 bg-white" : "text-white bg-zinc-900"}>Semibold</option>
                  <option value="700" className={isLight ? "text-zinc-900 bg-white" : "text-white bg-zinc-900"}>Bold</option>
                  <option value="800" className={isLight ? "text-zinc-900 bg-white" : "text-white bg-zinc-900"}>Extra Bold</option>
                  <option value="900" className={isLight ? "text-zinc-900 bg-white" : "text-white bg-zinc-900"}>Black</option>
                </select>
              </div>
            </div>

            <div className={cn(
              "grid grid-cols-2 gap-3 pt-2 border-t mt-2",
              isLight ? "border-zinc-200" : "border-white/10"
            )}>
              <div className="space-y-1.5">
                <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Text Color</label>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "relative w-full h-8 rounded-md overflow-hidden border",
                    isLight ? "border-zinc-200" : "border-white/10"
                  )}>
                    <input
                      type="color"
                      value={currentStyle.textColor || '#FFFFFF'}
                      onChange={(e) => updateStyle({ textColor: e.target.value })}
                      className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Background</label>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "relative w-full h-8 rounded-md overflow-hidden border",
                    isLight ? "border-zinc-200" : "border-white/10"
                  )}>
                    <input
                      type="color"
                      value={currentStyle.backgroundColor || '#000000'}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Background Opacity</label>
                <span className="text-[10px] font-mono text-auralis font-bold">{currentStyle.backgroundOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentStyle.backgroundOpacity}
                onChange={(e) => updateStyle({ backgroundOpacity: parseInt(e.target.value) })}
                className="w-full accent-auralis h-1 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Readability Section */}
        {activeSection === 'readability' && (
          <div className="space-y-5 animate-fade-in">
            <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-2", isLight ? "text-zinc-800" : "text-zinc-400")}>Readability Constraints</h3>
            
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Letter Spacing</label>
                <span className="text-[10px] font-mono text-auralis font-bold">{currentStyle.letterSpacing}px</span>
              </div>
              <input
                type="range"
                min="-5"
                max="10"
                step="0.5"
                value={currentStyle.letterSpacing}
                onChange={(e) => updateStyle({ letterSpacing: parseFloat(e.target.value) })}
                className="w-full accent-auralis h-1 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Line Spacing</label>
                <span className="text-[10px] font-mono text-auralis font-bold">{currentStyle.lineHeight}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={currentStyle.lineHeight}
                onChange={(e) => updateStyle({ lineHeight: parseFloat(e.target.value) })}
                className="w-full accent-auralis h-1 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Max Words per Segment</label>
                <span className="text-[10px] font-mono text-auralis font-bold">{currentStyle.wordsPerSegment}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={currentStyle.wordsPerSegment}
                onChange={(e) => updateStyle({ wordsPerSegment: parseInt(e.target.value) })}
                className="w-full accent-auralis h-1 bg-zinc-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className={cn("text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-zinc-700" : "text-zinc-400")}>Maximum Lines</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(lines => (
                  <button
                    key={lines}
                    onClick={() => updateStyle({ maxLines: lines })}
                    className={cn(
                      "py-1.5 rounded-md text-xs font-semibold transition-all border cursor-pointer",
                      currentStyle.maxLines === lines
                        ? "bg-auralis text-white border-auralis"
                        : isLight
                          ? "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
                          : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                    )}
                  >
                    {lines} Line{lines > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Preview Section */}
        {activeSection === 'preview' && (
          <div className="space-y-5 animate-fade-in flex flex-col items-center">
            <h3 className={cn("text-xs font-bold uppercase tracking-wider w-full mb-2", isLight ? "text-zinc-800" : "text-zinc-400")}>Live Preview</h3>
            
            <div 
              className="w-full aspect-video rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10 relative flex items-center justify-center bg-zinc-900"
              style={{
                backgroundImage: 'radial-gradient(circle at center, #333 1px, transparent 1px)',
                backgroundSize: '12px 12px'
              }}
            >
              <div
                className="absolute text-center max-w-[80%]"
                style={{
                  fontFamily: currentStyle.fontFamily,
                  fontSize: `${currentStyle.fontSize * 0.7}px`,
                  fontWeight: currentStyle.fontWeight,
                  color: currentStyle.textColor,
                  letterSpacing: `${currentStyle.letterSpacing}px`,
                  lineHeight: currentStyle.lineHeight,
                  textShadow: currentStyle.shadowEnabled 
                    ? `0px 2px ${currentStyle.shadowIntensity * 10}px ${currentStyle.shadowColor}` 
                    : 'none',
                  WebkitTextStroke: currentStyle.outlineEnabled
                    ? `${currentStyle.outlineWidth}px ${currentStyle.outlineColor}`
                    : 'none',
                  backgroundColor: currentStyle.backgroundEnabled 
                    ? `rgba(${parseInt(currentStyle.backgroundColor.slice(1, 3), 16)}, ${parseInt(currentStyle.backgroundColor.slice(3, 5), 16)}, ${parseInt(currentStyle.backgroundColor.slice(5, 7), 16)}, ${currentStyle.backgroundOpacity / 100})` 
                    : 'transparent',
                  padding: currentStyle.backgroundEnabled ? '8px 16px' : '0',
                  borderRadius: currentStyle.backgroundEnabled ? '8px' : '0'
                }}
              >
                {captionMode === 'emotion' && '[shocked] '}
                {captionMode === 'sounds' && '[door slams] '}
                {captionMode === 'emotion_sounds' && '[angry] Stop moving! [door slams]'}
                {captionMode === 'adaptive' && 'DON\'T MOVE right now'}
                {captionMode === 'full' && '[shocked] DON\'T MOVE right now [door slams]'}
                {(captionMode === 'standard' || captionMode === 'custom') && 'The quick brown fox jumps over the lazy dog.'}
              </div>
            </div>
            
            <p className={cn(
              "text-[10px] text-center px-4",
              isLight ? "text-zinc-600 font-medium" : "text-zinc-400"
            )}>
              Preview responds immediately to accessibility, mode, readability, and text changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

