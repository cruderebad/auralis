import React, { useRef, useState, useMemo, memo } from 'react';
import { useStore } from '../store';
import { formatTime, cn } from '../lib/utils';
import { Trash2 } from 'lucide-react';

interface RulerTicksProps {
  duration: number;
  zoom: number;
  isLight: boolean;
}

const RulerTicks = memo(function RulerTicks({ duration, zoom, isLight }: RulerTicksProps) {
  const rulerTicks = useMemo(() => {
    const zoomLevel = 1 + zoom * 4;
    // Determine appropriate interval in seconds: 0.5s, 1s, 2s, 5s, 10s, 30s, 60s
    let step = 5;
    if (duration <= 10) step = 1;
    else if (duration <= 30) step = zoomLevel > 2 ? 1 : 2;
    else if (duration <= 60) step = zoomLevel > 3 ? 1 : zoomLevel > 1.5 ? 2 : 5;
    else if (duration <= 180) step = zoomLevel > 2 ? 5 : 10;
    else step = zoomLevel > 2 ? 10 : 30;

    const ticks: { time: number; label: string; isMajor: boolean }[] = [];
    for (let t = 0; t <= duration; t += step) {
      ticks.push({
        time: t,
        label: formatTime(t),
        isMajor: true
      });
      // Add intermediate minor tick
      if (t + step / 2 < duration) {
        ticks.push({
          time: t + step / 2,
          label: '',
          isMajor: false
        });
      }
    }
    return ticks;
  }, [duration, zoom]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {rulerTicks.map((tick, idx) => {
        const leftPct = (tick.time / duration) * 100;
        return (
          <div 
            key={idx} 
            className="absolute top-0 bottom-0 flex flex-col justify-between -translate-x-1/2"
            style={{ left: `${leftPct}%` }}
          >
            {tick.isMajor && (
              <span className="text-[8px] font-mono font-medium leading-none mt-0.5 px-0.5 opacity-70">
                {tick.label}
              </span>
            )}
            <div 
              className={cn(
                "w-[1px] self-center",
                tick.isMajor 
                  ? (isLight ? "h-2.5 bg-zinc-400" : "h-2.5 bg-white/30") 
                  : (isLight ? "h-1.5 bg-zinc-300" : "h-1.5 bg-white/15")
              )} 
            />
          </div>
        );
      })}
    </div>
  );
});

interface MarkersListProps {
  duration: number;
  isLight: boolean;
}

