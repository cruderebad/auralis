import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
}

export function KeyboardShortcutsModal({ isOpen, onClose, isLight }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { category: 'Playback & Navigation', items: [
      { key: 'Space', desc: 'Play / Pause playback' },
      { key: '← / →', desc: 'Step 1 frame backward / forward' },
      { key: 'Shift + ← / →', desc: 'Jump 1 second backward / forward' },
      { key: 'Home / End', desc: 'Jump to beginning / end of project' },
      { key: 'J / K / L', desc: 'Rewind / Pause / Fast-forward' },
    ]},
    { category: 'Clip Editing', items: [
      { key: 'S', desc: 'Split selected clip at current playhead' },
      { key: 'Ctrl + D / ⌘D', desc: 'Duplicate selected clip' },
      { key: 'Delete / Backspace', desc: 'Delete selected clip' },
      { key: 'T', desc: 'Add new text / subtitle node at playhead' },
      { key: 'M', desc: 'Add timeline marker at playhead' },
    ]},
    { category: 'View & Timeline', items: [
      { key: 'N', desc: 'Toggle magnet snapping' },
      { key: '+ / -', desc: 'Zoom in / Zoom out timeline' },
      { key: '0 / Shift + Z', desc: 'Zoom to fit entire timeline' },
      { key: 'Ctrl + Z', desc: 'Undo last change' },
      { key: 'Ctrl + Shift + Z / Ctrl + Y', desc: 'Redo change' },
    ]}
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className={cn(
          "w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200",
          isLight ? "bg-white border-zinc-200 text-zinc-800" : "bg-[#141416] border-white/10 text-white/90"
        )}
      >
        {/* Header */}
        <div className={cn(
          "px-5 py-4 border-b flex items-center justify-between",
          isLight ? "bg-zinc-50 border-zinc-200" : "bg-[#18181B] border-white/10"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-auralis/10 text-auralis flex items-center justify-center">
              <Keyboard size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Timeline Keyboard Shortcuts</h3>
              <p className="text-[11px] opacity-60">High-speed NLE video & subtitle hotkeys</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer",
              isLight ? "hover:bg-zinc-200 text-zinc-500" : "hover:bg-white/10 text-white/60"
            )}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar text-xs">
          {shortcuts.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-auralis/90">
                {section.category}
              </h4>
              <div className={cn(
                "rounded-lg border divide-y overflow-hidden",
                isLight ? "border-zinc-200 divide-zinc-200 bg-zinc-50/50" : "border-white/5 divide-white/5 bg-[#18181A]/50"
              )}>
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="px-3 py-2 flex items-center justify-between gap-4">
                    <span className={cn(isLight ? "text-zinc-600" : "text-zinc-300")}>{item.desc}</span>
                    <kbd className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold shadow-xs whitespace-nowrap border",
                      isLight 
                        ? "bg-white border-zinc-300 text-zinc-800 shadow-zinc-200" 
                        : "bg-[#202024] border-white/10 text-auralis shadow-black"
                    )}>
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={cn(
          "px-5 py-3 border-t flex items-center justify-between text-[11px]",
          isLight ? "bg-zinc-50 border-zinc-200 text-zinc-500" : "bg-[#18181B] border-white/10 text-white/50"
        )}>
          <span>Press <kbd className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono">Esc</kbd> or click anywhere to close</span>
          <button 
            onClick={onClose}
            className="px-3 py-1 bg-auralis text-zinc-950 font-bold rounded-md hover:brightness-110 cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
