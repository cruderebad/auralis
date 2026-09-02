import { useConfirm } from '../context/ConfirmContext';
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { renderFrame } from '../engine/renderer';
import { Play, Pause, Maximize2, Search, Info, Sliders, Film } from 'lucide-react';
import { cn } from '../lib/utils';
import { get, set } from 'idb-keyval';

export function PreviewCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(105);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Selective store subscriptions to avoid re-rendering entire component on currentTime updates
  const isPlaying = useStore((s) => s.isPlaying);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const videoUrl = useStore((s) => s.videoUrl);
  const resolutionSize = useStore((s) => s.resolutionSize);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const setSelectedClipId = useStore((s) => s.setSelectedClipId);
  const originalVideoMissing = useStore((s) => s.originalVideoMissing);
  const setOriginalVideoMissing = useStore((s) => s.setOriginalVideoMissing);
  const originalVideoFilename = useStore((s) => s.originalVideoFilename);
  const projectId = useStore((s) => s.projectId);
  const setVideoData = useStore((s) => s.setVideoData);
  const canvasBackground = useStore((s) => s.style.canvasBackground || '#000000');
  const timelineResolution = useStore((s) => s.timelineResolution);

  const width = resolutionSize.width;
  const height = resolutionSize.height;

  // Auto resolve video handle on load if permission granted
  useEffect(() => {
    if (originalVideoMissing) {
      const autoResolve = async () => {
        try {
          const idbKey = `video-handle-${projectId}`;
          const handle: any = await get(idbKey);
          if (handle) {
             const permission = await handle.queryPermission({ mode: 'read' });
             if (permission === 'granted') {
                const file = await handle.getFile();
                const url = URL.createObjectURL(file);
                setVideoData(url, file);
                setOriginalVideoMissing(false);
             }
          }
        } catch (e) {
          // ignore
        }
      };
      autoResolve();
    }
  }, [projectId, originalVideoMissing, setVideoData, setOriginalVideoMissing]);

  // Handle ResizeObserver fluid sizing
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

  // Direct render loop subscription: renders canvas at 60fps without triggering React component re-renders
  const isRenderingRef = useRef(false);
  const pendingRenderRef = useRef(false);

  useEffect(() => {
    const renderCurrentState = async () => {
      if (!canvasRef.current || isRenderingRef.current) {
        pendingRenderRef.current = true;
        return;
      }
      isRenderingRef.current = true;
      pendingRenderRef.current = false;

      const state = useStore.getState();
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        const scale = state.timelineResolution === 'low' ? 0.25 : state.timelineResolution === 'medium' ? 0.5 : 1.0;
        const renderWidth = Math.round(state.resolutionSize.width * scale);
        const renderHeight = Math.round(state.resolutionSize.height * scale);
        try {
          await renderFrame(
            ctx,
            state.currentTime,
            state.tracks,
            renderWidth,
            renderHeight,
            state.style,
            false
          );
        } catch (err) {
          console.error('[PreviewCanvas] Error rendering frame:', err);
        }
      }

      isRenderingRef.current = false;
      if (pendingRenderRef.current) {
        pendingRenderRef.current = false;
        renderCurrentState();
      }
    };

    // Render immediately on mount / dimensions change
    renderCurrentState();

    // Subscribe to store updates for continuous or scrubbed updates
    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (
        state.currentTime !== prevState.currentTime ||
        state.tracks !== prevState.tracks ||
        state.style !== prevState.style ||
        state.timelineResolution !== prevState.timelineResolution ||
        state.resolutionSize !== prevState.resolutionSize
      ) {
        renderCurrentState();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [width, height, timelineResolution]);

  // Click handler to select and drag text elements
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * width;
    const clickY = ((e.clientY - rect.top) / rect.height) * height;

    const state = useStore.getState();
    const activeClips = state.tracks
      .flatMap((t) => t.clips)
      .filter((c) => state.currentTime >= c.start && state.currentTime <= c.end);

    let foundClipId: string | null = null;
    for (const clip of activeClips) {
      if (clip.type === 'text') {
        const centerX = clip.x + width / 2;
        const centerY = clip.y + height / 2;
        const halfW = clip.width / 2;
        const halfH = clip.height / 2 || 100;

        if (
          clickX >= centerX - halfW &&
          clickX <= centerX + halfW &&
          clickY >= centerY - halfH &&
          clickY <= centerY + halfH
        ) {
          foundClipId = clip.id;
          break;
        }
      }
    }
    setSelectedClipId(foundClipId);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col bg-[#1A1A1A] select-none text-[#b3b3b3] overflow-hidden">
      {/* Workspace Header Ruler bar */}
      <div className="hidden md:flex h-7 w-full bg-[#121212] border-b border-white/5 items-end justify-between px-4 shrink-0 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-auralis/80 font-mono font-bold tracking-tight">MONITOR COMPOSITION</span>
          <span className="text-[9px] text-[#555] font-mono">|</span>
          <span className="text-[9px] text-white/40 font-mono">Real-Time Sync active</span>
        </div>
        <span className="text-[9px] font-mono text-[#555]">{width} × {height} (H.264)</span>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Workspace Canvas Area */}
        <div className="flex-1 relative overflow-auto p-3 flex items-center justify-center bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:24px_24px]">
          <div
            id="preview-viewport-wrapper"
            onClick={handleCanvasClick}
            className={cn(
              "relative shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-all duration-300 group overflow-hidden border border-white/10"
            )}
            style={{
              backgroundColor: canvasBackground,
              height: containerSize.height ? `${(containerSize.height - 72) * (zoom / 100)}px` : '480px',
              aspectRatio: `${width}/${height}`,
              maxHeight: '98%',
              // Sub visual checkerboard for transparent canvas overlays
              backgroundImage: !videoUrl ? 'linear-gradient(45deg, #1b1b1b 25%, transparent 25%), linear-gradient(-45deg, #1b1b1b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b1b1b 75%), linear-gradient(-45deg, transparent 75%, #1b1b1b 75%)' : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }}
          >
            {/* Unified 2D rendering tag */}
            <canvas
              ref={canvasRef}
              width={Math.round(width * (timelineResolution === 'low' ? 0.25 : timelineResolution === 'medium' ? 0.5 : 1.0))}
              height={Math.round(height * (timelineResolution === 'low' ? 0.25 : timelineResolution === 'medium' ? 0.5 : 1.0))}
              className="w-full h-full object-contain block pointer-events-none image-render-auto"
            />

            {/* Floating click play icon overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePlay();
                }}
                className="w-16 h-16 bg-white/10 backdrop-blur-md hover:bg-white/20 hover:scale-105 active:scale-95 text-white rounded-full flex items-center justify-center border border-white/20 pointer-events-auto shadow-2xl transition-all"
              >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>
            </div>

            {/* Guidelines for visual centering */}
            {selectedClipId && (
              <div className="absolute inset-0 pointer-events-none border border-dashed border-auralis/60 z-50">
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-auralis/20" />
                <div className="absolute top-1/2 left-0 right-0 border-t border-auralis/20" />
              </div>
            )}
            
            {/* Missing Video Overlay */}
            {originalVideoMissing && (
              <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center border border-dashed border-auralis/50">
                <div className="w-16 h-16 bg-auralis/20 rounded-full flex items-center justify-center text-auralis mb-4">
                  <Film size={32} />
                </div>
                <h3 className="text-white font-bold mb-2">Original Video Missing</h3>
                <p className="text-white/60 text-xs mb-6 max-w-sm">
                  We saved your project settings and captions, but local video files aren't permanently stored on our servers. Please locate the original file to continue editing.
                  {originalVideoFilename && (
                    <span className="block mt-2 font-mono text-auralis/80 text-[10px] break-all bg-black/40 p-1.5 rounded">
                      {originalVideoFilename}
                    </span>
                  )}
                </p>
                <div className="flex flex-col gap-3 items-center">
                  <button 
                    className="bg-auralis hover:brightness-110 active:scale-95 transition-all text-black font-bold px-6 py-3 rounded-lg text-xs uppercase tracking-wider relative group cursor-pointer"
                  >
                    <span>Locate Original Video</span>
                    <input 
                      type="file" 
                      accept="video/*,audio/*" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setVideoData(url, file);
                          setOriginalVideoMissing(false);
                        }
                      }}
                    />
                  </button>
                  <button
                    onClick={() => setOriginalVideoMissing(false)}
                    className="text-white/50 hover:text-white transition-colors text-xs font-medium px-4 py-2"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hidden video element resides here to stream frames directly */}
        {videoUrl && (
          <video
            id="preview-video"
            src={videoUrl}
            className="hidden"
            crossOrigin="anonymous"
            playsInline
            preload="auto"
          />
        )}
      </div>

      {/* Control overlay footer */}
      <div className="h-10 w-full bg-[#121212] border-t border-white/5 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-1.5 bg-[#1B1B1B] border border-white/5 px-2 py-1 rounded-md text-[10px] font-mono">
          <span className="text-auralis font-bold">MONITOR MODE:</span>
          <span className="text-white/60">Unified Canvas Engine</span>
        </div>

        {/* Workspace Zoom Control slider */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setZoom(prev => Math.max(20, prev - 10))}
            className="text-white/50 hover:text-white transition-colors p-1"
          >
            <Search size={12} className="rotate-90" />
          </button>
          <input 
            type="range" 
            min="20" 
            max="120" 
            value={zoom} 
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-20 bg-[#262626] h-1 rounded-full appearance-none accent-auralis cursor-pointer"
          />
          <button 
            onClick={() => setZoom(prev => Math.min(120, prev + 10))}
            className="text-white/50 hover:text-white transition-colors p-1"
          >
            <Search size={12} />
          </button>
          <span className="text-[10px] font-mono text-white/50 min-w-[28px] text-right">{zoom}%</span>
        </div>
      </div>
    </div>
  );
}
export default PreviewCanvas;
