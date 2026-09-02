import React, { useEffect, useState, useRef } from 'react';
import { CaptionSegment, GlobalStyle, AspectRatio } from '../../types';
import { Play, Pause, Search, MousePointer2, Grid3X3, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store';
import { renderCaptionFrame, clamp } from '../../lib/RenderEngine';
import TextType from '../TextType';

interface VideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoUrl: string | null;
  captions: CaptionSegment[];
  currentTime: number;
  isPlaying: boolean;
  style: GlobalStyle;
  aspectRatio: AspectRatio;
  onPlayPause: (playing: boolean) => void;
  onLoadedMetadata?: () => void;
  selectedCaptionId: string | null;
  onSelectCaption: (id: string | null) => void;
  onUpdateStyle: (style: Partial<GlobalStyle>) => void;
  onUpdateAspectRatio: (ratio: AspectRatio) => void;
}

export function VideoCanvas({ 
  videoRef, 
  videoUrl, 
  captions, 
  currentTime, 
  isPlaying, 
  style, 
  aspectRatio,
  onPlayPause,
  onLoadedMetadata,
  selectedCaptionId,
  onSelectCaption,
  onUpdateStyle,
  onUpdateAspectRatio
}: VideoCanvasProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(85);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-video';
      case '1:1': return 'aspect-square';
      case '4:5': return 'aspect-[4/5]';
      case '9:16': 
      default: return 'aspect-[9/16]';
    }
  };

  const getRatioValue = () => {
    switch (aspectRatio) {
      case '16:9': return 16 / 9;
      case '1:1': return 1;
      case '4:5': return 4 / 5;
      case '9:16': 
      default: return 9 / 16;
    }
  };

  const ratio = getRatioValue();
  const baseWidth = 1080;
  const baseHeight = baseWidth / ratio;

  // Primary requestAnimationFrame Loop for Preview
  useEffect(() => {
    let af: number;
    const render = () => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      ctx.clearRect(0, 0, width, height);

      const t = (videoUrl && videoRef.current) ? videoRef.current.currentTime : currentTime;

      // 1. Draw video or background
      if (videoUrl && videoRef.current && videoRef.current.readyState >= 2) {
        const vW = videoRef.current.videoWidth;
        const vH = videoRef.current.videoHeight;
        const scale = Math.max(width / vW, height / vH);
        const drawW = vW * scale;
        const drawH = vH * scale;
        const drawX = (width - drawW) / 2;
        const drawY = (height - drawH) / 2;

        ctx.drawImage(videoRef.current, drawX, drawY, drawW, drawH);
      } else {
        ctx.fillStyle = style.canvasBackground || "#000000";
        ctx.fillRect(0, 0, width, height);
      }

      for (const caption of captions) {
        if (t >= caption.start && t <= caption.end) {
          ctx.save();
          renderCaptionFrame(ctx, caption, t, style, width, height);
          ctx.restore();
        }
      }

      af = requestAnimationFrame(render);
    };

    af = requestAnimationFrame(render);
    return () => cancelAnimationFrame(af);
  }, [videoUrl, isPlaying, currentTime, captions, style, aspectRatio, videoRef]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    
    // Find if we clicked an active caption (simple hit test using center of caption)
    // Actually we just select any active caption for now
    const t = (videoUrl && videoRef.current) ? videoRef.current.currentTime : currentTime;
    const active = captions.find(c => t >= c.start && t <= c.end);
    if(active) {
      onSelectCaption(active.id);
    } else {
      onSelectCaption(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = (e.movementX / rect.width) * 100;
    const dy = (e.movementY / rect.height) * 100;
    onUpdateStyle({
      positionX: clamp(style.positionX + dx, 0, 100),
      positionY: clamp(style.positionY + dy, 0, 100)
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col bg-[#1A1A1A] overflow-hidden">
      {/* Top Ruler */}
      <div className="h-6 w-full bg-[#141414] border-b border-white/5 flex items-end relative overflow-hidden shrink-0">
        <div className="absolute left-6 inset-y-0 right-0 flex pointer-events-none opacity-20">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="flex-1 border-l border-white/50 h-2 flex items-end justify-start px-0.5 text-[8px] font-mono text-white/50">
              {i % 2 === 0 && i * 100}
            </div>
          ))}
        </div>
        <div className="absolute left-0 inset-y-0 w-6 bg-[#141414] border-r border-white/10 z-10" />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Ruler */}
        <div className="w-6 h-full bg-[#141414] border-r border-white/5 flex flex-col items-end relative overflow-hidden shrink-0">
          <div className="absolute left-0 top-0 right-0 bottom-0 flex flex-col pointer-events-none opacity-20">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="flex-1 border-t border-white/50 w-2 flex items-start justify-end py-0.5 pr-0.5 text-[8px] font-mono text-white/50 vertical-rl">
                {i % 2 === 0 && i * 100}
              </div>
            ))}
          </div>
        </div>

        {/* Workspace Area */}
        <div className="flex-1 relative overflow-auto p-12 flex items-center justify-center bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:24px_24px]">
          <div 
            id="preview-container"
            className={cn(
              "relative shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-crosshair group overflow-hidden",
              getAspectRatioClasses()
            )}
            style={{
              backgroundColor: style.canvasBackground,
              height: containerSize.height ? `${(containerSize.height - 120) * (zoom / 100)}px` : 'auto',
              maxHeight: '95%',
              // The checkerboard pattern for transparency
              backgroundImage: !videoUrl ? 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)' : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Guide borders */}
            <div className="absolute -inset-[1px] border border-white/10 pointer-events-none z-50 group-hover:border-auralis/50 transition-colors" />
            
            {/* Unified Render Canvas */}
            <canvas
              ref={canvasRef}
              width={baseWidth}
              height={baseHeight}
              className="w-full h-full object-contain block pointer-events-none"
            />

            {/* DOM Overlay for React-based animations like TextType */}
            {style.animationStyle === 'typewriter' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {captions.map((caption) => {
                  const t = (videoUrl && videoRef.current) ? videoRef.current.currentTime : currentTime;
                  const isActive = t >= caption.start && t <= caption.end;
                  
                  if (!isActive) return null;

                  return (
                    <div 
                      key={caption.id} 
                      className="absolute w-full flex items-center justify-center text-center px-8"
                      style={{
                        top: `${style.positionY}%`,
                        left: `${style.positionX}%`,
                        transform: 'translate(-50%, -50%)',
                        fontFamily: style.fontFamily,
                        fontSize: `${style.fontSize * (containerSize.width / baseWidth)}px`,
                        fontWeight: style.fontWeight,
                        color: style.textColor,
                        textTransform: style.casing === 'none' ? 'none' : style.casing as any,
                        WebkitTextStroke: style.outlineEnabled ? `${style.outlineWidth || 4}px ${style.outlineColor}` : undefined,
                        textShadow: style.shadowEnabled ? `0px 4px 20px ${style.shadowColor}` : undefined,
                      }}
                    >
                      <TextType 
                        text={caption.text}
                        typingSpeed={50}
                        pauseDuration={1500}
                        showCursor={true}
                        cursorCharacter="|"
                      />
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Hidden Video element for audio/timing */}
            {videoUrl && (
              <video
                id="preview-video"
                ref={videoRef as React.RefObject<HTMLVideoElement>}
                src={videoUrl}
                crossOrigin="anonymous"
                className="hidden"
                onLoadedMetadata={onLoadedMetadata}
                onPlay={() => onPlayPause(true)}
                onPause={() => onPlayPause(false)}
              />
            )}
            
            {!videoUrl && captions.length === 0 && (
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 select-none opacity-50 pointer-events-none"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-dashed border-white/20">
                  <Grid3X3 className="text-white/40" size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#666]">Empty Workspace</h3>
                </div>
              </div>
            )}

            {/* In-canvas playback controls overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-50 pointer-events-none">
              <button 
                className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full text-white flex items-center justify-center pointer-events-auto hover:bg-white/20 active:scale-90 transition-all border border-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoUrl && videoRef.current) {
                    isPlaying ? videoRef.current.pause() : videoRef.current.play();
                  } else {
                    onPlayPause(!isPlaying);
                  }
                }}
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar Floating */}
        <div className="absolute left-10 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-1.5 bg-[#141414]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50">
          <ToolButton icon={<MousePointer2 size={18} />} active />
          <ToolButton icon={<Search size={18} />} />
          <ToolButton icon={<Grid3X3 size={18} />} />
          <div className="h-px bg-white/10 my-1 mx-2" />
          <ToolButton icon={<Info size={18} />} />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="h-8 w-full bg-[#141414] border-t border-white/5 flex items-center justify-between px-4 shrink-0 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#666]">
            <span className="text-auralis">CANVAS</span>
            <span>{Math.round(baseWidth)} × {Math.round(baseHeight)}</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#666]">
            <span>ZOOM</span>
            <span className="text-white">{zoom}%</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setZoom(prev => Math.max(25, prev - 10))}
            className="text-[#666] hover:text-white transition-colors"
          >
            <Search size={12} className="rotate-90" />
          </button>
          <input 
            type="range" 
            min="25" 
            max="150" 
            value={zoom} 
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-24 h-1 bg-[#262626] rounded-full appearance-none cursor-pointer accent-auralis"
          />
          <button 
            onClick={() => setZoom(prev => Math.min(150, prev + 10))}
            className="text-[#666] hover:text-white transition-colors"
          >
            <Search size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon, active }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button className={cn(
      "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
      active ? "bg-auralis text-white" : "text-white/40 hover:text-white hover:bg-white/5"
    )}>
      {icon}
    </button>
  );
}
