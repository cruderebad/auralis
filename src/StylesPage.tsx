import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Check, Heart, Eye, Brain, Sliders, Type, Play, Zap, Shield, Wand2, RefreshCw } from 'lucide-react';
import { cn } from './lib/utils';
import { useNavigate } from 'react-router-dom';
import { KineticCaptionDemo } from './components/KineticCaptionDemo';
import { useStore } from './store';
import { formatBionicText } from './lib/bionic';
import { AnimationStyle, GlobalStyle } from './types';

interface StyleItem {
  id: string;
  name: string;
  category: 'viral' | 'accessibility' | 'clean' | 'cinematic';
  fontFamily: string;
  class: string;
  highlight: string;
  tag: string;
  description: string;
  presetConfig: Partial<GlobalStyle>;
}

const STYLES: StyleItem[] = [
  { 
    id: 'bionic-focus', 
    name: 'Bionic Neurodivergent Focus', 
    category: 'accessibility',
    fontFamily: 'Atkinson Hyperlegible',
    class: 'font-medium text-white tracking-wide font-["Atkinson_Hyperlegible"]', 
    highlight: 'text-auralis font-bold underline decoration-auralis/60 decoration-2', 
    tag: 'Hack for Humanity',
    description: 'Bolds word prefixes to facilitate eye tracking & reduce reading fatigue for ADHD and Dyslexic viewers.',
    presetConfig: {
      fontFamily: 'Atkinson Hyperlegible, sans-serif',
      fontSize: 48,
      fontWeight: '600',
      textColor: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 85,
      bionicReadingEnabled: true,
      animationStyle: 'pop-up' as AnimationStyle,
      highlightColor: '#38BDF8',
      lineHeight: 1.5,
      letterSpacing: 1,
      wordsPerSegment: 5,
    }
  },
  { 
    id: 'opendyslexic-preset', 
    name: 'OpenDyslexic Hyperlegible', 
    category: 'accessibility',
    fontFamily: 'OpenDyslexic',
    class: 'font-normal text-white tracking-wider font-["OpenDyslexic"]', 
    highlight: 'text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40', 
    tag: 'Braille Institute Standards',
    description: 'Bottom-heavy letterforms designed to prevent character flipping and rotation during video playback.',
    presetConfig: {
      fontFamily: 'OpenDyslexic, sans-serif',
      fontSize: 46,
      fontWeight: '400',
      textColor: '#FFFFFF',
      backgroundColor: '#111115',
      backgroundOpacity: 90,
      bionicReadingEnabled: false,
      animationStyle: 'kinetic' as AnimationStyle,
      highlightColor: '#F59E0B',
      lineHeight: 1.6,
      letterSpacing: 2,
      wordsPerSegment: 5,
    }
  },
  { 
    id: 'emotion-brackets', 
    name: 'Acoustic Emotion & Sound', 
    category: 'accessibility',
    fontFamily: 'Lexend',
    class: 'font-semibold text-white font-["Lexend"]', 
    highlight: 'text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded-lg border border-cyan-400/40', 
    tag: 'Deaf & Hard of Hearing',
    description: 'Includes non-verbal cues [angry], [whispering], and sound events [door slams] for equal contextual access.',
    presetConfig: {
      fontFamily: 'Lexend, sans-serif',
      fontSize: 48,
      fontWeight: '600',
      textColor: '#FFFFFF',
      backgroundColor: '#09090B',
      backgroundOpacity: 85,
      animationStyle: 'word-highlight-box' as AnimationStyle,
      highlightBoxColor: '#0284C7',
      highlightColor: '#FFFFFF',
      lineHeight: 1.4,
      letterSpacing: 0.5,
      wordsPerSegment: 5,
    }
  },
  { 
    id: 'hormozi-viral', 
    name: 'Hormozi Classic Viral', 
    category: 'viral',
    fontFamily: 'Montserrat',
    class: 'font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.9)] uppercase font-["Montserrat"]', 
    highlight: 'text-yellow-400 scale-110 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]', 
    tag: 'High Retention',
    description: 'High-contrast yellow word callouts with heavy stroke, driving maximum engagement on short-form feeds.',
    presetConfig: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 56,
      fontWeight: '900',
      textColor: '#FFFFFF',
      highlightColor: '#FFD700',
      animationStyle: 'pop-up' as AnimationStyle,
      popupIntensity: 1.4,
      casing: 'uppercase',
      maxLines: 1,
      wordsPerSegment: 4,
      backgroundColor: '#000000',
      backgroundOpacity: 0,
    }
  },
  { 
    id: 'follow-up-stretch', 
    name: 'Dynamic Follow Up Stretch', 
    category: 'viral',
    fontFamily: 'Space Grotesk',
    class: 'font-extrabold text-white tracking-tight font-["Space_Grotesk"]', 
    highlight: 'text-sky-400 font-black scale-105', 
    tag: 'TikTok & Reels',
    description: 'Smooth sequential word expansion with color highlighting for natural speech synchronization.',
    presetConfig: {
      fontFamily: 'Space Grotesk, sans-serif',
      fontSize: 52,
      fontWeight: '800',
      textColor: '#FFFFFF',
      highlightColor: '#38BDF8',
      animationStyle: 'follow-up' as AnimationStyle,
      followUpStretch: true,
      wordsPerSegment: 5,
      maxLines: 1,
    }
  },
  { 
    id: 'minimalist-clean', 
    name: 'Minimalist Clean Slate', 
    category: 'clean',
    fontFamily: 'Plus Jakarta Sans',
    class: 'font-semibold text-zinc-100 tracking-wide font-["Plus_Jakarta_Sans"]', 
    highlight: 'bg-white text-black px-2 py-0.5 rounded-md font-bold shadow-md', 
    tag: 'Subtle & Modern',
    description: 'A crisp, balanced layout using subtle background pills and generous negative space.',
    presetConfig: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 44,
      fontWeight: '600',
      textColor: '#000000',
      highlightBoxColor: '#FFFFFF',
      animationStyle: 'word-highlight-box' as AnimationStyle,
      backgroundColor: '#000000',
      backgroundOpacity: 70,
      wordsPerSegment: 6,
    }
  },
  { 
    id: 'neon-cyberpunk', 
    name: 'Neon Cyberpunk Glow', 
    category: 'viral',
    fontFamily: 'Bebas Neue',
    class: 'font-bold text-white tracking-widest font-["Bebas_Neue"]', 
    highlight: 'text-fuchsia-400 drop-shadow-[0_0_18px_rgba(232,121,249,0.9)] scale-105', 
    tag: 'Gaming & Tech',
    description: 'Vibrant neon word highlights with high intensity luminescence for nocturnal content.',
    presetConfig: {
      fontFamily: 'Bebas Neue, sans-serif',
      fontSize: 58,
      fontWeight: '700',
      textColor: '#FFFFFF',
      highlightColor: '#E879F9',
      animationStyle: 'word-by-word' as AnimationStyle,
      backgroundColor: '#000000',
      backgroundOpacity: 50,
      letterSpacing: 2,
    }
  },
  { 
    id: 'karaoke-sing', 
    name: 'Karaoke Word Fill', 
    category: 'viral',
    fontFamily: 'Outfit',
    class: 'font-extrabold text-zinc-300 tracking-wide font-["Outfit"]', 
    highlight: 'text-rose-400 scale-105', 
    tag: 'Music & Podcasts',
    description: 'Continuous smooth color fill across syllables matching audio speech cadence.',
    presetConfig: {
      fontFamily: 'Outfit, sans-serif',
      fontSize: 50,
      fontWeight: '800',
      textColor: '#FFFFFF',
      highlightColor: '#FF6F61',
      animationStyle: 'karaoke' as AnimationStyle,
      wordsPerSegment: 5,
    }
  },
  { 
    id: 'cinematic-editorial', 
    name: 'Cinematic Editorial', 
    category: 'cinematic',
    fontFamily: 'Playfair Display',
    class: 'font-serif italic text-zinc-100 drop-shadow-md font-["Playfair_Display"]', 
    highlight: 'text-amber-200 font-bold not-italic border-b-2 border-amber-300/60 pb-0.5', 
    tag: 'Documentary',
    description: 'Serif elegance tailored for podcasts, film trailers, essay videos, and storytelling.',
    presetConfig: {
      fontFamily: 'Playfair Display, serif',
      fontSize: 44,
      fontWeight: '500',
      textColor: '#F8FAFC',
      highlightColor: '#FDE68A',
      animationStyle: 'fade-in-word' as AnimationStyle,
      backgroundColor: '#0F172A',
      backgroundOpacity: 70,
    }
  },
  { 
    id: 'tech-terminal', 
    name: 'Tech Glitch Terminal', 
    category: 'viral',
    fontFamily: 'Courier New',
    class: 'font-mono text-zinc-200 tracking-tighter uppercase', 
    highlight: 'text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/50', 
    tag: 'Developer & AI',
    description: 'Monospaced terminal aesthetic with glowing hacker green word focus states.',
    presetConfig: {
      fontFamily: 'Courier New, monospace',
      fontSize: 42,
      fontWeight: '700',
      textColor: '#10B981',
      highlightColor: '#34D399',
      animationStyle: 'typewriter' as AnimationStyle,
      backgroundColor: '#022C22',
      backgroundOpacity: 90,
    }
  },
];

