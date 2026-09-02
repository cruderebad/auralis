import React, { useRef } from 'react';
import { useStore } from '../../store';
import { cn, formatTime } from '../../lib/utils';

interface TimelineMiniMapProps {
  isLight?: boolean;
}

export function TimelineMiniMap({ isLight }: TimelineMiniMapProps) {
  const store = useStore();
  const miniMapRef = useRef<HTMLDivElement>(null);

  const duration = store.duration || 10;
  const currentTime = store.currentTime;
  const currentPct = (currentTime / duration) * 100;

  // Viewport calculation based on zoom
  const zoomFactor = 1 + store.zoom * 4;
  const viewportWidthPct = Math.min(100, 100 / zoomFactor);
  const viewportStartPct = Math.max(0, Math.min(100 - viewportWidthPct, currentPct - viewportWidthPct / 2));

  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!miniMapRef.current) return;
    const rect = miniMapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    store.setCurrentTime(pct * duration);
  };

  return (
    <div 
      className={cn(
        "h-6 px-3 border-b flex items-center gap-2 select-none relative transition-colors duration-200",
        isLight ? "bg-zinc-100/90 border-zinc-200" : "bg-[#0E0E10] border-white/5"
      )}
    >
      <span className="text-[9px] font-mono uppercase tracking-wider opacity-50 shrink-0 hidden sm:inline">
        Overview
      </span>

      <div 
        ref={miniMapRef}
        onClick={handleMiniMapClick}
        className={cn(
          "flex-1 h-3.5 rounded relative cursor-pointer overflow-hidden border shadow-inner transition-colors",
          isLight ? "bg-zinc-200/80 border-zinc-300" : "bg-[#18181B] border-white/10"
        )}
      >
        {/* Clip spans */}
        {store.tracks.map((track) => 
          track.clips.map((clip) => {
            const leftPct = (clip.start / duration) * 100;
            const widthPct = Math.max(0.5, ((clip.end - clip.start) / duration) * 100);
            const color = clip.type === 'video' 
              ? 'bg-blue-500/70' 
              : clip.type === 'audio' 
                ? 'bg-emerald-500/70' 
                : clip.type === 'text' 
                  ? 'bg-amber-500/70' 
                  : 'bg-purple-500/70';

            return (
              <div 
                key={clip.id}
                className={`absolute top-0.5 bottom-0.5 rounded-xs ${color}`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              />
            );
          })
        )}

        {/* Marker dots */}
        {store.markers?.map(marker => (
          <div 
            key={marker.id}
            className="absolute top-0 bottom-0 w-1 rounded-full z-10 -translate-x-1/2 shadow-xs"
            style={{ 
              left: `${(marker.time / duration) * 100}%`,
              backgroundColor: marker.color || '#DFAC24' 
            }}
          />
        ))}

        {/* Viewport Window Box */}
        <div 
          className="absolute top-0 bottom-0 border-2 border-auralis bg-auralis/15 rounded-xs pointer-events-none transition-all duration-75"
          style={{ 
            left: `${viewportStartPct}%`, 
            width: `${viewportWidthPct}%` 
          }}
        />

        {/* Playhead Needle in MiniMap */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none -translate-x-1/2"
          style={{ left: `${currentPct}%` }}
        />
      </div>

      <div className="text-[9px] font-mono opacity-60 shrink-0">
        {formatTime(store.currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
}
