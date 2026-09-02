import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let initPromise: Promise<FFmpeg> | null = null;

const CORE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm";

export const getFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (isLoading && initPromise) {
    return initPromise;
  }

  isLoading = true;
  initPromise = new Promise<FFmpeg>(async (resolve, reject) => {
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        console.log(`[FFMPEG] Loading FFmpeg Core... (Attempts left: ${retries})`);
        const ffmpeg = new FFmpeg();
        
        ffmpeg.on("log", ({ message }) => {
          console.log("[FFMPEG Log]", message);
        });

        // Timeout wrapper for blob fetching to avoid freezes over shaky networks
        
        console.log("[FFMPEG] Initializing single-threaded core load...");
        await ffmpeg.load({
          coreURL: CORE_URL,
          wasmURL: WASM_URL,

          
        });

        console.log("[FFMPEG] FFmpeg and WebAssembly loaded successfully");
        ffmpegInstance = ffmpeg;
        success = true;
        resolve(ffmpeg);
      } catch (err) {
        console.error("[FFMPEG] Initialization attempt failed:", err);
        retries--;
        if (retries === 0) {
           ffmpegInstance = null;
           initPromise = null;
           reject(err);
        } else {
           console.log("[FFMPEG] Retrying in 1.5 seconds...");
           await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
    isLoading = false;
  });

  return initPromise;
};
