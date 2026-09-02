import React from 'react';
import { useStore } from '../store';
import { useConfirm } from '../context/ConfirmContext';
import { 
  Type, 
  Image, 
  Trash2, 
  Scissors, 
  Magnet, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { CompositionEngine } from '../engine/compositionEngine';
import { cn } from '../lib/utils';

export function Toolbar() {
  const store = useStore();
  const { confirm } = useConfirm();

  const handleCreateTextOverlay = () => {
    CompositionEngine.addTextOverlay('New Text Overlay');
  };

  const handleSplitSelectedClip = () => {
    if (store.selectedClipId) {
      store.splitClip(store.selectedClipId, store.currentTime);
    }
  };

  const handleDeleteSelected = () => {
    if (store.selectedClipId) {
      store.removeClip(store.selectedClipId);
    }
  };

  const handleClearTimeline = () => {
    confirm({
      title: "Clear Timeline",
      message: "Clear all layers and composition clips on the timeline?",
      confirmText: "Clear All",
      onConfirm: () => {
        store.setTracks([
          { id: 'track-text-1', name: 'Titles & Subtitles', type: 'text', visible: true, muted: false, clips: [] },
          { id: 'track-overlay-1', name: 'Overlays', type: 'overlay', visible: true, muted: false, clips: [] },
          { id: 'track-video-1', name: 'Video Layer', type: 'video', visible: true, muted: false, clips: [] },
          { id: 'track-audio-1', name: 'Voice & Background Audio', type: 'audio', visible: true, muted: false, clips: [] }
        ]);
        store.setCurrentTime(0);
        store.setDuration(10);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 p-2 bg-[#121212] border border-white/5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
      {/* Tool items */}
      <h4 className="text-[7.5px] font-bold text-[#444] text-center select-none tracking-widest mt-0.5">TOOLS</h4>
      
      {/* Blade/Scissors Splitting clip */}
      <button
        onClick={handleSplitSelectedClip}
        disabled={!store.selectedClipId}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer",
          store.selectedClipId 
            ? "text-auralis hover:bg-auralis/10 hover:scale-105" 
            : "text-white/20 cursor-not-allowed"
        )}
        title="Split Clip at Playhead"
      >
        <Scissors size={18} />
      </button>

      {/* Add Text Titles */}
      <button
        onClick={handleCreateTextOverlay}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/5 hover:scale-105 transition-all cursor-pointer"
        title="Insert Floating Title Clip"
      >
        <Type size={18} />
      </button>

      {/* Manual Delete selection */}
      <button
        onClick={handleDeleteSelected}
        disabled={!store.selectedClipId}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer",
          store.selectedClipId 
            ? "text-red-400 hover:bg-red-500/15 hover:scale-105" 
            : "text-white/20 cursor-not-allowed"
        )}
        title="Delete Selected Clip"
      >
        <Trash2 size={18} />
      </button>

      <div className="h-px bg-white/5 my-0.5" />

      {/* Timeline Clearing & Restoration */}
      <button
        onClick={handleClearTimeline}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-[#666] hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"
        title="Clear Composition"
      >
        <RefreshCw size={15} />
      </button>
    </div>
  );
}
export default Toolbar;
