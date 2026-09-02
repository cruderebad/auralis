import { renderFrame } from '../engine/renderer';
import { useEditorStore } from '../store/useEditorStore';
import { AssetLoader } from './assetLoader';
import { assetManager } from '../engine/assetManager';
import { getFFmpeg } from './ffmpeg';

export interface ExportProgressUpdate {
  percent: number;
  statusText: string;
}

let sharedAudioCtx: AudioContext | null = null;
let sharedDest: MediaStreamAudioDestinationNode | null = null;

export class QuickExportEngine {
  public static async exportVideo(
    onProgress: (status: ExportProgressUpdate) => void,
    removeWatermark: boolean = false
  ): Promise<Blob> {
    console.log('[QuickExportEngine] Initiating quick export pipeline...');
    onProgress({ percent: 1, statusText: 'Initializing...' });

    const store = useEditorStore.getState();
    const duration = store.duration || 10;
    const canvasWidth = store.resolutionSize.width;
    const canvasHeight = store.resolutionSize.height;

    onProgress({ percent: 5, statusText: 'Preloading timeline media assets...' });
    try {
      await AssetLoader.preloadTracks(store.tracks);
    } catch (preloadErr) {
      console.warn('[QuickExportEngine] Asset preloading warned:', preloadErr);
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to acquire 2D rendering canvas context.');

    onProgress({ percent: 10, statusText: 'Starting export...' });

    return new Promise(async (resolve, reject) => {
            // 1. Prepare stream
      const stream = (exportCanvas as any).captureStream(store.fps);
          
      try {
        if (!sharedAudioCtx) {
          sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          sharedDest = sharedAudioCtx.createMediaStreamDestination();
        }
        const audioCtx = sharedAudioCtx;
        const dest = sharedDest!;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        
        // Find main video element and connect it
        const mainVideo = document.getElementById('preview-video') as HTMLVideoElement;
        if (mainVideo) {
          if (!(mainVideo as any)._audioSourceNode) {
            (mainVideo as any)._audioSourceNode = audioCtx.createMediaElementSource(mainVideo);
          }
          const source = (mainVideo as any)._audioSourceNode;
          source.disconnect();
          source.connect(dest);
          source.connect(audioCtx.destination); // Keep it audible
        }
        
        // Find all secondary audio/video elements used in the timeline
        store.tracks.forEach(track => {
          if (track.type === 'audio' || track.type === 'video') {
            track.clips.forEach(clip => {
              if (clip.sourceUrl && clip.sourceUrl !== store.videoUrl) {
                const mediaElement = track.type === 'audio' 
                   ? assetManager.getAudioElement(clip.sourceUrl)
                   : assetManager.getVideoElement(clip.sourceUrl);
                
                if (mediaElement) {
                   if (!(mediaElement as any)._audioSourceNode) {
                      (mediaElement as any)._audioSourceNode = audioCtx.createMediaElementSource(mediaElement);
                   }
                   const source = (mediaElement as any)._audioSourceNode;
                   source.disconnect();
                   source.connect(dest);
                   source.connect(audioCtx.destination);
                }
              }
            });
          }
        });
        
        // Add the mixed audio tracks to the canvas stream
        dest.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      } catch (err) {
        console.warn('[QuickExportEngine] Failed to mix audio:', err);
      }
            
      let mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp9';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        videoBitsPerSecond: 16000000 // 8 Mbps for decent quality
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onerror = (err) => {
        reject(err);
      };

      const workerCode = `
        let interval;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            interval = setInterval(() => self.postMessage('tick'), 1000 / 60);
          } else if (e.data === 'stop') {
            clearInterval(interval);
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      
      let isRecording = false;
      let startTime = performance.now();

      mediaRecorder.onstop = async () => {
        worker.postMessage('stop');
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        store.setIsPlaying(false);
        const finalBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
        
        if (mediaRecorder.mimeType.includes('mp4')) {
           resolve(finalBlob);
           return;
        }
        
        onProgress({ percent: 99, statusText: 'Converting to MP4 format...' });
        try {
           const ffmpeg = await getFFmpeg();
           const inputName = 'quick_temp.webm';
           const outputName = 'quick_final.mp4';
           
           const buffer = new Uint8Array(await finalBlob.arrayBuffer());
           await ffmpeg.writeFile(inputName, buffer);
           
           let bitrateArgs = ['-crf', '23'];
           if (store.resolution === '4K') {
             bitrateArgs = ['-b:v', '45M', '-maxrate', '68M', '-bufsize', '90M'];
           } else if (store.resolution === '1440p') {
             bitrateArgs = ['-b:v', '20M', '-maxrate', '30M', '-bufsize', '40M'];
           } else if (store.resolution === '1080p') {
             bitrateArgs = ['-b:v', '14M', '-maxrate', '20M', '-bufsize', '28M'];
           } else if (store.resolution === '720p') {
             bitrateArgs = ['-b:v', '7M', '-maxrate', '10M', '-bufsize', '14M'];
           } else {
             bitrateArgs = ['-b:v', '3M', '-maxrate', '5M', '-bufsize', '7M'];
           }

           const code = await ffmpeg.exec([
             '-i', inputName,
             '-c:v', 'libx264',
             '-pix_fmt', 'yuv420p',
             '-profile:v', 'high',
             '-level', '4.0',
             '-color_primaries', 'bt709',
             '-color_trc', 'bt709',
             '-colorspace', 'bt709',
             '-preset', 'fast',
             '-r', store.fps.toString(),
             '-vsync', '1',
             ...bitrateArgs,
             '-c:a', 'aac',
             '-b:a', '192k',
             '-movflags', '+faststart',
             outputName
           ]);
           
           if (code === 0) {
             const outBytes = await ffmpeg.readFile(outputName);
             const mp4Blob = new Blob([outBytes], { type: 'video/mp4' });
             resolve(mp4Blob);
             
             // Cleanup
             ffmpeg.deleteFile(inputName).catch(() => {});
             ffmpeg.deleteFile(outputName).catch(() => {});
           } else {
             console.warn('[QuickExport] FFmpeg conversion failed, returning webm fallback.');
             resolve(finalBlob);
           }
        } catch (e) {
           console.warn('[QuickExport] FFmpeg conversion error:', e);
           resolve(finalBlob);
        }
      };

      // Ensure audio track integration:
      // The prompt doesn't explicitly state how audio should be captured, 
      // but MediaRecorder only captures the canvas (video). To capture audio, 
      // we would need to capture audio streams. However, we'll follow the exact instruction 
      // which states "The export should simply: Canvas -> captureStream() -> MediaRecorder".
      // Wait, let's see if we can capture audio if needed, but for now we follow the exact steps.

      const renderLoop = () => {
        if (!isRecording) return;
        const currentStore = useEditorStore.getState();
        
        // Progress update
        
        let highestTime = currentStore.currentTime;
        if (highestTime === 0 && performance.now() - startTime > 500) {
           highestTime = duration; // It reset!
        }
        const progress = Math.min((highestTime / duration) * 100, 100);

        onProgress({
          percent: Math.round(10 + (progress * 0.9)),
          statusText: `Recording in real-time... ${Math.round(progress)}%`
        });

        // Use isExportingMode = false to allow real-time playback sync
        renderFrame(
          ctx,
          currentStore.currentTime,
          currentStore.tracks,
          canvasWidth,
          canvasHeight,
          currentStore.style,
          false
        );

        if (!removeWatermark) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          const fontSize = Math.max(16, canvasHeight * 0.025);
          ctx.font = `500 ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          ctx.fillText('made with auralis', canvasWidth - 20, 20);
          ctx.font = `400 ${fontSize * 0.8}px Inter, sans-serif`;
          ctx.fillText('auralis-studio.vercel.app', canvasWidth - 20, 20 + fontSize + 4);
          ctx.restore();
        }

        if (!currentStore.isPlaying && (performance.now() - startTime > 1000)) {
          isRecording = false;
          mediaRecorder.stop();
        }
      };

      // Seek to 0 and start playing
      store.setIsPlaying(false);
      store.setCurrentTime(0);
      
      // Let the video elements seek and buffer before starting
      setTimeout(() => {
        startTime = performance.now();
        store.setIsPlaying(true);
        mediaRecorder.start();
        isRecording = true;
        worker.onmessage = () => {
          if (isRecording) renderLoop();
        };
        worker.postMessage('start');
      }, 500); // 500ms delay to ensure seek completes
    });
  }
}
