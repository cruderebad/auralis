import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useStore } from '../store';
import { 
  Play, 
  Pause, 
  Scissors, 
  Trash2, 
  Plus, 
  Volume2, 
  VolumeX, 
  Lock, 
  Unlock, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Magnet, 
  Settings2, 
  Copy, 
  HelpCircle, 
  RotateCcw, 
  RotateCw, 
  SkipBack, 
  SkipForward, 
  Type, 
  Film, 
  Music, 
  Layers, 
  MapPin, 
  SlidersHorizontal,
  Bookmark,
  ChevronDown,
  Check
} from 'lucide-react';
import { cn, formatTime } from '../lib/utils';
import { Playhead } from './Playhead';
import { TimelineClip, TimelineTrack, ClipType } from '../types/timeline';
import { TimelineMiniMap } from './timeline/TimelineMiniMap';
import { AudioWaveformVisualizer } from './timeline/AudioWaveformVisualizer';
import { ClipQuickToolbar } from './timeline/ClipQuickToolbar';
import { KeyboardShortcutsModal } from './timeline/KeyboardShortcutsModal';

const TimelineTimecodeDisplay = memo(function TimelineTimecodeDisplay({ duration, fps, isLight }: { duration: number; fps: number; isLight: boolean }) {
  const currentTime = useStore((s) => s.currentTime);
  const currentFrame = Math.floor(currentTime * fps);

  return (
    <div className={cn(
      "flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold shadow-xs select-none",
      isLight ? "bg-white border-zinc-200 text-zinc-800" : "bg-[#1C1C1F] border-white/10 text-auralis"
    )}>
      <span>{formatTime(currentTime)}</span>
      <span className="opacity-40">/</span>
      <span className="opacity-60">{formatTime(duration)}</span>
      <span className={cn("text-[9px] px-1 py-0.2 rounded font-normal ml-1 hidden md:inline", isLight ? "bg-zinc-100 text-zinc-500" : "bg-black/40 text-zinc-400")}>
        F{currentFrame}
      </span>
    </div>
  );
});

