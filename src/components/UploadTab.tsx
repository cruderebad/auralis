import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { parseSRT } from '../lib/srt-parser';
import { CaptionSegment } from '../types';
import { useAuth } from '../context/AuthContext';

interface UploadTabProps {
  onVideoUpload: (file: File) => void;
  onTranscriptionComplete: (captions: CaptionSegment[], rawSRT: string) => void;
}

export function UploadTab({ onVideoUpload, onTranscriptionComplete }: UploadTabProps) {
  const { session, profile, deductCredits } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = function() {
        resolve(video.duration);
      };
      video.onerror = function() {
        // Try audio fallback
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = function() {
          resolve(audio.duration);
        };
        audio.onerror = function() {
          resolve(0); // Fallback
        };
        audio.src = URL.createObjectURL(file);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setIsUploading(true);
    
    try {
      // 1. Pass the file to App state so the video/audio can be previewed
      await onVideoUpload(file);
      
      const duration = await getDuration(file);
      
      let maxDuration = 120; // 2 minutes
      const plan = (profile?.plan || '').toLowerCase();
      if (plan === 'creator') {
        maxDuration = 300; // 5 minutes
      } else if (plan === 'pro') {
        maxDuration = 1200; // 20 minutes
      } else if (plan === 'studio') {
        maxDuration = 3600; // 60 minutes
      }

      if (duration > maxDuration) {
        throw new Error(`Your current plan limits uploads to ${Math.floor(maxDuration / 60)} minutes. Upload limit exceeded.`);
      }
      
      let res: Response | null = null;
      let storageSuccess = false;

      try {
        const fileExt = file.name.split('.').pop() || 'mp4';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${session?.user?.id || 'anonymous'}/${fileName}`;
        
        const { supabase } = await import('../lib/supabase');
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (!uploadError) {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('media')
            .createSignedUrl(filePath, 3600);

          if (!signedUrlError && signedUrlData?.signedUrl) {
            storageSuccess = true;
            res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: {
                'Authorization': session ? `Bearer ${session.access_token}` : '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                mediaUrl: signedUrlData.signedUrl,
                duration: duration && !isNaN(duration) ? duration : undefined,
                filePath: filePath
              }),
            });
          }
        }
      } catch (storageErr) {
        console.warn("Supabase storage bypass/fallback:", storageErr);
      }

      if (!storageSuccess || !res) {
        const formData = new FormData();
        formData.append('media', file);
        if (duration && !isNaN(duration)) {
          formData.append('duration', String(duration));
        }

        res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Authorization': session ? `Bearer ${session.access_token}` : '',
          },
          body: formData,
        });
      }
      
      const responseText = await res.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        if (res.status === 504 || responseText.includes('FUNCTION_INVOCATION_TIMEOUT')) {
          throw new Error("Vercel Function Timeout (504): Processing took longer than Vercel's execution limit (10s on Free plan). Please try a shorter video/audio clip or trim media under 2 minutes.");
        }
        if (responseText.includes('<!doctype') || responseText.includes('<html') || responseText.includes('<head>')) {
          throw new Error(`Server returned HTML instead of JSON (${res.status}). Please verify the server is running and the API route exists.`);
        }
        if (!res.ok) {
          throw new Error(`Server error (${res.status}): ${responseText.substring(0, 150)}`);
        }
        throw new Error(`Invalid server response format (${res.status}). Expected valid JSON.`);
      }

      if (!res.ok) {
        let errorMsg = data?.error || data?.message || `Server error (${res.status})`;
        if (res.status === 504 || String(errorMsg).includes('FUNCTION_INVOCATION_TIMEOUT')) {
          errorMsg = "Vercel Function Timeout (504): Processing took longer than Vercel's execution limit. Please try a shorter video/audio clip under 2 minutes.";
        }
        throw new Error(errorMsg);
      }
      
      if (data?.srt) {
        // Clean markdown quotes if the AI returned them
        let srtText = data.srt.trim();
        srtText = srtText.replace(/^```(srt|text)?\n?/i, '').replace(/\n?```$/i, '');
        srtText = srtText.trim();
        
        const parsed = parseSRT(srtText);
        console.log("Parsed SRT length:", parsed.length, "From text:", srtText.substring(0, 100));
        if (parsed.length === 0) {
          throw new Error("Failed to parse the transcribed text into captions. Received format: " + srtText.substring(0, 50));
        }
        
        onTranscriptionComplete(parsed, srtText);
      } else {
        throw new Error('No transcription returned');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during transcription.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl px-6 py-12 select-none">
      <div className="text-center mb-10 max-w-lg">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-auralis to-[#DFAC24] mb-8 drop-shadow-md" style={{ color: '#D4AF37' }}>
          Auralis
        </h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-auralis/10 border border-auralis/25 text-auralis text-[10px] font-bold tracking-wider uppercase mb-4 animate-pulse">
          <Sparkles size={11} />
          <span>Automatic Speech recognition active</span>
        </div>
        <p className="text-white/40 text-[13px] leading-relaxed max-w-md mx-auto">
          Upload any cinematic file. Auralis automatically transcribes text, highlights main keyword emphases, and loops perfectly.
        </p>
      </div>

      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "w-full rounded-2xl border-2 border-dashed border-white/5 bg-[#141416] p-12 text-center cursor-pointer hover:bg-[#1C1C1E] hover:border-auralis/40 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.35)] group",
          isUploading && "opacity-65 pointer-events-none"
        )}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/*,audio/*"
          className="hidden" 
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center py-6 text-auralis">
            <Loader2 className="w-10 h-10 mb-4 animate-spin text-auralis" />
            <p className="text-sm font-semibold text-white tracking-wide uppercase">Generative transcribing in progress...</p>
            <p className="text-[10px] text-white/40 mt-1 max-w-[240px] mx-auto leading-relaxed">Please keep this browser active. AI is rendering timestamps.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300 shadow-md group-hover:shadow-auralis/5 border border-white/5 group-hover:border-auralis/20">
              <UploadCloud className="w-7 h-7 text-auralis" />
            </div>
            <p className="text-sm font-bold text-white mb-1 uppercase tracking-wide">Import Video, Clip or Audio Track</p>
            <p className="text-[11px] text-[#A0A0A5]">Supports MP4, MOV, WebM, MP3, WAV (up to 100MB)</p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 w-full text-center text-xs font-semibold leading-relaxed">
          <strong>Transcription Alert:</strong> {error}
        </div>
      )}
    </div>
  );
}
