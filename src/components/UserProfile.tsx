import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, ChevronDown, Sparkles, Settings } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function UserProfile({ compact = false, forceDark = false, disabled = false }: { compact?: boolean, forceDark?: boolean, disabled?: boolean }) {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const theme = useStore((state) => state.theme);
  const isLight = forceDark ? false : theme === 'light';
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <div className={cn("animate-pulse w-48 h-12 rounded-full hidden md:block", isLight ? "bg-black/5" : "bg-white/5")}></div>;
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="relative pointer-events-auto" ref={menuRef}>
      <button 
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center backdrop-blur-md border rounded-full transition-all duration-300", disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          compact ? "p-1 gap-0" : "gap-3 p-1.5 pr-4 shadow-lg hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]",
          isLight 
            ? "bg-white/60 border-zinc-200/80 text-[#141416] hover:bg-white" 
            : "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/50"
        )}
      >
        {/* Avatar */}
        <div className={cn(
          "relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border",
          isLight ? "bg-zinc-100 border-zinc-200" : "bg-black/50 border-white/20"
        )}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name || 'User'} className="w-full h-full object-cover" />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center", isLight ? "text-zinc-400" : "text-zinc-500")}>
              <UserIcon className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* User Info (Desktop only) */}
        {!compact && (
          <>
            <div className="flex flex-col text-left hidden sm:flex">
              <span className="text-sm font-medium leading-tight text-inherit">
                {profile.full_name || user.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-[11px] text-[#D4AF37] font-medium mt-0.5 tracking-wider">
                {(profile.plan || 'Free Plan').split('|')[0]}
              </span>
            </div>

            <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", isOpen && "rotate-180", isLight ? "text-zinc-500" : "text-zinc-400")} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-xl overflow-hidden backdrop-blur-2xl z-50",
              isLight ? "bg-white/80 border-zinc-200 shadow-zinc-200/50" : "bg-zinc-900/80 border-white/10 shadow-black/50"
            )}
          >
            <div className={cn("p-4 border-b", isLight ? "border-zinc-200" : "border-white/10")}>
              <p className={cn("text-xs font-medium uppercase tracking-wider mb-1", isLight ? "text-zinc-500" : "text-zinc-400")}>Account Status</p>
              <div className="flex flex-col gap-1">
                <span className={cn("text-lg font-bold text-[#D4AF37]")}>
                  {(profile.plan || 'Free Plan').split('|')[0]}
                </span>
                <span className={cn("text-[10px]", isLight ? "text-zinc-500" : "text-zinc-400")}>
                  Full access to video timeline & transcription
                </span>
              </div>
            </div>
            <div className="p-2">
              <button className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isLight ? "hover:bg-zinc-100/50 text-zinc-700" : "hover:bg-white/5 text-zinc-300"
              )}>
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button 
                onClick={signOut}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-red-500",
                  isLight ? "hover:bg-red-50" : "hover:bg-red-500/10"
                )}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
