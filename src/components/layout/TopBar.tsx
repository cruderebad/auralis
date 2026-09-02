import { Video, Edit3, CirclePlay, Download, Zap, Upload as UploadIcon, Sun, Moon, Home, Undo2, Redo2, Lock } from 'lucide-react';
import { useStore } from '../../store';
import UserProfile from '../UserProfile';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  activeTab?: 'upload' | 'edit' | 'export';
  onTabChange?: (tab: 'upload' | 'edit' | 'export') => void;
  disabled?: boolean;
  hasMediaOrCaptions?: boolean;
}

export function TopBar({ activeTab = 'edit', onTabChange, disabled = false, hasMediaOrCaptions = false }: TopBarProps) {
  const store = useStore();
  const navigate = useNavigate();
  const isLight = store.theme === 'light';

  const isLocked = activeTab === 'upload' || !hasMediaOrCaptions;

  return (
    <header className={`h-16 flex items-center justify-between px-2 sm:px-4 md:px-6 z-50 select-none transition-all duration-300 w-full shrink-0 ${
      activeTab === 'edit' 
        ? 'md:absolute md:top-0 md:left-0 md:right-0 md:bg-transparent md:border-b-transparent md:pointer-events-none ' + (isLight ? 'bg-white border-b border-zinc-200 text-[#141416]' : 'bg-[#0F0F10] border-b border-white/5 text-white')
        : isLight 
          ? 'bg-white border-b border-zinc-200 text-[#141416]' 
          : 'bg-[#0F0F10] border-b border-white/5 text-white'
    }`}>
      
      {/* Mobile Top Bar */}
      <div className={`md:hidden flex items-center justify-between w-full ${
        activeTab === 'edit'
          ? `pointer-events-auto`
          : ''
      }`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { if (!disabled) navigate('/dashboard') }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-sm shrink-0 ${
              isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200' : 'bg-[#151518] hover:bg-white/10 border-white/5'
            }`}
          >
            <Home size={16} className={isLight ? 'text-zinc-700' : 'text-zinc-300'} />
          </button>
          
          {activeTab === 'edit' && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => store.undo()} disabled={store.historyIndex <= 0} className={`p-1.5 transition-all rounded-lg ${isLight ? 'text-zinc-500 hover:text-zinc-800' : 'text-zinc-400 hover:text-zinc-200'} disabled:opacity-30`}>
                <Undo2 size={18} />
              </button>
              <button onClick={() => store.redo()} disabled={store.historyIndex >= store.history.length - 1} className={`p-1.5 transition-all rounded-lg ${isLight ? 'text-zinc-500 hover:text-zinc-800' : 'text-zinc-400 hover:text-zinc-200'} disabled:opacity-30`}>
                <Redo2 size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Tabs */}
        <nav className={`flex items-center p-0.5 rounded-xl border transition-all duration-300 ${
          isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-[#151518] border-white/5'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <button 
            disabled={disabled}
            onClick={() => onTabChange?.('upload')}
            className={`flex items-center justify-center px-1.5 sm:px-2 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all duration-200 ${
              activeTab === 'upload' ? (isLight ? 'bg-white text-auralis shadow-sm' : 'bg-[#222226] text-auralis shadow-md') : (isLight ? 'text-[#666]' : 'text-[#888]')
            }`}
          >
            <span>Upload</span>
          </button>
          <button 
            disabled={disabled || isLocked}
            onClick={() => { if (!isLocked) onTabChange?.('edit') }}
            title={isLocked ? "Upload or transcribe media first to unlock editing" : "Edit"}
            className={`flex items-center gap-1 justify-center px-1.5 sm:px-2 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all duration-200 ${
              isLocked 
                ? 'opacity-40 cursor-not-allowed' 
                : activeTab === 'edit' 
                  ? (isLight ? 'bg-white text-auralis shadow-sm' : 'bg-[#222226] text-auralis shadow-md') 
                  : (isLight ? 'text-[#666]' : 'text-[#888]')
            }`}
          >
            <span>Edit</span>
            {isLocked && <Lock size={10} className="text-zinc-400" />}
          </button>
          <button 
            disabled={disabled || isLocked}
            onClick={() => { if (!isLocked) onTabChange?.('export') }}
            title={isLocked ? "Upload or transcribe media first to unlock export" : "Export"}
            className={`flex items-center gap-1 justify-center px-1.5 sm:px-2 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all duration-200 ${
              isLocked 
                ? 'opacity-40 cursor-not-allowed' 
                : activeTab === 'export' 
                  ? (isLight ? 'bg-white text-auralis shadow-sm' : 'bg-[#222226] text-auralis shadow-md') 
                  : (isLight ? 'text-[#666]' : 'text-[#888]')
            }`}
          >
            <span>Export</span>
            {isLocked && <Lock size={10} className="text-zinc-400" />}
          </button>
        </nav>

        {activeTab === 'edit' ? (
          <button 
            onClick={() => onTabChange?.('export')}
            className="bg-[#D4AF37] hover:bg-[#C5A028] text-white font-bold px-3 py-1.5 rounded-lg text-sm transition-all shadow-sm active:scale-95 shrink-0"
          >
            Done
          </button>
        ) : <div className="w-14 shrink-0" /> /* Placeholder to keep tabs centered if possible, or just space */}
      </div>

      {/* Desktop Top Bar */}
      <div className={`hidden md:flex items-center gap-8 ${
        activeTab === 'edit'
          ? `pointer-events-auto py-1 px-3 mt-2 rounded-xl border ${
              isLight ? 'bg-white border-zinc-200' : 'bg-[#151518] border-white/5'
            }`
          : ''
      }`}>
        <div 
          onClick={() => { if (!disabled) navigate('/dashboard') }} 
          className={`flex items-center gap-2.5 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90 active:scale-95'}`}
        >
          <div className="w-8 h-8 bg-gold-premium rounded-lg flex items-center justify-center shadow-lg shadow-auralis/10">
            <img src="/logo.svg" alt="C" className="w-5 h-5" />
          </div>
          <span className={`font-extrabold text-xl tracking-tight bg-gradient-to-r bg-clip-text text-transparent duration-300 ${
            isLight ? 'from-zinc-900 via-zinc-800 to-auralis' : 'from-white via-[#F5E6BE] to-auralis'
          }`}>Auralis</span>
        </div>

        <nav className={`flex items-center p-1 rounded-xl border transition-all duration-300 ${
          isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-[#151518] border-white/5'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <button 
            disabled={disabled}
            onClick={() => onTabChange?.('upload')}
            className={`flex items-center gap-2 px-2 md:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'upload' 
                ? isLight 
                  ? 'bg-white text-auralis border border-zinc-200/50 shadow-sm scale-[1.02]' 
                  : 'bg-[#222226] text-auralis border border-white/5 shadow-md scale-[1.02]'
                : isLight 
                  ? 'hover:bg-white/50 text-[#666] hover:text-[#111]' 
                  : 'hover:bg-[#1E1E22] text-[#888] hover:text-[#FFF]'
            }`}
          >
            <UploadIcon size={14} />
            <span className="hidden md:inline">Upload</span>
          </button>
          <button 
            disabled={disabled || isLocked}
            onClick={() => { if (!isLocked) onTabChange?.('edit') }}
            title={isLocked ? "Upload or transcribe media to unlock editing" : "Edit"}
            className={`flex items-center gap-1.5 px-2 md:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isLocked
                ? 'opacity-40 cursor-not-allowed text-[#888]'
                : activeTab === 'edit' 
                  ? isLight 
                    ? 'bg-white text-auralis border border-zinc-200/50 shadow-sm scale-[1.02] cursor-pointer' 
                    : 'bg-[#222226] text-auralis border border-white/5 shadow-md scale-[1.02] cursor-pointer'
                  : isLight 
                    ? 'hover:bg-white/50 text-[#666] hover:text-[#111] cursor-pointer' 
                    : 'hover:bg-[#1E1E22] text-[#888] hover:text-[#FFF] cursor-pointer'
            }`}
          >
            <Edit3 size={14} />
            <span className="hidden md:inline">Edit</span>
            {isLocked && <Lock size={12} className="text-zinc-400" />}
          </button>
          <button 
            disabled={disabled || isLocked}
            onClick={() => { if (!isLocked) onTabChange?.('export') }}
            title={isLocked ? "Upload or transcribe media to unlock export" : "Export"}
            className={`flex items-center gap-1.5 px-2 md:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isLocked
                ? 'opacity-40 cursor-not-allowed text-[#888]'
                : activeTab === 'export' 
                  ? isLight 
                    ? 'bg-white text-auralis border border-zinc-200/50 shadow-sm scale-[1.02] cursor-pointer' 
                    : 'bg-[#222226] text-auralis border border-white/5 shadow-md scale-[1.02] cursor-pointer'
                  : isLight 
                    ? 'hover:bg-white/50 text-[#666] hover:text-[#111] cursor-pointer' 
                    : 'hover:bg-[#1E1E22] text-[#888] hover:text-[#FFF] cursor-pointer'
            }`}
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
            {isLocked && <Lock size={12} className="text-zinc-400" />}
          </button>
        </nav>
      </div>

      <div className={`hidden md:flex items-center gap-3 ${
        activeTab === 'edit'
          ? `pointer-events-auto py-1 px-3 mt-2 rounded-xl border ${
              isLight ? 'bg-white border-zinc-200 shadow-sm' : 'bg-[#151518] border-white/5'
            }`
          : ''
      }`}>
        {activeTab === 'edit' && (
          <div className="flex items-center gap-1 border-r pr-3 mr-1 border-zinc-200 dark:border-white/10">
            <button onClick={() => store.undo()} disabled={store.historyIndex <= 0} className={`p-1.5 transition-all rounded-lg ${isLight ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/10'} disabled:opacity-30`} title="Undo (Ctrl+Z)">
              <Undo2 size={16} />
            </button>
            <button onClick={() => store.redo()} disabled={store.historyIndex >= store.history.length - 1} className={`p-1.5 transition-all rounded-lg ${isLight ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/10'} disabled:opacity-30`} title="Redo (Ctrl+Shift+Z)">
              <Redo2 size={16} />
            </button>
          </div>
        )}
        <div className="mr-2 hidden sm:block">
          <UserProfile compact={activeTab === 'edit'} disabled={disabled} />
        </div>
        {/* Toggle Theme Switch */}
        <button 
          disabled={disabled}
          onClick={() => store.setTheme(isLight ? 'dark' : 'light')}
          className={`flex items-center justify-between p-1 rounded-full w-14 h-7 transition-all duration-300 relative border cursor-pointer active:scale-95 ${
            isLight 
              ? 'bg-[#F2F2F5] border-zinc-200 shadow-inner' 
              : 'bg-[#151518] border-white/5'
          }`}
          title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {/* Slider Cap */}
          <div className={`absolute top-[2.5px] w-[20px] h-[20px] rounded-full transition-all duration-300 flex items-center justify-center shadow-md ${
            isLight 
              ? 'left-[4px] bg-white text-amber-500 border border-zinc-200/50' 
              : 'left-[28px] bg-[#222226] text-auralis'
          }`}>
            {isLight ? <Sun size={11} className="fill-amber-500 text-amber-500" /> : <Moon size={11} className="fill-auralis text-auralis" />}
          </div>
          <Sun size={10} className={`ml-1.5 transition-opacity duration-300 ${isLight ? 'opacity-0' : 'text-[#888]'}`} />
          <Moon size={10} className={`mr-1.5 transition-opacity duration-300 ${!isLight ? 'opacity-0' : 'text-[#666]'}`} />
        </button>
      </div>
    </header>
  );
}