export function Timeline() {
  const tracks = useStore((s) => s.tracks);
  const duration = useStore((s) => s.duration || 10);
  const zoom = useStore((s) => s.zoom);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const isPlaying = useStore((s) => s.isPlaying);
  const snappingEnabled = useStore((s) => s.snappingEnabled);
  const theme = useStore((s) => s.theme);
  const fps = useStore((s) => s.fps || 30);
  const playbackSpeed = useStore((s) => s.playbackSpeed || 1.0);
  const [videoTrackHeight, setVideoTrackHeight] = useState(80);
  const [audioTrackHeight, setAudioTrackHeight] = useState(70);
  const timelineResolution = useStore((s) => s.timelineResolution);

  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const splitClip = useStore((s) => s.splitClip);
  const removeClip = useStore((s) => s.removeClip);
  const duplicateClip = useStore((s) => s.duplicateClip);
  const addMarker = useStore((s) => s.addMarker);
  const setSnappingEnabled = useStore((s) => s.setSnappingEnabled);
  const setZoom = useStore((s) => s.setZoom);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setSelectedClipId = useStore((s) => s.setSelectedClipId);
  const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed);
  const addTrack = useStore((s) => s.addTrack);
  const removeTrack = useStore((s) => s.removeTrack);
  const renameTrack = useStore((s) => s.renameTrack);
  const toggleTrackLock = useStore((s) => s.toggleTrackLock);
  const toggleTrackSolo = useStore((s) => s.toggleTrackSolo);
  const setTracks = useStore((s) => s.setTracks);
  const updateClip = useStore((s) => s.updateClip);
  const addClip = useStore((s) => s.addClip);
  const setTimelineResolution = useStore((s) => s.setTimelineResolution);
  const pushHistory = useStore((s) => s.pushHistory);

  const trackContainerRef = useRef<HTMLDivElement>(null);
  const timelineRootRef = useRef<HTMLDivElement>(null);

  // Local interaction states
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'trim-start' | 'trim-end' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [initialClipState, setInitialClipState] = useState<{ start: number; end: number; duration: number } | null>(null);
  const [snapIndicatorTime, setSnapIndicatorTime] = useState<number | null>(null);

  // Menus & Modals
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState<string>('');

  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';

  // Track Zoom Multiplier
  const trackZoomMultiplier = 1 + zoom * 4;
  const trackWidthPercent = `${trackZoomMultiplier * 100}%`;

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      const storeState = useStore.getState();

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!storeState.isPlaying);
        return;
      }

      // S: Split selected clip at playhead
      if (e.key === 's' || e.key === 'S') {
        if (storeState.selectedClipId) {
          e.preventDefault();
          splitClip(storeState.selectedClipId, storeState.currentTime);
        }
        return;
      }

      // M: Add marker at playhead
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        addMarker(storeState.currentTime);
        return;
      }

      // N: Toggle Snapping
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setSnappingEnabled(!storeState.snappingEnabled);
        return;
      }

      // ?: Help Modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
        return;
      }

      // Delete / Backspace: Remove selected clip
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (storeState.selectedClipId) {
          e.preventDefault();
          removeClip(storeState.selectedClipId);
        }
        return;
      }

      // Ctrl+D or Cmd+D: Duplicate selected clip
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (storeState.selectedClipId) {
          e.preventDefault();
          duplicateClip(storeState.selectedClipId);
        }
        return;
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) || 
          ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y'))) {
        e.preventDefault();
        redo();
        return;
      }

      // Arrow navigation: frame stepping
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : (1 / (storeState.fps || 30));
        setCurrentTime(Math.max(0, storeState.currentTime - step));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : (1 / (storeState.fps || 30));
        setCurrentTime(Math.min(storeState.duration || 10, storeState.currentTime + step));
        return;
      }

      // Home / End
      if (e.key === 'Home') {
        e.preventDefault();
        setCurrentTime(0);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        setCurrentTime(storeState.duration || 10);
        return;
      }

      // Zoom keys: + and -
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(Math.min(1, storeState.zoom + 0.1));
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(Math.max(0, storeState.zoom - 0.1));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsPlaying, splitClip, addMarker, setSnappingEnabled, removeClip, duplicateClip, undo, redo, setCurrentTime, setZoom]);

  // Find currently selected clip object
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const t of tracks) {
      const c = t.clips.find(clip => clip.id === selectedClipId);
      if (c) return c;
    }
    return null;
  }, [tracks, selectedClipId]);

  // Calculate track height
  const getTrackHeight = (track: TimelineTrack) => {
    if (track.type === 'video') return videoTrackHeight;
    if (track.type === 'audio') return audioTrackHeight;
    if (track.type === 'text') return 60;
    return 65; // overlay/graphics
  };

  // Track Color theme
  const getTrackColor = (type: ClipType) => {
    switch (type) {
      case 'video':
        return isLight ? 'bg-blue-500/90 border-blue-600 text-white' : 'bg-blue-600/80 border-blue-500/50 text-white';
      case 'audio':
        return isLight ? 'bg-emerald-500/90 border-emerald-600 text-white' : 'bg-emerald-600/80 border-emerald-500/50 text-white';
      case 'text':
        return isLight ? 'bg-amber-500/90 border-amber-600 text-white' : 'bg-amber-600/80 border-amber-500/50 text-white';
      case 'image':
      case 'overlay':
        return isLight ? 'bg-purple-500/90 border-purple-600 text-white' : 'bg-purple-600/80 border-purple-500/50 text-white';
      default:
        return isLight ? 'bg-zinc-200 border-zinc-300 text-zinc-900' : 'bg-zinc-800 border-zinc-700 text-white';
    }
  };

  // Drag & Trim interactions
  const handlePointerDownClip = (
    e: React.PointerEvent<HTMLDivElement>, 
    clip: TimelineClip, 
    mode: 'move' | 'trim-start' | 'trim-end',
    trackLocked?: boolean
  ) => {
    if (trackLocked) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    setDraggingClipId(clip.id);
    setDragMode(mode);
    setDragStartX(e.clientX);
    setInitialClipState({ start: clip.start, end: clip.end, duration: clip.end - clip.start });
    setSelectedClipId(clip.id);
  };

  const handlePointerMoveClip = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingClipId || !dragMode || !initialClipState || !trackContainerRef.current) return;

    const rect = trackContainerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartX;
    const deltaTime = (deltaX / rect.width) * duration;

    let targetStart = initialClipState.start;
    let targetEnd = initialClipState.end;

    const storeState = useStore.getState();

    if (dragMode === 'move') {
      targetStart = Math.max(0, initialClipState.start + deltaTime);
      targetEnd = targetStart + initialClipState.duration;

      if (snappingEnabled) {
        const thresholdSeconds = (12 / rect.width) * duration;
        const snappedStart = storeState.snappedTime(targetStart, thresholdSeconds, draggingClipId);
        if (Math.abs(snappedStart - targetStart) < thresholdSeconds) {
          targetStart = snappedStart;
          targetEnd = targetStart + initialClipState.duration;
          setSnapIndicatorTime(targetStart);
        } else {
          const snappedEnd = storeState.snappedTime(targetEnd, thresholdSeconds, draggingClipId);
          if (Math.abs(snappedEnd - targetEnd) < thresholdSeconds) {
            targetEnd = snappedEnd;
            targetStart = targetEnd - initialClipState.duration;
            setSnapIndicatorTime(targetEnd);
          } else {
            setSnapIndicatorTime(null);
          }
        }
      } else {
        setSnapIndicatorTime(null);
      }

      updateClip(draggingClipId, { start: targetStart, end: targetEnd }, false);
    } else if (dragMode === 'trim-start') {
      targetStart = Math.max(0, Math.min(initialClipState.end - 0.2, initialClipState.start + deltaTime));
      if (snappingEnabled) {
        const thresholdSeconds = (12 / rect.width) * duration;
        const snappedStart = storeState.snappedTime(targetStart, thresholdSeconds, draggingClipId);
        if (Math.abs(snappedStart - targetStart) < thresholdSeconds) {
          targetStart = snappedStart;
          setSnapIndicatorTime(targetStart);
        } else {
          setSnapIndicatorTime(null);
        }
      } else {
        setSnapIndicatorTime(null);
      }
      updateClip(draggingClipId, { start: targetStart }, false);
    } else if (dragMode === 'trim-end') {
      targetEnd = Math.max(initialClipState.start + 0.2, initialClipState.end + deltaTime);
      if (snappingEnabled) {
        const thresholdSeconds = (12 / rect.width) * duration;
        const snappedEnd = storeState.snappedTime(targetEnd, thresholdSeconds, draggingClipId);
        if (Math.abs(snappedEnd - targetEnd) < thresholdSeconds) {
          targetEnd = snappedEnd;
          setSnapIndicatorTime(targetEnd);
        } else {
          setSnapIndicatorTime(null);
        }
      } else {
        setSnapIndicatorTime(null);
      }
      updateClip(draggingClipId, { end: targetEnd }, false);
    }
  };

  const handlePointerUpClip = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingClipId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingClipId(null);
      setDragMode(null);
      setInitialClipState(null);
      setSnapIndicatorTime(null);
      pushHistory();
    }
  };

  // Track click to seek
  const handleTrackClickToSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackContainerRef.current) return;
    const rect = trackContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTime(pct * duration);
  };

  // Add clip to specific track at playhead
  const handleAddClipToTrack = (trackId: string, trackType: ClipType) => {
    const storeState = useStore.getState();
    const cTime = storeState.currentTime;
    const defaultClipDuration = Math.min(5, duration - cTime);
    const start = cTime;
    const end = start + (defaultClipDuration > 0.5 ? defaultClipDuration : 3);

    let newClipData: any = {
      id: `${trackType}-${Date.now().toString(36)}`,
      type: trackType,
      start,
      end,
      duration: end - start,
      sourceStart: 0,
      sourceEnd: end - start,
      layer: 1,
      opacity: 1,
      visible: true,
      muted: false,
      x: 0,
      y: 0,
      width: storeState.resolutionSize.width,
      height: storeState.resolutionSize.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      playbackRate: 1
    };

    if (trackType === 'text') {
      newClipData.textFields = {
        text: 'NEW CAPTION',
        style: storeState.style
      };
    }

    addClip(trackId, newClipData);
    setSelectedClipId(newClipData.id);
  };

  // Add new custom track
  const handleCreateNewTrack = (type: 'video' | 'audio' | 'text' | 'overlay') => {
    const trackName = `${type.charAt(0).toUpperCase() + type.slice(1)} ${tracks.filter(t => t.type === type).length + 1}`;
    const newTrackId = addTrack(type, trackName);
    setIsAddMenuOpen(false);
    handleAddClipToTrack(newTrackId, type);
  };

  // Zoom to fit
  const handleZoomToFit = () => {
    setZoom(0);
  };

  // Frame stepping
  const handleStepFrame = (frames: number) => {
    const delta = frames / fps;
    const storeState = useStore.getState();
    setCurrentTime(Math.max(0, Math.min(duration, storeState.currentTime + delta)));
  };

  // Playback speeds cycle
  const speeds = [0.5, 1.0, 1.5, 2.0];
  const handleCycleSpeed = () => {
    const currentIdx = speeds.indexOf(playbackSpeed || 1.0);
    const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
  };

  // Inline track renaming
  const handleStartRenameTrack = (track: TimelineTrack) => {
    setEditingTrackId(track.id);
    setEditingTrackName(track.name);
  };

  const handleFinishRenameTrack = (trackId: string) => {
    if (editingTrackName.trim()) {
      renameTrack(trackId, editingTrackName);
    }
    setEditingTrackId(null);
  };

  const visibleTracks = tracks.filter(t => t.visible);

  return (
    <div 
      ref={timelineRootRef}
      className={cn(
        "flex-1 flex flex-col min-h-0 select-none transition-colors duration-200 relative",
        isLight ? "bg-white text-zinc-800" : "bg-[#0E0E10] text-zinc-100"
      )}
    >
      {/* 1. Header Toolbar (Playback & Precision Transport) */}
      <div className={cn(
        "h-12 px-3 border-b flex items-center justify-between gap-2 shrink-0 z-30 transition-colors shadow-xs",
        isLight ? "bg-zinc-100/90 border-zinc-200" : "bg-[#141416] border-white/5"
      )}>
        {/* Left Section: Playback Engine Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Jump to start */}
          <button
            onClick={() => setCurrentTime(0)}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              isLight ? "hover:bg-zinc-200 text-zinc-600 active:scale-95" : "hover:bg-white/10 text-zinc-400 hover:text-white active:scale-95"
            )}
            title="Jump to Start (Home)"
          >
            <SkipBack size={14} />
          </button>

          {/* Previous Frame */}
          <button
            onClick={() => handleStepFrame(-1)}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              isLight ? "hover:bg-zinc-200 text-zinc-600 active:scale-95" : "hover:bg-white/10 text-zinc-400 hover:text-white active:scale-95"
            )}
            title="Previous Frame (←)"
          >
            <RotateCcw size={13} />
          </button>

          {/* Master Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-auralis text-black font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause size={15} className="fill-black" /> : <Play size={15} className="fill-black ml-0.5" />}
          </button>

          {/* Next Frame */}
          <button
            onClick={() => handleStepFrame(1)}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              isLight ? "hover:bg-zinc-200 text-zinc-600 active:scale-95" : "hover:bg-white/10 text-zinc-400 hover:text-white active:scale-95"
            )}
            title="Next Frame (→)"
          >
            <RotateCw size={13} />
          </button>

          {/* Jump to end */}
          <button
            onClick={() => setCurrentTime(duration)}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              isLight ? "hover:bg-zinc-200 text-zinc-600 active:scale-95" : "hover:bg-white/10 text-zinc-400 hover:text-white active:scale-95"
            )}
            title="Jump to End (End)"
          >
            <SkipForward size={14} />
          </button>

          {/* Precision Timecode Display (Memoized Subscribed Component) */}
          <TimelineTimecodeDisplay duration={duration} fps={fps} isLight={isLight} />

          {/* Playback Speed Pill */}
          <button
            onClick={handleCycleSpeed}
            className={cn(
              "px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer hover:border-auralis/40",
              isLight ? "bg-white border-zinc-200 text-zinc-700" : "bg-[#1C1C1F] border-white/10 text-zinc-300"
            )}
            title="Playback Speed (Click to cycle)"
          >
            {playbackSpeed || 1.0}x
          </button>
        </div>

        {/* Center Section: Clip Action Tools */}
        <div className="flex items-center gap-1">
          {/* Split at Playhead */}
          <button
            onClick={() => {
              if (selectedClipId) {
                const cTime = useStore.getState().currentTime;
                splitClip(selectedClipId, cTime);
              }
            }}
            disabled={!selectedClipId}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
              selectedClipId 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20 active:scale-95" 
                : "opacity-40 cursor-not-allowed border-transparent text-zinc-400"
            )}
            title="Split Selected Clip (S)"
          >
            <Scissors size={13} />
            <span className="hidden sm:inline">Split</span>
          </button>

          {/* Duplicate Clip */}
          <button
            onClick={() => {
              if (selectedClipId) {
                duplicateClip(selectedClipId);
              }
            }}
            disabled={!selectedClipId}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer hidden md:flex",
              selectedClipId 
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 active:scale-95" 
                : "opacity-40 cursor-not-allowed border-transparent text-zinc-400"
            )}
            title="Duplicate Selected Clip (Ctrl+D)"
          >
            <Copy size={13} />
            <span>Duplicate</span>
          </button>

          {/* Delete Clip */}
          <button
            onClick={() => {
              if (selectedClipId) {
                removeClip(selectedClipId);
              }
            }}
            disabled={!selectedClipId}
            className={cn(
              "p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer",
              selectedClipId 
                ? "hover:bg-red-500/15 border-red-500/30 text-red-400 active:scale-95" 
                : "opacity-40 cursor-not-allowed border-transparent text-zinc-400"
            )}
            title="Delete Selected Clip (Del)"
          >
            <Trash2 size={13} />
          </button>

          {/* Add Marker */}
          <button
            onClick={() => {
              const cTime = useStore.getState().currentTime;
              addMarker(cTime);
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer hidden lg:flex",
              isLight ? "hover:bg-zinc-200 text-zinc-600" : "hover:bg-white/10 text-zinc-400 hover:text-auralis"
            )}
            title="Add Timeline Marker (M)"
          >
            <Bookmark size={14} />
          </button>

          {/* Snapping Magnet Toggle */}
          <button
            onClick={() => setSnappingEnabled(!snappingEnabled)}
            className={cn(
              "p-1.5 rounded-lg border transition-all cursor-pointer",
              snappingEnabled 
                ? "bg-auralis/15 border-auralis/40 text-auralis shadow-xs" 
                : isLight ? "bg-white border-zinc-200 text-zinc-400" : "bg-[#1C1C1F] border-white/5 text-zinc-500"
            )}
            title={`Magnet Snapping: ${snappingEnabled ? 'Enabled' : 'Disabled'} (N)`}
          >
            <Magnet size={13} />
          </button>

          {/* MiniMap Toggle */}
          <button
            onClick={() => setShowMiniMap(!showMiniMap)}
            className={cn(
              "p-1.5 rounded-lg border transition-all cursor-pointer hidden xl:flex",
              showMiniMap 
                ? "bg-auralis/15 border-auralis/40 text-auralis" 
                : isLight ? "bg-white border-zinc-200 text-zinc-400" : "bg-[#1C1C1F] border-white/5 text-zinc-500"
            )}
            title="Toggle Mini-Map Overview"
          >
            <MapPin size={13} />
          </button>
        </div>

        {/* Right Section: Add Track Menu, Zoom Controls & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Add Track / Layer Dropdown */}
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                isLight ? "bg-zinc-200/80 hover:bg-zinc-300/80 border-zinc-300 text-zinc-800" : "bg-[#1C1C1F] hover:bg-white/10 border-white/10 text-zinc-200"
              )}
            >
              <Plus size={13} className="text-auralis" />
              <span className="hidden sm:inline">Add Track</span>
              <ChevronDown size={11} className="opacity-60" />
            </button>

            {isAddMenuOpen && (
              <div className={cn(
                "absolute right-0 top-full mt-1.5 w-44 rounded-xl border shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95",
                isLight ? "bg-white border-zinc-200 text-zinc-800" : "bg-[#18181B] border-white/10 text-zinc-200"
              )}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider opacity-40">
                  Select Track Type
                </div>
                <button
                  onClick={() => handleCreateNewTrack('video')}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-blue-500/10 hover:text-blue-400 transition-colors text-left"
                >
                  <Film size={13} className="text-blue-400" />
                  <span>Video Track</span>
                </button>
                <button
                  onClick={() => handleCreateNewTrack('audio')}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors text-left"
                >
                  <Music size={13} className="text-emerald-400" />
                  <span>Audio Track</span>
                </button>
                <button
                  onClick={() => handleCreateNewTrack('text')}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-amber-500/10 hover:text-amber-400 transition-colors text-left"
                >
                  <Type size={13} className="text-amber-400" />
                  <span>Captions Track</span>
                </button>
                <button
                  onClick={() => handleCreateNewTrack('overlay')}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-purple-500/10 hover:text-purple-400 transition-colors text-left"
                >
                  <Layers size={13} className="text-purple-400" />
                  <span>Graphic Overlay</span>
                </button>
              </div>
            )}
          </div>

          {/* Timeline Zoom Slider Controls */}
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg border",
            isLight ? "bg-zinc-200/50 border-zinc-300" : "bg-[#18181B] border-white/5"
          )}>
            <button
              onClick={() => setZoom(Math.max(0, zoom - 0.1))}
              className="p-1 hover:text-auralis transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut size={12} />
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-14 sm:w-20 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-auralis"
              title={`Zoom: ${Math.round(zoom * 100)}%`}
            />

            <button
              onClick={() => setZoom(Math.min(1, zoom + 0.1))}
              className="p-1 hover:text-auralis transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn size={12} />
            </button>

            <button
              onClick={handleZoomToFit}
              className="p-1 hover:text-auralis transition-colors cursor-pointer ml-0.5 border-l border-zinc-500/30 pl-1.5"
              title="Fit Timeline to Viewport"
            >
              <Maximize2 size={11} />
            </button>
          </div>

          {/* Timeline Display Settings Gear */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
              className={cn(
                "p-1.5 rounded-lg border transition-all cursor-pointer",
                isSettingsMenuOpen 
                  ? "bg-auralis/20 border-auralis/40 text-auralis" 
                  : isLight ? "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-200" : "bg-[#1C1C1F] border-white/5 text-zinc-400 hover:text-white"
              )}
              title="Timeline Display Settings"
            >
              <Settings2 size={13} />
            </button>

            {isSettingsMenuOpen && (
              <div className={cn(
                "absolute right-0 top-full mt-1.5 w-56 rounded-xl border shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95",
                isLight ? "bg-white border-zinc-200 text-zinc-800" : "bg-[#18181B] border-white/10 text-zinc-200"
              )}>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-40 mb-2">
                  Timeline Settings
                </div>

                {/* Track Height Presets */}
                <div className="space-y-1 mb-3">
                  <span className="text-[11px] font-medium opacity-70 block mb-1">Track Density</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'compact', label: 'Compact', vh: 60, ah: 50 },
                      { id: 'standard', label: 'Standard', vh: 80, ah: 70 },
                      { id: 'tall', label: 'Expanded', vh: 110, ah: 95 }
                    ].map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setVideoTrackHeight(preset.vh);
                          setAudioTrackHeight(preset.ah);
                        }}
                        className={cn(
                          "py-1 text-[10px] font-semibold rounded-md border text-center transition-colors",
                          videoTrackHeight === preset.vh
                            ? "bg-auralis/20 border-auralis text-auralis"
                            : isLight ? "bg-zinc-100 border-zinc-200 hover:bg-zinc-200" : "bg-white/5 border-white/5 hover:bg-white/10"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Performance Resolution */}
                <div className="space-y-1">
                  <span className="text-[11px] font-medium opacity-70 block mb-1">Preview Playback Resolution</span>
                  <div className="grid grid-cols-3 gap-1">
                    {['low', 'medium', 'high'].map(res => (
                      <button
                        key={res}
                        onClick={() => setTimelineResolution(res as any)}
                        className={cn(
                          "py-1 text-[10px] font-semibold uppercase rounded-md border text-center transition-colors",
                          timelineResolution === res
                            ? "bg-auralis/20 border-auralis text-auralis"
                            : isLight ? "bg-zinc-100 border-zinc-200 hover:bg-zinc-200" : "bg-white/5 border-white/5 hover:bg-white/10"
                        )}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Help shortcuts button */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className={cn(
              "p-1.5 rounded-lg border transition-all cursor-pointer hidden sm:flex",
              isLight ? "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-200" : "bg-[#1C1C1F] border-white/5 text-zinc-400 hover:text-white"
            )}
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle size={13} />
          </button>
        </div>
      </div>

      {/* 2. Timeline Mini-Map Overview (Collapsible) */}
      {showMiniMap && <TimelineMiniMap isLight={isLight} />}

      {/* 3. Floating Quick Toolbar for Selected Clip */}
      {selectedClip && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40">
          <ClipQuickToolbar
            clip={selectedClip}
            isLight={isLight}
            onSplit={() => {
              const cTime = useStore.getState().currentTime;
              splitClip(selectedClip.id, cTime);
            }}
            onDuplicate={() => duplicateClip(selectedClip.id)}
            onDelete={() => removeClip(selectedClip.id)}
            onClose={() => setSelectedClipId(null)}
          />
        </div>
      )}

      {/* 4. Main Multi-Track Grid Workspace */}
      <div className="flex-1 flex overflow-y-auto overflow-x-hidden relative custom-scrollbar min-h-0">
        
        {/* Left Hand Channel Header Controllers */}
        <div className={cn(
          "w-36 sm:w-44 hidden md:flex flex-col shrink-0 z-20 shadow-md border-r transition-colors",
          isLight ? "bg-zinc-100/90 border-zinc-200 text-zinc-700" : "bg-[#121214] border-white/5 text-zinc-300"
        )}>
          {/* Ruler Top Gap spacer */}
          <div className={cn(
            "h-6 border-b px-2.5 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider opacity-60 sticky top-0 z-30",
            isLight ? "bg-zinc-200/90 border-zinc-300" : "bg-[#0A0A0C] border-white/5"
          )}>
            <span>Tracks</span>
            <span>{visibleTracks.length} Active</span>
          </div>

          {visibleTracks.map((track) => {
            const trackHeight = getTrackHeight(track);
            const isEditing = editingTrackId === track.id;

            return (
              <div 
                key={track.id} 
                className={cn(
                  "border-b px-2.5 py-1.5 flex flex-col justify-between transition-colors relative group",
                  isLight ? "border-zinc-200 bg-white/40" : "border-white/5 bg-[#141416]/40",
                  track.muted && "opacity-50",
                  track.locked && (isLight ? "bg-zinc-200/30" : "bg-zinc-900/30")
                )}
                style={{ height: trackHeight }}
              >
                {/* Track Label & Inline Rename */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* Track Type Icon */}
                    {track.type === 'video' ? <Film size={11} className="text-blue-400 shrink-0" /> :
                     track.type === 'audio' ? <Music size={11} className="text-emerald-400 shrink-0" /> :
                     track.type === 'text' ? <Type size={11} className="text-amber-400 shrink-0" /> :
                     <Layers size={11} className="text-purple-400 shrink-0" />}

                    {isEditing ? (
                      <input
                        type="text"
                        value={editingTrackName}
                        onChange={(e) => setEditingTrackName(e.target.value)}
                        onBlur={() => handleFinishRenameTrack(track.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRenameTrack(track.id);
                          if (e.key === 'Escape') setEditingTrackId(null);
                        }}
                        autoFocus
                        className={cn(
                          "text-[10px] font-semibold px-1 py-0.5 rounded w-full border outline-none",
                          isLight ? "bg-white border-zinc-300 text-zinc-800" : "bg-black border-white/20 text-white"
                        )}
                      />
                    ) : (
                      <span 
                        onDoubleClick={() => handleStartRenameTrack(track)}
                        className="text-[10px] font-semibold truncate leading-tight cursor-text select-none"
                        title="Double-click to rename track"
                      >
                        {track.name}
                      </span>
                    )}
                  </div>

                  {/* Track Delete for extra tracks */}
                  {!['track-text-1', 'track-video-1', 'track-audio-1'].includes(track.id) && (
                    <button 
                      onClick={() => removeTrack(track.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 transition-opacity p-0.5 cursor-pointer"
                      title="Delete Track"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>

                {/* Track Channel Controls (Lock, Solo, Mute) */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-200/50 dark:border-white/5">
                  <div className="flex items-center gap-1">
                    {/* Lock Toggle */}
                    <button
                      onClick={() => toggleTrackLock(track.id)}
                      className={cn(
                        "p-1 rounded transition-colors cursor-pointer",
                        track.locked 
                          ? "bg-amber-500/20 text-amber-400" 
                          : isLight ? "hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700" : "hover:bg-white/10 text-zinc-500 hover:text-zinc-200"
                      )}
                      title={track.locked ? "Unlock Track" : "Lock Track (Prevents editing)"}
                    >
                      {track.locked ? <Lock size={10} /> : <Unlock size={10} />}
                    </button>

                    {/* Solo Toggle */}
                    <button
                      onClick={() => toggleTrackSolo(track.id)}
                      className={cn(
                        "px-1 py-0.5 rounded text-[9px] font-bold font-mono transition-colors cursor-pointer",
                        track.solo 
                          ? "bg-emerald-500 text-zinc-950" 
                          : isLight ? "hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700" : "hover:bg-white/10 text-zinc-500 hover:text-zinc-200"
                      )}
                      title={track.solo ? "Unsolo Track" : "Solo Track"}
                    >
                      S
                    </button>

                    {/* Mute Toggle */}
                    <button
                      onClick={() => setTracks(tracks.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t))}
                      className={cn(
                        "p-1 rounded transition-colors cursor-pointer",
                        track.muted 
                          ? "bg-red-500/20 text-red-400" 
                          : isLight ? "hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700" : "hover:bg-white/10 text-zinc-500 hover:text-zinc-200"
                      )}
                      title={track.muted ? "Unmute Track" : "Mute Track"}
                    >
                      {track.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                    </button>
                  </div>

                  {/* Clip count badge */}
                  <span className="text-[8.5px] font-mono opacity-50">
                    {track.clips.length} {track.clips.length === 1 ? 'clip' : 'clips'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Drag Timeline track canvas */}
        <div 
          className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative flex flex-col min-w-0"
          onClick={handleTrackClickToSeek}
        >
          <div 
            ref={trackContainerRef}
            className={cn("flex-1 relative select-none transition-colors duration-200 min-h-fit", isLight ? "bg-zinc-50" : "bg-[#0B0B0C]")}
            style={{ width: trackWidthPercent }}
          >
            {/* Timeline Precision Ruler Scale and Pointer line */}
            <div className={cn(
              "h-6 border-b relative transition-colors sticky top-0 z-30",
              isLight ? "bg-zinc-200 border-zinc-200" : "bg-[#0A0A0C] border-white/5"
            )}>
              <Playhead />
            </div>

            {/* Stack of Active Clips drawn visually per Channel */}
            <div className="flex flex-col relative z-10">
              {visibleTracks.map((track) => {
                const trackHeight = getTrackHeight(track);
                return (
                  <div 
                    key={track.id} 
                    className={cn(
                      "border-b relative flex items-center transition-colors duration-150",
                      isLight ? "border-zinc-200/80 hover:bg-zinc-100/40" : "border-white/5 hover:bg-white/[0.02]",
                      track.muted && (isLight ? "opacity-40 bg-zinc-200/40" : "opacity-40 bg-black/40"),
                      track.locked && "pointer-events-none"
                    )}
                    style={{ height: trackHeight }}
                  >
                    {/* Track Background Grid Lines */}
                    <div className="absolute inset-0 pointer-events-none opacity-5 flex">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="flex-1 border-r border-current" />
                      ))}
                    </div>

                    {track.clips.map((clip) => {
                      const durationInTimeline = clip.end - clip.start;
                      const blockLeft = `${(clip.start / duration) * 100}%`;
                      const blockWidth = `${(durationInTimeline / duration) * 100}%`;
                      
                      const isSelected = selectedClipId === clip.id;
                      const isVideo = clip.type === 'video';
                      const isAudio = clip.type === 'audio';
                      const isText = clip.type === 'text';

                      return (
                        <div
                          key={clip.id}
                          onPointerDown={(e) => handlePointerDownClip(e, clip, 'move', track.locked)}
                          onPointerMove={handlePointerMoveClip}
                          onPointerUp={handlePointerUpClip}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                          }}
                          className={cn(
                            "absolute rounded-lg border flex items-center justify-between overflow-hidden transition-all shadow-sm cursor-grab active:cursor-grabbing touch-none group",
                            getTrackColor(clip.type),
                            isSelected && "ring-2 ring-auralis border-auralis z-20 scale-[1.005] shadow-lg shadow-auralis/20"
                          )}
                          style={{ 
                            left: blockLeft, 
                            width: blockWidth,
                            height: Math.max(24, trackHeight - 12),
                            top: 6
                          }}
                        >
                          {/* Trim Left Handle */}
                          <div 
                            onPointerDown={(e) => handlePointerDownClip(e, clip, 'trim-start', track.locked)}
                            className="w-2 h-full bg-black/20 hover:bg-auralis hover:w-2.5 cursor-col-resize rounded-l-md shrink-0 transition-all z-20 flex items-center justify-center opacity-0 group-hover:opacity-100"
                            title="Trim Start"
                          >
                            <div className="w-[1.5px] h-3 bg-white/60 rounded-full" />
                          </div>

                          {/* Middle Visual Content */}
                          <div className="flex-1 h-full relative overflow-hidden flex flex-col justify-between p-1 pointer-events-none select-none">
                            {/* Audio waveform rendering for Audio & Video clips */}
                            {(isAudio || isVideo) && (
                              <div className="absolute inset-0 opacity-60 flex items-center justify-center">
                                <AudioWaveformVisualizer 
                                  seed={clip.id} 
                                  color={isAudio ? '#10B981' : '#3B82F6'} 
                                  barsCount={Math.max(16, Math.floor(durationInTimeline * 12))}
                                  isAudio={isAudio}
                                />
                              </div>
                            )}

                            {/* Top Badge: Type & Name */}
                            <div className="flex items-center justify-between gap-1 relative z-10 w-full">
                              <span className="text-[9px] font-bold truncate leading-tight tracking-tight uppercase px-1 py-0.2 rounded bg-black/30 text-white backdrop-blur-xs">
                                {isText 
                                  ? (clip.textFields?.text || (clip as any).text || 'CAPTION') 
                                  : clip.type === 'image' || clip.type === 'overlay'
                                    ? 'GRAPHIC OVERLAY'
                                    : clip.type}
                              </span>

                              {/* Clip Duration Badge */}
                              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/40 text-white/90 font-medium">
                                {durationInTimeline.toFixed(1)}s
                              </span>
                            </div>

                            {/* Bottom info: text content preview or rate */}
                            {isText && clip.textFields?.text && (
                              <div className="relative z-10 text-[9px] truncate opacity-90 text-white font-medium drop-shadow-xs">
                                "{clip.textFields.text}"
                              </div>
                            )}
                            
                            {clip.playbackRate !== 1 && (
                              <div className="relative z-10 text-[8px] font-mono text-auralis font-bold">
                                {clip.playbackRate}x speed
                              </div>
                            )}
                          </div>

                          {/* Trim Right Handle */}
                          <div 
                            onPointerDown={(e) => handlePointerDownClip(e, clip, 'trim-end', track.locked)}
                            className="w-2 h-full bg-black/20 hover:bg-auralis hover:w-2.5 cursor-col-resize rounded-r-md shrink-0 transition-all z-20 flex items-center justify-center opacity-0 group-hover:opacity-100"
                            title="Trim End"
                          >
                            <div className="w-[1.5px] h-3 bg-white/60 rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Snapping vertical marker alignment pointer */}
            {snapIndicatorTime !== null && (
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-yellow-400 z-50 pointer-events-none opacity-90 shadow-sm shadow-yellow-400"
                style={{ left: `${(snapIndicatorTime / duration) * 100}%` }}
              />
            )}
          </div>
        </div>

        {/* Right Hand Quick Add Media Button Column */}
        <div className={cn(
          "w-12 hidden md:flex flex-col shrink-0 z-20 shadow-md border-l transition-colors",
          isLight ? "bg-zinc-100/90 border-zinc-200" : "bg-[#121214] border-white/5"
        )}>
          <div className={cn("h-6 border-b transition-colors sticky top-0 z-30", isLight ? "border-zinc-300 bg-zinc-200/90" : "border-white/5 bg-[#0A0A0C]")} />
          {visibleTracks.map((track) => {
            const trackHeight = getTrackHeight(track);
            return (
              <div 
                key={track.id} 
                className={cn(
                  "border-b px-2 flex items-center justify-center transition-colors",
                  isLight ? "border-zinc-200" : "border-white/5"
                )}
                style={{ height: trackHeight }}
              >
                <button 
                  onClick={() => handleAddClipToTrack(track.id, track.type)}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer",
                    isLight 
                      ? "hover:bg-zinc-200 text-zinc-500 hover:text-auralis border border-dashed border-zinc-300 active:scale-95" 
                      : "hover:bg-white/10 text-zinc-400 hover:text-auralis border border-dashed border-white/15 active:scale-95"
                  )}
                  title={`Add ${track.type} to ${track.name} at playhead`}
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        isLight={isLight}
      />
    </div>
  );
}

export default Timeline;