const MarkersList = memo(function MarkersList({ duration, isLight }: MarkersListProps) {
  const markers = useStore((s) => s.markers);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const removeMarker = useStore((s) => s.removeMarker);
  const [activeMarkerTooltip, setActiveMarkerTooltip] = useState<string | null>(null);

  if (!markers || markers.length === 0) return null;

  return (
    <>
      {markers.map((marker) => {
        const markerPct = (marker.time / duration) * 100;
        return (
          <div
            key={marker.id}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentTime(marker.time);
            }}
            onMouseEnter={() => setActiveMarkerTooltip(marker.id)}
            onMouseLeave={() => setActiveMarkerTooltip(null)}
            className="marker-pin absolute top-0 z-45 cursor-pointer -translate-x-1/2 group"
            style={{ left: `${markerPct}%` }}
          >
            {/* Marker Diamond Head */}
            <div 
              className="w-2.5 h-2.5 rotate-45 rounded-[1.5px] border border-black/40 shadow-sm transition-transform group-hover:scale-125"
              style={{ backgroundColor: marker.color || '#DFAC24' }}
            />
            {/* Marker Line downwards */}
            <div 
              className="w-[1px] h-[500px] pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity"
              style={{ backgroundColor: marker.color || '#DFAC24' }}
            />

            {/* Marker Tooltip */}
            {activeMarkerTooltip === marker.id && (
              <div 
                className={cn(
                  "absolute top-5 left-1/2 -translate-x-1/2 px-2 py-1 rounded shadow-xl border text-[9px] font-medium whitespace-nowrap z-50 flex items-center gap-1.5 animate-in fade-in zoom-in-95",
                  isLight ? "bg-white border-zinc-300 text-zinc-800" : "bg-[#1F1F23] border-white/15 text-white"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{marker.label}</span>
                <span className="font-mono opacity-60">({formatTime(marker.time)})</span>
                <button
                  onClick={() => removeMarker(marker.id)}
                  className="hover:text-red-400 p-0.5 transition-colors"
                  title="Remove Marker"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
});

function PlayheadNeedle({ duration }: { duration: number }) {
  const currentTime = useStore((s) => s.currentTime);
  const positionPercent = (currentTime / (duration || 1)) * 100;

  return (
    <div 
      className="absolute top-0 bottom-[-500px] w-[2px] bg-auralis z-50 pointer-events-none will-change-transform"
      style={{ left: `${positionPercent}%`, pointerEvents: 'none' }}
    >
      {/* Glow indicator */}
      <div className="absolute -left-[1px] top-6 bottom-0 w-1 bg-auralis/20 blur-[1px]" />
      
      {/* Needle Top Cap Handle */}
      <div 
        className="absolute top-0 -left-[6px] w-[14px] h-[10px] bg-auralis rounded-b-sm border-x border-b border-black/30 shadow-md flex items-center justify-center"
      >
        <div className="w-[2px] h-[5px] bg-[#121212]/45 rounded-full" />
      </div>
      
      {/* Triangular arrow pointer */}
      <div className="absolute top-[10px] -left-[6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-auralis" />

      {/* Needle time marker overlay */}
      <div className="absolute top-[-22px] -translate-x-1/2 left-[1px] bg-auralis text-black text-[8px] px-1 font-mono font-bold rounded shadow-xl tracking-tight leading-none h-4 flex items-center justify-center">
        {formatTime(currentTime)}
      </div>
    </div>
  );
}

export function Playhead() {
  const duration = useStore((s) => s.duration || 10);
  const zoom = useStore((s) => s.zoom);
  const isLight = useStore((s) => s.theme === 'light');
  const snappingEnabled = useStore((s) => s.snappingEnabled);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setCurrentTime = useStore((s) => s.setCurrentTime);

  const rulerRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const handleSeek = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const rawTime = pct * duration;

    let finalTime = rawTime;
    if (snappingEnabled) {
      const thresholdSeconds = (12 / rect.width) * duration;
      const storeState = useStore.getState();
      const snapped = storeState.snappedTime(rawTime, thresholdSeconds);
      if (Math.abs(snapped - rawTime) < thresholdSeconds) {
        finalTime = snapped;
      }
    }
    setCurrentTime(finalTime);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.marker-pin')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPlaying(false);
    setIsSeeking(true);
    handleSeek(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const rawTime = pct * duration;

    let finalTime = rawTime;
    if (snappingEnabled) {
      const thresholdSeconds = (12 / rect.width) * duration;
      const storeState = useStore.getState();
      const snapped = storeState.snappedTime(rawTime, thresholdSeconds);
      if (Math.abs(snapped - rawTime) < thresholdSeconds) {
        finalTime = snapped;
      }
    }

    const snappedX = (finalTime / duration) * rect.width;
    setHoverX(snappedX);
    setHoverTime(finalTime);

    if (isSeeking) {
      setCurrentTime(finalTime);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsSeeking(false);
  };

  const handlePointerLeave = () => {
    setHoverX(null);
    setHoverTime(null);
  };

  return (
    <div 
      ref={rulerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "absolute top-0 left-0 right-0 h-6 cursor-ew-resize z-40 select-none transition-colors duration-200",
        isLight ? "bg-zinc-100/90 hover:bg-zinc-200/50 border-b border-zinc-250 text-zinc-600" : "bg-[#141416]/90 hover:bg-[#18181B] border-b border-white/5 text-white/50"
      )}
    >
      {/* Precision Numbered Ticks & Divisions (Memoized) */}
      <RulerTicks duration={duration} zoom={zoom} isLight={isLight} />

      {/* Markers on Ruler (Memoized) */}
      <MarkersList duration={duration} isLight={isLight} />

      {/* Hover Guideline & Timestamp indicator */}
      {hoverX !== null && hoverTime !== null && !isSeeking && (
        <div 
          className={cn(
            "absolute top-0 bottom-[-500px] w-[1px] border-l border-dashed pointer-events-none z-30 opacity-70",
            isLight ? "border-zinc-500" : "border-white/40"
          )}
          style={{ left: `${hoverX}px` }}
        >
          {/* Timestamp tooltip above the ruler */}
          <div className={cn(
            "absolute top-[-22px] -translate-x-1/2 left-[0.5px] text-[8px] px-1 font-mono font-bold rounded shadow-xl leading-none h-4 flex items-center justify-center pointer-events-none select-none border",
            isLight 
              ? "bg-zinc-100 border-zinc-300 text-zinc-800"
              : "bg-[#29292B]/90 border-white/10 text-white/90"
          )}>
            {formatTime(hoverTime)}
          </div>
        </div>
      )}

      {/* Synchronized Playhead Needle (Snappy 60fps, zero CSS transition delay) */}
      <PlayheadNeedle duration={duration} />
    </div>
  );
}

export default Playhead;
