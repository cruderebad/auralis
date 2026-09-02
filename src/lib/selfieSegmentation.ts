/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let loadingPromise: Promise<any> | null = null;

/**
 * Dynamically loads MediaPipe Selfie Segmentation from CDN.
 */
export function loadMediaPipe(): Promise<any> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    if ((window as any).SelfieSegmentation) {
      resolve((window as any).SelfieSegmentation);
      return;
    }

    // Append standard script tag
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      console.log('[MediaPipe] Selfie Segmentation script loaded successfully');
      resolve((window as any).SelfieSegmentation);
    };
    script.onerror = (err) => {
      console.warn('[MediaPipe] Script loading failed, utilizing premium visual fallback:', err);
      reject(err);
    };
    document.body.appendChild(script);
  });
  return loadingPromise;
}

// Low-overhead caching layers for segmentation masks
interface MaskCacheEntry {
  canvas: HTMLCanvasElement;
  timestamp: number;
}
const maskCache = new Map<string, MaskCacheEntry>();
const MAX_CACHE_SIZE = 120; // Cache 4 seconds of frames

let selfieSegmentationInstance: any = null;
let latestResults: any = null;
let isProcessing = false;

/**
 * Triggers background segmentation of the active video frame.
 */
export async function triggerSegmentationBackground(
  video: HTMLVideoElement,
  frameId: string,
  modelSelection: number = 1
): Promise<void> {
  if (isProcessing) return;
  
  try {
    isProcessing = true;
    const SelfieSegmentationClass = await loadMediaPipe();
    
    if (!selfieSegmentationInstance) {
      selfieSegmentationInstance = new SelfieSegmentationClass({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });
      selfieSegmentationInstance.onResults((results: any) => {
        latestResults = results;
      });
    }

    selfieSegmentationInstance.setOptions({
      modelSelection: modelSelection === 0 ? 0 : 1, // 0 is general high-accuracy, 1 is fast landscape
    });

    // Pass the image frame to the WebGL/WASM execution graph
    await selfieSegmentationInstance.send({ image: video });

    if (latestResults && latestResults.segmentationMask) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = video.videoWidth || 540;
      maskCanvas.height = video.videoHeight || 960;
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        // Draw the black-and-white alpha mask returned by MediaPipe
        maskCtx.drawImage(latestResults.segmentationMask, 0, 0, maskCanvas.width, maskCanvas.height);
        
        // Cache the result
        if (maskCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = maskCache.keys().next().value;
          if (oldestKey !== undefined) maskCache.delete(oldestKey);
        }
        maskCache.set(frameId, {
          canvas: maskCanvas,
          timestamp: Date.now()
        });
      }
    }
  } catch (e) {
    // Graceful silent print, fallback engine handles drawing
  } finally {
    isProcessing = false;
  }
}

/**
 * Retrieves the cached MediaPipe segmentation mask if available.
 * If an exact frame match is not yet processed, finds the closest available frame's mask within a reasonable range (30 frames, ~1s) to eliminate playback flickering.
 */
export function getCachedMask(frameId: string): HTMLCanvasElement | null {
  const cached = maskCache.get(frameId);
  if (cached) {
    cached.timestamp = Date.now(); // update LRU access time
    return cached.canvas;
  }

  // Exact match not found. Try to find the closest frame's mask for the same video to prevent flickering.
  const lastUnderscore = frameId.lastIndexOf('_');
  if (lastUnderscore === -1) return null;
  
  const videoPrefix = frameId.substring(0, lastUnderscore + 1); // e.g., "http://something_"
  const currentFrameNum = parseInt(frameId.substring(lastUnderscore + 1), 10);
  if (isNaN(currentFrameNum)) return null;

  let closestCanvas: HTMLCanvasElement | null = null;
  let minDiff = Infinity;
  const maxSearchRange = 30; // ±30 frames is about 1 second at 30fps

  for (const [key, entry] of maskCache.entries()) {
    if (key.startsWith(videoPrefix)) {
      const entryFrameNum = parseInt(key.substring(videoPrefix.length), 10);
      if (!isNaN(entryFrameNum)) {
        const diff = Math.abs(currentFrameNum - entryFrameNum);
        if (diff < minDiff && diff <= maxSearchRange) {
          minDiff = diff;
          closestCanvas = entry.canvas;
        }
      }
    }
  }

  return closestCanvas;
}

/**
 * Clears the segmented frames cache memory safely.
 */
export function clearSegmentationCaches() {
  maskCache.clear();
  latestResults = null;
}

/**
 * Generates an adjustable interactive fallback cinematic torso-and-head silhouette mask.
 * This is incredibly useful for offline work, CORS-blocked iframes, or performance boosts.
 */
