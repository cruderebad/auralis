import { getFFmpeg } from './ffmpeg';
import { renderFrame } from '../engine/renderer';
import { useEditorStore } from '../store/useEditorStore';
import { AssetLoader } from './assetLoader';

export interface ExportProgressUpdate {
  percent: number;
  statusText: string;
}

/**
 * NLE Export Engine with Chunked Rendering.
 * Renders composition frame-by-frame, processes in chunks to avoid WebAssembly FS OOM crashes,
 * and concatenates chunks into a single high-fidelity MP4 using FFmpeg.
 */
export class ExportEngine {
  public static async exportVideo(
    onProgress: (status: ExportProgressUpdate) => void,
    removeWatermark: boolean = false
  ): Promise<Blob> {
    console.log('[ExportEngine] Initiating deterministic chunked export pipeline...');
    onProgress({ percent: 1, statusText: 'Initializing FFmpeg instance...' });

    const store = useEditorStore.getState();
    const ffmpeg = await getFFmpeg();
    onProgress({ percent: 4, statusText: 'Preloading timeline media assets...' });

    // Preload tracks before rendering
    try {
      await AssetLoader.preloadTracks(store.tracks);
    } catch (preloadErr) {
      console.warn('[ExportEngine] Asset preloading warned, proceeding anyway:', preloadErr);
    }

    const duration = store.duration || 10;
    const fps = store.fps || 30;
    const totalFrames = Math.ceil(duration * fps);
    const canvasWidth = store.resolutionSize.width;
    const canvasHeight = store.resolutionSize.height;

    // Create a local canvas for off-screen drawing
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    const ctx = exportCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('[ExportEngine] Failed to acquire 2D rendering canvas context.');
    }

    onProgress({ percent: 6, statusText: 'Preparing timeline streams...' });

    let sourceVideoName = 'source_video.mp4';
    if (store.videoFile) {
      try {
        const extension = store.videoFile.name.split('.').pop() || 'mp4';
        sourceVideoName = `source_video.${extension}`;
        
        onProgress({ percent: 7, statusText: 'Caching reference video stream...' });
        const fileBytes = new Uint8Array(await store.videoFile.arrayBuffer());
        await ffmpeg.writeFile(sourceVideoName, fileBytes);
        console.log('[ExportEngine] Reference video cached.');
      } catch (writeErr) {
        console.warn('[ExportEngine] Writing video file failed/skipped:', writeErr);
      }
    }

    // Parameters for Chunk-based rendering
    let chunkSize = 120;
    if (canvasWidth * canvasHeight >= 3840 * 2160) {
      chunkSize = 15; // 4K takes a lot of RAM
    } else if (canvasWidth * canvasHeight >= 1920 * 1080) {
      chunkSize = 45; // 1080p
    }
    const totalChunks = Math.ceil(totalFrames / chunkSize);
    console.log(`[ExportEngine] Rendering total of ${totalFrames} frames in ${totalChunks} chunk(s) (chunkSize: ${chunkSize}).`);

    const chunkFiles: string[] = [];

