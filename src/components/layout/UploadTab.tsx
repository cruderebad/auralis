import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, Sparkles, FileText, Video as VideoIcon, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseSRT } from '../../lib/srt-parser';
import { CaptionSegment } from '../../types';
import { useStore } from '../../store';
import { getFFmpeg } from '../../export/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { set as idbSet } from 'idb-keyval';
import { useAuth } from '../../context/AuthContext';

interface UploadTabProps {
  onVideoUpload: (file: File) => void;
  onSRTUpload?: (file: File) => void;
  onTranscriptionComplete: (captions: CaptionSegment[], rawSRT: string) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
}

export function UploadTab({ onVideoUpload, onSRTUpload, onTranscriptionComplete, onUploadStateChange }: UploadTabProps) {
  const { session, profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);
  const store = useStore();
  const isLight = store.theme === 'light';

  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = function() {
        resolve(video.duration);
      };
      video.onerror = function() {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = function() {
          resolve(audio.duration);
        };
        audio.onerror = function() {
          resolve(0);
        };
        audio.src = URL.createObjectURL(file);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const runAutomaticSemanticAnalysis = async (captions: CaptionSegment[], videoFile?: File, videoUrl?: string) => {
    if (captions.length === 0) return captions;
    try {
      setUploadStatus('Analyzing emotions, sound events & speaker dynamics...');
      setCurrentStep(2);

      let audioBase64: string | undefined = undefined;
      let mimeType: string | undefined = undefined;

      if (videoFile) {
        try {
          const maxChunk = 4 * 1024 * 1024; // 4MB safe chunk
          const fileChunk = videoFile.size > maxChunk ? videoFile.slice(0, maxChunk) : videoFile;
          mimeType = videoFile.type || 'audio/mp3';
          audioBase64 = await new Promise<string | undefined>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const res = reader.result as string;
                if (!res || typeof res !== 'string') return resolve(undefined);
                const base64 = res.includes(',') ? res.split(',')[1] : res;
                resolve(base64);
              } catch {
                resolve(undefined);
              }
            };
            reader.onerror = () => resolve(undefined);
            reader.readAsDataURL(fileChunk);
          });
        } catch (fErr) {
          console.warn("Could not read local file for audio analysis:", fErr);
        }
      }

      const res = await fetch("/api/analyze-auralis-semantic", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": session?.access_token ? `Bearer ${session.access_token}` : "Bearer guest"
        },
        body: JSON.stringify({
          segments: captions.slice(0, 300),
          audioBase64,
          mediaUrl: !audioBase64 ? videoUrl : undefined,
          mimeType
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.segments && Array.isArray(data.segments)) {
          store.setSemanticTimeline({
            segments: data.segments,
            soundEvents: data.soundEvents || [],
            analyzedAt: data.analyzedAt || new Date().toISOString()
          });
          return data.segments;
        }
      }
    } catch (semErr) {
      console.warn("Semantic auto-analysis notice:", semErr);
    }
    return captions;
  };

  const processSRTFile = async (file: File) => {
    setError(null);
    setIsUploading(true);
    onUploadStateChange?.(true);
    setUploadStatus('Parsing SRT file...');
    setCurrentStep(1);

    try {
      const text = await file.text();
      const parsed = parseSRT(text);
      if (parsed.length === 0) {
        throw new Error("No subtitle segments found in the uploaded SRT file. Please verify file formatting.");
      }

      setUploadStatus('Auto-analyzing emotions & speech semantics...');
      setCurrentStep(2);

      const enrichedCaptions = await runAutomaticSemanticAnalysis(parsed);

      setUploadStatus('Finalizing caption timeline...');
      setCurrentStep(3);

      onTranscriptionComplete(enrichedCaptions, text);
    } catch (err: any) {
      console.error("SRT processing error:", err);
      setError(err.message || "Failed to parse SRT file.");
    } finally {
      setIsUploading(false);
      onUploadStateChange?.(false);
      setUploadStatus('');
      setCurrentStep(1);
    }
  };

  const processFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.srt')) {
      await processSRTFile(file);
      return;
    }

    const storeState = useStore.getState();
    setError(null);
    setIsUploading(true);
    onUploadStateChange?.(true);
    setUploadStatus('Loading media duration...');
    setCurrentStep(1);
    
    try {
      await onVideoUpload(file);
      
      const duration = await getDuration(file);
      
      let maxDuration = 180; // 3 minutes default
      const plan = (profile?.plan || '').toLowerCase();
      if (plan === 'creator') {
        maxDuration = 600; // 10 minutes
      } else if (plan === 'pro') {
        maxDuration = 1800; // 30 minutes
      } else if (plan === 'studio') {
        maxDuration = 3600; // 60 minutes
      }

      if (duration > maxDuration) {
        throw new Error(`Your current plan limits uploads to ${Math.floor(maxDuration / 60)} minutes. Upload limit exceeded.`);
      }

      let fileToUpload = file;
      
      if (file.type.startsWith('video/')) {
        try {
          setUploadStatus('Optimizing audio track with FFmpeg...');
          const ffmpeg = await getFFmpeg();
          
          const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '');
          const inputName = `input_${Date.now()}_${cleanName}`;
          const outputName = `audio_${Date.now()}.mp3`;
          
          await ffmpeg.writeFile(inputName, await fetchFile(file));
          
          await ffmpeg.exec([
            '-i', inputName,
            '-vn',
            '-ar', '16000',
            '-ac', '1',
            '-c:a', 'libmp3lame',
            '-b:a', '48k',
            outputName
          ]);
          
          const audioData = await ffmpeg.readFile(outputName);
          
          try {
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);
          } catch (cleanupErr) {
            console.warn("Cleanup error:", cleanupErr);
          }
          
          const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
          fileToUpload = new File([audioBlob], `${file.name.split('.')[0]}_audio.mp3`, { type: 'audio/mp3' });
        } catch (ffmpegErr) {
          console.error("FFmpeg extraction fallback to raw upload:", ffmpegErr);
          fileToUpload = file;
        }
      }
      
      setUploadStatus('Transcribing with Gemini Multi-Speaker Diarization...');
      let res: Response | null = null;
      let storageSuccess = false;
      let uploadedUrl: string | undefined = undefined;

      try {
        const fileExt = fileToUpload.name.split('.').pop() || 'mp4';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${session?.user?.id || 'anonymous'}/${fileName}`;
        
        const { supabase } = await import('../../lib/supabase');
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (!uploadError) {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('media')
            .createSignedUrl(filePath, 3600);

          if (!signedUrlError && signedUrlData?.signedUrl) {
            storageSuccess = true;
            uploadedUrl = signedUrlData.signedUrl;
            res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: {
                'Authorization': session ? `Bearer ${session.access_token}` : '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                mediaUrl: signedUrlData.signedUrl,
                duration: duration && !isNaN(duration) ? duration : undefined,
                filePath: filePath,
                language: storeState.transcriptionLanguage
              }),
            });
          }
        }
      } catch (storageErr) {
        console.warn("Storage upload bypass:", storageErr);
      }

      if (!storageSuccess || !res) {
        const formData = new FormData();
        formData.append('media', fileToUpload);
        if (duration && !isNaN(duration)) {
          formData.append('duration', String(duration));
        }
        if (storeState.transcriptionLanguage) {
          formData.append('language', storeState.transcriptionLanguage);
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
      } catch (parseErr) {
        if (!res.ok) {
          if (responseText.includes('<!doctype') || responseText.includes('<html')) {
            throw new Error(`Server temporarily unavailable (${res.status}). Please retry in a few seconds.`);
          }
          throw new Error(`Server error (${res.status}): ${responseText.substring(0, 150)}`);
        }
        throw new Error('Received non-JSON response from server.');
      }

      if (!res.ok) {
        let errorMsg = data?.error || data?.message || `Server error (${res.status})`;
        throw new Error(errorMsg);
      }
      
      if (data?.srt) {
        let srtText = data.srt.trim();
        srtText = srtText.replace(/^```(srt|text)?\n?/i, '').replace(/\n?```$/i, '').trim();
        
        const parsed = parseSRT(srtText);
        if (parsed.length === 0) {
          throw new Error("Failed to parse the transcribed text into captions. Format received was invalid.");
        }
        
        // Automated step 2: Run semantic emotion & sound analysis
        const enriched = await runAutomaticSemanticAnalysis(parsed, fileToUpload, uploadedUrl);

        setUploadStatus('Directing to Caption Studio...');
        setCurrentStep(3);

        onTranscriptionComplete(enriched, srtText);
      } else {
        throw new Error('No transcription returned from speech engine');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during transcription.');
    } finally {
      setIsUploading(false);
      onUploadStateChange?.(false);
      setUploadStatus('');
      setCurrentStep(1);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleSRTChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSRTFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl px-6 py-8 select-none">
      <div className="text-center mb-8 max-w-lg">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-auralis to-[#DFAC24] mb-3 drop-shadow-sm" style={{ color: '#D4AF37' }}>
          Auralis
        </h1>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3 ${
          isLight ? 'bg-auralis/10 border border-auralis/20 text-auralis' : 'bg-auralis/15 border border-auralis/30 text-auralis'
        }`}>
          <Cpu size={12} className="text-auralis" />
          <span>Gemini Latest Speech & Diarization Engine</span>
        </div>
        <p className={`text-[13px] leading-relaxed max-w-md mx-auto transition-colors duration-300 ${
          isLight ? 'text-zinc-600' : 'text-white/50'
        }`}>
          Import a video, audio recording, or existing SRT file. Auralis automatically transcribes, identifies speakers with distinct colors, and extracts emotion cues.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          "w-full rounded-2xl border-2 border-dashed transition-all duration-300 p-10 text-center cursor-pointer shadow-lg group relative",
          isLight 
            ? "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-auralis/50" 
            : "bg-[#141416] border-white/10 hover:bg-[#1C1C1E] hover:border-auralis/40 shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
          isDragging && "border-auralis scale-[1.01] bg-auralis/5",
          isUploading && "opacity-80 pointer-events-none"
        )}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/*,audio/*,.srt"
          className="hidden" 
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center py-6 text-auralis">
            <Loader2 className="w-10 h-10 mb-4 animate-spin text-auralis" />
            <p className={cn(
              "text-sm font-bold tracking-wide uppercase transition-colors duration-300",
              isLight ? "text-zinc-800" : "text-white"
            )}>
              {uploadStatus || "Processing AI Transcription & Semantic Analysis..."}
            </p>
            
            {/* Step Progress Pills */}
            <div className="flex items-center gap-2 mt-4">
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                currentStep >= 1 ? "bg-auralis/15 border-auralis/30 text-auralis" : "bg-white/5 border-white/10 text-zinc-500"
              )}>
                <span>1. Diarized Speech</span>
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                currentStep >= 2 ? "bg-auralis/15 border-auralis/30 text-auralis" : "bg-white/5 border-white/10 text-zinc-500"
              )}>
                <span>2. Emotion & Sounds</span>
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                currentStep >= 3 ? "bg-auralis/15 border-auralis/30 text-auralis" : "bg-white/5 border-white/10 text-zinc-500"
              )}>
                <span>3. Studio Setup</span>
              </div>
            </div>

            <p className={`text-[11px] mt-3 max-w-[280px] mx-auto leading-relaxed transition-all duration-300 ${
              isLight ? 'text-zinc-500' : 'text-white/40'
            }`}>
              Please keep this window open. All other views remain locked until analysis is complete.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-all duration-300 shadow-md border group-hover:border-auralis/30",
              isLight ? "bg-zinc-100 border-zinc-200" : "bg-white/5 border-white/10 group-hover:shadow-auralis/10"
            )}>
              <UploadCloud className="w-7 h-7 text-auralis" />
            </div>
            <p className={cn(
              "text-base font-bold mb-1 tracking-tight transition-colors duration-300",
              isLight ? "text-zinc-850" : "text-white"
            )}>
              Drop your Video, Audio or SRT file here
            </p>
            <p className={`text-[12px] mb-4 transition-colors duration-300 ${isLight ? 'text-zinc-500' : 'text-[#A0A0A5]'}`}>
              Supports MP4, MOV, WebM, MP3, WAV or subtitle .SRT
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 bg-auralis hover:bg-[#C5A028] text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <VideoIcon size={14} />
                <span>Select Video / Audio</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  srtInputRef.current?.click();
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer",
                  isLight 
                    ? "bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-700" 
                    : "bg-[#1E1E22] hover:bg-[#28282D] border-white/10 text-white"
                )}
              >
                <FileText size={14} className="text-auralis" />
                <span>Upload SRT Subtitles</span>
              </button>
              <input 
                type="file" 
                ref={srtInputRef}
                onChange={handleSRTChange}
                accept=".srt"
                className="hidden" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-6 text-left">
        <div className={cn(
          "p-3.5 rounded-xl border text-xs",
          isLight ? "bg-white border-zinc-200 text-zinc-700" : "bg-[#121215] border-white/5 text-zinc-300"
        )}>
          <div className="flex items-center gap-2 font-bold text-auralis mb-1 text-[11px] uppercase tracking-wider">
            <Sparkles size={13} />
            <span>Speaker Diarization</span>
          </div>
          <p className="text-[11px] opacity-70 leading-relaxed">
            Multi-speaker voice separation with individual color-coded caption tracks.
          </p>
        </div>

        <div className={cn(
          "p-3.5 rounded-xl border text-xs",
          isLight ? "bg-white border-zinc-200 text-zinc-700" : "bg-[#121215] border-white/5 text-zinc-300"
        )}>
          <div className="flex items-center gap-2 font-bold text-auralis mb-1 text-[11px] uppercase tracking-wider">
            <CheckCircle2 size={13} />
            <span>Automated Analysis</span>
          </div>
          <p className="text-[11px] opacity-70 leading-relaxed">
            Emotions and ambient sounds are analyzed automatically on upload.
          </p>
        </div>

        <div className={cn(
          "p-3.5 rounded-xl border text-xs",
          isLight ? "bg-white border-zinc-200 text-zinc-700" : "bg-[#121215] border-white/5 text-zinc-300"
        )}>
          <div className="flex items-center gap-2 font-bold text-auralis mb-1 text-[11px] uppercase tracking-wider">
            <ShieldCheck size={13} />
            <span>Inclusive Profiles</span>
          </div>
          <p className="text-[11px] opacity-70 leading-relaxed">
            Purpose-driven profiles for Dyslexia, Low Vision, ADHD, and Deaf / Hard of Hearing.
          </p>
        </div>
      </div>
      
      {error && (
        <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 w-full text-center text-xs font-semibold leading-relaxed">
          <strong>Transcription Alert:</strong> {error}
        </div>
      )}
    </div>
  );
}