export function drawFallbackSilhouetteMask(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  subjectOffsetX: number = 0,
  subjectOffsetY: number = 0,
  subjectMargin: number = 10,
  depthIntensity: number = 100
) {
  // Clear offscreen/canvas canvas area as black transparent
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // We paint the white mask region representing the speaker
  // Center is determined with XOffset and YOffset
  const cx = width * (0.50 + subjectOffsetX / 100);
  const cy = height * (0.42 + subjectOffsetY / 100);
  const baseScale = (100 - subjectMargin) / 100;

  // Let's draw head & shoulders
  const headRadius = Math.min(width, height) * 0.18 * baseScale;
  const shoulderW = width * 0.38 * baseScale;
  const shoulderH = height * 0.32 * baseScale;

  // Create soft feather gradient for high-quality edges matching the intensity slider
  const opacity = depthIntensity / 100;
  
  ctx.save();
  // Draw Torso Shading region
  const torsoGradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
  torsoGradient.addColorStop(0, `rgba(255,255,255,${0.95 * opacity})`);
  torsoGradient.addColorStop(1, `rgba(255,255,255,${1.0 * opacity})`);
  ctx.fillStyle = torsoGradient;
  
  // Torso / Rounded Shoulder box
  ctx.beginPath();
  const tx = cx - shoulderW;
  const ty = cy + headRadius * 0.8;
  const tw = shoulderW * 2;
  const th = height - ty;
  const r = 40; // corner radius
  
  ctx.moveTo(tx + r, ty);
  ctx.lineTo(tx + tw - r, ty);
  ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + r);
  ctx.lineTo(tx + tw, ty + th);
  ctx.lineTo(tx, ty + th);
  ctx.lineTo(tx, ty + r);
  ctx.quadraticCurveTo(tx, ty, tx + r, ty);
  ctx.closePath();
  ctx.fill();

  // Draw Head Shading region (Radial feathering)
  const headGradient = ctx.createRadialGradient(cx, cy, headRadius * 0.4, cx, cy, headRadius);
  headGradient.addColorStop(0, `rgba(255,255,255,${1.0 * opacity})`);
  headGradient.addColorStop(0.85, `rgba(255,255,255,${0.9 * opacity})`);
  headGradient.addColorStop(1, `rgba(255,255,255,0)`);
  ctx.fillStyle = headGradient;
  
  ctx.beginPath();
  ctx.arc(cx, cy, headRadius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Partition text into a main prominent keyword and the remaining subtitle words.
 * Matches user specifications: "automatically detect the most important keyword".
 */
export function partitionTextByKeyword(
  text: string,
  manualKeyword?: string
): { keyword: string; remaining: string } {
  if (!text) return { keyword: '', remaining: '' };

  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) {
    return { keyword: trimmed, remaining: '' };
  }

  let keyword = '';
  // Convert text and override to uniform checks
  if (manualKeyword && trimmed.toLowerCase().includes(manualKeyword.toLowerCase().trim())) {
    keyword = manualKeyword.trim();
  } else {
    // Smart auto selection: Avoid small grammar stop words, choose first significant word
    const stopWords = new Set([
      'is', 'am', 'are', 'was', 'were', 'be', 'been', 'a', 'an', 'the', 'and', 'or', 'but', 
      'if', 'of', 'in', 'on', 'at', 'by', 'for', 'to', 'with', 'from', 'as', 'that', 'this', 
      'these', 'those', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i', 'my', 'your', 'their'
    ]);
    
    let candidateIndex = 0;
    for (let i = 0; i < words.length; i++) {
      const cleanWord = words[i].toLowerCase().replace(/[^a-z]/g, '');
      if (!stopWords.has(cleanWord)) {
        candidateIndex = i;
        break;
      }
    }
    keyword = words[candidateIndex] || words[0]; // fallback to first word
  }

  // Find occurrences of keyword and slice it out safely
  const keywordCleaned = keyword.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").toLowerCase();
  
  // Find match index based on alphanumeric similarity to avoid partial matches
  let chosenWordIdx = -1;
  for (let i = 0; i < words.length; i++) {
    const cleanWord = words[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").toLowerCase();
    if (cleanWord === keywordCleaned) {
      chosenWordIdx = i;
      break;
    }
  }

  let remaining = '';
  if (chosenWordIdx !== -1) {
    keyword = words[chosenWordIdx]; // Preserve case & punctuation
    const remainingWords = [...words];
    remainingWords.splice(chosenWordIdx, 1);
    remaining = remainingWords.join(' ');
  } else {
    // Replacement fallback
    const kPos = trimmed.toLowerCase().indexOf(keyword.toLowerCase());
    if (kPos !== -1) {
      remaining = trimmed.substring(0, kPos) + trimmed.substring(kPos + keyword.length);
    } else {
      remaining = trimmed;
    }
  }

  return {
    keyword: keyword.trim().toUpperCase(), // matching uppercase request
    remaining: remaining.replace(/\s+/g, ' ').trim()
  };
}
