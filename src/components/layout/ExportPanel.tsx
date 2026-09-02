import { useConfirm } from '../../context/ConfirmContext';
import React, { useState, useEffect } from 'react';
import { 
  Download, 
  ArrowLeft, 
  Film, 
  Tv, 
  Compass, 
  CheckCircle2, 
  Loader2, 
  Info,
  Clock,
  FileJson,
  Type,
  Star,
  X,
  Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ExportEngine } from '../../export/exportEngine';
import { QuickExportEngine } from '../../export/quickExportEngine';
import { useStore } from '../../store';
import { formatTime, cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useFeatures } from '../../useFeatures';

interface ExportPanelProps {
  onClose: () => void;
}

export function ExportPanel({ onClose }: ExportPanelProps) {
  const { alert } = useConfirm();
  const store = useStore();
  const { profile, deductCredits } = useAuth();
  const { hasFeature } = useFeatures();
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState('Standing by');
  const isExporting = store.isExporting;
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackStep, setFeedbackStep] = useState<1 | 2>(1);
  const [userFeedbackText, setUserFeedbackText] = useState('');
  const [userRating, setUserRating] = useState(0);


  const userPlan = (profile?.plan || 'Free').split('|')[0].toLowerCase();
  const isProUser = userPlan === 'creator' || userPlan === 'pro' || userPlan === 'studio';

  useEffect(() => {
    if ((!isProUser && !hasFeature('4K Export')) && store.resolution === '4K') {
      store.setResolution('1080p');
    }
    if ((!isProUser && !hasFeature('60 FPS Export')) && store.fps === 60) {
      store.setFps(30);
    }
  }, [profile?.plan, store.resolution, store.fps, isProUser]);

  // Export Settings
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  
  const [exportMethod, setExportMethod] = useState<'quick' | 'studio'>('quick');
  
  const isQuickExportSupported = typeof MediaRecorder !== 'undefined' && ('captureStream' in HTMLCanvasElement.prototype || 'mozCaptureStream' in HTMLCanvasElement.prototype);
  const [removeWatermark, setRemoveWatermark] = useState(false);

  const handleStartExportClick = () => {
    if (store.resolution === '4K' && !isProUser && !hasFeature('4K Export')) {
      setErrorMessage('4K export is locked for Free users. This feature is locked.');
      return;
    }
    const baseStudioCreditPerMin = store.resolution === '4K' ? 60 : 40;
    const baseQuickCreditPerMin = store.resolution === '4K' ? 20 : 10;
    let creditsNeeded = exportMethod === 'studio' ? Math.max(baseStudioCreditPerMin, Math.ceil(store.duration / 60) * baseStudioCreditPerMin) : Math.max(baseQuickCreditPerMin, Math.ceil(store.duration / 60) * baseQuickCreditPerMin);
    if (removeWatermark) creditsNeeded += 10;
    if (profile) {
      if (profile.credits < creditsNeeded) {
        setErrorMessage(`Insufficient credits. You need ${creditsNeeded} credits, but have ${profile.credits}.`);
        return;
      }
    }
    
    // reset feedback state
    setFeedbackStep(1);
    setUserFeedbackText('');
    setUserRating(0);
    setShowFeedbackModal(true);
  };

  const startExportProcess = async (ratingVal: number) => {
    setShowFeedbackModal(false);
    
    // Save feedback to admin panel
    if (profile) {
      try {
        await supabase.from('feedback').insert([{
          user_id: profile.id,
          category: 'Export Feedback',
          subject: 'Export flow feedback',
          description: userFeedbackText || 'No text feedback provided',
          rating: ratingVal,
          status: 'Open'
        }]);
      } catch (err) {
        console.warn('Could not save feedback', err);
      }
    }

    const baseStudioCreditPerMin = store.resolution === '4K' ? 60 : 40;
    const baseQuickCreditPerMin = store.resolution === '4K' ? 20 : 10;
    let creditsNeeded = exportMethod === 'studio' ? Math.max(baseStudioCreditPerMin, Math.ceil(store.duration / 60) * baseStudioCreditPerMin) : Math.max(baseQuickCreditPerMin, Math.ceil(store.duration / 60) * baseQuickCreditPerMin);
    if (removeWatermark) creditsNeeded += 10;
    
    store.setExportState(true, 1);
    setDownloadUrl(null);
    setOutputBlob(null);
    setErrorMessage(null);
    setExportProgress(1);
    setExportStatusText('Initializing compiler...');

    try {
      const blob = exportMethod === 'quick' ? await QuickExportEngine.exportVideo((status) => {
        setExportProgress(status.percent);
        setExportStatusText(status.statusText);
      }, removeWatermark) : await ExportEngine.exportVideo((status) => {
        setExportProgress(status.percent);
        setExportStatusText(status.statusText);
      }, removeWatermark);
      const downloadLink = URL.createObjectURL(blob);
      setDownloadUrl(downloadLink);
      setOutputBlob(blob);
      
      if (profile) {
        await deductCredits(creditsNeeded);
      }
    } catch (err: any) {
      console.error('[ExportUI] Export failed:', err);
      setErrorMessage(err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'An error occurred during video rendering and compilation.');
    } finally {
      
      store.setExportState(false, 0);
    }
  };

  const downloadProjectFile = () => {
    const data = store.getProjectData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.title || 'project'}.auralis`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadCaptions = () => {
    // Basic SRT generation from text track
    const textTrack = store.tracks.find(t => t.type === 'text');
    if (!textTrack) return;
    
    let srtData = '';
    textTrack.clips.forEach((clip, index) => {
      const formatTimeSRT = (secs: number) => {
        const d = new Date(secs * 1000);
        const h = String(d.getUTCHours()).padStart(2, '0');
        const m = String(d.getUTCMinutes()).padStart(2, '0');
        const s = String(d.getUTCSeconds()).padStart(2, '0');
        const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
        return `${h}:${m}:${s},${ms}`;
      };
      
      srtData += `${index + 1}\n`;
      srtData += `${formatTimeSRT(clip.start)} --> ${formatTimeSRT(clip.end)}\n`;
      srtData += `${clip.textFields?.text || ''}\n\n`;
    });
    
    const blob = new Blob([srtData], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store.projectTitle || 'captions'}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-full w-full bg-[#111] text-[#E0E0E0] p-8 flex flex-col font-sans select-none overflow-y-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <button
          onClick={onClose}
          disabled={isExporting}
          className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all", isExporting ? "opacity-50 cursor-not-allowed bg-[#111] border border-white/5 text-white/50" : "bg-[#1A1A1A] hover:bg-[#252525] border border-white/5 text-white/80 cursor-pointer")}
        >
          <ArrowLeft size={14} />
          <span>BACK TO TIMELINE</span>
        </button>
        <div className="flex items-center gap-2 text-xs font-mono bg-auralis/10 text-auralis px-2.5 py-1 rounded-full font-bold">
          <Film size={12} />
          <span>H.264 COMPILER ACTIVE</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start my-auto">
        {/* Left Side: Export Parameters */}
        <div className="space-y-6 bg-[#181818] p-6 rounded-2xl border border-white/5 shadow-2xl">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Export Settings</h2>
            <p className="text-[#888] text-xs">Configure your rendering options before launching the compilation.</p>
          </div>

            {/* Export Method Selection */}
            <div className="space-y-3 mb-6">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#666]">EXPORT METHOD</label>
                
              <div 
                onClick={() => !isExporting && isQuickExportSupported && setExportMethod('quick')}
                className={cn(
                  "p-4 rounded-xl border transition-all relative overflow-hidden",
                  (!isQuickExportSupported || isExporting) ? "opacity-50 cursor-not-allowed bg-[#111] border-white/5" : "cursor-pointer",
                  exportMethod === 'quick' && (!isExporting)
                    ? "bg-purple-900/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]" 
                    : "bg-[#222] border-transparent hover:bg-[#282828]"
                )}
              >
                {exportMethod === 'quick' && <div className="absolute top-0 right-0 bg-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">RECOMMENDED</div>}
                <div className="flex items-start gap-3">
                  <div className="text-xl">⚡</div>
                  <div className="space-y-1">
                    <h3 className={cn("font-bold", exportMethod === 'quick' ? "text-purple-400" : "text-white")}>Quick Export</h3>
                    <p className="text-xs text-[#888] leading-relaxed">
                      Fastest real-time capture.
                    </p>
                    {!isQuickExportSupported && <p className="text-xs text-red-400 mt-2 font-bold">Quick Export is not supported in this browser.</p>}
                  </div>
                </div>
              </div>

              <div 
                onClick={() => !isExporting && setExportMethod('studio')}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                  exportMethod === 'studio' 
                    ? "bg-auralis/10 border-auralis shadow-[0_0_15px_rgba(212,175,55,0.1)]" 
                    : "bg-[#222] border-transparent hover:bg-[#282828]"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl">🎬</div>
                  <div className="space-y-1">
                    <h3 className={cn("font-bold", exportMethod === 'studio' ? "text-auralis" : "text-white")}>Studio Export</h3>
                    <p className="text-xs text-[#888] leading-relaxed">
                      Maximum quality using FFmpeg rendering.
                    </p>
                    <p className="text-[10px] text-white/50 pt-1 font-mono">Estimated speed: 3–10× video duration depending on device.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Format Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#666]">CONTAINER FORMAT</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => !isExporting && setSelectedFormat('mp4')}
                  className={cn(
                    "py-2.5 rounded-xl border font-bold text-xs transition-all text-center",
                    isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                    selectedFormat === 'mp4' 
                      ? "bg-auralis/10 border-auralis text-auralis" 
                      : "bg-[#222] border-transparent text-[#999] hover:bg-[#282828]"
                  )}
                >
                  MPEG-4 (MP4)
                </button>
                <button
                  disabled
                  className="py-2.5 rounded-xl border border-transparent bg-[#1A1A1A] font-bold text-xs text-[#444] cursor-not-allowed text-center"
                >
                  QuickTime (MOV)
                </button>
              </div>
            </div>

            {/* Resolution Selector moved to export tab */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#666]">OUTPUT RESOLUTION</label>
              <div className="grid grid-cols-5 gap-2">
                {['4K', '1440p', '1080p', '720p', '480p'].map((res) => {
                  const is4K = res === '4K';
                  const isLocked = is4K && !isProUser && !hasFeature('4K Export');
                  return (
                    <button
                      key={res}
                      type="button"
                      onClick={() => {
                        if (isExporting) return;
                        if (isLocked) {
                          alert("4K export is locked for Free users!", "Pro Plan");
                          return;
                        }
                        store.setResolution(res);
                      }}
                      className={cn(
                        "py-3 rounded-xl border font-bold text-xs transition-all text-center relative",
                        isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                        isLocked 
                          ? "bg-[#181818] border-amber-500/30 text-gray-400 hover:border-amber-500/50" 
                          : store.resolution === res 
                            ? "bg-auralis/10 border-auralis text-auralis" 
                            : "bg-[#222] border-transparent text-[#999] hover:bg-[#282828]"
                      )}
                    >
                      <div className="font-bold flex items-center justify-center gap-1">
                        {res}
                        {res === '1080p' && <span className="text-[8px] text-amber-500 font-normal absolute -top-2 bg-[#222] px-1 rounded border border-amber-500/30">REC</span>}
                        {isLocked && <Lock size={11} className="text-amber-400 shrink-0" />}
                      </div>
                      <div className="text-[8px] font-mono opacity-60">
                        {is4K ? ((isProUser || hasFeature('4K Export')) ? 'UHD 2160' : 'PRO ONLY') : res === '1440p' ? 'QHD 1440' : res === '1080p' ? 'HD 1080' : res === '720p' ? 'HD 720' : 'SD 480'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Encoding Display Details */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#666]">ENCODING DETAILS</label>
              <div className="bg-[#1F1F1F] p-3 rounded-xl border border-white/5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tv className="text-auralis" size={16} />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">{store.resolution} Preset</h4>
                      <p className="text-[10px] text-[#888] font-mono">{store.resolutionSize.width} × {store.resolutionSize.height}px</p>
                    </div>
                  </div>
                  <div className="text-xs font-mono bg-white/5 px-2 py-1 rounded text-white/50">{store.aspectRatio}</div>
                </div>
                <div className="flex gap-4 border-t border-white/5 pt-3">
                  <div>
                    <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-0.5">Bitrate</h4>
                    <p className="text-[11px] font-mono text-white/80">{store.resolution === '4K' ? '35-68 Mbps' : store.resolution === '1440p' ? '16-24 Mbps' : store.resolution === '720p' ? '5-10 Mbps' : store.resolution === '480p' ? '2-5 Mbps' : '8-20 Mbps'}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-0.5">Codec</h4>
                    <p className="text-[11px] font-mono text-white/80">H.264 (MP4)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Frame rate Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#666]">FRAME RATE</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => !isExporting && store.setFps(30)}
                    className={cn(
                      "flex-1 py-2 rounded-xl border font-bold text-xs transition-all text-center",
                      isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      store.fps === 30
                        ? "bg-auralis/10 border-auralis text-auralis"
                        : "bg-[#222] border-transparent text-[#999] hover:bg-[#282828]"
                    )}
                  >
                    30 FPS
                  </button>
                  <button
                    onClick={() => {
                      if (isExporting) return;
                      if (!isProUser && !hasFeature('60 FPS Export')) {
                        alert("60 FPS export is locked for Free users!", "Creator Plan");
                        return;
                      }
                      store.setFps(60);
                    }}
                    className={cn(
                      "flex-1 py-2 rounded-xl border font-bold text-xs transition-all text-center flex items-center justify-center gap-1",
                      isExporting ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      (!isProUser && !hasFeature('60 FPS Export'))
                        ? "bg-[#181818] border-amber-500/30 text-gray-400 hover:border-amber-500/50"
                        : store.fps === 60
                          ? "bg-auralis/10 border-auralis text-auralis"
                          : "bg-[#222] border-transparent text-[#999] hover:bg-[#282828]"
                    )}
                  >
                    60 FPS
                    {(!isProUser && !hasFeature('60 FPS Export')) && <Lock size={10} className="text-amber-400 shrink-0" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#666]">TIMELINE LENGTH</label>
                <div className="bg-[#1F1F1F] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono font-bold text-white">
                  <Clock size={12} className="text-[#666]" />
                  <span>{formatTime(store.duration)}</span>
                </div>
              </div>
            </div>
          </div>

          {!isExporting && !downloadUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-[#1F1F1F] p-3 rounded-xl border border-white/5">
                <input 
                  type="checkbox" 
                  id="removeWatermark" 
                  checked={removeWatermark}
                  onChange={(e) => setRemoveWatermark(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-black/20 text-auralis focus:ring-auralis/50 focus:ring-offset-0"
                />
                <label htmlFor="removeWatermark" className="text-xs text-[#AAA] cursor-pointer flex-1 select-none">
                  Remove Auralis watermark
                </label>
              </div>
              <button
                onClick={handleStartExportClick}
                className="w-full bg-gold-premium hover:brightness-110 active:scale-95 text-black py-3 rounded-xl font-bold text-xs tracking-wider transition-all shadow-[0_4px_20px_rgba(223,172,36,0.25)] select-none text-center block cursor-pointer uppercase duration-300"
              >
                Compile & Export Video
              </button>
              <div className="text-center text-[10px] text-amber-500/80 mt-2 px-2 leading-relaxed">
                Estimated time depends on your device's processing power and can take up to 5-10 minutes, especially for 4K.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center leading-relaxed">
              <strong>Export Failure:</strong> {errorMessage}
            </div>
          )}
        </div>

        {/* Right Side: Visual Rendering Status Monitor */}
        <div className="h-full bg-[#181818] p-6 rounded-2xl border border-white/5 flex flex-col justify-between shadow-2xl min-h-[340px]">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Monitoring Engine</h3>
            <p className="text-[#888] text-[10px]">Real-time visual stream compilation status.</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-6">
            {!isExporting && !downloadUrl && (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5 mx-auto">
                  <Compass size={22} className="text-[#666]" />
                </div>
                <p className="text-xs text-[#888]">Renderer standing by. Ready to export.</p>
              </div>
            )}

            {isExporting && (
              <div className="w-full space-y-4 max-w-xs text-center">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <Loader2 size={36} className="text-auralis animate-spin absolute" />
                  <span className="text-xs font-mono font-bold text-white">{exportProgress}%</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-auralis uppercase tracking-wide font-mono">
                    {exportStatusText}
                  </h4>
                  <p className="text-xs text-amber-500 font-bold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 mt-2">
                    ⚠️ Warning: Do not navigate away or close this tab, otherwise the render will get corrupted.
                  </p>
                </div>
                {/* Visual Progress Track */}
                <div className="w-full bg-[#2a2a2a] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-auralis h-full rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {downloadUrl && (
              <div className="text-center space-y-4 max-w-xs">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 mx-auto text-green-400">
                  <CheckCircle2 size={28} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">Compilation Success!</h4>
                  <p className="text-[10px] text-[#888]">Your H.264 high-fidelity video file is ready.</p>
                </div>
                <div className="space-y-2 w-full pt-4">
                  <a
                    href={downloadUrl}
                    download={`${store.projectTitle || 'export_nle_composition'}.${outputBlob?.type.includes('webm') ? 'webm' : 'mp4'}`}
                    className="w-full bg-green-500 hover:bg-green-400 text-black py-2.5 rounded-xl font-bold text-[10px] tracking-wider transition-all shadow-[0_4px_12px_rgba(34,197,94,0.2)] flex items-center justify-center gap-2 block text-center cursor-pointer uppercase"
                  >
                    <Download size={13} />
                    <span>Download {outputBlob?.type.includes('webm') ? 'WEBM' : 'MP4'}</span>
                  </a>
                  <button
                    onClick={downloadProjectFile}
                    className="w-full bg-[#1A1A1A] hover:bg-[#252525] border border-white/10 text-white py-2.5 rounded-xl font-bold text-[10px] tracking-wider transition-all flex items-center justify-center gap-2 block text-center cursor-pointer uppercase"
                  >
                    <FileJson size={13} />
                    <span>Download .auralis Project</span>
                  </button>
                  <button
                    onClick={downloadCaptions}
                    className="w-full bg-[#1A1A1A] hover:bg-[#252525] border border-white/10 text-white py-2.5 rounded-xl font-bold text-[10px] tracking-wider transition-all flex items-center justify-center gap-2 block text-center cursor-pointer uppercase"
                  >
                    <Type size={13} />
                    <span>Download Captions (.srt)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2.5 text-[10px] text-white/40 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
            <Info size={12} className="text-auralis shrink-0 mt-0.5" />
            <p>Our client-side WebAssembly NLE compilation encodes frame-by-frame directly in your sandbox. Download complete results instantly.</p>
          </div>
        </div>
      </div>

      {/* Feedback Modal Before Export */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowFeedbackModal(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            {feedbackStep === 1 ? (
              <div>
                <h3 className="text-xl font-bold text-white mb-2">How is your experience?</h3>
                <p className="text-sm text-gray-400 mb-4">Before we compile your video, let us know if you have any feedback.</p>
                <textarea 
                  value={userFeedbackText}
                  onChange={(e) => setUserFeedbackText(e.target.value)}
                  placeholder="Tell us what you like or what we can improve..."
                  className="w-full h-32 bg-[#1A1A1A] border border-white/5 rounded-xl p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50 resize-none mb-4"
                />
                <div className="flex justify-between items-center gap-3">
                  <button 
                    onClick={() => setFeedbackStep(2)}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-colors"
                  >
                    Skip
                  </button>
                  <button 
                    onClick={() => setFeedbackStep(2)}
                    className="flex-1 px-4 py-2 bg-[#6B46C1] hover:bg-[#7b57db] text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold text-white mb-2 text-center">Rate your experience</h3>
                <p className="text-sm text-gray-400 mb-6 text-center">How many stars would you give us?</p>
                
                <div className="flex justify-center items-center gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => startExportProcess(star)}
                      onMouseEnter={() => setUserRating(star)}
                      onMouseLeave={() => setUserRating(0)}
                      className="transition-transform hover:scale-110 p-1"
                    >
                      <Star 
                        size={36} 
                        className={cn(
                          "transition-colors",
                          userRating >= star ? "fill-amber-400 text-amber-400" : "text-gray-600"
                        )} 
                      />
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={() => startExportProcess(0)}
                  className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-gray-300 transition-colors"
                >
                  Skip Rating
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default ExportPanel;
