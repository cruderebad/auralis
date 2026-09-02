import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Scissors, Plus, Magnet, Trash2, Video, ZoomIn, ZoomOut } from 'lucide-react';
import { CaptionSegment } from '../../types';
import { formatTime, cn } from '../../lib/utils';
import WaveSurfer from 'wavesurfer.js';

interface TimelineProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  captions: CaptionSegment[];
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onUpdateCaptions: (captions: CaptionSegment[]) => void;
  videoUrl: string | null;
}

export function Timeline({ 
  currentTime, 
  duration, 
  isPlaying, 
  captions, 
  onSeek, 
  onTogglePlay,
  onUpdateCaptions,
  videoUrl
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<{ type: 'move' | 'trim-start' | 'trim-end', id: string, initialX: number, initialStart: number, initialEnd: number } | null>(null);
  const [zoom, setZoom] = useState(1); 
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapLine, setSnapLine] = useState<number | null>(null);

  const trackWidth = `${100 * zoom}%`;
  const safeDuration = Math.max(duration, 0.001);

  useEffect(() => {
    if (videoUrl && waveformRef.current) {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }

      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4caf50',
        progressColor: '#4caf50',
        cursorWidth: 0,
        height: 36,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        interact: false, // We handle interactions on the track overlay
      });

      wavesurfer.current.load(videoUrl)
        .catch(err => {
          console.warn('Wavesurfer failed to decode video audio track (expected if silent):', err);
        });

      return () => {
        wavesurfer.current?.destroy();
      };
    }
  }, [videoUrl]);

  // Sync wavesurfer width and zoom manually because it acts as a background
  useEffect(() => {
    if (wavesurfer.current && waveformRef.current && trackRef.current) {
      // Re-draw or zoom could go here if needed
      // Currently simple CSS scaling or layout handles the flex width
    }
  }, [zoom]);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current || duration === 0 || dragAction) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * safeDuration);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!trackRef.current || duration === 0) return;
    
    if (isDragging && !dragAction) {
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      onSeek(percentage * safeDuration);
      return;
    }

    if (dragAction) {
      e.preventDefault();
      const rect = trackRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragAction.initialX;
      let deltaTime = (deltaX / rect.width) * safeDuration;

      // Snapping logic
      if (snappingEnabled) {
        const snapThresholdTime = (10 / rect.width) * safeDuration;
        const snapPoints = [currentTime, 0, duration];
        captions.forEach(c => {
          if (c.id !== dragAction.id) {
            snapPoints.push(c.start, c.end);
          }
        });

        let bestSnap = Infinity;
        let snapDelta = 0;
        const checkSnap = (targetTime: number) => {
          snapPoints.forEach(p => {
            const diff = Math.abs(targetTime - p);
            if (diff < snapThresholdTime && diff < bestSnap) {
              bestSnap = diff;
              snapDelta = p - targetTime;
            }
          });
        };

        if (dragAction.type === 'move') {
          checkSnap(dragAction.initialStart + deltaTime);
          checkSnap(dragAction.initialEnd + deltaTime);
        } else if (dragAction.type === 'trim-start') {
          checkSnap(dragAction.initialStart + deltaTime);
        } else if (dragAction.type === 'trim-end') {
          checkSnap(dragAction.initialEnd + deltaTime);
        }

        if (bestSnap < snapThresholdTime) {
          deltaTime += snapDelta;
          
          if (dragAction.type === 'move') {
            const currentStart = dragAction.initialStart + deltaTime;
            const currentEnd = dragAction.initialEnd + deltaTime;
            setSnapLine(Math.abs(snapDelta) < 0.001 ? (bestSnap === Math.abs(currentStart - (currentStart - snapDelta)) ? currentStart : currentEnd) : null);
            snapPoints.forEach(p => {
              if (Math.abs(currentStart - p) < 0.001 || Math.abs(currentEnd - p) < 0.001) {
                setSnapLine(p);
              }
            });
          } else if (dragAction.type === 'trim-start') {
            setSnapLine(dragAction.initialStart + deltaTime);
          } else if (dragAction.type === 'trim-end') {
            setSnapLine(dragAction.initialEnd + deltaTime);
          }
        } else {
          setSnapLine(null);
        }
      }

      const newCaptions = captions.map(c => {
        if (c.id !== dragAction.id) return c;

        if (dragAction.type === 'move') {
           const clipDuration = dragAction.initialEnd - dragAction.initialStart;
           const newStart = Math.max(0, dragAction.initialStart + deltaTime);
           return { ...c, start: newStart, end: newStart + clipDuration };
        } else if (dragAction.type === 'trim-start') {
          return { ...c, start: Math.min(c.end - 0.1, Math.max(0, dragAction.initialStart + deltaTime)) };
        } else if (dragAction.type === 'trim-end') {
          return { ...c, end: Math.max(c.start + 0.1, Math.min(duration, dragAction.initialEnd + deltaTime)) };
        }
        return c;
      });

      onUpdateCaptions(newCaptions);
    }
  };

  const handleMouseDownSegment = (e: React.MouseEvent, caption: CaptionSegment, type: 'move' | 'trim-start' | 'trim-end') => {
    e.stopPropagation();
    setSelectedId(caption.id);
    setDragAction({
      type,
      id: caption.id,
      initialX: e.clientX,
      initialStart: caption.start,
      initialEnd: caption.end
    });
  };

  const handleRippleDelete = () => {
    if (!selectedId) return;
    const deletedClip = captions.find(c => c.id === selectedId);
    if (!deletedClip) return;

    const clipDuration = deletedClip.end - deletedClip.start;
    const newCaptions = captions
      .filter(c => c.id !== selectedId)
      .map(c => {
        if (c.start > deletedClip.start) {
          return { ...c, start: c.start - clipDuration, end: c.end - clipDuration };
        }
        return c;
      });
    
    onUpdateCaptions(newCaptions);
    setSelectedId(null);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    onUpdateCaptions(captions.filter(c => c.id !== selectedId));
    setSelectedId(null);
  };

  useEffect(() => {
    const handleUp = () => {
      setIsDragging(false);
      setDragAction(null);
      setSnapLine(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (selectedId) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          if (e.shiftKey) {
            handleRippleDelete();
          } else {
            handleDelete();
          }
        }
      }

      if (e.key === 'n' || e.key === 'N') {
        setSnappingEnabled(prev => !prev);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging, dragAction, duration, captions, selectedId, snappingEnabled]);

  return (
    <div className="h-64 bg-[#1e1e20] border-t border-[#333] flex flex-col z-40 select-none text-[#a0a0a0]">
      {/* Timeline Toolbar */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-4">
          <button 
            onClick={onTogglePlay}
            className="text-white hover:text-auralis transition-colors"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider">
            <span className="text-auralis font-bold">{formatTime(currentTime)}</span>
            <span className="opacity-30">|</span>
            <span className="opacity-50">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 border-r border-[#333] pr-4">
            <button 
              className={cn("p-1.5 rounded transition-colors", snappingEnabled ? "text-auralis bg-auralis/10" : "hover:bg-[#38383a]")}
              onClick={() => setSnappingEnabled(!snappingEnabled)}
              title="Snapping (N)"
            >
              <Magnet size={14} />
            </button>
            <button 
              className={cn("p-1.5 rounded hover:bg-[#38383a] transition-colors", selectedId && "text-red-400")}
              onClick={handleDelete}
              disabled={!selectedId}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
            <button 
              className={cn("p-1.5 rounded hover:bg-[#38383a] transition-colors", selectedId && "text-red-400")}
              onClick={handleRippleDelete}
              disabled={!selectedId}
              title="Ripple Delete (Shift+Backspace)"
            >
              <div className="flex flex-col items-center leading-none">
                <Trash2 size={14} />
                <span className="text-[6px] font-bold mt-0.5">RIPPLE</span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 border-r border-[#333]">
            <ZoomOut size={14} className={cn(zoom <= 1 && "opacity-20")} />
            <input 
              type="range" 
              min="1" 
              max="10" 
              step="0.1" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 accent-auralis h-1"
            />
            <ZoomIn size={14} className={cn(zoom >= 10 && "opacity-20")} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Track Labels Backgrounds */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-[#252526] z-50 border-r border-[#333] flex flex-col">
          <div className="h-6 border-b border-[#333] bg-[#2d2d2d]" />
          <div className="h-12 border-b border-[#333] flex items-center justify-center tracking-tighter font-bold text-[10px]">T1</div>
          <div className="h-12 border-b border-[#333] flex items-center justify-center tracking-tighter font-bold text-[10px]">V1</div>
          <div className="h-12 border-b border-[#333] flex items-center justify-center tracking-tighter font-bold text-[10px]">A1</div>
        </div>

        <div ref={containerRef} className="flex-1 relative overflow-x-auto overflow-y-hidden custom-scrollbar ml-8">
          <div 
            ref={trackRef}
            className="h-full relative min-w-full bg-[#1e1e20]"
            style={{ width: trackWidth }}
            onMouseDown={(e) => { if (e.button === 0) setIsDragging(true); }}
            onClick={handleTrackClick}
          >
            {/* Ruler */}
            <div className="h-6 border-b border-[#333] relative bg-[#2d2d2d] overflow-hidden pointer-events-none">
              {Array.from({ length: Math.ceil(10 * Math.max(1, zoom)) + 1 }).map((_, i) => {
                const time = (i / (10 * Math.max(1, zoom))) * duration;
                const isMajor = i % 2 === 0;
                return (
                  <div 
                    key={i} 
                    className={cn(
                      "absolute top-0 bottom-0 border-l border-[#444] transition-opacity",
                      !isMajor && "h-1.5 opacity-50",
                      isMajor && "h-3"
                    )}
                    style={{ left: `${(time / safeDuration) * 100}%` }}
                  >
                    {isMajor && (
                      <span className="text-[8px] pl-1 pt-1 font-mono text-[#666]">
                        {formatTime(time).split('.')[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none mt-6">
              <div className="h-12 border-b border-[#333]/50" />
              <div className="h-12 border-b border-[#333]/50" />
              <div className="h-12 border-b border-[#333]/50" />
            </div>

            <div className="relative pt-0 flex flex-col z-10">
              {/* Subtitles Track (T1) */}
              <div className="h-12 relative flex items-center">
                {captions.map((caption) => (
                  <div
                    key={caption.id}
                    className={cn(
                      "absolute h-9 bg-[#c4c4a4] border border-[#a4a484] rounded-[2px] flex items-center overflow-hidden cursor-move group/clip transition-colors",
                      currentTime >= caption.start && currentTime <= caption.end && "bg-[#d4d4b8] z-20",
                      selectedId === caption.id && "ring-2 ring-auralis border-auralis z-30"
                    )}
                    style={{
                      left: `${(caption.start / safeDuration) * 100}%`,
                      width: `${((caption.end - caption.start) / safeDuration) * 100}%`,
                      minWidth: '54px'
                    }}
                    onMouseDown={(e) => handleMouseDownSegment(e, caption, 'move')}
                  >
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-2 hover:bg-black/10 cursor-col-resize z-10"
                      onMouseDown={(e) => handleMouseDownSegment(e, caption, 'trim-start')}
                    />
                    <span 
                      className="px-1 text-[10px] font-bold text-black/80 truncate w-full text-center select-none uppercase tracking-tighter cursor-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        // Double click could trigger edit later
                      }}
                    >
                      {caption.text}
                    </span>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-2 hover:bg-black/10 cursor-col-resize z-10"
                      onMouseDown={(e) => handleMouseDownSegment(e, caption, 'trim-end')}
                    />
                  </div>
                ))}
              </div>

              {/* Video Track (V1) */}
              <div className="h-12 relative flex items-center opacity-80 pointer-events-none">
                {videoUrl && duration > 0 && (
                  <div 
                    className="absolute h-9 bg-[#4a7298] border border-[#3b5d7d] rounded-[2px] flex items-center px-3 overflow-hidden shadow-inner"
                    style={{ left: '0', width: '100%' }}
                  >
                    <Video size={10} className="text-white/50 mr-2 shrink-0" />
                    <span className="text-[9px] font-bold text-white/70 truncate">video_track_01</span>
                    {/* Simulated filmstrip frames could go here */}
                  </div>
                )}
              </div>

              {/* Audio Track (A1) */}
              <div className="h-12 relative flex items-center opacity-80 pointer-events-none overflow-hidden">
                {videoUrl && duration > 0 && (
                  <div 
                    className="absolute h-9 bg-[#2a4d3a] border border-[#1e3b2b] rounded-[2px] w-full"
                  >
                    {/* Real Waveform via WaveSurfer */}
                    <div ref={waveformRef} className="w-full h-full opacity-60" />
                  </div>
                )}
              </div>
            </div>

            {/* Playhead (Line) */}
            <div 
              className="absolute top-0 bottom-0 w-[1px] bg-auralis z-40 pointer-events-none"
              style={{ left: `${(currentTime / safeDuration) * 100}%` }}
            >
              <div className="absolute top-0 left-[-7px] w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px] border-t-auralis drop-shadow-md" />
            </div>

            {/* Snapping Line Indicator */}
            {snapLine !== null && (
              <div 
                className="absolute top-0 bottom-0 w-[1px] bg-yellow-400/50 z-30 pointer-events-none"
                style={{ left: `${(snapLine / safeDuration) * 100}%` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

