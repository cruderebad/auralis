import { CaptionAccessibilityPanel } from './CaptionAccessibilityPanel';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFeatures } from '../../useFeatures';
import { useConfirm } from '../../context/ConfirmContext';
import { safeSetLocalStorage } from '../../lib/projectStorage';
import { 
  Type, 
  Music, 
  Layers, 
  Share2, 
  Languages, 
  Plus, 
  Video as VideoIcon, 
  FileText, 
  Monitor, 
  Smartphone, 
  Square, 
  RectangleVertical,
  Sliders, 
  Sparkles,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Palette,
  Scroll,
  X,
  Smile,
  RotateCw,
  HelpCircle,
  Keyboard,
  Sun,
  Moon,
  Check,
  Sparkle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  ChevronDown,
  ChevronRight,
  Download,
  Trash2,
  Upload,
  Pencil,
  ArrowLeft,
  Lock,
  Loader2,
  User
} from 'lucide-react';
import { parseSRT } from '../../lib/srt-parser';
import { cn } from '../../lib/utils';
import { GlobalStyle, CaptionSegment, AspectRatio, AnimationStyle } from '../../types';
import { getFormattedCaptionsForMode, formatEmotionBracket } from '../../lib/captionFormatter';
import { getSpeakerColor } from '../../lib/speakerColors';
import { COLORS, FONT_FAMILIES } from '../../constants';
import { useStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import { DepthCaptionSettings } from './DepthCaptionSettings';

interface CaptionPreset {
  id: string;
  name: string;
  description: string;
  type: 'content-aware' | 'dynamic';
  style: Partial<GlobalStyle>;
  bgText: string;
  fgText: string;
  textColor: string;
  bgColor: string;
  fontFamily: string;
  characterColor?: string;
  badge?: string;
}

interface CustomPreset {
  id: string;
  name: string;
  style: Partial<GlobalStyle>;
}

interface BrandKit {
  id: string;
  name: string;
  style: Partial<GlobalStyle>;
  colors: string[];
  desc?: string;
}

interface MotionPreset {
  id: AnimationStyle;
  name: string;
  emoji: string;
  desc: string;
  bgGrad: string;
}

const MOTION_PRESETS: MotionPreset[] = [
  {
    id: 'pop-up',
    name: 'Pop Up',
    emoji: '💥',
    desc: 'Bouncy energetic entries',
    bgGrad: 'from-orange-650 to-pink-600',
  },
  {
    id: 'word-by-word',
    name: 'Word by Word',
    emoji: '👉',
    desc: 'Classic sequential step',
    bgGrad: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'word-highlight-box',
    name: 'Highlight Box',
    emoji: '🟩',
    desc: 'Glow wrap color overlay',
    bgGrad: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'word-highlight-color',
    name: 'Highlight Color',
    emoji: '🎨',
    desc: 'Active color emphasis',
    bgGrad: 'from-violet-600 to-fuchsia-600',
  },
  {
    id: 'fade-in-word',
    name: 'Cinematic Fade',
    emoji: '🎬',
    desc: 'Soft continuous transitions',
    bgGrad: 'from-zinc-700 to-zinc-950',
  },
  {
    id: 'karaoke',
    name: 'Karaoke Sweep',
    emoji: '🎙️',
    desc: 'Solid sweep progression',
    bgGrad: 'from-rose-500 to-red-600',
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    emoji: '⌨️',
    desc: 'Aesthetic type indicators',
    bgGrad: 'from-cyan-600 to-blue-500',
  },
  {
    id: 'netflix',
    name: 'Netflix Stories',
    emoji: '📺',
    desc: 'Sleek blurred animations',
    bgGrad: 'from-red-650 to-zinc-900',
  },
  {
    id: 'aesthetic',
    name: 'Aesthetic Flow',
    emoji: '🌊',
    desc: 'Liquid momentum waves',
    bgGrad: 'from-purple-600 to-pink-500',
  },
  {
    id: 'flat',
    name: 'Clean Flat',
    emoji: '📏',
    desc: 'Zero-delay instant text',
    bgGrad: 'from-slate-600 to-slate-800',
  }
];

interface HoverCaptionPreviewProps {
  style: Partial<GlobalStyle>;
  isLight: boolean;
  presetBgColor?: string;
  depthBgText?: string;
  fgText?: string;
}

export function HoverCaptionPreview({
  style,
  isLight,
  presetBgColor,
  depthBgText
}: HoverCaptionPreviewProps) {
  const [frameTime, setFrameTime] = useState(0);

  useEffect(() => {
    let start = Date.now();
    let animId: number;

    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      setFrameTime(elapsed % 3.0); // 3-second cycle loop
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const rawText = "This is how your captions will look";
  const casing = style.casing || 'none';
  const textToDisplay = casing === 'uppercase' 
    ? rawText.toUpperCase() 
    : casing === 'lowercase' 
      ? rawText.toLowerCase() 
      : rawText;

  const words = textToDisplay.split(" ");
  const animStyle = style.animationStyle || 'word-by-word';
  const isTypewriter = animStyle === 'typewriter';

  const textColor = style.textColor || '#FFFFFF';
  const highlightColor = style.highlightColor || style.glowColor || '#FF7067';
  const fontFamily = style.fontFamily || 'sans-serif';

  // Find active word index (0 to 6)
  const activeIndex = Math.floor((frameTime / 2.6) * words.length) % words.length;

  return (
    <div className="absolute inset-0 flex flex-col justify-between p-3 overflow-hidden select-none z-30 bg-[#0E0E11] text-white">
      {/* Background Cover Overlay */}
      {presetBgColor ? (
        <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-300", presetBgColor)} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-900 duration-300" />
      )}

      {/* Simulated Speaker cover shadow */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Background Depth layer (only if depthEnabled is true) */}
      {style.depthEnabled && (
        <div 
          style={{ 
            fontFamily: style.depthFontFamily || 'Impact', 
            color: style.depthFontColor || '#EF4444',
            letterSpacing: '-0.02em',
            lineHeight: '0.95'
          }}
          className="absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-[26px] font-black select-none leading-none w-full truncate px-1 opacity-70 filter blur-[0.5px] uppercase"
        >
          {depthBgText || "LOOK"}
        </div>
      )}

      {/* Speaker Silhouette SVG (only if depthEnabled is true) */}
      {style.depthEnabled && (
        <svg viewBox="0 0 100 100" className="w-[105%] h-[105%] absolute bottom-[-10px] left-1/2 -translate-x-1/2 text-zinc-900/40 select-none pointer-events-none" fill="currentColor">
          <circle cx="50" cy="38" r="16" />
          <path d="M15,85 C15,62 30,58 50,58 C70,58 85,62 85,85" />
        </svg>
      )}

      {/* Top indicator ribbon */}
      <div className="flex items-center justify-between w-full opacity-85 z-20">
        <span className="text-[8px] tracking-wider uppercase font-extrabold text-auralis/90">Preview Dynamic</span>
        <span className="text-[9px] bg-white/10 px-1 py-0.5 rounded leading-none text-zinc-300 font-mono">
          {animStyle === 'word-highlight-box' ? 'Highlight' : animStyle}
        </span>
      </div>

      {/* Caption Output Area */}
      <div 
        className={cn(
          "w-full flex-1 flex items-center justify-center text-center px-1 z-20",
          style.depthEnabled ? "pb-2" : ""
        )}
      >
        {isTypewriter ? (
          <div 
            style={{ fontFamily, color: textColor }}
            className="text-[11px] font-extrabold drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)] tracking-tight leading-snug break-words text-center"
          >
            {textToDisplay.slice(0, Math.floor((frameTime / 2.6) * textToDisplay.length))}
            <span className="animate-pulse font-mono pl-0.5">|</span>
          </div>
        ) : (
          <div 
            style={{ fontFamily }}
            className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-center"
          >
            {words.map((word, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              let styleObj: React.CSSProperties = {
                color: textColor,
              };
              let classNames = "text-[10px] tracking-tight leading-none font-bold transition-all duration-155 select-none";

              if (animStyle === 'flat') {
                classNames = "text-[10px] tracking-tight leading-none font-semibold text-white/95";
              } else if (animStyle === 'word-highlight-color') {
                if (isActive) {
                  styleObj.color = highlightColor;
                  classNames += " scale-105 font-black drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]";
                } else {
                  classNames += " opacity-65";
                }
              } else if (animStyle === 'word-highlight-box') {
                if (isActive) {
                  styleObj.backgroundColor = highlightColor;
                  styleObj.color = '#000000';
                  classNames += " px-1 py-0.5 rounded-[3px] font-extrabold";
                } else {
                  classNames += " opacity-65";
                }
              } else if (animStyle === 'pop-up') {
                if (isActive) {
                  styleObj.color = highlightColor;
                  classNames += " scale-120 font-black rotate-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]";
                } else {
                  classNames += " opacity-55";
                }
              } else if (animStyle === 'fade-in-word') {
                if (isPast) {
                  classNames += " opacity-100";
                } else if (isActive) {
                  classNames += " animate-pulse opacity-100 duration-100";
                } else {
                  classNames += " opacity-0";
                }
              } else if (animStyle === 'netflix') {
                if (isActive) {
                  classNames += " scale-105 opacity-100 duration-200 blur-none";
                } else {
                  classNames += " opacity-35 blur-[0.2px] scale-95";
                }
              } else if (animStyle === 'aesthetic') {
                if (isActive) {
                  styleObj.color = highlightColor;
                  classNames += " -translate-y-1 scale-110 font-bold drop-shadow-md";
                } else {
                  classNames += " opacity-75";
                }
              } else if (animStyle === 'karaoke') {
                if (isActive) {
                  styleObj.color = highlightColor;
                  classNames += " font-extrabold";
                } else if (isPast) {
                  styleObj.color = highlightColor;
                  classNames += " opacity-90";
                } else {
                  classNames += " opacity-45";
                }
              } else {
                if (isActive) {
                  styleObj.color = highlightColor;
                  classNames += " scale-110 font-extrabold";
                } else {
                  classNames += " opacity-65 scale-95";
                }
              }

              return (
                <span 
                  key={idx} 
                  style={styleObj} 
                  className={classNames}
                >
                  {word}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="text-[7px] text-zinc-400 font-medium text-center opacity-80 pointer-events-none">
        Click to apply Preset
      </div>
    </div>
  );
}

const CAPTION_PRESETS: CaptionPreset[] = [
  {
    id: 'ca-studio',
    name: 'Studio Rose',
    description: 'Bold pinkish red Bebas Neue behind the speaker, with elegant fine lower captions.',
    type: 'content-aware',
    style: {
      depthEnabled: true,
      depthFontColor: '#E11D48',
      depthFontFamily: 'Bebas Neue',
      depthBigWordSize: 180,
      depthTextTransform: 'uppercase',
      depthSubjectMargin: 10,
      depthBlurAmount: 0,
      depthModelSelection: 1,
      fontSize: 28,
      textColor: '#FFFFFF',
      fontFamily: 'Inter',
      animationStyle: 'word-by-word',
    },
    bgText: 'studio',
    fgText: 'we are finally open',
    textColor: '#E11D48',
    bgColor: 'from-zinc-950 via-zinc-900 to-rose-950',
    fontFamily: 'Bebas Neue',
    characterColor: 'bg-emerald-600/60',
  },
  {
    id: 'ca-music',
    name: 'TikTok Music',
    description: 'Vibrant yellow Outfit outline and font behind character with lowercase accents.',
    type: 'content-aware',
    style: {
      depthEnabled: true,
      depthFontColor: '#FFD700',
      depthFontFamily: 'Outfit',
      depthBigWordSize: 165,
      depthTextTransform: 'lowercase',
      depthSubjectMargin: 12,
      depthBlurAmount: 1,
      depthModelSelection: 1,
      fontSize: 30,
      textColor: '#FFFFFF',
      fontFamily: 'Inter',
      animationStyle: 'pop-up',
    },
    bgText: 'music',
    fgText: "wasn't",
    textColor: '#FFD700',
    bgColor: 'from-amber-955 via-zinc-900 to-zinc-950',
    fontFamily: 'Outfit',
    characterColor: 'bg-indigo-600/60',
  },
  {
    id: 'ca-three-seconds',
    name: 'Triple High',
    description: 'Orange double-stacked Anton text behind head for dramatic emphasis.',
    type: 'content-aware',
    style: {
      depthEnabled: true,
      depthFontColor: '#F59E0B',
      depthFontFamily: 'Anton',
      depthBigWordSize: 145,
      depthTextTransform: 'uppercase',
      depthSubjectMargin: 8,
      depthBlurAmount: 0,
      depthModelSelection: 0,
      fontSize: 32,
      textColor: '#FFFFFF',
      fontFamily: 'Space Grotesk',
      animationStyle: 'flat',
    },
    bgText: 'THREE SEC',
    fgText: 'before you think',
    textColor: '#F59E0B',
    bgColor: 'from-zinc-950 via-zinc-900 to-amber-950',
    fontFamily: 'Anton',
    characterColor: 'bg-sky-600/65',
  },
  {
    id: 'ca-super-simple',
    name: 'Red Slate',
    description: 'Tall scarlet crimson font behind head with clean sans sub-titles.',
    type: 'content-aware',
    style: {
      depthEnabled: true,
      depthFontColor: '#EF4444',
      depthFontFamily: 'League Spartan',
      depthBigWordSize: 190,
      depthTextTransform: 'uppercase',
      depthSubjectMargin: 10,
      depthBlurAmount: 0,
      depthModelSelection: 1,
      fontSize: 26,
      textColor: '#F3F4F6',
      fontFamily: 'Inter',
      animationStyle: 'word-by-word',
    },
    bgText: 'this',
    fgText: 'super simple',
    textColor: '#EF4444',
    bgColor: 'from-zinc-950 via-zinc-900 to-red-950',
    fontFamily: 'League Spartan',
    characterColor: 'bg-violet-600/60',
  },
  {
    id: 'ca-anyone',
    name: 'Cyan Anyone',
    description: 'Cool rounded cyan Lilita One font layered behind head.',
    type: 'content-aware',
    style: {
      depthEnabled: true,
      depthFontColor: '#0EA5E9',
      depthFontFamily: 'Lilita One',
      depthBigWordSize: 160,
      depthTextTransform: 'lowercase',
      depthSubjectMargin: 15,
      depthBlurAmount: 2,
      depthModelSelection: 1,
      fontSize: 32,
      textColor: '#FFFFFF',
      fontFamily: 'Poppins',
      animationStyle: 'pop-up',
    },
    bgText: 'anyone',
    fgText: 'anyone',
    textColor: '#0EA5E9',
    bgColor: 'from-slate-905 via-slate-900 to-sky-955',
    fontFamily: 'Lilita One',
    characterColor: 'bg-rose-500/65',
  },
  {
    id: 'dyn-ready',
    name: 'Impact Pop',
    description: 'Bold all-caps white text with high bounce animation style.',
    type: 'dynamic',
    style: {
      depthEnabled: false,
      textColor: '#FFFFFF',
      fontSize: 36,
      fontFamily: 'Anton',
      animationStyle: 'pop-up',
      animationEnabled: true,
      onlyHighlightKeyword: false,
    },
    bgText: 'READY',
    fgText: 'READY',
    textColor: '#FFFFFF',
    bgColor: 'from-zinc-900 to-zinc-950',
    fontFamily: 'Anton',
    characterColor: 'bg-yellow-500/65',
  },
  {
    id: 'dyn-editorial',
    name: 'Editorial Serif',
    description: 'Classy serif typography with high-fidelity soft fade-in animation.',
    type: 'dynamic',
    style: {
      depthEnabled: false,
      textColor: '#FFFBF0',
      fontSize: 32,
      fontFamily: 'Playfair Display',
      animationStyle: 'fade-in-word',
      animationEnabled: true,
      onlyHighlightKeyword: false,
    },
    bgText: 'Editorial',
    fgText: 'something resolved',
    textColor: '#FFFBF0',
    bgColor: 'from-teal-955 to-zinc-950',
    fontFamily: 'Playfair Display',
    characterColor: 'bg-teal-500/60',
  },
  {
    id: 'dyn-minimal',
    name: 'Before Make',
    description: 'Clean typewriter horizontal subtitles on a quiet low backdrop.',
    type: 'dynamic',
    style: {
      depthEnabled: false,
      textColor: '#E0E7FF',
      fontSize: 24,
      fontFamily: 'Inter',
      animationStyle: 'typewriter',
      animationEnabled: true,
      onlyHighlightKeyword: false,
    },
    bgText: 'Sub',
    fgText: 'before you make',
    textColor: '#E0E7FF',
    bgColor: 'from-blue-955 to-zinc-950',
    fontFamily: 'Inter',
    characterColor: 'bg-cyan-500/60',
  },
  {
    id: 'dyn-handwritten',
    name: 'Handwritten Splash',
    description: 'Aesthetic modern handwritten splash style in custom bold yellow curves.',
    type: 'dynamic',
    style: {
      depthEnabled: false,
      textColor: '#FACC15',
      fontSize: 38,
      fontFamily: 'Lobster',
      animationStyle: 'aesthetic',
      animationEnabled: true,
      onlyHighlightKeyword: false,
    },
    bgText: 'Aesthetic',
    fgText: 'Anyone can do it',
    textColor: '#FACC15',
    bgColor: 'from-purple-955 to-zinc-955',
    fontFamily: 'Lobster',
    characterColor: 'bg-pink-500/60',
  },
  {
    id: 'dyn-green-bar',
    name: 'Green Lime Block',
    description: 'Highlight word with bright neon bounding container.',
    type: 'dynamic',
    style: {
      depthEnabled: false,
      textColor: '#00FF66',
      highlightColor: '#00FF66',
      fontSize: 30,
      fontFamily: 'Outfit',
      animationStyle: 'word-highlight-box',
      animationEnabled: true,
      onlyHighlightKeyword: true,
    },
    bgText: 'Lime',
    fgText: 'we have to focus',
    textColor: '#00FF66',
    bgColor: 'from-emerald-955 to-zinc-955',
    fontFamily: 'Outfit',
    characterColor: 'bg-emerald-500/60',
  },
  {
    id: 'dyn-classic',
    name: 'Anyone Gray',
    description: 'Simple bottom-third subtitle rendering styled for clarity.',
    type: 'dynamic',
    style: {
      depthEnabled: false,
      textColor: '#F4F4F5',
      fontSize: 26,
      fontFamily: 'Poppins',
      animationStyle: 'word-by-word',
      animationEnabled: true,
      onlyHighlightKeyword: false,
    },
    bgText: 'Sub',
    fgText: 'anyone',
    textColor: '#F4F4F5',
    bgColor: 'from-neutral-900 to-neutral-950',
    fontFamily: 'Poppins',
    characterColor: 'bg-indigo-500/60',
  }
];

const CAPTION_GRID_PRESETS: Array<{id: string, name: string, style: AnimationStyle, section: string, description: string, depthEnabled: boolean, defaultSettings?: Partial<GlobalStyle>}> = [
  {
    id: 'kinetic',
    name: 'Kinetic Typography',
    style: 'kinetic' as AnimationStyle,
    section: 'dynamic',
    description: 'Dynamic font mixing & layouts',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 7, useOriginalSRT: false, maxLines: 1, fontSize: 64, fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'flat',
    name: 'Flat style',
    style: 'flat' as AnimationStyle,
    section: 'formal',
    description: 'Minimal static timed lines',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 10, maxLines: 1, fontSize: 56, fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'fade-in-word',
    name: 'Fade In Word',
    style: 'fade-in-word' as AnimationStyle,
    section: 'formal',
    description: 'Cinematic word fade entries',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 8, maxLines: 1, fontSize: 56, fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'follow-up',
    name: 'Follow Up',
    style: 'follow-up' as AnimationStyle,
    section: 'dynamic',
    description: 'Fade in & out with stretch',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 5, maxLines: 1, fontSize: 64, fontWeight: '900', fontFamily: 'Montserrat', highlightFontFamily: 'Montserrat', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center', followUpStretch: true, followUpStretchAmount: 5, followUpStretchSpline: 'linear', aiAdaptiveLines: true, aiAdaptiveEmphasis: true, shadowEnabled: true, shadowIntensity: 4, shadowColor: 'rgba(0,0,0,0.5)', glowEnabled: true, glowSize: 45, glowColor: '#FFD700', adaptiveGlow: true, gScale: 1, gOpacity: 1, fadeInDuration: 0.2, fadeOutDuration: 0.2, staggerDelay: 0.05, lineHeight: 1.2, positionX: 50, letterSpacing: 0, wordSpacing: 0 }
  },
  {
    id: 'word-by-word',
    name: 'Word by Word',
    style: 'word-by-word' as AnimationStyle,
    section: 'dynamic',
    description: 'Standard step captions',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 5, maxLines: 1, fontSize: 64, fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'pop-up',
    name: 'Pop Up',
    style: 'pop-up' as AnimationStyle,
    section: 'dynamic',
    description: 'Energetic bounce retainer',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 5, maxLines: 1, fontSize: 64, fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'word-highlight-color',
    name: 'Highlight Color',
    style: 'word-highlight-color' as AnimationStyle,
    section: 'dynamic',
    description: 'Word splash colouring',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 5, maxLines: 1, fontSize: 60, fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'aesthetic',
    name: 'Aesthetic style',
    style: 'aesthetic' as AnimationStyle,
    section: 'trendy',
    description: 'Flowing momentum wave',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 5, maxLines: 1, fontSize: 64, fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'play-typo',
    name: 'Play Typo',
    style: 'play-typo' as AnimationStyle,
    section: 'trendy',
    description: 'Brat style soft glow words',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 6, maxLines: 3, fontSize: 50, fontWeight: '700', textColor: '#FFFFFF', highlightColor: '#FFFFFF', textAlign: 'center', shadowEnabled: true, shadowColor: '#FFFFFF', shadowIntensity: 10 }
  },
  {
    id: 'karaoke',
    name: 'Karaoke Sweep',
    style: 'karaoke' as AnimationStyle,
    section: 'trendy',
    description: 'Liquid horizontal sweep',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 5, maxLines: 1, fontSize: 60, fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'netflix',
    name: 'Netflix Stories',
    style: 'netflix' as AnimationStyle,
    section: 'tv',
    description: 'Sleek TV story entries',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 10, maxLines: 1, fontSize: 56, fontFamily: 'Inter', fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'typewriter',
    name: 'Typewriter',
    style: 'typewriter' as AnimationStyle,
    section: 'tv',
    description: 'Kinetic terminal layout',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 12, maxLines: 3, fontSize: 46, fontFamily: 'JetBrains Mono', fontWeight: '600', textAlign: 'center', positionX: 50, positionY: 80, textColor: '#00FF00', highlightColor: '#00FF00' }
  },
  {
    id: 'person-mask',
    name: 'Rotoscope Mask',
    style: 'word-by-word' as AnimationStyle,
    section: 'beta',
    description: 'AI subject cutout & text behind',
    depthEnabled: true,
    defaultSettings: { wordsPerSegment: 5, maxLines: 1, depthFontFamily: 'Bebas Neue', depthFontColor: '#FFD700' }
  },
  {
    id: 'ai-reactive',
    name: 'AI Emotional Adapt',
    style: 'ai-reactive' as AnimationStyle,
    section: 'content-aware',
    description: 'Reactive adaptive sizing',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 5, maxLines: 1, fontSize: 64, fontWeight: '900', textColor: '#FFFFFF', highlightColor: '#FFD700', textAlign: 'center' }
  },
  {
    id: 'ai-kinetic-emotion',
    name: '🎭 AI Emotion & Pitch Kinetics',
    style: 'ai-reactive' as AnimationStyle,
    section: 'content-aware',
    description: 'Mutates colors, scale & jitter by AI emotion and voice pitch',
    depthEnabled: false,
    defaultSettings: {
      wordsPerSegment: 5,
      maxLines: 1,
      fontSize: 68,
      fontWeight: '900',
      textColor: '#FFFFFF',
      highlightColor: '#FFD700',
      textAlign: 'center',
      aiSentimentColors: true,
      pitchModulation: true,
      kineticJitter: 1.2,
      emotionGlow: true,
      shadowEnabled: true,
      shadowIntensity: 6,
      shadowColor: 'rgba(0,0,0,0.7)',
    }
  },
  {
    id: 'word-highlight-box',
    name: 'Highlight Box',
    style: 'word-highlight-box' as AnimationStyle,
    section: 'trendy',
    description: 'Sleek bounding blocks',
    depthEnabled: false,
    defaultSettings: { wordsPerSegment: 5, maxLines: 1, fontSize: 60, fontWeight: '900', textColor: '#000000', highlightBoxColor: '#FFCC00', highlightColor: '#FFD700', outlineEnabled: false, shadowEnabled: false, textAlign: 'center' }
  }
];

const SECTIONS = [
  { id: 'content-aware', label: 'Content Aware', badge: 'AI' },
  { id: 'dynamic', label: 'Dynamic', badge: 'AI' },
  { id: 'trendy', label: 'Trendy', badge: 'New' },
  { id: 'formal', label: 'Formal', badge: 'Pro' },
  { id: 'tv', label: 'TV', badge: 'Hot' },
  { id: 'beta', label: 'Beta', badge: 'Beta' }
];

interface SidebarProps {
  onVideoUpload: (file: File) => void;
  onSRTUpload: (file: File) => void;
  updateStyle: (style: Partial<GlobalStyle>) => void;
  currentStyle: GlobalStyle;
  captions: CaptionSegment[];
  onUpdateCaptions: (captions: CaptionSegment[]) => void;
  currentTime?: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  resolution: string;
  onUpdateResolution: (res: string) => void;
  aspectRatio: AspectRatio;
  onUpdateAspectRatio: (ratio: AspectRatio) => void;
}

interface SidebarSubtitleItemProps {
  caption: CaptionSegment;
  isLight: boolean;
  updateCaptionText: (id: string, text: string) => void;
}

const SidebarSubtitleItem = React.memo(function SidebarSubtitleItem({
  caption,
  isLight,
  updateCaptionText
}: SidebarSubtitleItemProps) {
  const isActive = useStore(useCallback(state => state.currentTime >= caption.start && state.currentTime <= caption.end, [caption.start, caption.end]));
  const durationValue = caption.end - caption.start;

  return (
    <div 
      className={cn(
        "p-3 rounded-xl border transition-all duration-300",
        isActive 
          ? "bg-auralis/5 border-auralis/35 shadow-sm shadow-auralis/10 scale-[1.01]" 
          : isLight
            ? "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
            : "bg-[#1C1C1E] border-white/5 hover:border-white/10 text-[#CCC]"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isActive ? "bg-auralis animate-pulse" : isLight ? "bg-zinc-300 animate-none" : "bg-white/10")} />
          <span className={cn(
            "text-[9px] font-mono font-bold transition-colors shrink-0",
            isLight ? "text-zinc-400" : "text-white/40"
          )}>
            {caption.start.toFixed(2)}s
          </span>
          {caption.speaker && (() => {
            const col = getSpeakerColor(caption.speaker);
            return (
              <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded-md border inline-flex items-center gap-1 shrink-0", col.bg, col.text, col.border)}>
                <User size={9} />
                {caption.speaker}
              </span>
            );
          })()}
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border text-[8px] font-bold shrink-0",
          isLight ? "bg-zinc-50 border-zinc-200 text-zinc-400" : "bg-[#141416] border-white/5 text-white/30"
        )}>
          <span>Dur:</span>
          <span className="font-mono font-bold text-auralis">{durationValue.toFixed(2)}s</span>
        </div>
      </div>
      <textarea
        value={caption.text}
        onChange={(e) => updateCaptionText(caption.id, e.target.value)}
        className={cn(
          "w-full border p-2.5 rounded-lg text-sm font-semibold focus:ring-1 focus:ring-auralis focus:border-auralis resize-none outline-none transition-all min-h-[82px] leading-relaxed",
          isLight
            ? "bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-350 focus:bg-white"
            : "bg-[#0F0F12] border-white/5 text-white placeholder:text-white/20"
        )}
        rows={3}
        placeholder="Type caption segment text..."
        spellCheck={false}
      />
    </div>
  );
});

export function Sidebar({ 
  onVideoUpload, 
  onSRTUpload, 
  updateStyle, 
  currentStyle, 
  captions, 
  onUpdateCaptions, 
  currentTime,
  activeTab,
  setActiveTab,
  resolution,
  onUpdateResolution,
  aspectRatio,
  onUpdateAspectRatio
}: SidebarProps) {
  const applyStyleWithAutoSemantics = React.useCallback((styleUpdates: Partial<GlobalStyle>) => {
    updateStyle({
      textAlign: 'center',
      positionX: 50,
      ...styleUpdates,
      aiAdaptiveLines: true,
      aiAdaptiveEmphasis: true,
    });

    const storeState = useStore.getState();
    const currentCaptionMode = storeState.captionMode;
    if (!currentCaptionMode || currentCaptionMode === 'standard') {
      storeState.setCaptionMode('emotion_sounds');
    }

    const semTimeline = storeState.semanticTimeline;
    const activeMode = (!currentCaptionMode || currentCaptionMode === 'standard') ? 'emotion_sounds' : currentCaptionMode;

    if (semTimeline?.segments && semTimeline.segments.length > 0) {
      const formatted = getFormattedCaptionsForMode(
        semTimeline.segments,
        semTimeline.soundEvents || [],
        activeMode,
        storeState.customAccessibilityConfig
      );

      const updatedCaptions = captions.map((c) => {
        const semSeg = semTimeline.segments.find(s => Math.abs(s.start - c.start) < 0.5) || c;
        const bracket = formatEmotionBracket(semSeg.emotion, semSeg.speechStyle) || semSeg.bracketLabel || (semSeg as any).bracket_label;
        let textVal = c.text;
        if (bracket && !textVal.includes(bracket)) {
          textVal = `${bracket} ${textVal}`;
        }
        return {
          ...c,
          text: textVal,
          emotion: semSeg.emotion || c.emotion || 'neutral',
          speechStyle: semSeg.speechStyle || c.speechStyle || 'normal',
          speaker: semSeg.speaker || c.speaker,
          bracketLabel: bracket || c.bracketLabel
        };
      });
      onUpdateCaptions(updatedCaptions);
    } else {
      const updatedCaptions = captions.map((c) => {
        const bracket = formatEmotionBracket(c.emotion, c.speechStyle) || c.bracketLabel || (c as any).bracket_label;
        if (bracket && !c.text.includes(bracket)) {
          return {
            ...c,
            text: `${bracket} ${c.text}`,
            bracketLabel: bracket
          };
        }
        return c;
      });
      onUpdateCaptions(updatedCaptions);
    }
  }, [updateStyle, captions, onUpdateCaptions]);

  const applyAIAdaptivePunctuation = React.useCallback(() => {
    let allWords: any[] = [];
    captions.forEach(c => {
      if (c.words && c.words.length > 0) {
        c.words.forEach(w => {
          allWords.push({
            ...w,
            segRef: c,
            emotion: w.emotion || c.emotion
          });
        });
      } else {
        const parts = c.text.split(/\s+/).filter(Boolean);
        const duration = c.end - c.start;
        const step = duration / Math.max(1, parts.length);
        parts.forEach((p, i) => {
          allWords.push({
            text: p,
            start: c.start + i * step,
            end: c.start + (i + 1) * step,
            segRef: c,
            emotion: c.emotion
          });
        });
      }
    });

    const newCaptions: CaptionSegment[] = [];
    let currentWords: any[] = [];
    
    const wordsPerSegment = currentStyle.wordsPerSegment || 5;
    const maxLines = currentStyle.maxLines || 1;
    const effectiveWordsPerSegment = wordsPerSegment * maxLines;

    for (let i = 0; i < allWords.length; i++) {
      let word = { ...allWords[i] };
      const originalText = word.text;
      
      const isSplit = /[.?!]+$/.test(originalText);
      const endsWithQuestion = /[?]+$/.test(originalText);
      const endsWithExclamation = /[!]+$/.test(originalText);

      word.text = word.text.replace(/[.?!]+$/, '').replace(/\./g, '');
      currentWords.push(word);
      
      const reachedLimit = currentWords.length >= effectiveWordsPerSegment;

      if (isSplit || reachedLimit || i === allWords.length - 1) {
        let lastWord = currentWords[currentWords.length - 1];
        if (endsWithQuestion) lastWord.text += '?';
        else if (endsWithExclamation) lastWord.text += '!';
        else lastWord.text += '.';

        const distributeIntoLines = (words: string[], targetMaxLines: number) => {
            if (words.length <= 1) return words.join(' ');
            const totalChars = words.reduce((sum, w) => sum + w.length, 0) + words.length - 1;
            let effectiveMaxLines = targetMaxLines;
            if (effectiveMaxLines <= 1 && totalChars > 26 && words.length >= 5) {
              effectiveMaxLines = 2;
            } else if (effectiveMaxLines <= 2 && totalChars > 48 && words.length >= 8) {
              effectiveMaxLines = 3;
            }

            if (effectiveMaxLines <= 1) return words.join(' ');
            const targetLineCount = Math.min(effectiveMaxLines, words.length);
            const wordsPerLine = Math.ceil(words.length / targetLineCount);
            const lines = [];
            for (let j = 0; j < words.length; j += wordsPerLine) {
                const lineWords = words.slice(j, Math.min(j + wordsPerLine, words.length));
                if (lineWords.length > 0) {
                    lines.push(lineWords.join(' '));
                }
            }
            return lines.join('\n');
        };

        const segmentText = distributeIntoLines(currentWords.map(w => w.text), maxLines);
        const start = currentWords[0].start;
        const end = currentWords[currentWords.length - 1].end;
        
        const refSeg = currentWords[0]?.segRef || captions.find(c => c.start <= start && c.end >= start);
        const chunkEmotion = currentWords.find(w => w.emotion && w.emotion !== 'neutral')?.emotion || refSeg?.emotion;
        let bracket = refSeg?.bracketLabel || (refSeg as any)?.bracket_label;
        if (!bracket && chunkEmotion && chunkEmotion !== 'neutral') {
          bracket = chunkEmotion.startsWith('[') ? chunkEmotion : `[${chunkEmotion}]`;
        }

        newCaptions.push({
          id: `caption-${Date.now()}-${i}`,
          start,
          end,
          text: segmentText,
          words: currentWords,
          emotion: chunkEmotion || refSeg?.emotion || "neutral",
          speechStyle: refSeg?.speechStyle || "normal",
          tone: refSeg?.tone || "neutral",
          speaker: refSeg?.speaker || null,
          bracketLabel: bracket || null,
          emotionIntensity: refSeg?.emotionIntensity ?? 0.8,
          confidence: refSeg?.confidence ?? 0.9,
          emphasis: refSeg?.emphasis || [],
        });

        currentWords = [];
      }
    }
    
    if (newCaptions.length > 0) {
      onUpdateCaptions(newCaptions);
    }
  }, [captions, onUpdateCaptions, currentStyle.wordsPerSegment, currentStyle.maxLines]);

  const theme = useStore((s) => s.theme);
  const isLight = theme === 'light';
  const timelineResolution = useStore((s) => s.timelineResolution);
  const transcriptionLanguage = useStore((s) => s.transcriptionLanguage);
  const accessibilitySettings = useStore((s) => s.accessibility);
  const uploadedImages = useStore((s) => s.uploadedImages);
  const setTimelineResolution = useStore((s) => s.setTimelineResolution);
  const setTranscriptionLanguage = useStore((s) => s.setTranscriptionLanguage);
  const setAccessibility = useStore((s) => s.setAccessibility);
  const setTheme = useStore((s) => s.setTheme);
  const addUploadedImage = useStore((s) => s.addUploadedImage);
  const removeUploadedImage = useStore((s) => s.removeUploadedImage);
  const { profile, session, deductCredits } = useAuth();
  const { hasFeature } = useFeatures();
  const { confirm, alert, upgradePopup } = useConfirm();

  const isFeatureLocked = (sectionId: string) => {
    const plan = ((profile?.plan || 'Free').split('|')[0]).toLowerCase() || '';
    const isPro = plan === 'creator' || plan === 'pro' || plan === 'studio';
    return !isPro && (sectionId === 'beta' || sectionId === 'formal' || sectionId === 'tv');
  };
  const plan = ((profile?.plan || 'Free').split('|')[0]).toLowerCase() || '';
  const isProUser = plan === 'creator' || plan === 'pro' || plan === 'studio';
  const isPresetActive = (preset: CaptionPreset) => {
    if (preset.type === 'content-aware') {
      return (
        !!currentStyle.depthEnabled &&
        currentStyle.depthFontColor === preset.style.depthFontColor &&
        currentStyle.depthFontFamily === preset.style.depthFontFamily
      );
    } else {
      return (
        !currentStyle.depthEnabled &&
        currentStyle.fontFamily === preset.style.fontFamily &&
        currentStyle.animationStyle === preset.style.animationStyle
      );
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showCaptionSettings, setShowCaptionSettings] = useState(false);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>('ca-5');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isSavingBrandKit, setIsSavingBrandKit] = useState(false);
  const [brandKitNameInput, setBrandKitNameInput] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  const [myPresets, setMyPresets] = useState<CustomPreset[]>(() => {
    try {
      const saved = localStorage.getItem('user-caption-presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [myBrandKits, setMyBrandKits] = useState<BrandKit[]>(() => {
    try {
      const saved = localStorage.getItem('user-brand-kits');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const [retranscribeProgress, setRetranscribeProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRetranscribe = async () => {
    const storeState = useStore.getState();
    if (!storeState.videoFile) {
      alert("No video file found to re-transcribe. Please upload a video first.", "Error");
      return;
    }
    
    const duration = storeState.duration || 60;
    const creditsNeeded = 10;
    
    if (profile && profile.credits < creditsNeeded) {
      alert(`Insufficient credits. Re-transcribing costs ${creditsNeeded} credits.`, "Error");
      return;
    }

    confirm({
      title: "Re-transcribe Video",
      message: `This will overwrite your existing subtitles. Do you want to proceed?`,
      confirmText: "Re-transcribe",
      onConfirm: async () => {
        let currentPct = 10;
        setRetranscribeProgress(10);
        storeState.setTranscriptionProgress(10);
        const timer = setInterval(() => {
          currentPct += (90 - currentPct) * 0.08;
          const clamped = Math.min(92, Math.round(currentPct));
          setRetranscribeProgress(clamped);
          useStore.getState().setTranscriptionProgress(clamped);
        }, 300);

        try {
          setIsRetranscribing(true);
          let res: Response | null = null;
          let storageSuccess = false;

          try {
            const { supabase } = await import('../../lib/supabase');
            const fileExt = storeState.videoFile!.name.split('.').pop() || 'mp4';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${session?.user?.id || 'anonymous'}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('media')
              .upload(filePath, storeState.videoFile!, { cacheControl: '3600', upsert: false });
              
            if (!uploadError) {
              const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                .from('media')
                .createSignedUrl(filePath, 3600);

              if (!signedUrlError && signedUrlData?.signedUrl) {
                storageSuccess = true;
                res = await fetch('/api/transcribe', {
                  method: 'POST',
                  headers: {
                    'Authorization': session ? `Bearer ${session.access_token}` : '',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    mediaUrl: signedUrlData.signedUrl,
                    duration: duration && !isNaN(duration) ? duration : undefined,
                    filePath: filePath,
                    language: transcriptionLanguage
                  }),
                });
              }
            }
          } catch (storageErr) {
            console.warn("Supabase storage bypass/fallback:", storageErr);
          }

          if (!storageSuccess || !res) {
            const formData = new FormData();
            formData.append('media', storeState.videoFile!);
            if (duration && !isNaN(duration)) {
              formData.append('duration', String(duration));
            }
            if (transcriptionLanguage) {
              formData.append('language', transcriptionLanguage);
            }

            res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: {
                'Authorization': session ? `Bearer ${session.access_token}` : '',
              },
              body: formData,
            });
          }
          
          const responseText = await res.text();
          let data: any = null;
          try {
            data = responseText ? JSON.parse(responseText) : {};
          } catch {
            if (res.status === 504 || responseText.includes('FUNCTION_INVOCATION_TIMEOUT')) {
              throw new Error("Vercel Function Timeout (504): Processing took longer than Vercel's execution limit (10s on Free plan). Please try a shorter video/audio clip or trim media under 2 minutes.");
            }
            if (responseText.includes('<!doctype') || responseText.includes('<html') || responseText.includes('<head>')) {
              throw new Error(`Server returned HTML instead of JSON (${res.status}). Please verify the server is running and the API route exists.`);
            }
            if (!res.ok) {
              throw new Error(`Server error (${res.status}): ${responseText.substring(0, 150)}`);
            }
            throw new Error(`Invalid server response format (${res.status}). Expected valid JSON.`);
          }

          if (!res.ok) {
            let errorMsg = data?.error || data?.message || `Transcription failed (${res.status})`;
            if (res.status === 504 || String(errorMsg).includes('FUNCTION_INVOCATION_TIMEOUT')) {
              errorMsg = "Vercel Function Timeout (504): Processing took longer than Vercel's execution limit. Please try a shorter video/audio clip under 2 minutes.";
            }
            throw new Error(errorMsg);
          }
          
          if (data?.srt) {
            let srtText = data.srt.trim();
            srtText = srtText.replace(/^```(srt|text)?\n?/i, '').replace(/\n?```$/i, '');
            srtText = srtText.trim();
            
            const parsed = parseSRT(srtText);
            
            if (parsed.length > 0) {
              clearInterval(timer);
              setRetranscribeProgress(100);
              useStore.getState().setTranscriptionProgress(100);
              onUpdateCaptions(parsed);
              await deductCredits(creditsNeeded);
              alert("Transcription complete!", "Success");
            } else {
              throw new Error("No captions generated.");
            }
          } else {
            throw new Error("No SRT data returned from transcription.");
          }
        } catch (err: any) {
          clearInterval(timer);
          console.error(err);
          alert(err.message || "An error occurred during transcription.", "Error");
        } finally {
          clearInterval(timer);
          setIsRetranscribing(false);
        }
      }
    });
  };

  const saveCurrentAsBrandKit = () => {
    const plan = ((profile?.plan || 'Free').split('|')[0]).toLowerCase() || '';
    const isPro = plan === 'creator' || plan === 'pro' || plan === 'studio';
    
    if (!isPro && !hasFeature('Brand Kit Access')) {
      upgradePopup("Brand Kits is a feature available for paid plans.", "Creator, Pro or Studio");
      return;
    }
    
    if (!brandKitNameInput.trim()) return;
    
    // Extract unique colors from current style to build a visual palette
    const extractedColors = [
      currentStyle.highlightColor || '#FFD700',
      currentStyle.textColor || '#FFFFFF',
      currentStyle.shadowColor || '#000000',
      currentStyle.glowColor || currentStyle.outlineColor || '#FF3B30'
    ];
    
    const colors = Array.from(new Set(extractedColors)).slice(0, 4);

    const newKit: BrandKit = {
      id: Date.now().toString(),
      name: brandKitNameInput.trim(),
      desc: 'User custom template',
      style: { ...currentStyle },
      colors
    };
    const updated = [...myBrandKits, newKit];
    setMyBrandKits(updated);
    safeSetLocalStorage('user-brand-kits', JSON.stringify(updated));
    setIsSavingBrandKit(false);
    setBrandKitNameInput('');
  };
  
  const deleteBrandKit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = myBrandKits.filter(p => p.id !== id);
    setMyBrandKits(updated);
    safeSetLocalStorage('user-brand-kits', JSON.stringify(updated));
  };

  const saveCurrentAsPreset = () => {
    if (!presetNameInput.trim()) return;
    const newPreset: CustomPreset = {
      id: Date.now().toString(),
      name: presetNameInput.trim(),
      style: {
        fontFamily: currentStyle.fontFamily,
        fontSize: currentStyle.fontSize,
        textColor: currentStyle.textColor,
        highlightColor: currentStyle.highlightColor,
        shadowEnabled: currentStyle.shadowEnabled,
        shadowColor: currentStyle.shadowColor,
        shadowIntensity: currentStyle.shadowIntensity,
        animationStyle: currentStyle.animationStyle,
        fontWeight: currentStyle.fontWeight,
      }
    };
    const updated = [...myPresets, newPreset];
    setMyPresets(updated);
    safeSetLocalStorage('user-caption-presets', JSON.stringify(updated));
    setIsSavingPreset(false);
    setPresetNameInput('');
  };

  const deletePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = myPresets.filter(p => p.id !== id);
    setMyPresets(updated);
    safeSetLocalStorage('user-caption-presets', JSON.stringify(updated));
  };

  const isAnyPresetActive = CAPTION_GRID_PRESETS.some(
    preset => currentStyle.animationStyle === preset.style && !currentStyle.depthEnabled === !preset.depthEnabled
  );

  const fontOptions = FONT_FAMILIES.map(family => ({
    value: family,
    label: family,
    style: { fontFamily: family }
  }));

  const animationOptions = [
    { value: 'flat' as AnimationStyle, label: 'Flat (Static / Clean)', desc: 'Zero entrance motion, zero fades, raw instantaneous timed text' },
    { value: 'word-by-word' as AnimationStyle, label: 'Word by Word', desc: 'Classic captioning, clean step animations' },
    { value: 'fade-in-word' as AnimationStyle, label: 'Fade In Word', desc: 'Slightly softer cinematic fade transitions' },
    { value: 'pop-up' as AnimationStyle, label: 'Pop Up', desc: 'Energetic bounce curves, high viewer retention' },
    { value: 'word-highlight-box' as AnimationStyle, label: 'Highlight Box', desc: 'Flowing color bounding box behind text' },
    { value: 'word-highlight-color' as AnimationStyle, label: 'Highlight Color', desc: 'Dynamic text color splash highlight' },
    { value: 'karaoke' as AnimationStyle, label: '🎙️ Karaoke Sweep', desc: 'Liquid left-to-right color gradient sweep' },
    { value: 'typewriter' as AnimationStyle, label: '⌨️ Typewriter Kinetic', desc: 'Rapid character typing with blinking cursor' },
    { value: 'netflix' as AnimationStyle, label: '📺 Netflix Stories', desc: 'Sleek immersive blurred entries' },
    { value: '3d-depth' as AnimationStyle, label: '🧊 Layered 3D Depth', desc: 'Independent floating layers, perspective parallax' },
    { value: 'ai-reactive' as AnimationStyle, label: '🤖 AI Emotional Adaptive', desc: 'Angry shakes, sad slides, excited bouncers' },
    { value: 'aesthetic' as AnimationStyle, label: 'Aesthetic Trendy', desc: 'Liquid wavy animation with responsive momentum' },
    { value: 'follow-up' as AnimationStyle, label: 'Follow Up', desc: 'Word by word fade in, with fade out and optional stretch' },
  ];

  const updateCaptionText = (id: string, text: string) => {
    const newCaptions = captions.map(c => c.id === id ? { ...c, text, words: undefined } : c);
    onUpdateCaptions(newCaptions);
  };

  const downloadSRT = () => {
    if (captions.length === 0) return;
    
    const formatTime = (seconds: number) => {
      const pad = (num: number, size: number) => ('005' + num).slice(-size);
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      const pad2 = (n: number) => n < 10 ? '0' + n : String(n);
      const pad3 = (n: number) => n < 10 ? '00' + n : n < 100 ? '0' + n : String(n);
      return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
    };

    let content = '';
    captions.forEach((c, index) => {
      content += `${index + 1}\n`;
      content += `${formatTime(c.start)} --> ${formatTime(c.end)}\n`;
      content += `${c.text}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/srt;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'project_captions.srt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      setActiveTab(''); // Collapses panel
    } else {
      setActiveTab(tabId);
      setShowStylePanel(false);
    }
  };

  // Define 10 high-fidelity side tabs matching the visual workflow in user picture
  const railTabs = [
    { id: 'typography', icon: Type, label: 'Typography' },
    { id: 'video', icon: VideoIcon, label: 'Video' },
    { id: 'captions', icon: Sparkles, label: 'Transcribe' },
    { id: 'depth-captions', icon: Sparkle, label: 'Captions' },
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'subtitles', icon: FileText, label: 'Subtitles' },
    { id: 'text', icon: Languages, label: 'Text' },
    { id: 'elements', icon: Layers, label: 'Elements' },
    { id: 'script', icon: Scroll, label: 'Script' },
    { id: 'brand-kit', icon: Palette, label: 'Brand Kit' },
  ];

  // Concatenated dialogue scripts for the video
  const fullTranscript = captions.map(c => c.text).join(' ');

  const filteredCaptions = captions.filter(c => 
    c.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn(
      "md:h-full flex flex-col md:flex-row shrink-0 select-none transition-all duration-300 ease-in-out z-40 md:border-r",
      activeTab ? "md:w-[364px]" : "md:w-[76px]",
      isLight 
        ? "md:bg-[#FCFCFD] border-zinc-200 text-zinc-800" 
        : "md:bg-[#0E0E10] border-white/5 text-[#E0E0E6]",
      "fixed md:static bottom-0 left-0 right-0 w-full md:w-auto"
    )}>
      
      {/* 1. NARROW VERTICAL/HORIZONTAL RAIL */}
      <div className={cn(
        "w-full md:w-[76px] h-16 md:h-full shrink-0 flex flex-row md:flex-col justify-between md:pb-4 md:pt-[76px] items-center md:border-r z-50 transition-colors duration-300 border-t md:border-t-0 overflow-x-auto custom-scrollbar",
        isLight ? "border-zinc-200 bg-white" : "border-white/5 bg-[#0F0F11]"
      )}>
        {/* Main Stack */}
        <div className="flex flex-row md:flex-col items-center justify-start md:justify-center md:gap-1.5 w-max md:w-full px-2 md:px-0">
          {railTabs.map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center w-[64px] h-[64px] rounded-xl transition-all duration-250 cursor-pointer group relative text-center flex-shrink-0",
                  isTabActive 
                    ? isLight
                      ? "bg-auralis/10 text-auralis font-bold"
                      : "bg-[#1C1C1F] text-auralis font-bold"
                    : isLight
                      ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                      : "text-[#7B7B8F] hover:bg-white/5 hover:text-[#CCC]"
                )}
                title={tab.label}
              >
                {/* Accent highlight line */}
                {isTabActive && (
                  <>
                    <span className="hidden md:block absolute left-[3px] top-1/4 bottom-1/4 w-[3.5px] bg-auralis rounded-full" />
                    <span className="md:hidden absolute top-[3px] left-1/4 right-1/4 h-[3.5px] bg-auralis rounded-full" />
                  </>
                )}
                <tab.icon size={19} className={cn(
                  "transition-transform duration-300 group-hover:scale-110",
                  isTabActive ? "text-auralis" : isLight ? "text-zinc-500" : "text-[#7B7B8F]"
                )} />
                <span className="text-[9px] mt-1.5 font-semibold tracking-wide truncate max-w-full px-1">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Gear - Settings */}
        <div className="md:w-full md:px-1 flex-shrink-0 px-2 md:px-0">
          <button
            onClick={() => handleTabClick('settings')}
            className={cn(
              "flex flex-col items-center justify-center w-[64px] h-[64px] rounded-xl transition-all duration-250 mx-auto cursor-pointer group relative text-center flex-shrink-0",
              activeTab === 'settings'
                ? isLight
                  ? "bg-auralis/10 text-auralis font-bold"
                  : "bg-[#1C1C1F] text-auralis font-bold"
                : isLight
                  ? "text-zinc-500 hover:bg-zinc-100"
                  : "text-[#7B7B8F] hover:bg-white/5"
            )}
            title="Settings"
          >
            {activeTab === 'settings' && (
              <>
                <span className="hidden md:block absolute left-[3px] top-1/4 bottom-1/4 w-[3.5px] bg-auralis rounded-full" />
                <span className="md:hidden absolute top-[3px] left-1/4 right-1/4 h-[3.5px] bg-auralis rounded-full" />
              </>
            )}
            <SettingsIcon size={19} className={cn(
              "transition-transform duration-300 group-hover:rotate-45",
              activeTab === 'settings' ? "text-auralis" : isLight ? "text-zinc-500" : "text-[#7B7B8F]"
            )} />
            <span className="text-[9px] mt-1.5 font-semibold tracking-wide">
              Settings
            </span>
          </button>
        </div>
      </div>

      {/* 2. EXPANDABLE SUBPANEL DRAWER (w-[288px]) - Shows only when activeTab is selected */}
      {activeTab && (
        <>
          {/* Mobile Overlay */}
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm" 
            onClick={() => handleTabClick(activeTab)}
          />
          <div className={cn(
            "fixed md:static bottom-16 md:bottom-0 left-0 right-0 md:w-[288px] h-[75vh] md:h-full flex flex-col shrink-0 overflow-y-auto custom-scrollbar md:pt-[76px] z-40 animate-slide-up shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-none rounded-t-2xl md:rounded-none border-t md:border-t-0",
            isLight ? "bg-[#FAFBFD] border-zinc-200" : "bg-[#121215] border-white/10"
          )}>
            {/* Mobile handle */}
            <div className="md:hidden w-full flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
            
            {/* Header Panel */}
          <div className={cn(
            "flex items-center justify-between p-4 border-b shrink-0",
            isLight ? "border-zinc-200" : "border-white/5"
          )}>
            <div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest text-[#8F8F9F]",
                isLight ? "text-zinc-450" : "text-white/35"
              )}>
                {activeTab === 'typography' && 'Typography'}
                {activeTab === 'video' && 'Canvas Assets'}
                {activeTab === 'captions' && 'Auto Transcribe'}
                {activeTab === 'depth-captions' && 'Captions'}
                {activeTab === 'image' && 'Image Overlay'}
                {activeTab === 'subtitles' && 'Subtitle Style'}
                {activeTab === 'text' && 'Subtitles Editor'}
                {activeTab === 'elements' && 'Screen Canvas'}
                {activeTab === 'script' && 'Interactive Script'}
                {activeTab === 'brand-kit' && 'Visual Kit'}
                {activeTab === 'settings' && 'System Setup'}
              </span>
              <h2 className="text-xs font-bold font-sans">
                {activeTab === 'typography' && 'Typography & Fonts'}
                {activeTab === 'video' && 'Video Setup'}
                {activeTab === 'captions' && 'AI Speech-to-Text'}
                {activeTab === 'depth-captions' && (
                  <div className="flex items-center gap-1.5">
                    <span>Captions & Styles</span>
                    <button
                      onClick={() => isAnyPresetActive && setShowCaptionSettings(!showCaptionSettings)}
                      disabled={!isAnyPresetActive}
                      className={cn(
                        "p-1 rounded-md transition-all cursor-pointer flex items-center justify-center",
                        !isAnyPresetActive 
                          ? "opacity-35 cursor-not-allowed text-zinc-500" 
                          : showCaptionSettings
                            ? "bg-auralis/20 text-auralis hover:bg-auralis/30"
                            : "hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-450 dark:text-zinc-400 hover:text-auralis"
                      )}
                      title="Edit Caption Settings"
                    >
                      <Pencil size={11} className="stroke-[2.5]" />
                    </button>
                  </div>
                )}
                {activeTab === 'image' && 'Overlays & Stickers'}
                {activeTab === 'subtitles' && 'SRT Import & Presets'}
                {activeTab === 'text' && 'Active Segments'}
                {activeTab === 'elements' && 'Canvas Palette'}
                {activeTab === 'script' && 'Narration Text'}
                {activeTab === 'brand-kit' && 'Branding Palettes'}
                {activeTab === 'settings' && 'Environment Settings'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="md:hidden flex items-center justify-center px-4 py-1.5 bg-[#D4AF37] text-white hover:bg-[#C5A028] transition-colors rounded-lg text-xs font-bold shadow-sm"
                onClick={() => setActiveTab('')}
              >
                Done
              </button>
              <button 
                onClick={() => setActiveTab('')}
                className={cn(
                  "hidden md:flex p-1.5 rounded-lg border transition-all cursor-pointer hover:scale-105 active:scale-95",
                  isLight 
                    ? "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-805 hover:bg-zinc-50"
                    : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                )}
                title="Retract Sidebar"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Core Panel Content Body */}
          <div className={cn(
            "flex-1 p-4 overflow-y-auto custom-scrollbar space-y-5",
            activeTab === 'text' && "flex flex-col h-full space-y-4 overflow-hidden"
          )}>
            
            {/* TA-1: Typography Settings Drawer Content */}
            {activeTab === 'typography' && (
              <div className="space-y-6">
                
                {/* Font Choices */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Font Family</label>
                    <CustomPremiumSelect 
                      value={currentStyle.fontFamily}
                      onChange={(f) => updateStyle({ fontFamily: f })}
                      options={fontOptions}
                      isLight={isLight}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Size</label>
                      <input 
                        type="number"
                        value={currentStyle.fontSize}
                        onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) || 12 })}
                        className={cn(
                          "w-full px-3 py-1.5 border rounded-xl text-xs outline-none transition-all",
                          isLight 
                            ? "bg-zinc-50/50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-auralis" 
                            : "bg-[#1C1C1E] border-white/5 text-white focus:border-auralis"
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Weight</label>
                      <select 
                        value={currentStyle.fontWeight}
                        onChange={(e) => updateStyle({ fontWeight: e.target.value })}
                        className={cn(
                          "w-full px-3 py-1.5 border rounded-xl text-xs outline-none transition-all cursor-pointer",
                          isLight 
                            ? "bg-[#F4F4F5] border-zinc-200 text-zinc-805" 
                            : "bg-[#1C1C1E] border-white/5 text-white focus:border-auralis"
                        )}
                      >
                        <option value="400">Regular</option>
                        <option value="600">Semi Bold</option>
                        <option value="700">Bold</option>
                        <option value="900">Black</option>
                      </select>
                    </div>
                  </div>

                  {/* Text Color Picker under Size & Weight */}
                  <div className="space-y-1.5 pt-1.5">
                    <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Text Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color"
                        value={currentStyle.textColor || '#FFFFFF'}
                        onChange={(e) => updateStyle({ textColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border-0 cursor-pointer overflow-hidden bg-transparent shrink-0"
                        title="Pick text color"
                      />
                      <div className="flex flex-wrap gap-1 flex-1 select-none">
                        {['#FFFFFF', '#FFD700', '#FF3B30', '#34C759', '#007AFF', '#AF52DE', '#E5E5EA'].map((col) => (
                          <button 
                            key={col} 
                            onClick={() => updateStyle({ textColor: col })}
                            className={cn(
                              "w-5 h-5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all",
                              currentStyle.textColor === col ? "ring-2 ring-auralis border-transparent" : "border-white/10"
                            )}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button 
                      onClick={() => updateStyle({ fontWeight: currentStyle.fontWeight === 'bold' ? '400' : 'bold' })}
                      className={cn(
                        "p-2 rounded-lg flex-1 flex justify-center transition-all duration-200 active:scale-95 cursor-pointer border", 
                        currentStyle.fontWeight === 'bold' 
                          ? "bg-auralis/10 border-auralis/35 text-auralis" 
                          : isLight 
                            ? "bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-800"
                            : "bg-[#1C1C1E] border-white/5 text-white/60 hover:text-white"
                      )}
                    >
                      <Bold size={13} />
                    </button>
                    <button 
                      onClick={() => updateStyle({ fontStyle: currentStyle.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      className={cn(
                        "p-2 rounded-lg flex-1 flex justify-center transition-all duration-200 active:scale-95 cursor-pointer border", 
                        currentStyle.fontStyle === 'italic' 
                          ? "bg-auralis/10 border-auralis/35 text-auralis" 
                          : isLight 
                            ? "bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-800"
                            : "bg-[#1C1C1E] border-white/5 text-white/60 hover:text-white"
                      )}
                    >
                      <Italic size={13} />
                    </button>
                    <div className={cn("w-px h-4 mx-1", isLight ? "bg-zinc-200" : "bg-white/5")} />
                    {[AlignLeft, AlignCenter, AlignRight].map((Icon, i) => {
                      const align = ['left', 'center', 'right'][i] as any;
                      return (
                        <button 
                          key={align}
                          onClick={() => updateStyle({ textAlign: align })}
                          className={cn(
                            "p-2 rounded-lg flex-1 flex justify-center transition-all duration-200 active:scale-95 cursor-pointer border", 
                            currentStyle.textAlign === align 
                              ? "bg-auralis/10 border-auralis/35 text-auralis" 
                              : isLight 
                                ? "bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-800"
                                : "bg-[#1C1C1E] border-white/5 text-white/60 hover:text-white"
                          )}
                        >
                          <Icon size={13} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Typography Glow Selection Section */}
                <div className="pt-4 border-t border-zinc-200/50 dark:border-white/5 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Text Glow Effect</label>
                    <button 
                      onClick={() => updateStyle({ glowEnabled: !currentStyle.glowEnabled })}
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95",
                        currentStyle.glowEnabled 
                          ? "bg-auralis/10 border-auralis text-auralis font-extrabold" 
                          : isLight ? "bg-zinc-100 border-zinc-200 text-zinc-500" : "bg-white/5 border-white/10 text-white/50"
                      )}
                    >
                      {currentStyle.glowEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {currentStyle.glowEnabled && (
                    <div className="space-y-3 pl-1 animate-slide-up">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-zinc-400">Glow Size</label>
                          <input 
                            type="number"
                            min="1" max="40"
                            value={currentStyle.glowSize || 8}
                            onChange={(e) => updateStyle({ glowSize: parseInt(e.target.value) || 1 })}
                            className={cn(
                              "w-full px-2 py-1 border rounded-lg text-xs outline-none transition-all",
                              isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900" : "bg-[#1C1C1E] border-white/5 text-white"
                            )}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-zinc-400">Glow Spread</label>
                          <input 
                            type="number"
                            min="1" max="25"
                            value={currentStyle.glowSpread || 3}
                            onChange={(e) => updateStyle({ glowSpread: parseInt(e.target.value) || 1 })}
                            className={cn(
                              "w-full px-2 py-1 border rounded-lg text-xs outline-none transition-all",
                              isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900" : "bg-[#1C1C1E] border-white/5 text-[#E0E0E6]"
                            )}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Glow Color</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color"
                            value={currentStyle.glowColor || '#FFD700'}
                            onChange={(e) => updateStyle({ glowColor: e.target.value })}
                            className="w-8 h-8 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent shrink-0"
                          />
                          <div className="flex flex-wrap gap-1 select-none">
                            {['#FFD700', '#FF3B30', '#30D158', '#0A84FF', '#FFFFFF'].map(gmColor => (
                              <button 
                                key={gmColor} 
                                onClick={() => updateStyle({ glowColor: gmColor })}
                                className={cn(
                                  "w-5 h-5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all",
                                  currentStyle.glowColor === gmColor ? "ring-2 ring-auralis border-transparent" : "border-white/10"
                                )}
                                style={{ backgroundColor: gmColor }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Typography Outline Selection Section */}
                <div className="pt-4 border-t border-zinc-200/50 dark:border-white/5 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Text Outline Effect</label>
                    <button 
                      onClick={() => updateStyle({ outlineEnabled: !currentStyle.outlineEnabled })}
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95",
                        currentStyle.outlineEnabled 
                          ? "bg-auralis/10 border-auralis text-auralis font-extrabold" 
                          : isLight ? "bg-zinc-100 border-zinc-200 text-zinc-500" : "bg-white/5 border-white/10 text-white/50"
                      )}
                    >
                      {currentStyle.outlineEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {currentStyle.outlineEnabled && (
                    <div className="space-y-3 pl-1 animate-slide-up">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] uppercase font-bold text-zinc-400">Outline Width</label>
                          <span className="text-[10px] font-mono text-auralis font-bold">{currentStyle.outlineWidth !== undefined ? currentStyle.outlineWidth : 3}px</span>
                        </div>
                        <input 
                          type="range"
                          min="0.5" max="12" step="0.5"
                          value={currentStyle.outlineWidth !== undefined ? currentStyle.outlineWidth : 3}
                          onChange={(e) => updateStyle({ outlineWidth: parseFloat(e.target.value) })}
                          className="w-full accent-auralis h-1"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Outline Color</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color"
                            value={currentStyle.outlineColor || '#000000'}
                            onChange={(e) => updateStyle({ outlineColor: e.target.value })}
                            className="w-8 h-8 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent shrink-0"
                          />
                          <div className="flex flex-wrap gap-1 select-none">
                            {['#000000', '#FFFFFF', '#FFD700', '#FF3B30', '#30D158', '#0A84FF'].map(outCol => (
                              <button 
                                key={outCol} 
                                onClick={() => updateStyle({ outlineColor: outCol })}
                                className={cn(
                                  "w-5 h-5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all",
                                  currentStyle.outlineColor === outCol ? "ring-2 ring-auralis border-transparent" : "border-white/10"
                                )}
                                style={{ backgroundColor: outCol }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vertical adjustments, words, height, lines */}
                <div className="pt-4 border-t border-zinc-200/50 dark:border-white/5 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>Line Height</span>
                      <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1.5 py-0.5 rounded">{currentStyle.lineHeight.toFixed(1)}</span>
                    </div>
                    <input type="range" min="0.5" max="3" step="0.1" value={currentStyle.lineHeight} onChange={(e) => updateStyle({ lineHeight: parseFloat(e.target.value) })} className="w-full accent-auralis h-1" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>Letter Spacing</span>
                      <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1.5 py-0.5 rounded">{currentStyle.letterSpacing.toFixed(1)}</span>
                    </div>
                    <input type="range" min="-10" max="20" step="0.5" value={currentStyle.letterSpacing} onChange={(e) => updateStyle({ letterSpacing: parseFloat(e.target.value) })} className="w-full accent-auralis h-1" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>Words Per Segment</span>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[9px] cursor-pointer hover:text-auralis transition-colors flex items-center gap-1 select-none" title="Split segments based on punctuation">
                          <input type="checkbox" checked={currentStyle.aiAdaptiveLines} onChange={(e) => updateStyle({ aiAdaptiveLines: e.target.checked })} className="accent-auralis w-3 h-3 cursor-pointer" />
                          AI Adaptive Lines
                          </label>
                          <label className="text-[10px] cursor-pointer hover:text-auralis transition-colors flex items-center gap-1 select-none text-zinc-400">
                            <input type="checkbox" checked={currentStyle.aiAdaptiveEmphasis} onChange={(e) => updateStyle({ aiAdaptiveEmphasis: e.target.checked })} className="accent-auralis w-3 h-3 cursor-pointer" />
                            AI Adaptive Emphasis
                        </label>
                        <label className="text-[9px] cursor-pointer hover:text-auralis transition-colors flex items-center gap-1 select-none">
                          <input type="checkbox" checked={currentStyle.useOriginalSRT} onChange={(e) => updateStyle({ useOriginalSRT: e.target.checked })} className="accent-auralis w-3 h-3 cursor-pointer" />
                          SRT limits
                        </label>
                        <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1 py-0.5 rounded">{currentStyle.wordsPerSegment}</span>
                      </div>
                    </div>
                    <input type="range" min="1" max="10" step="1" disabled={currentStyle.useOriginalSRT} value={currentStyle.wordsPerSegment} onChange={(e) => updateStyle({ wordsPerSegment: parseInt(e.target.value) })} className={cn("w-full h-1 accent-auralis", currentStyle.useOriginalSRT && "opacity-20")} />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Max Lines</label>
                      <div className={cn("flex p-1 rounded-xl gap-0.5 border", isLight ? "bg-zinc-100 border-zinc-200" : "bg-[#151518] border-white/5")}>
                        {[1, 2, 3].map((num) => (
                          <button
                            key={num}
                            onClick={() => updateStyle({ maxLines: num })}
                            className={cn(
                              "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer text-center",
                              currentStyle.maxLines === num 
                                ? isLight 
                                  ? "bg-white text-auralis border border-zinc-205 shadow-sm font-bold" 
                                  : "bg-[#222226] text-auralis border border-white/5 shadow-md font-bold" 
                                : isLight 
                                  ? "text-zinc-500 hover:text-zinc-800"
                                  : "text-[#777] hover:text-[#CCC]"
                            )}
                          >
                            {num}L
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Casing</label>
                      <div className={cn("flex p-1 rounded-xl gap-0.5 border", isLight ? "bg-zinc-100 border-zinc-200" : "bg-[#151518] border-white/5")}>
                        {[
                          { key: 'none', label: '-' },
                          { key: 'uppercase', label: 'AB' },
                          { key: 'capitalize', label: 'Ab' }
                        ].map((c) => (
                          <button
                            key={c.key}
                            onClick={() => updateStyle({ casing: c.key as any })}
                            className={cn(
                              "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer text-center",
                              currentStyle.casing === c.key 
                                ? isLight 
                                  ? "bg-white text-auralis border border-zinc-205 shadow-sm font-bold"
                                  : "bg-[#222226] text-auralis border border-white/5 shadow-md font-bold" 
                                : isLight
                                  ? "text-zinc-500 hover:text-zinc-800"
                                  : "text-[#777] hover:text-[#CCC]"
                            )}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* X / Y Position Settings */}
                <div className="pt-4 border-t border-zinc-200/50 dark:border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span>Positioning Offset</span>
                    <button 
                      onClick={() => updateStyle({ positionX: 50, positionY: 80 })}
                      className="text-[9px] font-bold text-auralis bg-auralis/10 hover:bg-auralis/20 border border-auralis/25 px-2 py-0.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <AlignCenter size={9} />
                      Center
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">X Offset</label>
                        <span className="text-[9px] font-mono">{Math.round(currentStyle.positionX)}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="1" value={currentStyle.positionX} onChange={(e) => updateStyle({ positionX: parseInt(e.target.value) })} className="w-full h-1 accent-auralis" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Y Offset</label>
                        <span className="text-[9px] font-mono">{Math.round(currentStyle.positionY)}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="1" value={currentStyle.positionY} onChange={(e) => updateStyle({ positionY: parseInt(e.target.value) })} className="w-full h-1 accent-auralis" />
                    </div>
                  </div>
                </div>

                {/* Subtitle Animation presets toggling */}
                <div className="pt-4 border-t border-zinc-200/50 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Enable Motion Physics</span>
                    <button 
                      onClick={() => updateStyle({ animationEnabled: !currentStyle.animationEnabled })}
                      className={cn(
                        "w-9 h-5 rounded-full transition-all relative cursor-pointer",
                        currentStyle.animationEnabled ? "bg-auralis shadow-sm shadow-auralis/30" : isLight ? "bg-[#E4E4E7]" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all shadow-md",
                        currentStyle.animationEnabled ? "left-[18px]" : "left-[2px]"
                      )} />
                    </button>
                  </div>

                  {currentStyle.animationEnabled && (
                    <div className="space-y-4 pt-1 animate-slide-up">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-zinc-400">Preset Style</label>
                        <CustomPremiumSelect 
                          value={currentStyle.animationStyle}
                          onChange={(a) => updateStyle({ animationStyle: a })}
                          options={animationOptions}
                          isLight={isLight}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/30 dark:border-white/5">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] uppercase font-bold text-zinc-405" title="Fade In Duration">Fade In</label>
                            <span className="text-[9px] font-mono text-auralis">{currentStyle.fadeInDuration?.toFixed(2)}s</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.05" max="1.0" step="0.05"
                            value={currentStyle.fadeInDuration || 0.20} 
                            onChange={(e) => updateStyle({ fadeInDuration: parseFloat(e.target.value) })} 
                            className="w-full h-1 accent-auralis cursor-pointer" 
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] uppercase font-bold text-zinc-405" title="Fade Out Duration">Fade Out</label>
                            <span className="text-[9px] font-mono text-auralis">{currentStyle.fadeOutDuration?.toFixed(2)}s</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.05" max="1.0" step="0.05"
                            value={currentStyle.fadeOutDuration || 0.20} 
                            onChange={(e) => updateStyle({ fadeOutDuration: parseFloat(e.target.value) })} 
                            className="w-full h-1 accent-auralis cursor-pointer" 
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] uppercase font-bold text-zinc-405" title="Stagger Delay">Stagger</label>
                            <span className="text-[9px] font-mono text-auralis">{currentStyle.staggerDelay?.toFixed(3)}s</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.01" max="0.30" step="0.01"
                            value={currentStyle.staggerDelay || 0.05} 
                            onChange={(e) => updateStyle({ staggerDelay: parseFloat(e.target.value) })} 
                            className="w-full h-1 accent-auralis cursor-pointer" 
                          />
                        </div>
                      </div>

                      {currentStyle.animationStyle === 'pop-up' && (
                        <div className="space-y-1.5 pt-2 border-t border-zinc-200/30 dark:border-white/5 animate-slide-up">
                          <div className="flex justify-between items-center text-[10px] font-semibold">
                            <span className="text-zinc-400">POP UP INTENSITY</span>
                            <span className="font-mono text-auralis font-bold text-[10px]">x{(currentStyle.popupIntensity !== undefined ? currentStyle.popupIntensity : 1.0).toFixed(1)}</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.2" max="2.2" step="0.1"
                            value={currentStyle.popupIntensity !== undefined ? currentStyle.popupIntensity : 1.0} 
                            onChange={(e) => updateStyle({ popupIntensity: parseFloat(e.target.value) })} 
                            className="w-full h-1 accent-auralis cursor-pointer" 
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Color and style highlights */}
                <div className="pt-4 border-t border-zinc-200/50 dark:border-white/5 space-y-3">
                  <label className="text-xs font-semibold">Highlight Emphasis Color</label>
                  <div className="flex items-center gap-2 pt-0.5">
                    <input 
                      type="color"
                      value={currentStyle.highlightColor || '#FFD700'}
                      onChange={(e) => updateStyle({ highlightColor: e.target.value })}
                      className="w-8 h-8 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent shrink-0"
                      title="Pick custom highlight color"
                    />
                    <div className="flex flex-wrap gap-1 select-none">
                      {['#FFD700', '#FF3B30', '#30D158', '#0A84FF', '#FFFFFF'].map(c => (
                        <button 
                          key={c} 
                          className={cn(
                            "w-5 h-5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all", 
                            currentStyle.highlightColor === c 
                              ? (isLight ? "ring-2 ring-auralis border-zinc-250" : "ring-2 ring-auralis border-transparent")
                              : (isLight ? "border-zinc-200" : "border-white/10")
                          )}
                          style={{ backgroundColor: c }}
                          onClick={() => updateStyle({ highlightColor: c })}
                        />
                      ))}
                    </div>
                  </div>

                  {currentStyle.animationStyle === 'word-highlight-box' && (
                    <div className="space-y-2 pt-2 border-t border-zinc-200/30 dark:border-white/5 animate-slide-up">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-[#E0E0E6]">Active Highlight Box Color</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color"
                          value={currentStyle.highlightBoxColor || '#DFAC24'}
                          onChange={(e) => updateStyle({ highlightBoxColor: e.target.value })}
                          className="w-8 h-8 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent shrink-0"
                          title="Pick custom container box color"
                        />
                        <div className="flex flex-wrap gap-1 select-none">
                          {['#DFAC24', '#000000', '#FDF9EC', '#FF3B30', '#34C759', '#1C1C1E'].map((col) => (
                            <button 
                              key={col}
                              onClick={() => updateStyle({ highlightBoxColor: col })}
                              className={cn(
                                "w-5 h-5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all",
                                currentStyle.highlightBoxColor === col ? "ring-2 ring-auralis border-transparent" : "border-white/10"
                              )}
                              style={{ backgroundColor: col }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1.5">
                    <button 
                      onClick={() => updateStyle({ highlightBold: !currentStyle.highlightBold })}
                      className={cn(
                        "py-1.5 rounded-lg flex-1 flex justify-center text-[10px] font-bold transition-all border cursor-pointer", 
                        currentStyle.highlightBold 
                          ? "bg-auralis/10 border-auralis/35 text-auralis" 
                          : isLight ? "bg-zinc-50 border-zinc-200 text-zinc-500" : "bg-[#1C1C1E] border-white/5 text-[#888]"
                      )}
                    >
                      Highlight Bold
                    </button>
                    <button 
                      onClick={() => updateStyle({ highlightItalic: !currentStyle.highlightItalic })}
                      className={cn(
                        "py-1.5 rounded-lg flex-1 flex justify-center text-[10px] italic transition-all border cursor-pointer", 
                        currentStyle.highlightItalic 
                          ? "bg-auralis/10 border-auralis/35 text-auralis" 
                          : isLight ? "bg-zinc-50 border-zinc-200 text-zinc-500" : "bg-[#1C1C1E] border-white/5 text-[#888]"
                      )}
                    >
                      Highlight Italic
                    </button>
                  </div>
                </div>

                {/* AI Creator Features integrated under typography drawer */}
                <div className="pt-4 border-t border-auralis/10 space-y-3 bg-auralis/5 p-3.5 rounded-xl border border-auralis/10">
                  <div className="flex items-center gap-1 text-xs font-bold text-auralis">
                    <Sparkles size={12} className="animate-pulse" />
                    <span>Viral AI Retainer Engine</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span>AI Line Focus Word Highlight</span>
                    <button 
                      onClick={() => updateStyle({ aiLineFocusHighlighting: !(currentStyle.aiLineFocusHighlighting ?? true) })}
                      className={cn(
                        "w-8 h-4 bg-zinc-200 rounded-full transition-all relative cursor-pointer",
                        (currentStyle.aiLineFocusHighlighting ?? true) ? "bg-auralis shadow-sm shadow-auralis/30" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "absolute top-[1.5px] w-3.5 h-3.5 rounded-full bg-white transition-all shadow-md",
                        (currentStyle.aiLineFocusHighlighting ?? true) ? "left-[15px]" : "left-[1px]"
                      )} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>AI Emphasis Highlights</span>
                    <button 
                      onClick={() => updateStyle({ aiEmphasis: !currentStyle.aiEmphasis })}
                      className={cn(
                        "w-8 h-4 bg-zinc-200 rounded-full transition-all relative cursor-pointer",
                        currentStyle.aiEmphasis ? "bg-auralis shadow-sm shadow-auralis/30" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "absolute top-[1.5px] w-3.5 h-3.5 rounded-full bg-white transition-all shadow-md",
                        currentStyle.aiEmphasis ? "left-[15px]" : "left-[1px]"
                      )} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Context Smart Emojis</span>
                    <button 
                      onClick={() => updateStyle({ autoEmoji: !currentStyle.autoEmoji })}
                      className={cn(
                        "w-8 h-4 bg-zinc-200 rounded-full transition-all relative cursor-pointer",
                        currentStyle.autoEmoji ? "bg-auralis shadow-sm shadow-auralis/30" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "absolute top-[1.5px] w-3.5 h-3.5 rounded-full bg-white transition-all shadow-md",
                        currentStyle.autoEmoji ? "left-[15px]" : "left-[1px]"
                      )} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Only Focus Highlight Key Word</span>
                    <button 
                      onClick={() => updateStyle({ onlyHighlightKeyword: !currentStyle.onlyHighlightKeyword })}
                      className={cn(
                        "w-8 h-4 bg-zinc-200 rounded-full transition-all relative cursor-pointer",
                        currentStyle.onlyHighlightKeyword ? "bg-auralis shadow-sm shadow-auralis/30" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "absolute top-[1.5px] w-3.5 h-3.5 rounded-full bg-white transition-all shadow-md",
                        currentStyle.onlyHighlightKeyword ? "left-[15px]" : "left-[1px]"
                      )} />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TA-2: Video Drawer Content (Import Media, Aspect Ratios, Res) */}
            {activeTab === 'video' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase text-auralis">Core Media Asset</span>
                  <label className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 group shadow-sm text-center",
                    isLight
                      ? "border-zinc-200 bg-zinc-50 hover:border-auralis hover:bg-auralis/5"
                      : "border-white/5 bg-[#1C1C1E] hover:border-auralis/50 hover:bg-auralis/5"
                  )}>
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-105 mb-2.5",
                      isLight ? "bg-zinc-200/50 text-zinc-650" : "bg-white/5 text-white/40"
                    )}>
                      <VideoIcon className="group-hover:text-auralis transition-colors" size={22} />
                    </div>
                    <span className={cn(
                      "text-xs font-bold transition-colors group-hover:text-auralis mb-1",
                      isLight ? "text-zinc-800" : "text-white"
                    )}>Upload Video / Audio</span>
                    <span className={cn(
                      "text-[9px] text-[#8F8F9F]",
                      isLight ? "text-zinc-400" : "text-white/30"
                    )}>Supports MP4, MP3, WAV, MOV</span>
                    <input type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && onVideoUpload(e.target.files[0])} />
                  </label>
                </div>

                {/* Aspect Ratios selection */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-200/50 dark:border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Monitor size={11} className="text-auralis" />
                    <span className="text-[11px] font-semibold">Aspect Ratio Canvas</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: '9:16', icon: <Smartphone size={11} />, label: '9:16' },
                      { id: '1:1', icon: <Square size={11} />, label: '1:1' },
                      { id: '16:9', icon: <Monitor size={11} />, label: '16:9' },
                      { id: '4:5', icon: <RectangleVertical size={11} />, label: '4:5' }
                    ].map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onUpdateAspectRatio(r.id as AspectRatio)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 py-2.5 rounded-lg border transition-all cursor-pointer",
                          aspectRatio === r.id 
                            ? isLight
                              ? "bg-white text-auralis border-auralis font-bold shadow-xs scale-[1.03]"
                              : "bg-[#1E1E22] text-auralis border-auralis/40 font-bold shadow-md scale-[1.03]" 
                            : isLight
                              ? "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300"
                              : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                        )}
                      >
                        {r.icon}
                        <span className="text-[8.5px] font-bold uppercase">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline Resolution quality */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-200/50 dark:border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Sliders size={11} className="text-auralis" />
                    <span className="text-[11px] font-semibold">Playback Quality</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'low', label: '1/4 Draft' },
                      { id: 'medium', label: '1/2 Bal' },
                      { id: 'high', label: 'Full Res' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setTimelineResolution(opt.id as 'low' | 'medium' | 'high')}
                        className={cn(
                          "py-2 rounded-lg border text-[9px] font-semibold hover:scale-102 transition-all cursor-pointer text-center",
                          timelineResolution === opt.id 
                            ? isLight
                              ? "bg-white text-auralis border-auralis font-bold shadow-xs"
                              : "bg-[#1C1C1F] text-auralis border-auralis/30 font-bold shadow-md"
                            : isLight
                              ? "bg-white border-zinc-200 text-zinc-500 hover:text-[#111]"
                              : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                        )}
                        title={`Timeline Quality Mode: ${opt.label}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TA-3: Captions Drawer Content */}
            {activeTab === 'captions' && (
              <div className="space-y-4">
                {/* Auto Captions Actions and Credits info */}
                <div className={cn(
                  "p-4 rounded-2xl border space-y-3.5 transition-all duration-300",
                  isLight ? "bg-white border-zinc-200 shadow-xs" : "bg-[#18181B] border-white/5"
                )}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-auralis/10 text-auralis flex items-center justify-center">
                      <Sparkles size={16} className="animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-tight">AI Subtitle Studio</h4>
                      <p className="text-[9px] text-[#8F8F9F]">Optimized for TikTok / Reels</p>
                    </div>
                  </div>

                  <p className={cn(
                    "text-[10px] leading-relaxed",
                    isLight ? "text-zinc-650" : "text-white/45"
                  )}>
                    Speech-to-text algorithms analyze audio frames instantly. Uploading a video clip automatically starts transcription!
                  </p>

                  <div className="space-y-2 pt-1 border-t border-zinc-200/50 dark:border-white/5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="opacity-70">Short-Form Max Loop:</span>
                      <span className="font-bold text-auralis">2:00 min</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="opacity-70">Free User Active Quota:</span>
                      <span className="font-bold text-auralis">20m free</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="opacity-70">Client Extraction FFmpeg:</span>
                      <span className="font-bold text-green-500 text-[9.5px]">Enabled & Active</span>
                    </div>
                  </div>
                </div>

                {/* AI Focus Word Highlighting Option */}
                <div className={cn(
                  "p-3 rounded-xl border flex items-center justify-between gap-3 transition-all",
                  isLight ? "bg-white border-zinc-200 shadow-xs" : "bg-[#18181B] border-white/5"
                )}>
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold flex items-center gap-1.5">
                      <Sparkles size={13} className="text-auralis" /> AI Focus Word Highlighting
                    </span>
                    <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      Highlights focus words on each line with emotion animations
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => updateStyle({ aiLineFocusHighlighting: !(currentStyle.aiLineFocusHighlighting ?? true) })}
                    className={cn(
                      "w-9 h-5 rounded-full transition-all relative cursor-pointer shrink-0 border border-[#888]/10",
                      (currentStyle.aiLineFocusHighlighting ?? true) ? "bg-auralis shadow-md shadow-auralis/30" : "bg-zinc-300 dark:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all shadow-md",
                      (currentStyle.aiLineFocusHighlighting ?? true) ? "left-[18px]" : "left-[2px]"
                    )} />
                  </button>
                </div>

                {/* Transcription Language Option */}
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Language Mode</label>
                  <select
                    value={transcriptionLanguage || 'hinglish'}
                    onChange={(e) => setTranscriptionLanguage(e.target.value)}
                    className={cn(
                      "w-full text-xs p-2.5 rounded-xl border outline-none transition-colors",
                      isLight
                        ? "bg-white border-zinc-200 text-zinc-800"
                        : "bg-[#1C1C1E] border-white/5 text-white/90"
                    )}
                  >
                    <option value="hinglish">Hinglish (Default)</option>
                    <option value="hindi">Hindi (Devanagari)</option>
                    <option value="english">English</option>
                    <option value="auto">Auto-detect</option>
                  </select>
                </div>
                
                {/* Transcribe Video Button */}
                <button
                  onClick={() => {
                    confirm({
                      title: "Transcribe Video",
                      message: "Warning: Transcribing will remove any existing transcription and text nodes. Do you want to proceed?",
                      confirmText: "Transcribe",
                      onConfirm: () => {
                        const storeState = useStore.getState();
                        const newTracks = storeState.tracks.map(track => {
                          if (track.type === 'text') {
                            return { ...track, clips: [] };
                          }
                          return track;
                        });
                        storeState.setTracks(newTracks);
                        alert("Subtitles cleared. Automatic transcription will restart when processing video.", "Cleared");
                      }
                    });
                  }}
                  className={cn(
                    "w-full p-5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer hover:opacity-80 active:scale-[0.98]",
                    isLight 
                      ? "border-zinc-200 bg-white shadow-xs text-zinc-900" 
                      : "border-white/5 bg-[#1C1C1E] shadow-sm text-white"
                  )}
                >
                  <div className="p-2.5 rounded-full bg-auralis/10 text-auralis mb-3">
                    <Sparkle size={20} className="p-0.5 animate-pulse" />
                  </div>
                  <h3 className="text-xs font-extrabold tracking-tight mb-1.5">
                    Transcribe Video
                  </h3>
                  <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed font-sans">
                    Automatically generate new subtitles based on your video's audio track.
                  </p>
                </button>

                {/* Re-transcribe Video Button */}
                <button
                  onClick={handleRetranscribe}
                  disabled={isRetranscribing}
                  className={cn(
                    "w-full p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all duration-300 cursor-pointer hover:opacity-80 active:scale-[0.98] mt-2",
                    isLight 
                      ? "border-auralis/20 bg-auralis/5 text-auralis font-bold" 
                      : "border-auralis/20 bg-auralis/10 text-auralis font-bold",
                    isRetranscribing && "opacity-90 cursor-not-allowed pointer-events-none"
                  )}
                >
                  {isRetranscribing ? (
                    <div className="w-full flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-auralis shrink-0" />
                        <span className="text-[11px] font-bold tracking-tight">
                          Transcribing ({retranscribeProgress}%)...
                        </span>
                      </div>
                      <div className="w-full h-2 bg-auralis/20 rounded-full overflow-hidden p-0.5">
                        <div 
                          className="h-full bg-auralis rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, retranscribeProgress))}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RotateCw size={14} />
                      <span className="text-[11px] font-bold tracking-tight">Re-transcribe Video</span>
                    </div>
                  )}
                </button>

                {/* Subtitle operations panel */}
                <span className="text-[9px] font-bold uppercase text-auralis">Operational Utilities</span>
                <div className="grid grid-cols-1 gap-2">
                  {/* Upload Custom SRT */}
                  <label className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer hover:scale-102 transition-all duration-300 group shadow-xs",
                    isLight ? "border-zinc-200 bg-white hover:border-auralis/50" : "border-white/5 bg-[#1C1C1E] hover:border-auralis/40"
                  )}>
                    <Upload size={14} className="text-[#888] group-hover:text-auralis transition-colors shrink-0" />
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-bold">Import SRT File</span>
                      <span className="text-[9px] opacity-60">Overwrites existing subtitles</span>
                    </div>
                    <input type="file" accept=".srt" className="hidden" onChange={(e) => e.target.files?.[0] && onSRTUpload(e.target.files[0])} />
                  </label>

                  {/* Export / Download SRT File */}
                  <button
                    onClick={downloadSRT}
                    disabled={captions.length === 0}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl border hover:scale-102 transition-all duration-305 text-left w-full cursor-pointer group shadow-xs disabled:opacity-40 disabled:pointer-events-none",
                      isLight ? "border-zinc-200 bg-white hover:border-auralis/50" : "border-white/5 bg-[#1C1C1E] hover:border-auralis/40"
                    )}
                  >
                    <Download size={14} className="text-[#888] group-hover:text-auralis transition-colors shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold">Export SRT Captions</span>
                      <span className="text-[9px] opacity-60">Download formatted subtitles</span>
                    </div>
                  </button>

                  {/* Clear All Subtitles */}
                  <button
                    onClick={() => {
                      confirm({
                        title: "Clear Subtitles",
                        message: "Are you sure you want to clear all active subtitle segments? This cannot be undone.",
                        confirmText: "Clear All",
                        onConfirm: () => {
                          onUpdateCaptions([]);
                        }
                      });
                    }}
                    disabled={captions.length === 0}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl border hover:scale-102 transition-all duration-305 text-left w-full cursor-pointer group shadow-xs disabled:opacity-40 disabled:pointer-events-none",
                      isLight ? "border-zinc-200 bg-white hover:border-red-400/50" : "border-white/5 bg-[#1C1C1E] hover:border-red-400/40"
                    )}
                  >
                    <Trash2 size={14} className="text-[#888] group-hover:text-red-450 transition-colors shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold">Wipe Subtitle Segments</span>
                      <span className="text-[9px] opacity-60">Clear current timeline list</span>
                    </div>
                  </button>
                </div>

                {/* Subtitle Redirections */}
                <div className={cn(
                  "p-3 rounded-xl border text-[10px] space-y-1 text-center font-sans",
                  isLight ? "bg-zinc-50/50 border-zinc-200 text-zinc-500" : "bg-[#151518] border-white/5 text-white/30"
                )}>
                  <p>Need to customize colors, animations, or styles?</p>
                  <div className="flex gap-1.5 justify-center pt-2">
                    <button 
                      onClick={() => setActiveTab('subtitles')}
                      className="text-auralis hover:underline font-bold"
                    >
                      Preset Colors & Styles &rarr;
                    </button>
                    <span>|</span>
                    <button 
                      onClick={() => setActiveTab('text')}
                      className="text-auralis hover:underline font-bold"
                    >
                      Edit Wording Segments &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TA-3.5: Depth Captions Drawer Content */}
            {activeTab === 'depth-captions' && (
              <div className="h-full">
                <CaptionAccessibilityPanel 
                  currentStyle={currentStyle} 
                  updateStyle={updateStyle}
                  accessibilitySettings={accessibilitySettings}
                  updateAccessibility={setAccessibility}
                  isLight={isLight!}
                  captions={captions}
                  onUpdateCaptions={onUpdateCaptions}
                  session={session}
                />
              </div>
            )}

            {/* TA-4: Image Drawer Content */}
            {activeTab === 'image' && (() => {
              const handleAddImageToTimeline = (name: string, url: string) => {
                const storeState = useStore.getState();
                const overlayTrack = storeState.tracks.find(t => t.type === 'overlay') || storeState.tracks.find(t => t.type === 'video') || storeState.tracks[0];
                if (!overlayTrack) return;
                
                const clipId = `image-${Date.now().toString(36)}`;
                const start = storeState.currentTime;
                const duration = storeState.duration || 60;
                const end = Math.min(duration, start + 5);
                
                storeState.addClip(overlayTrack.id, {
                  id: clipId,
                  type: 'image',
                  start,
                  end,
                  duration: end - start,
                  sourceStart: 0,
                  sourceEnd: end - start,
                  layer: 30,
                  opacity: 1.0,
                  visible: true,
                  muted: false,
                  x: 0,
                  y: 0,
                  width: 300,
                  height: 300,
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                  playbackRate: 1,
                  sourceUrl: url
                });
                
                storeState.setSelectedClipId(clipId);
              };

              return (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold uppercase text-auralis">Upload Image Logo / Watermark</span>
                    <label className={cn(
                      "flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 group shadow-sm text-center",
                      isLight ? "border-zinc-200 bg-zinc-50 hover:border-auralis" : "border-white/5 bg-[#1C1C1E] hover:border-auralis"
                    )}>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 duration-200 text-[#888]">
                        <ImageIcon className="group-hover:text-auralis transition-colors" size={20} />
                      </div>
                      <span className="text-xs font-bold transition-colors group-hover:text-auralis mb-0.5">Custom Watermark</span>
                      <span className="text-[9px] text-[#8F8F9F]">Supports transparent PNG, SVGs & JPEGs</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            addUploadedImage(file.name, url, file);
                          }
                        }} 
                      />
                    </label>
                  </div>

                  {uploadedImages.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[9px] font-bold uppercase text-auralis">Uploaded Watermarks (Drag or Click)</span>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                        {uploadedImages.map((img) => (
                          <div 
                            key={img.id}
                            draggable="true"
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'image', name: img.name, url: img.url }));
                            }}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-xl border group hover:border-auralis/50 cursor-grab relative overflow-hidden transition-all duration-200",
                              isLight ? "bg-white border-zinc-100" : "bg-[#1C1C1E] border-white/5"
                            )}
                          >
                            <img src={img.url} className="w-10 h-10 object-contain rounded-lg bg-black/10 border border-white/5" alt={img.name} />
                            <div className="flex-1 min-w-0 font-sans">
                              <h4 className="text-[11px] font-semibold truncate pr-6">{img.name}</h4>
                              <p className="text-[9px] text-gray-500 font-mono">Drag or click to add</p>
                            </div>
                            
                            <button 
                              onClick={() => handleAddImageToTimeline(img.name, img.url)}
                              className="absolute right-9 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all bg-auralis text-black p-1 rounded-lg text-[10px] font-extrabold cursor-pointer"
                              title="Add to playhead"
                            >
                              <Plus size={10} />
                            </button>
                            
                            <button 
                              onClick={() => removeUploadedImage(img.id)}
                              className="absolute right-2 text-red-400 opacity-60 hover:opacity-100 hover:scale-110 transition-all p-1"
                              title="Delete"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-[9px] font-bold uppercase text-auralis">Stickers & Labels (Drag or Click)</span>
                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {[
                        { name: '🔥 Trending', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40"><rect width="120" height="40" rx="10" fill="%23FF5E3A"/><text x="12" y="24" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold">🔥 TRENDING</text></svg>' },
                        { name: '👑 Champion', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40"><rect width="120" height="40" rx="10" fill="%23FFD700"/><text x="14" y="24" fill="%231E1E24" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold">👑 CHAMPION</text></svg>' },
                        { name: '👍 Like It', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="100" height="40"><rect width="100" height="40" rx="10" fill="%2300BFFF"/><text x="15" y="24" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold">👍 LIKE IT</text></svg>' },
                        { name: '⚠️ Danger', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="100" height="40"><rect width="100" height="40" rx="10" fill="%23FFCC00"/><text x="15" y="24" fill="%231E1E24" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold">⚠️ DANGER</text></svg>' },
                        { name: '🌟 Star Up', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="100" height="40"><rect width="100" height="40" rx="10" fill="%23FF6B6B"/><text x="15" y="24" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold">🌟 STAR UP</text></svg>' },
                        { name: '📍 Anchor', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="100" height="40"><rect width="100" height="40" rx="10" fill="%234D96FF"/><text x="15" y="24" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold">📍 ANCHOR</text></svg>' }
                      ].map((p) => (
                        <div 
                          key={p.name} 
                          draggable="true"
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'image', name: p.name, url: p.url }));
                          }}
                          onClick={() => handleAddImageToTimeline(p.name, p.url)}
                          className={cn(
                            "py-3 px-1 rounded-xl border text-xs font-semibold cursor-grab active:scale-95 transition-all text-center flex flex-col items-center gap-1 select-none font-sans",
                            isLight 
                              ? "bg-white border-zinc-200 hover:border-auralis hover:bg-auralis/5" 
                              : "bg-[#1C1C1E] border-white/5 hover:border-auralis/50"
                          )}
                        >
                          <img src={p.url} className="h-6 object-contain pointer-events-none" alt={p.name} />
                          <span className="text-[10px] opacity-75">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TA-5: Subtitles Presets Tab */}
            {activeTab === 'subtitles' && (
              <div className="space-y-5">
                {/* SRT Import Banner */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase text-auralis">Import Custom Caption File</span>
                  <label className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 group shadow-sm",
                    isLight
                      ? "border-zinc-200 bg-zinc-50 hover:border-auralis hover:bg-auralis/5"
                      : "border-white/5 bg-[#1C1C1E] hover:border-auralis/50 hover:bg-auralis/5"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-105",
                      isLight ? "bg-zinc-200/50" : "bg-white/5"
                    )}>
                      <FileText className={cn(
                        "transition-colors",
                        isLight ? "text-zinc-500 group-hover:text-auralis" : "text-white/40 group-hover:text-auralis"
                      )} size={16} />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className={cn(
                        "text-xs font-bold transition-colors group-hover:text-auralis",
                        isLight ? "text-zinc-800" : "text-white"
                      )}>Import SRT File</span>
                      <span className={cn(
                        "text-[9px] mt-0.5",
                        isLight ? "text-zinc-400" : "text-[#8F8F9F]"
                      )}>Adds custom timestamps</span>
                    </div>
                    <input type="file" accept=".srt" className="hidden" onChange={(e) => e.target.files?.[0] && onSRTUpload(e.target.files[0])} />
                  </label>
                </div>

                {/* Built-in Animation Style Presets Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-auralis flex items-center gap-1">
                      <Sparkles size={11} />
                      Animation Presets ({CAPTION_GRID_PRESETS.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {CAPTION_GRID_PRESETS.map((preset) => {
                      const isActive = currentStyle.animationStyle === preset.style && !currentStyle.depthEnabled === !preset.depthEnabled;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            applyStyleWithAutoSemantics({
                              animationStyle: preset.style,
                              depthEnabled: preset.depthEnabled,
                              ...(preset.defaultSettings || {})
                            });
                          }}
                          className={cn(
                            "relative rounded-xl border p-2.5 flex flex-col justify-between text-left transition-all duration-200 cursor-pointer group shadow-sm overflow-hidden",
                            isActive 
                              ? "border-auralis bg-auralis/10 ring-1 ring-auralis/40 shadow-auralis/10" 
                              : isLight
                                ? "bg-white border-zinc-200/80 hover:border-auralis/50 hover:bg-zinc-50 text-zinc-800"
                                : "bg-[#1A1A1E] border-white/5 hover:border-auralis/40 hover:bg-[#222226] text-white"
                          )}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className={cn(
                              "text-[8.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded-md border",
                              isActive 
                                ? "bg-auralis text-white border-auralis" 
                                : isLight ? "bg-zinc-100 border-zinc-200 text-zinc-600" : "bg-white/10 border-white/10 text-zinc-400"
                            )}>
                              {preset.section}
                            </span>
                            {isActive && (
                              <span className="w-4 h-4 rounded-full bg-auralis text-white flex items-center justify-center text-[10px] shadow-xs">
                                ✓
                              </span>
                            )}
                          </div>

                          <span className="font-bold text-[11px] leading-tight mt-1">{preset.name}</span>
                          <span className="text-[9.5px] text-zinc-400 line-clamp-1 mt-0.5">{preset.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content-Aware 3D Depth Presets */}
                <div className="space-y-3 pt-2">
                  <span className="text-[9px] font-bold uppercase text-auralis flex items-center gap-1">
                    <Layers size={11} />
                    Content-Aware & 3D Depth Presets ({CAPTION_PRESETS.length})
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {CAPTION_PRESETS.map((preset) => {
                      const isActive = isPresetActive(preset);
                      return (
                        <button
                          key={preset.id}
                          onClick={() => applyStyleWithAutoSemantics(preset.style)}
                          className={cn(
                            "relative rounded-xl border p-3 flex items-center gap-3 text-left transition-all duration-200 cursor-pointer group shadow-sm overflow-hidden",
                            isActive 
                              ? "border-auralis bg-auralis/10 ring-1 ring-auralis/40" 
                              : isLight
                                ? "bg-white border-zinc-200 hover:border-auralis/50 hover:bg-zinc-50 text-zinc-800"
                                : "bg-[#1A1A1E] border-white/5 hover:border-auralis/40 hover:bg-[#222226] text-white"
                          )}
                        >
                          {/* Mini Visual Badge Preview */}
                          <div className={cn(
                            "w-12 h-12 rounded-lg bg-gradient-to-br flex flex-col items-center justify-center shrink-0 border border-white/10 p-1 text-center font-bold overflow-hidden shadow-xs",
                            preset.bgColor || "from-zinc-900 to-black"
                          )}>
                            <span className="text-[11px] leading-none tracking-wider uppercase font-black" style={{ color: preset.textColor, fontFamily: preset.fontFamily }}>
                              {preset.bgText}
                            </span>
                            <span className="text-[8px] opacity-80 text-white font-sans truncate w-full mt-0.5">
                              {preset.fgText}
                            </span>
                          </div>

                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs truncate">{preset.name}</span>
                              {isActive && (
                                <span className="text-[10px] font-bold text-auralis bg-auralis/20 px-1.5 py-0.2 rounded-md">
                                  Active
                                </span>
                              )}
                            </div>
                            <span className="text-[9.5px] text-zinc-400 line-clamp-1 mt-0.5">{preset.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Featured Brand Kits */}
                <div className="space-y-3 pt-2">
                  <span className="text-[9px] font-bold uppercase text-auralis">Featured Brand Kits</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Pixelated Follow Up', style: { fontFamily: 'GNF', highlightColor: '#FEECF2', canvasBackground: '#000000', textColor: '#FEECF2', animationStyle: 'follow-up', fontSize: 56, fontWeight: '300', shadowEnabled: false, glowEnabled: true, glowSize: 38, glowColor: '#FFFFFF', wordsPerSegment: 7, aiAdaptiveLines: true, useOriginalSRT: false, maxLines: 1, fadeInDuration: 0.35, fadeOutDuration: 0.05, staggerDelay: 0.13, followUpStretch: true, followUpStretchAmount: 5, followUpStretchSpline: 'linear', letterSpacing: 0, lineHeight: 1.2, wordSpacing: 0, positionX: 50, positionY: 80, gOpacity: 0.9, gScale: 1.1 }, colors: ['#FEECF2', '#FFFFFF', '#000000'], desc: 'Smooth continuous drift' },
                      { name: 'Sunset Bold', style: { highlightColor: '#DFAC24', canvasBackground: '#0F0F12', textColor: '#FFFFFF', animationStyle: 'fade-in-word', fontSize: 60, fontWeight: '700' }, colors: ['#DFAC24', '#FFFFFF', '#0F0F12'], desc: 'Inspirational creators edge' },
                      { name: 'Royal Mint', style: { highlightColor: '#10B981', canvasBackground: '#FCFCFD', textColor: '#1E40AF', animationStyle: 'fade-in-word', fontSize: 50, fontWeight: '600' }, colors: ['#10B981', '#1E40AF', '#FCFCFD'], desc: 'Clean aesthetics financial loops' },
                      { name: 'Neon Arcade', style: { highlightColor: '#39FF14', canvasBackground: '#070708', textColor: '#FFFFFF', shadowColor: '#FF007F', shadowEnabled: true, animationStyle: 'play-typo', fontSize: 65, fontWeight: '900' }, colors: ['#FF007F', '#39FF14', '#070708'], desc: 'High visual gaming clips' }
                    ].map((kit) => (
                      <button 
                        key={kit.name}
                        className={cn(
                          "p-2.5 rounded-xl border flex flex-col text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-98 gap-1 shadow-sm",
                          isLight ? "bg-white border-zinc-200" : "bg-[#1A1A1E] border-white/5"
                        )}
                        onClick={() => applyStyleWithAutoSemantics(kit.style as any)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[11px] font-bold leading-none truncate">{kit.name}</span>
                          <div className="flex gap-1 shrink-0">
                            {kit.colors.map(c => (
                              <span key={c} className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
                        <span className="text-[9px] text-zinc-400">{kit.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* My Saved Presets Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase text-auralis">My Saved Presets</span>
                    {!isSavingPreset && (
                      <button 
                        onClick={() => setIsSavingPreset(true)}
                        className="text-[9px] font-bold bg-auralis/10 text-auralis hover:bg-auralis/20 transition-colors px-2 py-1 rounded cursor-pointer"
                      >
                        + Save Current
                      </button>
                    )}
                  </div>
                  
                  {isSavingPreset && (
                    <div className={cn("flex flex-col gap-2 p-2 rounded-xl border animate-slide-up", isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#1C1C1E] border-white/5")}>
                      <input
                        type="text"
                        placeholder="Preset Name..."
                        value={presetNameInput}
                        onChange={(e) => setPresetNameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveCurrentAsPreset()}
                        className={cn("w-full px-2 py-1 text-xs rounded border outline-none", isLight ? "bg-white border-zinc-200" : "bg-black/40 border-white/10")}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setIsSavingPreset(false); setPresetNameInput(''); }}
                          className="flex-1 py-1 text-[9px] font-bold rounded hover:bg-zinc-200 dark:hover:bg-white/10 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveCurrentAsPreset}
                          disabled={!presetNameInput.trim()}
                          className="flex-1 py-1 text-[9px] font-bold rounded bg-auralis text-white hover:bg-auralis/90 disabled:opacity-50 cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    {myPresets.map((preset) => (
                      <button 
                        key={preset.id}
                        onClick={() => applyStyleWithAutoSemantics(preset.style)}
                        className={cn(
                          "relative aspect-[4/3] rounded-xl border p-3 flex flex-col justify-between hover:border-auralis/55 transition-all duration-300 cursor-pointer active:scale-95 group shadow-sm overflow-hidden",
                          isLight
                            ? "bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100"
                            : "bg-[#1C1C1E] border-white/5 text-[#CCC] bg-gradient-to-b from-[#1C1C1E] to-[#141416]"
                        )}
                      >
                        <button
                          onClick={(e) => deletePreset(e, preset.id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-colors opacity-0 group-hover:opacity-100 cursor-pointer z-10"
                        >
                          <Trash2 size={10} />
                        </button>
                        <div className={cn(
                          "w-5 h-5 rounded-lg flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform",
                          isLight ? "bg-white border border-zinc-200" : "bg-white/5"
                        )}>
                          <Sparkles size={10} className={cn(
                            "transition-colors",
                            isLight ? "text-zinc-505 group-hover:text-auralis" : "text-[#888] group-hover:text-auralis"
                          )} />
                        </div>
                        <span className={cn(
                          "font-bold text-[9px] uppercase tracking-wider transition-colors text-left truncate w-full pr-1",
                          isLight ? "text-zinc-700 group-hover:text-zinc-900" : "text-white/80 group-hover:text-white"
                        )}>{preset.name}</span>
                      </button>
                    ))}
                    
                    {myPresets.length === 0 && (
                      <div className="col-span-2 flex flex-col items-center justify-center text-center py-6 border border-dashed rounded-xl border-white/10 text-white/40 text-xs">
                        <Palette size={16} className="mb-1.5 opacity-50" />
                        <span>No saved custom presets yet.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TA-6: Text Drawer Content (Active text segment editor) */}
            {activeTab === 'text' && (
              <div className="flex flex-col flex-1 h-full min-h-0 space-y-3.5">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-auralis">Wording Segments</span>
                  <span className="text-[9px] bg-auralis/10 text-auralis font-bold px-2 py-0.5 rounded-full">{captions.length} lines</span>
                </div>

                {/* Subtitle Search Box */}
                <input 
                  type="text"
                  placeholder="Filter key phrases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-xs rounded-xl border outline-none transition-all shrink-0",
                    isLight 
                      ? "bg-zinc-50 border-zinc-200 focus:bg-white focus:border-auralis" 
                      : "bg-[#151518] border-white/10 text-white focus:border-auralis"
                  )}
                />

                <div className="space-y-3 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-4">
                  {filteredCaptions.length === 0 ? (
                    <div className={cn(
                      "text-center py-10 px-4 rounded-xl border text-[11px]",
                      isLight ? "bg-zinc-50 border-zinc-200 text-zinc-500" : "bg-[#18181B] border-white/5 text-white/30"
                    )}>
                      No matched segments available
                    </div>
                  ) : (
                    filteredCaptions.map((caption) => (
                      <SidebarSubtitleItem 
                        key={caption.id}
                        caption={caption}
                        isLight={isLight}
                        updateCaptionText={updateCaptionText}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TA-7: Elements Drawer Content */}
            {activeTab === 'elements' && (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <span className="text-[9px] font-bold uppercase text-auralis">Canvas Background Color</span>
                  <div className={cn(
                    "p-3 rounded-xl border space-y-3",
                    isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#1C1C1E] border-white/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold">Active monitor color</span>
                      <div 
                        className="w-4 h-4 rounded-md border border-zinc-300 shadow-md"
                        style={{ backgroundColor: currentStyle.canvasBackground }}
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-1">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => updateStyle({ canvasBackground: color })}
                          className={cn(
                            "w-6 h-6 rounded-full border transition-all cursor-pointer active:scale-95 hover:scale-110",
                            currentStyle.canvasBackground === color 
                              ? isLight 
                                ? "ring-2 ring-auralis ring-offset-2 ring-offset-white border-zinc-200" 
                                : "ring-2 ring-auralis ring-offset-2 ring-offset-[#1C1C1E]" 
                              : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border text-center space-y-2",
                  isLight ? "bg-zinc-50 border-zinc-200 text-zinc-500" : "bg-[#151518] border-white/5"
                )}>
                  <Layers className={cn("mx-auto mb-1", isLight ? "text-zinc-300" : "text-white/15")} size={20} />
                  <h3 className="text-[11px] font-bold flex items-center justify-center gap-1.5 uppercase text-auralis">
                    Custom overlay styles
                  </h3>
                  <p className="text-[9px] leading-relaxed opacity-60">
                    Graphic vectors, badges & shapes overlays will display in the elements layer in a future update release.
                  </p>
                </div>
              </div>
            )}

            {/* TA-8: Script Transcription tab */}
            {activeTab === 'script' && (
              <div className="space-y-3">
                <span className="text-[9px] font-bold uppercase text-auralis">Narrated Script</span>
                <p className="text-[9.5px] opacity-45 leading-relaxed">Reads the total verbal flow parsed from subtitle nodes. Easily copy text block below.</p>
                
                <div className={cn(
                  "w-full h-48 border p-3 rounded-xl text-xs font-medium overflow-y-auto custom-scrollbar leading-relaxed mb-3",
                  isLight 
                    ? "bg-zinc-50 border-zinc-200 text-zinc-805" 
                    : "bg-[#151518] border-white/5 text-[#FFF]"
                )}>
                  {fullTranscript || "Import SRT caption node or transcribe video above to preview formatted narration lines script."}
                </div>

                {fullTranscript && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(fullTranscript);
                      alert("Formatted narration script copied to clipboard!", "Success");
                    }}
                    className="w-full py-2 bg-auralis hover:brightness-105 active:scale-98 cursor-pointer rounded-xl text-xs font-bold text-slate-900 text-center"
                  >
                    Copy Narration Draft
                  </button>
                )}
              </div>
            )}

            {/* TA-9: Brand Kit Tab */}
            {activeTab === 'brand-kit' && (
              <div className="space-y-4 relative">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase text-auralis">Visual Brand Palettes</span>
                    {!isSavingBrandKit && (
                      <button
                        onClick={() => {
                          if (!isProUser) {
                            upgradePopup("Saving custom Brand Kits is a feature available for paid plans.", "Creator, Pro or Studio");
                            return;
                          }
                          setIsSavingBrandKit(true);
                        }}
                        className={cn(
                          "px-2 py-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                          isLight ? "bg-auralis text-white hover:bg-auralis/90" : "bg-auralis/20 text-auralis hover:bg-auralis/30"
                        )}
                      >
                        {!isProUser && <Lock size={10} />}
                        + Save Template
                      </button>
                    )}
                  </div>
                      
                      {isSavingBrandKit && (
                        <div className={cn("flex flex-col gap-2 p-2.5 rounded-xl border animate-slide-up", isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#151518] border-white/5")}>
                          <input
                            type="text"
                            placeholder="Template Name..."
                            value={brandKitNameInput}
                            onChange={(e) => setBrandKitNameInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveCurrentAsBrandKit()}
                            className={cn("w-full px-2 py-1.5 text-xs rounded-lg border outline-none", isLight ? "bg-white border-zinc-200" : "bg-black/40 border-white/10")}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setIsSavingBrandKit(false); setBrandKitNameInput(''); }}
                              className="flex-1 py-1.5 text-[10px] font-bold rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveCurrentAsBrandKit}
                              disabled={!brandKitNameInput.trim()}
                              className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-auralis text-white hover:bg-auralis/90 disabled:opacity-50 cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {myBrandKits.length > 0 && (
                      <div className="space-y-3 pb-3 border-b border-zinc-200/10 dark:border-white/5">
                        <span className="text-[9px] font-bold uppercase text-zinc-500">My Saved Templates</span>
                        <div className="grid grid-cols-2 gap-2">
                          {myBrandKits.map((kit) => (
                            <div
                              key={kit.id}
                              onClick={() => applyStyleWithAutoSemantics(kit.style)}
                              className={cn(
                                "relative p-2 rounded-xl border flex flex-col items-start text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-98 gap-1.5 shadow-sm overflow-hidden group",
                                isLight ? "bg-white border-zinc-200" : "bg-[#1C1C1E] border-white/5"
                              )}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[10px] font-bold leading-none truncate pr-2">{kit.name}</span>
                                <button
                                  onClick={(e) => deleteBrandKit(e, kit.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-red-500/20 text-red-500 absolute top-1.5 right-1.5 cursor-pointer"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                              <div className="flex gap-0.5 mt-1">
                                {kit.colors.map((c, i) => (
                                  <span key={i} className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3 pt-1">
                      <span className="text-[9px] font-bold uppercase text-zinc-500">Featured Kits</span>
                      {[
                        { name: 'Pixelated Follow Up', style: { fontFamily: 'GNF', highlightColor: '#FEECF2', canvasBackground: '#000000', textColor: '#FEECF2', animationStyle: 'follow-up', fontSize: 56, fontWeight: '300', shadowEnabled: false, glowEnabled: true, glowSize: 38, glowColor: '#FFFFFF', wordsPerSegment: 7, aiAdaptiveLines: true, useOriginalSRT: false, maxLines: 1, fadeInDuration: 0.35, fadeOutDuration: 0.05, staggerDelay: 0.13, followUpStretch: true, followUpStretchAmount: 5, followUpStretchSpline: 'linear', letterSpacing: 0, lineHeight: 1.2, wordSpacing: 0, positionX: 50, positionY: 80, gOpacity: 0.9, gScale: 1.1 }, colors: ['#FEECF2', '#FFFFFF', '#000000'], desc: 'Smooth continuous drift' },
                        { name: 'Sunset Bold', style: { highlightColor: '#DFAC24', canvasBackground: '#0F0F12', textColor: '#FFFFFF', animationStyle: 'fade-in-word', fontSize: 60, fontWeight: '700' }, colors: ['#DFAC24', '#FFFFFF', '#0F0F12'], desc: 'Inspirational creators edge' },
                        { name: 'Royal Mint', style: { highlightColor: '#10B981', canvasBackground: '#FCFCFD', textColor: '#1E40AF', animationStyle: 'fade-in-word', fontSize: 50, fontWeight: '600' }, colors: ['#10B981', '#1E40AF', '#FCFCFD'], desc: 'Clean aesthetics financial loops' },
                        { name: 'Neon Arcade', style: { highlightColor: '#39FF14', canvasBackground: '#070708', textColor: '#FFFFFF', shadowColor: '#FF007F', shadowEnabled: true, animationStyle: 'play-typo', fontSize: 65, fontWeight: '900' }, colors: ['#FF007F', '#39FF14', '#070708'], desc: 'High visual gaming clips' }
                      ].map((preset) => (
                        <button 
                          key={preset.name}
                          className={cn(
                            "w-full p-3 rounded-xl border flex flex-col items-start text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-98 gap-1.5",
                            isLight ? "bg-white border-zinc-200" : "bg-[#151518] border-white/5"
                          )}
                          onClick={() => {
                            applyStyleWithAutoSemantics(preset.style as any);
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold leading-none">{preset.name}</span>
                            <div className="flex gap-1">
                              {preset.colors.map(c => (
                                <span key={c} className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          </div>
                          <span className="text-[9.5px] opacity-40">{preset.desc}</span>
                        </button>
                      ))}
                    </div>
              </div>
            )}

            {/* TA-10: Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <span className="text-[9px] font-bold uppercase text-auralis font-bold uppercase">UI Preferences</span>
                  
                  {/* Theme toggling button */}
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-xl border",
                    isLight ? "bg-white border-zinc-200 bg-zinc-50" : "bg-[#161619] border-white/5"
                  )}>
                    <div className="flex items-center gap-2">
                      {isLight ? <Sun size={13} className="text-auralis" /> : <Moon size={13} className="text-auralis" />}
                      <span className="text-xs font-semibold">Workspace Theme</span>
                    </div>
                    <button 
                      onClick={() => setTheme(isLight ? 'dark' : 'light')}
                      className={cn(
                        "relative flex items-center justify-center p-1.5 px-3 rounded-lg text-[10px] font-bold border cursor-pointer active:scale-95 transition-all",
                        isLight 
                          ? "bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800" 
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                      )}
                    >
                      {isLight ? "Switch to Dark" : "Switch to Light"}
                    </button>
                  </div>
                </div>

                {/* Legend Shortcuts */}
                <div className="space-y-2.5 pt-3 border-t border-zinc-200/50 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-auralis">
                    <Keyboard size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Keyboard Shortcuts</span>
                  </div>
                  <div className={cn(
                    "p-3 rounded-xl border text-[9.5px] space-y-2 leading-relaxed opacity-75 font-sans",
                    isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#151518] border-white/5"
                  )}>
                    <div className="flex justify-between">
                      <span className="font-semibold text-zinc-500">Spacebar</span>
                      <span className="font-bold underline">Play / Pause</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-zinc-500">S Key</span>
                      <span className="font-bold underline">Split Clip</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-zinc-500">Delete Key</span>
                      <span className="font-bold underline">Remove Segment</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
        </>
      )}

    </div>
  );
}

function ToggleOption({ label, active, onToggle, icon, isLight }: { label: string, active: boolean, onToggle: (v: boolean) => void, icon?: React.ReactNode, isLight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/75")}>{label}</span>
      </div>
      <button 
        onClick={() => onToggle(!active)}
        className={cn(
          "w-9 h-5 rounded-full transition-all duration-300 relative cursor-pointer",
          active ? "bg-auralis shadow-sm shadow-auralis/30" : isLight ? "bg-[#E4E4E7]" : "bg-white/10"
        )}
      >
        <div className={cn(
          "absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all shadow-md",
          active ? "left-[18px]" : "left-[2px]"
        )} />
      </button>
    </div>
  );
}

function CustomPremiumSelect<T extends string>({
  value,
  onChange,
  options,
  isLight,
  placeholder = "Select option..."
}: {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string; desc?: string; style?: React.CSSProperties }[];
  isLight: boolean;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        className={cn(
          "w-full px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all duration-300 outline-none border text-left cursor-pointer shadow-sm relative overflow-hidden group",
          isLight
            ? "bg-[#F4F4F5] border-zinc-200 text-zinc-805 hover:bg-[#E4E4E7] hover:border-auralis"
            : "bg-[#1C1C1E] border-white/5 text-white hover:bg-[#252528] hover:border-auralis/50"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-col text-left">
          <span className="font-bold tracking-tight" style={selectedOption?.style}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.desc && (
            <span className={cn("text-[9px] font-medium leading-none mt-0.5", isLight ? "text-zinc-500" : "text-white/30")}>
              {selectedOption.desc}
            </span>
          )}
        </div>
        <ChevronDown 
          size={14} 
          className={cn(
            "transform transition-transform duration-300", 
            isOpen ? "rotate-180 text-auralis" : isLight ? "text-zinc-500" : "text-white/40"
          )} 
        />
        <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-auralis group-hover:w-full transition-all duration-300" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-50 left-0 right-0 mt-1.5 p-1.5 rounded-xl border shadow-xl max-h-60 overflow-y-auto custom-scrollbar transition-all backdrop-blur-md",
              isLight
                ? "bg-white/95 border-zinc-200 text-zinc-800"
                : "bg-[#18181B]/95 border-white/10 text-white"
            )}
            style={{ width: '100%' }}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all text-left mb-0.5 last:mb-0 cursor-pointer",
                    isSelected
                      ? "bg-auralis/10 text-auralis border border-auralis/25"
                      : isLight
                        ? "text-zinc-700 hover:bg-zinc-100 border border-transparent"
                        : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex flex-col text-left">
                    <span style={option.style} className={cn(isSelected && "text-auralis font-bold")}>{option.label}</span>
                    {option.desc && (
                      <span className={cn("text-[9px] mt-0.5", isSelected ? "text-auralis/75 font-semibold" : isLight ? "text-zinc-450" : "text-white/30")}>
                        {option.desc}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={11} className="text-auralis" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
