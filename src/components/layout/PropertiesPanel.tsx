import React from 'react';
import { useStore } from '../../store';
import { GlobalStyle, AnimationStyle } from '../../types';
import { FONT_FAMILIES, COLORS } from '../../constants';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Layers, 
  Play, 
  Sparkles, 
  Smile, 
  RotateCw,
  ChevronDown,
  Check
} from 'lucide-react';

interface PropertiesPanelProps {
  style: GlobalStyle;
  updateStyle: (style: Partial<GlobalStyle>) => void;
}

export function PropertiesPanel({ style, updateStyle }: PropertiesPanelProps) {
  const store = useStore();
  const isLight = store.theme === 'light';

  // Customize dropdown lists for the selectors
  const fontOptions = FONT_FAMILIES.map(family => ({
    value: family,
    label: family,
    style: { fontFamily: family }
  }));

  const animationOptions = [
    { value: 'word-by-word' as AnimationStyle, label: 'Word by Word', desc: 'Classic captioning, clean step animations' },
    { value: 'fade-in-word' as AnimationStyle, label: 'Fade In Word', desc: 'Slightly softer cinematic fade transitions' },
    { value: 'pop-up' as AnimationStyle, label: 'Pop Up', desc: 'Energetic bounce curves, high viewer retention' },
    { value: 'word-highlight-box' as AnimationStyle, label: 'Highlight Box', desc: 'Flowing color bounding box behind text' },
    { value: 'word-highlight-color' as AnimationStyle, label: 'Highlight Color', desc: 'Dynamic text color splash highlight' },
    { value: 'karaoke' as AnimationStyle, label: '🎙️ Karaoke Sweep', desc: 'Liquid left-to-right color gradient sweep' },
    { value: 'typewriter' as AnimationStyle, label: '⌨️ Typewriter Kinetic', desc: 'Rapid character typing with blinking cursor cursor' },
    { value: 'netflix' as AnimationStyle, label: '📺 Netflix Stories', desc: 'Sleek immersive blurred entries' },
    { value: '3d-depth' as AnimationStyle, label: '🧊 Layered 3D Depth', desc: 'Independent floating layers, perspective parallax' },
    { value: 'ai-reactive' as AnimationStyle, label: '🤖 AI Emotional Adaptive', desc: 'Angry shakes, sad slides, excited bouncers' },
    { value: 'aesthetic' as AnimationStyle, label: 'Aesthetic Trendy', desc: 'Liquid wavy animation with responsive momentum' },
    { value: 'follow-up' as AnimationStyle, label: 'Follow Up', desc: 'Word by word fade in, with fade out and optional stretch' },
  ];

  return (
    <div className={cn(
      "w-80 border-l flex flex-col z-40 overflow-y-auto custom-scrollbar select-none transition-colors duration-300",
      isLight ? "bg-white border-zinc-200 text-zinc-800" : "bg-[#121214] border-white/5 text-[#E0E0E6]"
    )}>
      <div className="p-6 space-y-8">
        <section className="space-y-4">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-widest", isLight ? "text-zinc-500" : "text-[#8F8F9F]")}>Typography</h3>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Font Family</label>
              <CustomPremiumSelect 
                value={style.fontFamily}
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
                  value={style.fontSize}
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
                  value={style.fontWeight}
                  onChange={(e) => updateStyle({ fontWeight: e.target.value })}
                  className={cn(
                    "w-full px-3 py-2 border rounded-xl text-xs outline-none transition-all cursor-pointer",
                    isLight 
                      ? "bg-[#F4F4F5] border-zinc-200 text-zinc-800 focus:bg-white focus:border-auralis" 
                      : "bg-[#1C1C1E] border-white/5 text-white focus:border-auralis"
                  )}
                >
                  <option value="400" className={isLight ? "bg-white" : "bg-[#1C1C1E]"}>Regular</option>
                  <option value="600" className={isLight ? "bg-white" : "bg-[#1C1C1E]"}>Semi Bold</option>
                  <option value="700" className={isLight ? "bg-white" : "bg-[#1C1C1E]"}>Bold</option>
                  <option value="900" className={isLight ? "bg-white" : "bg-[#1C1C1E]"}>Black</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1.5">
              <button 
                onClick={() => updateStyle({ fontWeight: style.fontWeight === 'bold' ? '400' : 'bold' })}
                className={cn(
                  "p-2 rounded-lg flex-1 flex justify-center transition-all duration-200 active:scale-95 cursor-pointer border", 
                  style.fontWeight === 'bold' 
                    ? "bg-auralis/10 border-auralis/35 text-auralis" 
                    : isLight 
                      ? "bg-zinc-50 border-zinc-200 text-zinc-550 text-zinc-650 hover:text-zinc-800 hover:bg-zinc-100"
                      : "bg-[#1C1C1E] border-white/5 text-white/60 hover:text-white"
                )}
              >
                <Bold size={14} />
              </button>
              <button 
                onClick={() => updateStyle({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })}
                className={cn(
                  "p-2 rounded-lg flex-1 flex justify-center transition-all duration-200 active:scale-95 cursor-pointer border", 
                  style.fontStyle === 'italic' 
                    ? "bg-auralis/10 border-auralis/35 text-auralis" 
                    : isLight 
                      ? "bg-zinc-50 border-zinc-200 text-zinc-550 text-zinc-650 hover:text-zinc-800 hover:bg-zinc-100"
                      : "bg-[#1C1C1E] border-white/5 text-white/60 hover:text-white"
                )}
              >
                <Italic size={14} />
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
                      style.textAlign === align 
                        ? "bg-auralis/10 border-auralis/35 text-auralis" 
                        : isLight 
                          ? "bg-zinc-50 border-zinc-200 text-zinc-550 text-zinc-650 hover:text-zinc-800 hover:bg-zinc-100"
                          : "bg-[#1C1C1E] border-white/5 text-white/60 hover:text-white"
                    )}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>

            {/* Typography Text Color Selection block */}
            <div className="space-y-1.5 pt-1">
              <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Text Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color"
                  value={style.textColor || '#FFFFFF'}
                  onChange={(e) => updateStyle({ textColor: e.target.value })}
                  className="w-7 h-7 rounded-lg border-0 cursor-pointer overflow-hidden bg-transparent shrink-0"
                  title="Pick custom color"
                />
                <div className="flex flex-wrap gap-1 flex-1 select-none">
                  {['#FFFFFF', '#FFD700', '#FF3B30', '#34C759', '#007AFF', '#AF52DE', '#E5E5EA'].map((col) => (
                    <button 
                      key={col} 
                      onClick={() => updateStyle({ textColor: col })}
                      className={cn(
                        "w-5 h-5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all",
                        style.textColor === col ? "ring-2 ring-auralis border-transparent" : "border-white/10"
                      )}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Typography Glow Selection block */}
            <div className={cn("pt-4 border-t space-y-4", isLight ? "border-zinc-200/80" : "border-white/5")}>
              <div className="flex justify-between items-center">
                <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Text Glow Glow</label>
                <button 
                  onClick={() => updateStyle({ glowEnabled: !style.glowEnabled })}
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95",
                    style.glowEnabled 
                      ? "bg-auralis/10 border-auralis text-auralis font-extrabold" 
                      : isLight ? "bg-zinc-100 border-zinc-200 text-zinc-500" : "bg-white/5 border-white/10 text-white/50"
                  )}
                >
                  {style.glowEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {style.glowEnabled && (
                <div className="space-y-3 pl-1">
                  <div className="grid grid-cols-2 gap-3 pb-1">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-500">Glow Size</label>
                      <input 
                        type="number"
                        min="1" max="40"
                        value={style.glowSize || 8}
                        onChange={(e) => updateStyle({ glowSize: parseInt(e.target.value) || 1 })}
                        className={cn(
                          "w-full px-2 py-1 border rounded-lg text-xs outline-none transition-all",
                          isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900" : "bg-[#1C1C1E] border-white/5 text-white"
                        )}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-500">Spread</label>
                      <input 
                        type="number"
                        min="1" max="20"
                        value={style.glowSpread || 3}
                        onChange={(e) => updateStyle({ glowSpread: parseInt(e.target.value) || 1 })}
                        className={cn(
                          "w-full px-2 py-1 border rounded-lg text-xs outline-none transition-all",
                          isLight ? "bg-zinc-50 border-zinc-200 text-zinc-900" : "bg-[#1C1C1E] border-white/5 text-white"
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-gray-400">Glow Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color"
                        value={style.glowColor || '#FFD700'}
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
                              style.glowColor === gmColor ? "ring-1 ring-auralis border-transparent" : "border-white/10"
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

            <div className={cn("pt-4 border-t space-y-4", isLight ? "border-zinc-200/80" : "border-white/5")}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className={cn("text-xs font-semibold", isLight ? "text-zinc-750 font-semibold text-zinc-700" : "text-white/55")}>Line Height</label>
                  <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1.5 py-0.5 rounded-md">{style.lineHeight.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" max="3" step="0.1"
                  value={style.lineHeight}
                  onChange={(e) => updateStyle({ lineHeight: parseFloat(e.target.value) })}
                  className="w-full accent-auralis h-1 cursor-ew-resize" 
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className={cn("text-xs font-semibold", isLight ? "text-zinc-750 font-semibold text-zinc-700" : "text-white/55")}>Letter Spacing</label>
                  <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1.5 py-0.5 rounded-md">{style.letterSpacing.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="-10" max="20" step="0.5"
                  value={style.letterSpacing}
                  onChange={(e) => updateStyle({ letterSpacing: parseFloat(e.target.value) })}
                  className="w-full accent-auralis h-1 cursor-ew-resize" 
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className={cn("text-xs font-semibold", isLight ? "text-zinc-750 font-semibold text-zinc-700" : "text-white/55")}>Words Per Segment</label>
                  <div className="flex items-center gap-2">
                    <label className={cn("text-[10px] cursor-pointer hover:text-auralis transition-colors flex items-center gap-1.5 select-none", isLight ? "text-zinc-400 hover:text-auralis" : "text-white/30 hover:text-white")} title="Split segments based on punctuation">
                      <input 
                        type="checkbox" 
                        checked={style.aiAdaptiveLines}
                        onChange={(e) => updateStyle({ aiAdaptiveLines: e.target.checked })}
                        className="accent-auralis w-3 h-3 cursor-pointer"
                      />
                      AI Adaptive Lines
                    </label>
                    <label className={cn("text-[10px] cursor-pointer hover:text-auralis transition-colors flex items-center gap-1.5 select-none", isLight ? "text-zinc-400 hover:text-auralis" : "text-white/30 hover:text-white")} title="Dynamically adjust words per line for emphasis">
                      <input
                        type="checkbox"
                        checked={style.aiAdaptiveEmphasis}
                        onChange={(e) => updateStyle({ aiAdaptiveEmphasis: e.target.checked })}
                        className="accent-auralis w-3 h-3 cursor-pointer"
                      />
                      AI Adaptive Emphasis
                    </label>
                    <label className={cn("text-[10px] cursor-pointer hover:text-auralis transition-colors flex items-center gap-1.5 select-none", isLight ? "text-zinc-400 hover:text-auralis" : "text-white/30 hover:text-white")}>
                      <input 
                        type="checkbox" 
                        checked={style.useOriginalSRT}
                        onChange={(e) => updateStyle({ useOriginalSRT: e.target.checked })}
                        className="accent-auralis w-3 h-3 cursor-pointer"
                      />
                      Original SRT
                    </label>
                    <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1.5 py-0.5 rounded-md">{style.wordsPerSegment}</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="1" max="10" step="1"
                  disabled={style.useOriginalSRT}
                  value={style.wordsPerSegment}
                  onChange={(e) => updateStyle({ wordsPerSegment: parseInt(e.target.value) })}
                  className={cn("w-full h-1 accent-auralis cursor-ew-resize", style.useOriginalSRT && "opacity-20 cursor-not-allowed")} 
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-xs font-semibold", isLight ? "text-zinc-750 font-semibold text-zinc-700" : "text-white/55")}>Max Lines</label>
                <div className={cn("flex p-1 rounded-xl gap-1 border transition-all", isLight ? "bg-zinc-100 border-zinc-200" : "bg-[#151518] border-white/5")}>
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => updateStyle({ maxLines: num })}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                        style.maxLines === num 
                          ? isLight 
                            ? "bg-white text-auralis border border-zinc-200 shadow-sm font-bold" 
                            : "bg-[#222226] text-auralis border border-white/5 shadow-md font-bold" 
                          : isLight 
                            ? "text-zinc-500 hover:text-zinc-800"
                            : "text-[#777] hover:text-[#CCC]"
                      )}
                    >
                      {num} {num === 1 ? 'Line' : 'Lines'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className={cn("text-xs font-semibold", isLight ? "text-zinc-750 font-semibold text-zinc-700" : "text-white/55")}>Letter Casing</label>
                <div className={cn("flex p-1 rounded-xl gap-1 border transition-all", isLight ? "bg-zinc-100 border-zinc-200" : "bg-[#151518] border-white/5")}>
                  {[
                    { key: 'none', label: '-' },
                    { key: 'uppercase', label: 'AB' },
                    { key: 'capitalize', label: 'Ab' },
                    { key: 'lowercase', label: 'ab' }
                  ].map((c) => (
                    <button
                      key={c.key}
                      onClick={() => updateStyle({ casing: c.key as any })}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                        style.casing === c.key 
                          ? isLight 
                            ? "bg-white text-auralis border border-zinc-200 shadow-sm font-bold"
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

              <div className={cn("pt-4 border-t space-y-4", isLight ? "border-zinc-200" : "border-white/5")}>
                <div className="flex justify-between items-center">
                  <label className={cn("text-xs font-semibold", isLight ? "text-zinc-705 text-zinc-700" : "text-white/55")}>Positioning</label>
                  <button 
                    onClick={() => updateStyle({ positionX: 50, positionY: 80 })}
                    className="text-[10px] font-bold text-auralis bg-auralis/10 hover:bg-auralis/20 border border-auralis/25 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <AlignCenter size={10} />
                    Auto Center
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-400" : "text-white/30")}>X Offset</label>
                      <span className={cn("text-[10px] font-mono px-1 py-0.5 rounded-md", isLight ? "text-zinc-700 bg-zinc-150" : "text-[#AAA] bg-[#1C1C1E]")}>{Math.round(style.positionX)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="1"
                      value={style.positionX}
                      onChange={(e) => updateStyle({ positionX: parseInt(e.target.value) })}
                      className="w-full h-1 accent-auralis cursor-ew-resize" 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-400" : "text-white/30")}>Y Offset</label>
                      <span className={cn("text-[10px] font-mono px-1 py-0.5 rounded-md", isLight ? "text-zinc-700 bg-zinc-150" : "text-[#AAA] bg-[#1C1C1E]")}>{Math.round(style.positionY)}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="1"
                      value={style.positionY}
                      onChange={(e) => updateStyle({ positionY: parseInt(e.target.value) })}
                      className="w-full h-1 accent-auralis cursor-ew-resize" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-widest", isLight ? "text-zinc-500" : "text-[#8F8F9F]")}>Visual Effects</h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <ToggleOption 
                label="Outline Style" 
                active={style.outlineEnabled} 
                onToggle={(v) => updateStyle({ outlineEnabled: v })} 
                isLight={isLight}
              />
              {style.outlineEnabled && (
                <div className="space-y-2.5 px-1 pt-1 animate-slide-up">
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className={isLight ? "text-zinc-500" : "text-zinc-400"}>Outline Width</span>
                    <span className="font-mono text-auralis font-bold">{style.outlineWidth !== undefined ? style.outlineWidth : 3}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" max="12" step="0.5"
                    value={style.outlineWidth !== undefined ? style.outlineWidth : 3}
                    onChange={(e) => updateStyle({ outlineWidth: parseFloat(e.target.value) })}
                    className="w-full accent-auralis h-1 cursor-ew-resize" 
                  />
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {COLORS.map(c => (
                      <button 
                        key={c} 
                        className={cn(
                          "w-6 h-6 rounded-full border border-white/15 cursor-pointer active:scale-95 transition-all", 
                          style.outlineColor === c && (isLight ? "ring-2 ring-auralis ring-offset-2 ring-offset-white border-zinc-200" : "ring-2 ring-auralis ring-offset-2 ring-offset-[#121214]")
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => updateStyle({ outlineColor: c })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <ToggleOption 
                label={style.animationStyle === 'play-typo' ? "Shadow / Glow" : "Soft Shadow"} 
                active={style.shadowEnabled} 
                onToggle={(v) => updateStyle({ shadowEnabled: v })} 
                isLight={isLight}
              />
              {style.shadowEnabled && (
                <div className="space-y-2.5 px-1 pt-1">
                  <input 
                    type="range" 
                    min="1" max="20" 
                    value={style.shadowIntensity}
                    onChange={(e) => updateStyle({ shadowIntensity: parseInt(e.target.value) })}
                    className="w-full accent-auralis h-1 cursor-ew-resize" 
                  />
                  <div className="flex flex-wrap gap-2.5">
                    {COLORS.map(c => (
                      <button 
                        key={c} 
                        className={cn(
                          "w-6 h-6 rounded-full border border-white/15 cursor-pointer active:scale-95 transition-all", 
                          style.shadowColor === c && (isLight ? "ring-2 ring-auralis ring-offset-2 ring-offset-white border-zinc-200" : "ring-2 ring-auralis ring-offset-2 ring-offset-[#121214]")
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => updateStyle({ shadowColor: c })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <ToggleOption 
              label="Overlay Background" 
              active={style.backgroundEnabled} 
              onToggle={(v) => updateStyle({ backgroundEnabled: v })} 
              isLight={isLight}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-widest", isLight ? "text-zinc-500" : "text-[#8F8F9F]")}>Animation</h3>
          <div className="space-y-4">
            <ToggleOption 
              label="Enable Motion" 
              active={style.animationEnabled} 
              onToggle={(v) => updateStyle({ animationEnabled: v })} 
              isLight={isLight}
            />
            {style.animationEnabled && (
              <CustomPremiumSelect 
                value={style.animationStyle}
                onChange={(a) => updateStyle({ animationStyle: a })}
                options={animationOptions}
                isLight={isLight}
              />
            )}

            {style.animationEnabled && (
              <div className="pt-2 space-y-4 animate-fade-in">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-400" : "text-white/30")}>Fade In Duration</label>
                    <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1.5 py-0.5 rounded-md">{style.fadeInDuration}s</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" max="2" step="0.1"
                    value={style.fadeInDuration}
                    onChange={(e) => updateStyle({ fadeInDuration: parseFloat(e.target.value) })}
                    className="w-full accent-auralis h-1 cursor-ew-resize" 
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-400" : "text-white/30")}>Fade Out Duration</label>
                    <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1.5 py-0.5 rounded-md">{style.fadeOutDuration}s</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" max="2" step="0.1"
                    value={style.fadeOutDuration}
                    onChange={(e) => updateStyle({ fadeOutDuration: parseFloat(e.target.value) })}
                    className="w-full accent-auralis h-1 cursor-ew-resize" 
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-400" : "text-white/30")}>Stagger Delay</label>
                    <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1.5 py-0.5 rounded-md">{style.staggerDelay}s</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.01" max="0.5" step="0.01"
                    value={style.staggerDelay}
                    onChange={(e) => updateStyle({ staggerDelay: parseFloat(e.target.value) })}
                    className="w-full accent-auralis h-1 cursor-ew-resize" 
                  />
                </div>

                {style.animationStyle === 'ai-reactive' && (
                  <div className={cn("p-3.5 rounded-2xl border space-y-3 mt-3", isLight ? "bg-auralis/5 border-auralis/20" : "bg-auralis/10 border-auralis/30")}>
                    <div className="flex items-center gap-2 text-auralis font-bold text-xs">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Kinetic Kinetics Options</span>
                    </div>

                    <ToggleOption 
                      label="AI Emotion Color Mutation" 
                      active={style.aiSentimentColors ?? true} 
                      onToggle={(v) => updateStyle({ aiSentimentColors: v, aeAutoColorToggle: v })} 
                      isLight={isLight}
                    />

                    <ToggleOption 
                      label="Pitch & Speech Modulation" 
                      active={style.pitchModulation ?? true} 
                      onToggle={(v) => updateStyle({ pitchModulation: v })} 
                      isLight={isLight}
                    />

                    <ToggleOption 
                      label="Emotion Aura Glow" 
                      active={style.emotionGlow ?? true} 
                      onToggle={(v) => updateStyle({ emotionGlow: v })} 
                      isLight={isLight}
                    />

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center">
                        <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-600" : "text-white/60")}>Kinetic Energy Jitter</label>
                        <span className="text-[10px] font-mono text-auralis bg-auralis/10 px-1.5 py-0.5 rounded-md">{(style.kineticJitter ?? 1.0).toFixed(1)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.2" max="2.5" step="0.1"
                        value={style.kineticJitter ?? 1.0}
                        onChange={(e) => updateStyle({ kineticJitter: parseFloat(e.target.value) })}
                        className="w-full accent-auralis h-1 cursor-ew-resize" 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={cn("text-[10px] font-bold uppercase tracking-widest", isLight ? "text-zinc-500" : "text-[#8F8F9F]")}>Highlight Style</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Highlight Font</label>
              <CustomPremiumSelect 
                value={style.highlightFontFamily}
                onChange={(f) => updateStyle({ highlightFontFamily: f })}
                options={fontOptions}
                isLight={isLight}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Highlight Color</label>
              <div className="flex items-center gap-2 pt-0.5">
                <input 
                  type="color"
                  value={style.highlightColor || '#FFD700'}
                  onChange={(e) => updateStyle({ highlightColor: e.target.value })}
                  className="w-8 h-8 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent shrink-0"
                  title="Pick highlight color"
                />
                <div className="flex flex-wrap gap-1 select-none">
                  {['#FFD700', '#FF3B30', '#30D158', '#0A84FF', '#FFFFFF'].map(c => (
                    <button 
                      key={c} 
                      className={cn(
                        "w-5 h-5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all", 
                        style.highlightColor === c 
                          ? (isLight ? "ring-2 ring-auralis border-zinc-200" : "ring-2 ring-auralis border-transparent")
                          : (isLight ? "border-zinc-200" : "border-white/10")
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => updateStyle({ highlightColor: c })}
                    />
                  ))}
                </div>
              </div>
            </div>

            {style.animationStyle === 'word-highlight-box' && (
              <div className="space-y-1.5 pt-1">
                <label className={cn("text-xs font-semibold", isLight ? "text-zinc-700" : "text-white/55")}>Active Box Color</label>
                <div className="flex items-center gap-2 pt-0.5">
                  <input 
                    type="color"
                    value={style.highlightBoxColor || '#DFAC24'}
                    onChange={(e) => updateStyle({ highlightBoxColor: e.target.value })}
                    className="w-8 h-8 rounded-lg overflow-hidden border-0 cursor-pointer bg-transparent shrink-0"
                    title="Pick background box color"
                  />
                  <div className="flex flex-wrap gap-1 select-none">
                    {['#DFAC24', '#000000', '#FDF9EC', '#FF3B30', '#34C759', '#1C1C1E'].map((col) => (
                      <button 
                        key={col}
                        onClick={() => updateStyle({ highlightBoxColor: col })}
                        className={cn(
                          "w-5 h-5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all",
                          style.highlightBoxColor === col ? "ring-2 ring-auralis border-transparent" : "border-white/10"
                        )}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button 
                onClick={() => updateStyle({ highlightBold: !style.highlightBold })}
                className={cn(
                  "p-2.5 rounded-xl flex-1 flex justify-center text-xs font-bold transition-all cursor-pointer active:scale-95 border", 
                  style.highlightBold 
                    ? "bg-auralis/10 border-auralis/35 text-auralis" 
                    : isLight 
                      ? "bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-800"
                      : "bg-[#1C1C1E] border-white/5 text-[#888] hover:text-white"
                )}
              >
                Bold
              </button>
              <button 
                onClick={() => updateStyle({ highlightItalic: !style.highlightItalic })}
                className={cn(
                  "p-2.5 rounded-xl flex-1 flex justify-center text-xs italic transition-all cursor-pointer active:scale-95 border", 
                  style.highlightItalic 
                    ? "bg-auralis/10 border-auralis/35 text-auralis" 
                    : isLight 
                      ? "bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-800"
                      : "bg-[#1C1C1E] border-white/5 text-[#888] hover:text-white"
                )}
              >
                Italic
              </button>
            </div>
          </div>
        </section>

        <section className={cn(
          "p-5 rounded-2xl border space-y-6 transition-all duration-300",
          isLight ? "bg-auralis/5 border-auralis/15" : "bg-auralis/5 border-auralis/10"
        )}>
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-auralis flex items-center gap-1.5">
            <Sparkles size={14} className="animate-pulse" />
            Creator Edge (AI)
          </h3>
          
          <ToggleOption label="AI Focus Word Highlighting" icon={<Sparkles size={14} className="text-auralis" />} active={style.aiLineFocusHighlighting ?? true} onToggle={(v) => updateStyle({ aiLineFocusHighlighting: v })} isLight={isLight} />
          <ToggleOption label="AI Emphasis" icon={<Sparkles size={14} className="text-auralis" />} active={style.aiEmphasis} onToggle={(v) => updateStyle({ aiEmphasis: v })} isLight={isLight} />
          <ToggleOption label="Auto Emoji" icon={<Smile size={14} className="text-auralis" />} active={style.autoEmoji} onToggle={(v) => updateStyle({ autoEmoji: v })} isLight={isLight} />
          <ToggleOption label="Random Rotate" icon={<RotateCw size={14} className="text-auralis" />} active={style.randomRotate} onToggle={(v) => updateStyle({ randomRotate: v })} isLight={isLight} />
        </section>
      </div>
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
            ? "bg-[#F4F4F5] border-zinc-200 text-zinc-800 hover:bg-[#E4E4E7] hover:border-auralis"
            : "bg-[#1C1C1E] border-white/5 text-white hover:bg-[#252528] hover:border-auralis/50"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-col">
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
        {/* Animated accent trim */}
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
                  <div className="flex flex-col">
                    <span style={option.style} className={cn(isSelected && "text-auralis font-bold")}>{option.label}</span>
                    {option.desc && (
                      <span className={cn("text-[9px] mt-0.5", isSelected ? "text-auralis/75 font-semibold" : isLight ? "text-zinc-400" : "text-white/30")}>
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