    for (let c = 0; c < totalChunks; c++) {
      const startFrame = c * chunkSize;
      const endFrame = Math.min(totalFrames, (c + 1) * chunkSize);
      const chunkFrameCount = endFrame - startFrame;

      onProgress({ 
        percent: Math.round(10 + (c / totalChunks) * 60), 
        statusText: `Rendering chunk ${c + 1} of ${totalChunks} (frames ${startFrame}-${endFrame - 1})...` 
      });

      const frameNames: string[] = [];

      for (let f = startFrame; f < endFrame; f++) {
        const frameTime = f / fps;
        const innerFrameIdx = f - startFrame;

        // Render entire timeline frame onto offscreen canvas context
        await renderFrame(
          ctx,
          frameTime,
          store.tracks,
          canvasWidth,
          canvasHeight,
          store.style,
          true // High-accuracy export-seek mode
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

        // Capture frame as JPEG binary to minimize WebAssembly virtual storage consumption
        const blob = await new Promise<Blob | null>((resolve) => {
          exportCanvas.toBlob(resolve, 'image/jpeg', 0.85);
        });

        if (!blob) {
          throw new Error(`[ExportEngine] Frame composition failed at frame ${f}.`);
        }

        const bufferBytes = new Uint8Array(await blob.arrayBuffer());
        const frameName = `frame_${innerFrameIdx.toString().padStart(5, '0')}.jpg`;
        await ffmpeg.writeFile(frameName, bufferBytes);
        frameNames.push(frameName);

        // Frequent UI feedback inside chunk render loop
        if (f % 15 === 0 || f === endFrame - 1) {
          const rawPercentage = Math.round(10 + ((f / totalFrames) * 60));
          onProgress({
            percent: rawPercentage,
            statusText: `Rendering frame ${f + 1} of ${totalFrames} (Chunk ${c + 1}/${totalChunks})`
          });
        }
      }

      // Compile current chunk into intermediate MPEG Transport Stream (.ts) 
      // TS matches H.264 streams and is completely safe to concatenate without audio drift
      const chunkFilename = `chunk_${c}.ts`;
      onProgress({ 
        percent: Math.round(10 + ((c + 0.8) / totalChunks) * 60), 
        statusText: `Encoding chunk ${c + 1} of ${totalChunks} into H.264...` 
      });

      
      // attach log listener
      let chunkLogs = "";
      const logCb = ({ message }) => { chunkLogs += message + "\n"; };
      ffmpeg.on("log", logCb);
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

      const chunkExit = await ffmpeg.exec([
        '-framerate', fps.toString(),
        '-i', 'frame_%05d.jpg',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
        '-level', '4.0',
        '-color_primaries', 'bt709',
        '-color_trc', 'bt709',
        '-colorspace', 'bt709',
        '-preset', 'fast',
        '-r', fps.toString(),
        '-vsync', '1',
        ...bitrateArgs,
        chunkFilename
      ]);

      ffmpeg.off("log", logCb);
      if (chunkExit !== 0) {
        console.error("FFMPEG CHUNK LOGS:", chunkLogs);
        throw new Error(`[ExportEngine] Chunk compilation failed at chunk ${c} (code ${chunkExit}). Logs: ${chunkLogs.substring(0, 500)}`);

        throw new Error(`[ExportEngine] Chunk compilation failed at chunk ${c} (code ${chunkExit}).`);
      }

      chunkFiles.push(chunkFilename);

      // Free virtual memory by purging Standard JPEGs of current chunk immediately
      for (const name of frameNames) {
        try {
          await ffmpeg.deleteFile(name);
        } catch (delErr) {
          console.warn(`[ExportEngine] Error purging temporary frame file: ${name}`, delErr);
        }
      }
    }

    // Concatenate all TS chunks together
    onProgress({ percent: 75, statusText: 'Concatenating video scene chunks...' });
    const concatFilename = 'concat.txt';
    const concatLines = chunkFiles.map(file => `file '${file}'`).join('\n');
    await ffmpeg.writeFile(concatFilename, new TextEncoder().encode(concatLines));

    const concatExit = await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFilename,
      '-c', 'copy',
      'merged_video.mp4'
    ]);

    if (concatExit !== 0) {
      throw new Error(`[ExportEngine] FFmpeg chunk union failed with code ${concatExit}.`);
    }

    // Mux original audio into the unified video file
    onProgress({ percent: 85, statusText: 'Integrating synchronized audio track...' });
    const finalFilename = 'output_video.mp4';
    
    let compiled = false;
    if (store.videoFile) {
      // Strategy 1: Map the specific audio stream with direct transcoding to aac
      try {
        console.log('[ExportEngine] Attempting to mux final video with source audio mapping...');
        const muxExit = await ffmpeg.exec([
          '-i', 'merged_video.mp4',
          '-i', sourceVideoName,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-movflags', '+faststart',
          '-map', '0:v:0',
          '-map', '1:a:0',
          '-shortest',
          '-y',
          finalFilename
        ]);
        if (muxExit === 0) {
          compiled = true;
          console.log('[ExportEngine] Multi-channel audio mapping succeeded.');
        }
      } catch (audioMuxErr) {
        console.warn('[ExportEngine] Direct audio map failed, trying auto-selection copy...', audioMuxErr);
      }

      // Strategy 2: Rely on auto-selection of first matching video/audio streams
      if (!compiled) {
        try {
          console.log('[ExportEngine] Attempting auto-selection copy stream union...');
          const muxExit = await ffmpeg.exec([
            '-i', 'merged_video.mp4',
            '-i', sourceVideoName,
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            '-shortest',
            '-y',
            finalFilename
          ]);
          if (muxExit === 0) {
            compiled = true;
            console.log('[ExportEngine] Auto-selection stream copy succeeded.');
          }
        } catch (autoMuxErr) {
          console.warn('[ExportEngine] Auto-selection stream copy failed, falling back to pure video:', autoMuxErr);
        }
      }
    }

    // Strategy 3: Pure video fallback with no audio mapping whatsoever
    if (!compiled) {
      console.log('[ExportEngine] Compiling final video as video-only fallback track...');
      const muxExit = await ffmpeg.exec([
        '-i', 'merged_video.mp4',
        '-c:v', 'copy',
        '-movflags', '+faststart',
        '-y',
        finalFilename
      ]);
      if (muxExit !== 0) {
        throw new Error(`[ExportEngine] Final MP4 compilation failed (code ${muxExit}).`);
      }
    }

    onProgress({ percent: 95, statusText: 'Finalizing high-fidelity MP4 streams...' });

    const compiledBytes = await ffmpeg.readFile(finalFilename);
    const finalBlob = new Blob([compiledBytes], { type: 'video/mp4' });

    // Memory garbage collection
    console.log('[ExportEngine] Running file system garbage collection...');
    setTimeout(async () => {
      try {
        await ffmpeg.deleteFile(finalFilename);
        await ffmpeg.deleteFile('merged_video.mp4');
        await ffmpeg.deleteFile(concatFilename);
        if (store.videoFile) {
          await ffmpeg.deleteFile(sourceVideoName);
        }
        for (const file of chunkFiles) {
          await ffmpeg.deleteFile(file);
        }
        AssetLoader.clear();
        console.log('[ExportEngine] Cleaned up temporary files.');
      } catch (cleanupErr) {
        console.warn('[ExportEngine] Warning cleaning temporary FS files:', cleanupErr);
      }
    }, 1000);

    onProgress({ percent: 100, statusText: 'Done!' });
    return finalBlob;
  }
}

export default ExportEngine;
