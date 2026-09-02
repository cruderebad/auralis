import React from 'react';
import { Scissors, Copy, Trash2, Volume2, VolumeX, Eye, FastForward, Sparkles, X } from 'lucide-react';
import { useStore } from '../../store';
import { TimelineClip } from '../../types/timeline';
import { cn, formatTime } from '../../lib/utils';

interface ClipQuickToolbarProps {
  clip: TimelineClip;
  isLight?: boolean;
  onSplit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ClipQuickToolbar({
  clip,
  isLight,
  onSplit,
  onDuplicate,
  onDelete,
  onClose
}: ClipQuickToolbarProps) {
  const store = useStore();

  const handleSpeedChange = (speed: number) => {
    store.updateClip(clip.id, { playbackRate: speed });
  };

  const handleToggleMute = () => {
    store.updateClip(clip.id, { muted: !clip.muted });
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-lg border shadow-xl backdrop-blur-md z-40 text-xs animate-in fade-in zoom-in-95 select-none",
        isLight ? "bg-white/95 border-zinc-200 text-zinc-800 shadow-zinc-300" : "bg-[#1C1C1F]/95 border-white/10 text-white shadow-black/80"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-auralis px-1 border-r border-white/10 dark:border-white/10 mr-0.5">
        {clip.type}
      </span>

      {/* Split at Playhead */}
      <button
        onClick={onSplit}
        className={cn(
          "flex items-center gap-1 px-1.5 py-1 rounded transition-colors cursor-pointer text-[11px]",
          isLight ? "hover:bg-zinc-100 text-zinc-700" : "hover:bg-white/10 text-zinc-200"
        )}
        title="Split at Current Playhead (S)"
      >
        <Scissors size={12} className="text-amber-500" />
        <span className="hidden sm:inline">Split</span>
      </button>

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        className={cn(
          "flex items-center gap-1 px-1.5 py-1 rounded transition-colors cursor-pointer text-[11px]",
          isLight ? "hover:bg-zinc-100 text-zinc-700" : "hover:bg-white/10 text-zinc-200"
        )}
        title="Duplicate Clip (Ctrl+D)"
      >
        <Copy size={12} className="text-blue-400" />
        <span className="hidden sm:inline">Duplicate</span>
      </button>

      {/* Mute Toggle if Video/Audio */}
      {(clip.type === 'video' || clip.type === 'audio') && (
        <button
          onClick={handleToggleMute}
          className={cn(
            "p-1 rounded transition-colors cursor-pointer",
            isLight ? "hover:bg-zinc-100" : "hover:bg-white/10",
            clip.muted ? "text-red-400" : "text-zinc-400 hover:text-white"
          )}
          title={clip.muted ? "Unmute Clip" : "Mute Clip"}
        >
          {clip.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      )}

      {/* Speed Selector */}
      {(clip.type === 'video' || clip.type === 'audio') && (
        <div className="flex items-center border-l pl-1 ml-0.5 border-zinc-200 dark:border-white/10 gap-0.5">
          {[0.5, 1, 1.5, 2].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={cn(
                "px-1 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer",
                clip.playbackRate === s 
                  ? "bg-auralis text-zinc-950 font-bold" 
                  : isLight ? "hover:bg-zinc-100 text-zinc-600" : "hover:bg-white/10 text-zinc-400"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      )}

      {/* Duration Badge */}
      <span className="text-[9px] font-mono opacity-50 px-1 border-l border-zinc-200 dark:border-white/10">
        {(clip.end - clip.start).toFixed(2)}s
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer ml-0.5"
        title="Delete Clip (Del)"
      >
        <Trash2 size={12} />
      </button>

      {/* Close button */}
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        title="Deselect"
      >
        <X size={11} />
      </button>
    </div>
  );
}