export default function StylesPage() {
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customText, setCustomText] = useState<string>('[whispering] Inclusive captions empower every viewer');
  const [bionicDemoStrength, setBionicDemoStrength] = useState<number>(0.45);
  const [appliedStyleId, setAppliedStyleId] = useState<string | null>(null);

  const sampleWords = ['Inclusive', 'captions', 'empower', 'every', 'single', 'human'];
  const navigate = useNavigate();
  const setStyle = useStore(state => state.setStyle);
  const setCaptionMode = useStore(state => state.setCaptionMode);
  const isLight = useStore(state => state.theme === 'light');

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWordIndex(prev => (prev + 1) % sampleWords.length);
    }, 450);
    return () => clearInterval(interval);
  }, [sampleWords.length]);

  const filteredStyles = STYLES.filter(s => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  const handleApplyStyle = (style: StyleItem) => {
    setStyle(style.presetConfig);
    if (style.category === 'accessibility') {
      setCaptionMode('emotion_sounds');
    }
    setAppliedStyleId(style.id);
    setTimeout(() => {
      navigate('/dashboard');
    }, 600);
  };

  const bionicFormatted = formatBionicText(customText, bionicDemoStrength);

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 font-sans selection:bg-auralis/30 transition-colors duration-200",
      isLight ? "bg-zinc-50 text-zinc-900" : "bg-[#09090B] text-zinc-100"
    )}>
      {/* Header Bar */}
      <header className={cn(
        "max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b",
        isLight ? "border-zinc-200" : "border-white/10"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className={cn(
              "p-2.5 border rounded-2xl transition-all cursor-pointer",
              isLight 
                ? "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 shadow-xs" 
                : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white"
            )}
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-auralis/20 text-auralis border border-auralis/30">
                Auralis Typography & Style Studio
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <Heart size={10} className="fill-current text-emerald-600 dark:text-emerald-400" /> Hack for Humanity
              </span>
            </div>
            <h1 className={cn(
              "text-2xl sm:text-3xl font-extrabold mt-1",
              isLight 
                ? "text-zinc-900" 
                : "bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-100 to-auralis"
            )}>
              Accessible Typography & Animation Presets
            </h1>
            <p className={cn(
              "text-xs sm:text-sm mt-0.5",
              isLight ? "text-zinc-600 font-medium" : "text-zinc-400"
            )}>
              Explore neurodivergent-friendly fonts, bionic reading, emotion brackets, and high-retention video caption styles.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 rounded-2xl bg-auralis hover:bg-auralis/90 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-auralis/20 transition-all cursor-pointer shrink-0 self-start md:self-center"
        >
          <Wand2 size={16} />
          <span>Open Editor Canvas</span>
        </button>
      </header>

      {/* Category Filter Pills */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'all', label: 'All Presets', count: STYLES.length, icon: Sparkles },
          { id: 'accessibility', label: 'Accessibility & Neurodivergent', count: STYLES.filter(s => s.category === 'accessibility').length, icon: Brain },
          { id: 'viral', label: 'Kinetic & Viral', count: STYLES.filter(s => s.category === 'viral').length, icon: Zap },
          { id: 'clean', label: 'Minimalist & Clean', count: STYLES.filter(s => s.category === 'clean').length, icon: Type },
          { id: 'cinematic', label: 'Cinematic & Documentary', count: STYLES.filter(s => s.category === 'cinematic').length, icon: Eye },
        ].map(cat => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer shrink-0",
                isSelected
                  ? "bg-auralis border-auralis text-white shadow-md shadow-auralis/20"
                  : isLight
                    ? "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 shadow-xs"
                    : "bg-[#141417] border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold",
                isSelected 
                  ? "bg-white/20 text-white" 
                  : isLight ? "bg-zinc-100 text-zinc-700" : "bg-white/10 text-zinc-400"
              )}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Styles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-16">
        {filteredStyles.map(style => {
          const isApplied = appliedStyleId === style.id;
          return (
            <div 
              key={style.id} 
              className={cn(
                "border rounded-2xl p-5 flex flex-col group transition-all duration-300 relative overflow-hidden",
                isLight
                  ? style.category === 'accessibility'
                    ? "bg-white border-auralis/40 shadow-sm hover:border-auralis hover:shadow-md"
                    : "bg-white border-zinc-200 shadow-xs hover:border-zinc-300 hover:shadow-sm"
                  : style.category === 'accessibility' 
                    ? "border-auralis/30 hover:border-auralis/70 bg-gradient-to-b from-[#181820] to-[#121215]" 
                    : "bg-[#121215] border-white/10 hover:border-white/25"
              )}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-md border",
                      style.category === 'accessibility' 
                        ? "bg-auralis/20 text-auralis border-auralis/30" 
                        : isLight 
                          ? "bg-zinc-100 text-zinc-700 border-zinc-200" 
                          : "bg-white/5 text-zinc-400 border-white/10"
                    )}>
                      {style.tag}
                    </span>
                    <span className={cn("text-[10px] font-mono", isLight ? "text-zinc-600 font-semibold" : "text-zinc-500")}>
                      {style.fontFamily}
                    </span>
                  </div>
                  <h3 className={cn(
                    "font-extrabold text-base transition-colors",
                    isLight ? "text-zinc-900 group-hover:text-auralis" : "text-zinc-100 group-hover:text-auralis"
                  )}>
                    {style.name}
                  </h3>
                </div>

                <button
                  onClick={() => handleApplyStyle(style)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border",
                    isApplied 
                      ? "bg-emerald-500 text-white border-emerald-400"
                      : "bg-auralis/10 hover:bg-auralis text-auralis hover:text-white border-auralis/30"
                  )}
                  title="Apply preset to active project"
                >
                  {isApplied ? <Check size={14} /> : <Play size={12} className="fill-current" />}
                  <span>{isApplied ? 'Applied!' : 'Apply Style'}</span>
                </button>
              </div>

              <p className={cn(
                "text-xs leading-relaxed mb-4 min-h-[36px]",
                isLight ? "text-zinc-600 font-medium" : "text-zinc-400"
              )}>
                {style.description}
              </p>

              {/* Animated Canvas Preview Box */}
              <div className={cn(
                "flex-1 flex items-center justify-center min-h-[130px] rounded-xl border p-4 overflow-hidden relative transition-all",
                isLight 
                  ? "bg-zinc-900 border-zinc-300 group-hover:border-auralis/40" 
                  : "bg-[#0A0A0C] border-white/10 group-hover:border-auralis/20"
              )}>
                {/* Background grid lines */}
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none" 
                  style={{
                    backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                />

                <div className="text-xl sm:text-2xl text-center leading-tight flex flex-wrap justify-center gap-x-2 gap-y-1.5 relative z-10">
                  {sampleWords.map((word, i) => (
                    <span 
                      key={i}
                      className={cn(
                        "transition-all duration-200 inline-block",
                        style.class,
                        i === activeWordIndex ? cn(style.highlight, "scale-105") : "opacity-60 scale-100"
                      )}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Neurodivergent Bionic Reading Sandbox */}
      <section className={cn(
        "max-w-7xl mx-auto mb-16 border rounded-3xl p-6 sm:p-8 relative overflow-hidden",
        isLight
          ? "bg-white border-auralis/40 shadow-xl"
          : "bg-[#121215] border-auralis/30 shadow-2xl"
      )}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-auralis/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-auralis/20 text-auralis border border-auralis/30 inline-flex items-center gap-1.5">
              <Brain size={12} /> Hack for Humanity Interactive Sandbox
            </span>
            <h2 className={cn("text-2xl font-extrabold", isLight ? "text-zinc-900" : "text-white")}>
              Bionic Reading & Neurodivergent Focus Simulator
            </h2>
            <p className={cn("text-xs", isLight ? "text-zinc-600 font-medium" : "text-zinc-400")}>
              Type custom caption text below to see real-time Bionic prefix formatting and font adjustments.
            </p>
          </div>

          <div className={cn(
            "flex items-center gap-4 p-3 rounded-2xl border shrink-0",
            isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#0A0A0C] border-white/10"
          )}>
            <div className="text-right">
              <span className={cn("text-[10px] font-bold block", isLight ? "text-zinc-700" : "text-zinc-400")}>Bold Prefix Ratio</span>
              <span className="text-xs font-mono font-extrabold text-auralis">{Math.round(bionicDemoStrength * 100)}%</span>
            </div>
            <input 
              type="range"
              min="0.2"
              max="0.8"
              step="0.05"
              value={bionicDemoStrength}
              onChange={(e) => setBionicDemoStrength(parseFloat(e.target.value))}
              className="accent-auralis w-28 h-1.5 bg-zinc-200 dark:bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Text Input */}
        <div className="mb-6 relative z-10">
          <label className={cn("text-xs font-bold block mb-2", isLight ? "text-zinc-800" : "text-zinc-400")}>Test Custom Subtitle String:</label>
          <input 
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Type anything..."
            className={cn(
              "w-full px-4 py-3 rounded-xl border font-medium text-sm focus:border-auralis focus:ring-1 focus:ring-auralis outline-none transition-all",
              isLight
                ? "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                : "bg-[#0A0A0C] border-white/10 text-white placeholder:text-zinc-500"
            )}
          />
        </div>

        {/* Live Formatted Output Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Standard Text */}
          <div className={cn(
            "p-5 rounded-2xl border space-y-2",
            isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#0A0A0C] border-white/10"
          )}>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isLight ? "text-zinc-700" : "text-zinc-400")}>Standard Reading Display</span>
            <p className={cn("text-lg font-medium leading-relaxed font-sans", isLight ? "text-zinc-900" : "text-zinc-200")}>
              {customText || 'Type text above to test...'}
            </p>
          </div>

          {/* Bionic Reading Formatted Text */}
          <div className={cn(
            "p-5 rounded-2xl border space-y-2 relative overflow-hidden",
            isLight ? "bg-zinc-50 border-auralis/60" : "bg-[#0A0A0C] border-auralis/40"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-auralis flex items-center gap-1">
                <Brain size={12} /> Bionic Focus Assist Display
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ADHD / Dyslexia Optimized
              </span>
            </div>

            <div className={cn(
              "text-lg leading-relaxed font-['Atkinson_Hyperlegible'] flex flex-wrap gap-x-1",
              isLight ? "text-zinc-900" : "text-white"
            )}>
              {bionicFormatted.map((item, idx) => (
                <span key={idx} className="inline-block">
                  <strong className="font-extrabold text-auralis underline decoration-auralis/30">{item.prefix}</strong>
                  <span className="font-normal opacity-85">{item.suffix}</span>
                  <span>{item.space}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Kinetic Component Demo Footer */}
      <div className="w-full max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn("text-xl font-bold flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
            <Sparkles size={18} className="text-auralis" />
            <span>Interactive Word-Level Kinetic Animator</span>
          </h2>
        </div>
        <KineticCaptionDemo />
      </div>
    </div>
  );
}
