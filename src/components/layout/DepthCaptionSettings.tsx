import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GlobalStyle } from '../../types';

interface DepthCaptionSettingsProps {
  currentStyle: GlobalStyle;
  updateStyle: (updates: Partial<GlobalStyle>) => void;
  isLight: boolean;
  currentTime: number;
  store: any;
}

export const DepthCaptionSettings: React.FC<DepthCaptionSettingsProps> = ({
  currentStyle,
  updateStyle,
  isLight,
  currentTime,
  store,
}) => {
  return (
    <div className="space-y-5">
      {/* Switch Activation banner */}
      <div className={cn(
        "p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between shadow-xs",
        currentStyle.depthEnabled 
          ? "bg-auralis/15 border-auralis/40" 
          : isLight ? "bg-white border-zinc-200" : "bg-[#18181B] border-white/5"
      )}>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-auralis">ACTIVATE DEPTH CAPTIONS</span>
          <span className="text-[9px] opacity-65">Dual-layer body segmentation</span>
        </div>
        <button 
          onClick={() => updateStyle({ depthEnabled: !currentStyle.depthEnabled })}
          className={cn(
            "w-11 h-6 rounded-full transition-all relative cursor-pointer border border-[#888]/10",
            currentStyle.depthEnabled ? "bg-auralis shadow-md shadow-auralis/30" : isLight ? "bg-zinc-200" : "bg-white/10"
          )}
        >
          <div className={cn(
            "absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all shadow-md",
            currentStyle.depthEnabled ? "left-[23px]" : "left-[3px]"
          )} />
        </button>
      </div>

      {/* Depth Options Panel (Grayed out if disabled) */}
      <div className={cn(
        "space-y-5 transition-all duration-300",
        !currentStyle.depthEnabled && "opacity-45 pointer-events-none"
      )}>

        {/* Operational Override Manual Keyword Input */}
        {(() => {
          const textTrack = store.tracks.find((t: any) => t.id === 'track-text-1');
          const activeClip = textTrack?.clips.find((c: any) => currentTime >= c.start && currentTime <= c.end);
          const activeText = activeClip?.textFields?.text || (activeClip as any)?.text || '';
          const words = activeText.trim().split(/\s+/).filter(Boolean);

          const overrideKeyword = activeClip?.textFields?.style?.depthKeywordManualOverride || currentStyle.depthKeywordManualOverride || '';
          
          let autoKeyword = '';
          if (words.length > 0) {
            const stopWords = new Set([
              'is', 'am', 'are', 'was', 'were', 'be', 'been', 'a', 'an', 'the', 'and', 'or', 'but', 
              'if', 'of', 'in', 'on', 'at', 'by', 'for', 'to', 'with', 'from', 'as', 'that', 'this', 
              'these', 'those', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i', 'my', 'your', 'their'
            ]);
            let candidateIndex = 0;
            for (let i = 0; i < words.length; i++) {
              const cleanWord = words[i].toLowerCase().replace(/[^a-z]/g, '');
              if (!stopWords.has(cleanWord)) {
                candidateIndex = i;
                break;
              }
            }
            autoKeyword = words[candidateIndex] || words[0] || '';
          }
          const activeKeyword = overrideKeyword || autoKeyword;

          const handleWordClick = (word: string) => {
            if (!activeClip) return;
            const wordCleaned = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
            const currentOverride = activeClip.textFields?.style?.depthKeywordManualOverride || '';
            
            let newOverride = '';
            // Toggle off if already manually clicked to reverse to AI choice
            if (currentOverride.toLowerCase() !== wordCleaned.toLowerCase()) {
              newOverride = wordCleaned;
            }
            
            const updatedClip = {
              ...activeClip,
              textFields: {
                ...(activeClip.textFields || { text: activeText }),
                style: {
                  ...(activeClip.textFields?.style || {}),
                  depthKeywordManualOverride: newOverride
                }
              }
            };
            store.updateClip(activeClip.id, updatedClip);
          };

          const handleManualKeywordChange = (val: string) => {
            updateStyle({ depthKeywordManualOverride: val });
            if (activeClip) {
              const updatedClip = {
                ...activeClip,
                textFields: {
                  ...(activeClip.textFields || { text: activeText }),
                  style: {
                    ...(activeClip.textFields?.style || {}),
                    depthKeywordManualOverride: val
                  }
                }
              };
              store.updateClip(activeClip.id, updatedClip);
            }
          };

          return (
            <div className="space-y-3.5 p-3 rounded-xl bg-white/5 border border-white/5 text-left">
              <div className="flex flex-col gap-0.5">
                <label className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-650" : "text-white/45")}>
                  Interactive Focus Keyword
                </label>
                <span className="text-[8px] opacity-50">Click any word to override AI keyword select</span>
              </div>

              {activeClip ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-black/15 dark:bg-white/5 border border-white/5 max-h-[110px] overflow-y-auto custom-scrollbar">
                    {words.map((w: string, wIdx: number) => {
                      const wordClean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").toLowerCase();
                      const activeKeywordClean = activeKeyword.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").toLowerCase();
                      const isSelected = activeKeywordClean && wordClean === activeKeywordClean;
                      const isManual = overrideKeyword && wordClean === overrideKeyword.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").toLowerCase();

                      return (
                        <button
                          key={wIdx}
                          onClick={() => handleWordClick(w)}
                          className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer scale-100 hover:scale-[1.03] active:scale-95 border",
                            isSelected
                              ? isManual
                                ? "bg-auralis text-white border-auralis shadow-sm font-extrabold"
                                : "bg-auralis/20 text-auralis border-auralis/30 font-bold"
                              : isLight
                                ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200"
                                : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/5"
                          )}
                          title={isManual ? `Manual highlight override: ${w}` : isSelected ? `AI Auto-highlighted: ${w}` : `Set manual highlight override: ${w}`}
                        >
                          {w}
                          {isSelected && (
                            <span className="ml-1 text-[8px] opacity-75">
                              {isManual ? '★' : 'AI'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[8px] opacity-60">
                    <span className="text-auralis">★</span> Click a word to set as override, click again to return to AI auto-detection.
                  </p>
                </div>
              ) : (
                <div className="text-[9px] text-[#8F8F9F] italic text-center p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                  Move playhead to an active sub-phrase to select word pills.
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[8px] font-bold text-zinc-400">Manual Selection Input</span>
                <input 
                  type="text" 
                  placeholder="Automatic extraction (Auto if blank)..."
                  value={overrideKeyword}
                  onChange={(e) => handleManualKeywordChange(e.target.value)}
                  className={cn(
                    "w-full px-3 py-1.5 border rounded-lg text-xs outline-none transition-all",
                    isLight 
                      ? "bg-zinc-100 border-zinc-200 text-zinc-900 focus:bg-white focus:border-auralis" 
                      : "bg-[#1C1C1E] border-white/5 text-white focus:border-auralis"
                  )}
                />
              </div>
            </div>
          );
        })()}

        {/* Section A: Depth Settings */}
        <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/5 text-left">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-auralis border-b border-auralis/10 pb-1.5 mb-2">
             Dual-Layer Segmentation
           </div>

          {/* Depth Intensity slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Depth Mask Opacity</span>
              <span className="font-mono text-auralis">{currentStyle.depthIntensity}%</span>
            </div>
            <input 
              type="range" min="0" max="100" step="5"
              value={currentStyle.depthIntensity !== undefined ? currentStyle.depthIntensity : 100}
              onChange={(e) => updateStyle({ depthIntensity: parseInt(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>

          {/* Mask Edge Feathering */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Mask Edge Feathering</span>
              <span className="font-mono text-auralis">{currentStyle.depthMaskFeather !== undefined ? currentStyle.depthMaskFeather : 3}px</span>
            </div>
            <input 
              type="range" min="0" max="15" step="1"
              value={currentStyle.depthMaskFeather !== undefined ? currentStyle.depthMaskFeather : 3}
              onChange={(e) => updateStyle({ depthMaskFeather: parseInt(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>

          {/* Margin Controls */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Subject Scaled Margins</span>
              <span className="font-mono text-auralis">{(currentStyle.depthSubjectScaleMargin || 0).toFixed(2)}x</span>
            </div>
            <input 
              type="range" min="-0.2" max="0.5" step="0.02"
              value={currentStyle.depthSubjectScaleMargin !== undefined ? currentStyle.depthSubjectScaleMargin : 0}
              onChange={(e) => updateStyle({ depthSubjectScaleMargin: parseFloat(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>
        </div>

        {/* Section B: Typography Setting duplicates */}
        <div className="space-y-3.5 p-3 rounded-xl bg-white/5 border border-white/5 text-left">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-auralis border-b border-auralis/10 pb-1.5 mb-2">
             Interactive Typography
          </div>

          {/* Background Text Selection Font */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-zinc-400 font-sans block">Highlight Font Family</span>
            <div className="grid grid-cols-2 gap-1.5">
              {['Inter', 'Impact', 'Rubik Mono One', 'Orbitron', 'Space Grotesk', 'Playfair Display'].map((f) => {
                const isSel = currentStyle.depthFontFamily === f;
                return (
                  <button 
                    key={f}
                    onClick={() => updateStyle({ depthFontFamily: f })}
                    style={{ fontFamily: f }}
                    className={cn(
                      "px-2 py-1 border rounded-lg text-[9px] text-center font-bold cursor-pointer transition-all active:scale-95 truncate",
                      isSel 
                        ? "border-auralis bg-auralis/10 text-auralis shadow-sm shadow-auralis/15" 
                        : isLight ? "border-zinc-200 bg-zinc-55 hover:bg-zinc-100 text-zinc-700" : "border-white/5 bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white/85"
                    )}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Color Configuration */}
          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <span className="text-[10px] text-zinc-400 font-sans block">Foreground and Background Highlight Colors</span>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-500">
              <div className="flex flex-col gap-1">
                <span>Highlight Color</span>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="color" 
                    value={currentStyle.depthTextColor || '#FFFF00'}
                    onChange={(e) => updateStyle({ depthTextColor: e.target.value })}
                    className="w-8 h-6 rounded cursor-pointer overflow-hidden border border-white/10"
                  />
                  <span className="font-mono text-zinc-400 text-[9px]">{currentStyle.depthTextColor || '#FFFF00'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <span>Standard Color</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="font-mono text-zinc-400 text-[9px]">{currentStyle.textColor || '#FFFFFF'}</span>
                  <input 
                    type="color" 
                    value={currentStyle.textColor || '#FFFFFF'}
                    onChange={(e) => updateStyle({ textColor: e.target.value })}
                    className="w-8 h-6 rounded cursor-pointer overflow-hidden border border-white/10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Positioning and Sizing */}
        <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/5 text-left">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-auralis border-b border-auralis/10 pb-1.5 mb-2">
             Scale & Layer Positioning
          </div>

          {/* Highlight word Font-Size slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Selected word Scale</span>
              <span className="font-mono text-auralis">{currentStyle.depthFontSize !== undefined ? currentStyle.depthFontSize : 42}px</span>
            </div>
            <input 
              type="range" min="15" max="80" step="1"
              value={currentStyle.depthFontSize !== undefined ? currentStyle.depthFontSize : 42}
              onChange={(e) => updateStyle({ depthFontSize: parseInt(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>

          {/* Standard phrase font size */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Standard phrase Font Size</span>
              <span className="font-mono text-auralis">{currentStyle.fontSize !== undefined ? currentStyle.fontSize : 24}px</span>
            </div>
            <input 
              type="range" min="12" max="50" step="1"
              value={currentStyle.fontSize !== undefined ? currentStyle.fontSize : 24}
              onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>

          {/* Vertical Offset Positioning on Page */}
          <div className="space-y-1 pt-1.5 border-t border-white/5">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Vertical position (from top)</span>
              <span className="font-mono text-auralis">{currentStyle.depthVerticalPos !== undefined ? currentStyle.depthVerticalPos : 50}%</span>
            </div>
            <input 
              type="range" min="10" max="90" step="1"
              value={currentStyle.depthVerticalPos !== undefined ? currentStyle.depthVerticalPos : 50}
              onChange={(e) => updateStyle({ depthVerticalPos: parseInt(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>

          {/* Highlight word extra vertical offset */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Highlight word Offset (Y)</span>
              <span className="font-mono text-auralis">{currentStyle.depthHighlightYOffset !== undefined ? currentStyle.depthHighlightYOffset : -10}px</span>
            </div>
            <input 
              type="range" min="-120" max="100" step="2"
              value={currentStyle.depthHighlightYOffset !== undefined ? currentStyle.depthHighlightYOffset : -10}
              onChange={(e) => updateStyle({ depthHighlightYOffset: parseInt(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>
        </div>

        {/* Section D: Rotation and Style Settings */}
        <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/5 text-left">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-auralis border-b border-auralis/10 pb-1.5 mb-2">
             3D Rotations & Tilt
          </div>

          {/* Highlight Word Rotation Z Axis */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Highlight Z Rotation (Flat Tilt)</span>
              <span className="font-mono text-auralis">{currentStyle.depthRotationZ !== undefined ? currentStyle.depthRotationZ : -3}&deg;</span>
            </div>
            <input 
              type="range" min="-45" max="45" step="1"
              value={currentStyle.depthRotationZ !== undefined ? currentStyle.depthRotationZ : -3}
              onChange={(e) => updateStyle({ depthRotationZ: parseInt(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>

          {/* Highlight Word Rotation Y Axis (3D Spin) */}
          <div className="space-y-1 pt-1 border-t border-white/5">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Highlight Y Rotation (3D Facing Angle)</span>
              <span className="font-mono text-auralis">{currentStyle.depthRotationY !== undefined ? currentStyle.depthRotationY : 12}&deg;</span>
            </div>
            <input 
              type="range" min="-60" max="60" step="2"
              value={currentStyle.depthRotationY !== undefined ? currentStyle.depthRotationY : 12}
              onChange={(e) => updateStyle({ depthRotationY: parseInt(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>
        </div>

        {/* Section E: Interactive Animation Curve Settings */}
        <div className="space-y-3.5 p-3 rounded-xl bg-white/5 border border-white/5 text-left">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-auralis border-b border-auralis/10 pb-1.5 mb-2">
             Interactive Transitions
          </div>

          {/* Core Animation Preset style type select dropdown */}
          <div className="space-y-1 pt-0.5">
            <span className="text-[10px] text-zinc-400 font-sans">Active transition Preset style</span>
            <select 
              value={currentStyle.depthAnimationStyle || 'pop'}
              onChange={(e) => updateStyle({ depthAnimationStyle: e.target.value as any })}
              className={cn(
                "w-full px-2 py-1.5 border rounded-lg text-xs outline-none cursor-pointer",
                isLight ? "bg-[#F4F4F5] border-zinc-200" : "bg-[#1C1C1E] border-white/10 text-white"
              )}
            >
              <option value="none">None (Instant Cut)</option>
              <option value="slide-up">Slide Up</option>
              <option value="slide-down">Slide Down</option>
              <option value="slide-left">Slide Left</option>
              <option value="slide-right">Slide Right</option>
              <option value="fade-in">Fade In</option>
              <option value="zoom-in">Zoom In</option>
              <option value="pop">Pop (Damped Spring)</option>
              <option value="bounce">Bounce Wave</option>
              <option value="elastic">Elastic Band</option>
              <option value="rotate-in">Spin Roll In</option>
              <option value="drift">Drift (Slow Floating)</option>
              <option value="cinematic-reveal">Cinematic Mystery Reveal</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-0.5">
              <div className="flex justify-between text-[8px] font-bold text-zinc-500">
                <span>Duration</span>
                <span>{(currentStyle.depthAnimationDuration || 0.45).toFixed(2)}s</span>
              </div>
              <input 
                type="range" min="0.1" max="1.5" step="0.05"
                value={currentStyle.depthAnimationDuration !== undefined ? currentStyle.depthAnimationDuration : 0.45}
                onChange={(e) => updateStyle({ depthAnimationDuration: parseFloat(e.target.value) })}
                className="w-full h-1 accent-auralis cursor-pointer"
              />
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between text-[8px] font-bold text-zinc-500">
                <span>Delay Offset</span>
                <span>{(currentStyle.depthAnimationDelay || 0).toFixed(2)}s</span>
              </div>
              <input 
                type="range" min="0" max="0.5" step="0.05"
                value={currentStyle.depthAnimationDelay !== undefined ? currentStyle.depthAnimationDelay : 0}
                onChange={(e) => updateStyle({ depthAnimationDelay: parseFloat(e.target.value) })}
                className="w-full h-1 accent-auralis cursor-pointer"
              />
            </div>
          </div>

          {/* Advanced curves select inputs */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[9px]">
            <div className="space-y-1">
              <span className="text-zinc-500 font-sans">Easing Curve</span>
              <select 
                value={currentStyle.depthAnimationEasing || 'spring'}
                onChange={(e) => updateStyle({ depthAnimationEasing: e.target.value })}
                className={cn(
                  "w-full px-2 py-0.5 border rounded text-[9px] outline-none cursor-pointer",
                  isLight ? "bg-[#F4F4F5] border-[#ccc]" : "bg-[#1C1C1E] border-white/5 text-white/80"
                )}
              >
                <option value="spring">Elastic Spring</option>
                <option value="ease-out">Quart Out</option>
                <option value="linear">Linear</option>
                <option value="ease-in-out">Ease In Out</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-zinc-500 font-sans">Scale Curve</span>
              <select 
                value={currentStyle.depthScaleCurve || 'spring'}
                onChange={(e) => updateStyle({ depthScaleCurve: e.target.value })}
                className={cn(
                  "w-full px-2 py-0.5 border rounded text-[9px] outline-none cursor-pointer",
                  isLight ? "bg-[#F4F4F5] border-[#ccc]" : "bg-[#1C1C1E] border-white/5 text-white/80"
                )}
              >
                <option value="spring">Spring Overshoot</option>
                <option value="ease-out">Linear-to-Stop</option>
                <option value="pulse">Heartbeat Pulse</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section F: Effects */}
        <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/5 text-left">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-auralis border-b border-auralis/10 pb-1.5 mb-2">
             Aesthetic Effects
          </div>

          {/* Blur amount slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Person Mask Blur</span>
              <span className="font-mono text-auralis">{currentStyle.depthBlurAmount || 0}px</span>
            </div>
            <input 
              type="range" min="0" max="10" step="1"
              value={currentStyle.depthBlurAmount !== undefined ? currentStyle.depthBlurAmount : 0}
              onChange={(e) => updateStyle({ depthBlurAmount: parseInt(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>

          {/* Glow strength and size */}
          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-zinc-400">AMBER GLOW EFFUSION</span>
              <button 
                onClick={() => updateStyle({ depthGlowStrength: currentStyle.depthGlowStrength ? 0 : 1 })}
                className={cn(
                  "px-2 py-0.5 text-[8.5px] font-bold rounded-lg border cursor-pointer active:scale-95 transition-all",
                  currentStyle.depthGlowStrength
                    ? "bg-auralis/10 border-auralis text-auralis"
                    : isLight ? "bg-zinc-100 border-zinc-200 text-zinc-500" : "bg-white/5 border-white/10 text-white/50"
                )}
              >
                {currentStyle.depthGlowStrength ? 'ON' : 'OFF'}
              </button>
            </div>
            {currentStyle.depthGlowStrength ? (
              <div className="space-y-1 pt-1.5 animate-slide-up col-span-2">
                <div className="flex justify-between text-[8px] font-semibold text-zinc-500">
                  <span>Glow Spread Radius</span>
                  <span>{currentStyle.depthGlowRadius || 10}px</span>
                </div>
                <input 
                  type="range" min="4" max="25" step="1"
                  value={currentStyle.depthGlowRadius !== undefined ? currentStyle.depthGlowRadius : 10}
                  onChange={(e) => updateStyle({ depthGlowRadius: parseInt(e.target.value) })}
                  className="w-full h-1 accent-auralis cursor-pointer"
                />
              </div>
            ) : null}
          </div>

          {/* Shadow Strength */}
          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span>Drop Shadows opacity</span>
              <span className="font-mono text-auralis">{(currentStyle.depthShadowStrength !== undefined ? currentStyle.depthShadowStrength : 0.5).toFixed(1)}</span>
            </div>
            <input 
              type="range" min="0" max="1.0" step="0.1"
              value={currentStyle.depthShadowStrength !== undefined ? currentStyle.depthShadowStrength : 0.5}
              onChange={(e) => updateStyle({ depthShadowStrength: parseFloat(e.target.value) })}
              className="w-full h-1 accent-auralis cursor-pointer"
            />
          </div>

          {/* Outlines configuration */}
          <div className="space-y-1.5 pt-1.5 border-t border-white/5">
            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-zinc-400">
              <div className="space-y-1">
                <span className="text-[8px] text-zinc-500">Outline Width</span>
                <input 
                  type="range" min="0" max="12" step="1"
                  value={currentStyle.depthOutlineWidth !== undefined ? currentStyle.depthOutlineWidth : 0}
                  onChange={(e) => updateStyle({ depthOutlineWidth: parseInt(e.target.value) })}
                  className="w-full h-1 accent-auralis cursor-pointer"
                />
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[8px] text-zinc-500 block pr-0.5">Outline Color</span>
                <input 
                  type="color"
                  value={currentStyle.depthOutlineColor || '#000000'}
                  onChange={(e) => updateStyle({ depthOutlineColor: e.target.value })}
                  className="w-6 h-5 rounded cursor-pointer ml-auto block overflow-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Informational Diagnostics & Indicators for premium look */}
        <div className={cn(
          "p-3 rounded-2xl border text-[9px] space-y-1.5 text-left font-mono",
          isLight ? "bg-zinc-150 border-zinc-200 text-zinc-650" : "bg-[#131317] border-white/5 text-[#888]"
        )}>
          <div className="text-[9.5px] font-bold text-auralis flex items-center gap-1.5 uppercase font-sans">
            <Check size={11} className="text-green-500" />
            Rendering Pipeline Diagnostics
          </div>
          <p className="leading-snug">● MediaPipe Selfie Segmenter CDN loader initiated</p>
          <p className="leading-snug">● WebGL GPU acceleration capability active</p>
          <p className="leading-snug">● requestAnimationFrame LRU cached render loop active</p>
          <p className="leading-snug">● Optimized for 9:16 portrait Mobile layouts</p>
        </div>
      </div>
    </div>
  );
};
