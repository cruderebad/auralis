import { TimelineClip, TimelineTrack } from '../types/timeline';
import { assetManager } from './assetManager';
import { getAnimatedValues } from './animationEngine';
import { renderCaptionFrame, clamp, easeOutQuart, popSpring } from '../lib/RenderEngine';
import { GlobalStyle } from '../types';
import { useEditorStore } from '../store/useEditorStore';
import { 
  getCachedMask, 
  triggerSegmentationBackground, 
  drawFallbackSilhouetteMask, 
  partitionTextByKeyword 
} from '../lib/selfieSegmentation';

/**
 * Calculates scaling and positioning to center/cover/fit elements on canvas
 */
export function getDrawDimensions(
  srcW: number,
  srcH: number,
  destW: number,
  destH: number,
  clip: { type?: string; scaleX?: number; scaleY?: number; x?: number; y?: number; width?: number; height?: number }
) {
  if (clip.type === 'image') {
    const clipW = clip.width || 300;
    const clipH = clip.height || 300;
    const ratio = Math.min(clipW / srcW, clipH / srcH);
    const drawW = srcW * ratio;
    const drawH = srcH * ratio;
    return {
      x: (destW - drawW) / 2 + (clip.x || 0),
      y: (destH - drawH) / 2 + (clip.y || 0),
      w: drawW * (clip.scaleX || 1),
      h: drawH * (clip.scaleY || 1),
    };
  }

  const scale = Math.max(destW / srcW, destH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;

  return {
    x: (destW - drawW) / 2 + (clip.x || 0),
    y: (destH - drawH) / 2 + (clip.y || 0),
    w: drawW * (clip.scaleX || 1),
    h: drawH * (clip.scaleY || 1),
  };
}

/**
 * Unified frame renderer. Renders the entire composition timeline at a given timestamp.
 */
// Reusable canvas buffer for depth masking to avoid allocating DOM canvases every frame
let sharedMaskCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let sharedMaskCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

function getSharedMaskBuffer(width: number, height: number): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } | null {
  try {
    if (!sharedMaskCanvas) {
      if (typeof OffscreenCanvas !== 'undefined') {
        sharedMaskCanvas = new OffscreenCanvas(width, height);
      } else {
        sharedMaskCanvas = document.createElement('canvas');
      }
    }
    if (sharedMaskCanvas.width !== width || sharedMaskCanvas.height !== height) {
      sharedMaskCanvas.width = width;
      sharedMaskCanvas.height = height;
    }
    if (!sharedMaskCtx) {
      sharedMaskCtx = sharedMaskCanvas.getContext('2d') as any;
    }
    if (sharedMaskCtx) {
      sharedMaskCtx.clearRect(0, 0, width, height);
      sharedMaskCtx.filter = 'none';
      sharedMaskCtx.globalCompositeOperation = 'source-over';
    }
    return sharedMaskCtx ? { canvas: sharedMaskCanvas, ctx: sharedMaskCtx } : null;
  } catch (e) {
    return null;
  }
}

// Cache parameters
let lastSignature = '';
const frameCache = new Map<number, ImageBitmap>();
const MAX_CACHE_SIZE = 180; // Cache up to 6 seconds

function getCompositionSignature(
  tracks: TimelineTrack[],
  globalStyle: GlobalStyle,
  canvasWidth: number,
  canvasHeight: number
): string {
  try {
    const stylePart = `${globalStyle.animationStyle}_${globalStyle.fontSize}_${globalStyle.fontFamily}_${globalStyle.textColor}_${globalStyle.highlightColor}_${globalStyle.positionX}_${globalStyle.positionY}_${globalStyle.depthEnabled}_${globalStyle.depthBigWordSize}`;
    let tracksPart = '';
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      if (!t.visible) continue;
      for (let j = 0; j < t.clips.length; j++) {
        const c = t.clips[j];
        if (!c.visible) continue;
        const textPart = c.type === 'text' && c.textFields ? c.textFields.text : ((c as any).text || '');
        tracksPart += `${c.id}:${c.start.toFixed(2)}:${c.end.toFixed(2)}:${textPart};`;
      }
    }
    return `${canvasWidth}x${canvasHeight}_${stylePart}_${tracksPart}`;
  } catch (e) {
    return `${canvasWidth}x${canvasHeight}_fallback_${Date.now()}`;
  }
}

function clearFrameCache() {
  for (const bitmap of frameCache.values()) {
    try {
      bitmap.close();
    } catch (e) {
      console.error('[Cache] Error closing ImageBitmap:', e);
    }
  }
  frameCache.clear();
}

/**
 * Animation interpolation for Large Keyword
 */
function getAnimationTransform(
  style: string,
  progress: number,
  duration: number,
  time: number
): { opacity: number; scale: number; translateX: number; translateY: number; rotation: number } {
  let opacity = 1;
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let rotation = 0;

  const t = progress; // 0 to 1
  
  switch (style) {
    case 'slide-up':
      translateY = 70 * (1 - easeOutQuart(t));
      opacity = t;
      break;
    case 'slide-down':
      translateY = -70 * (1 - easeOutQuart(t));
      opacity = t;
      break;
    case 'slide-left':
      translateX = 70 * (1 - easeOutQuart(t));
      opacity = t;
      break;
    case 'slide-right':
      translateX = -70 * (1 - easeOutQuart(t));
      opacity = t;
      break;
    case 'fade-in':
      opacity = t;
      break;
    case 'zoom-in':
      scale = 0.5 + 0.5 * easeOutQuart(t);
      opacity = t;
      break;
    case 'pop': {
      const s = popSpring(t);
      scale = s;
      opacity = Math.min(1, t * 2);
      break;
    }
    case 'bounce': {
      const bounce = Math.sin(t * Math.PI) * 0.3;
      scale = 1 + bounce;
      break;
    }
    case 'elastic': {
      const elastic = Math.sin(t * Math.PI * 3) * 0.12 * (1 - t);
      scale = 1 + elastic;
      break;
    }
    case 'rotate-in':
      rotation = (25 * (1 - easeOutQuart(t)) * Math.PI) / 180;
      scale = 0.85 + 0.15 * easeOutQuart(t);
      opacity = t;
      break;
    case 'drift':
      translateX = Math.sin(time * 1.8) * 8;
      translateY = Math.cos(time * 1.4) * 8;
      break;
    case 'cinematic-reveal':
      scale = 0.94 + 0.06 * easeOutQuart(t);
      opacity = t;
      break;
    default:
      break;
  }

  return { opacity, scale, translateX, translateY, rotation };
}

/**
 * Draws the cinematic background large word behind the speaker
 */
function drawLargeKeyword(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  keyword: string,
  time: number,
  segStart: number,
  style: GlobalStyle,
  canvasWidth: number,
  canvasHeight: number
) {
  if (!keyword) return;

  const styleCasing = style.depthTextTransform || 'uppercase';
  let txt = keyword;
  if (styleCasing === 'uppercase') txt = keyword.toUpperCase();
  else if (styleCasing === 'lowercase') txt = keyword.toLowerCase();
  else if (styleCasing === 'capitalize') {
    txt = keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
  }
  
  ctx.save();
  
  const baseSize = (style.depthBigWordSize || 180) * (canvasWidth / 1080);
  ctx.font = `${style.depthFontWeight || '900'} ${baseSize}px ${style.depthFontFamily || 'Bebas Neue'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Customize letter spacing
  if (style.depthLetterSpacing && (ctx as any).letterSpacing !== undefined) {
    (ctx as any).letterSpacing = `${style.depthLetterSpacing}px`;
  }

  let posX = canvasWidth * ((style.depthPositionX !== undefined ? style.depthPositionX : 50) / 100);
  let posY = canvasHeight * ((style.depthPositionY !== undefined ? style.depthPositionY : 50) / 100);

  if (style.depthAutoCenter) {
    posX = canvasWidth * 0.5;
    posY = canvasHeight * 0.42; // centered slightly higher around head/chest
  }

  // Animation calculation
  const duration = style.depthAnimationDuration || 0.45;
  const delay = style.depthAnimationDelay || 0;
  const animStyle = style.depthAnimationStyle || 'pop';
  
  const progress = clamp((time - segStart - delay) / duration, 0, 1);
  const transform = getAnimationTransform(animStyle, progress, duration, time);

  ctx.translate(posX + transform.translateX, posY + transform.translateY);
  ctx.rotate(transform.rotation);
  ctx.scale(transform.scale, transform.scale);

  const opacity = (style.depthFontOpacity !== undefined ? style.depthFontOpacity : 1.0) * transform.opacity;
  ctx.globalAlpha = opacity;

  // Render glow
  if (style.depthGlowStrength && style.depthGlowStrength > 0) {
    ctx.shadowColor = style.depthFontColor || '#FF6F61';
    ctx.shadowBlur = style.depthGlowRadius || 10;
  }

  // Render shadow
  if (style.depthShadowStrength && style.depthShadowStrength > 0) {
    ctx.shadowColor = `rgba(0, 0, 0, ${style.depthShadowStrength})`;
    ctx.shadowBlur = style.depthShadowBlur || 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
  }

  // Render outline
  if (style.depthOutlineWidth && style.depthOutlineWidth > 0) {
    ctx.strokeStyle = style.depthOutlineColor || '#000000';
    ctx.lineWidth = style.depthOutlineWidth * (canvasWidth / 1080);
    ctx.strokeText(txt, 0, 0);
  }

  ctx.fillStyle = style.depthFontColor || '#FF6F61';
  ctx.fillText(txt, 0, 0);

  ctx.restore();
}

/**
 * Draws the high-contrast foreground caption in front of the speaker
 */
function drawForegroundCaption(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  remainingText: string,
  time: number,
  segStart: number,
  style: GlobalStyle,
  canvasWidth: number,
  canvasHeight: number
) {
  if (!remainingText) return;

  ctx.save();

  const fontSize = (style.depthForegroundSize || 52) * (canvasWidth / 1080);
  ctx.font = `bold ${fontSize}px ${style.fontFamily || 'Inter'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const posX = canvasWidth * 0.5;
  const posY = canvasHeight * 0.78;

  ctx.translate(posX, posY);

  if (style.shadowEnabled) {
    ctx.shadowColor = style.shadowColor || 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = style.shadowIntensity || 6;
    ctx.shadowOffsetY = 2;
  }
  if (style.outlineEnabled) {
    ctx.strokeStyle = style.outlineColor || '#000';
    ctx.lineWidth = (style.outlineWidth || 4) * (canvasWidth / 1080);
    ctx.strokeText(remainingText, 0, 0);
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(remainingText, 0, 0);

  ctx.restore();
}

export async function renderFrame(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  time: number,
  tracks: TimelineTrack[],
  canvasWidth: number,
  canvasHeight: number,
  globalStyle: GlobalStyle,
  isExportingMode: boolean = false
) {
  const hasActiveVideo = tracks.some(t => 
    t.visible && t.clips.some(c => 
      c.type === 'video' && c.visible && time >= c.start && time <= c.end
    )
  );

  const isCacheable = !isExportingMode && canvasWidth > 0 && canvasHeight > 0 && !hasActiveVideo;
  let frameKey = 0;

  if (isCacheable) {
    const currentSignature = getCompositionSignature(tracks, globalStyle, canvasWidth, canvasHeight);
    if (currentSignature !== lastSignature) {
      clearFrameCache();
      lastSignature = currentSignature;
    }

    // Key on standard 30 FPS frame ticks (round to nearest frame index)
    frameKey = Math.round(time * 30);

    const cachedBitmap = frameCache.get(frameKey);
    if (cachedBitmap) {
      // Direct high-performance GPU blit
      ctx.drawImage(cachedBitmap, 0, 0, canvasWidth, canvasHeight);
      return;
    }
  }

  // 1. Clear background
  ctx.fillStyle = globalStyle.canvasBackground || '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Filter tracks and sort clips by layer & order
  // Higher layers/tracks are drawn on top.
  const activeClips: { clip: TimelineClip; track: TimelineTrack }[] = [];

  // Sort tracks bottom to top: Audio first (invisible), Video, Overlay, Text
  const trackSortOrder = { audio: 0, video: 1, overlay: 2, text: 3 };
  const sortedTracks = [...tracks].sort((a, b) => {
    return (trackSortOrder[a.type] || 0) - (trackSortOrder[b.type] || 0);
  });

  for (const track of sortedTracks) {
    if (!track.visible) continue;
    for (const clip of track.clips) {
      if (clip.visible && time >= clip.start && time <= clip.end) {
        activeClips.push({ clip, track });
      }
    }
  }

  // Sort clips based on their intrinsic layer (higher layer draws on top)
  activeClips.sort((a, b) => {
    if (a.clip.layer !== b.clip.layer) {
      return a.clip.layer - b.clip.layer;
    }
    // tie-breaker: track rank
    return (trackSortOrder[a.track.type] || 0) - (trackSortOrder[b.track.type] || 0);
  });

  // 3. Render each clip
  for (const { clip, track } of activeClips) {
    ctx.save();

    // Track mute checks
    if (clip.muted || track.muted) {
      // Handle audio muting logic internally (handled in playback engine)
    }

    // Calculate animation properties
    const anim = getAnimatedValues(clip, time, canvasWidth, canvasHeight);
    
    // Apply animations
    ctx.globalAlpha = anim.opacity;

    // Apply filter effects (grayscale, sepia, blur, contrast)
    let filterString = '';
    if (clip.effects && clip.effects.length > 0) {
      for (const effect of clip.effects) {
        if (effect.type === 'grayscale') {
          filterString += ` grayscale(${effect.intensity * 100}%)`;
        } else if (effect.type === 'sepia') {
          filterString += ` sepia(${effect.intensity * 100}%)`;
        } else if (effect.type === 'blur') {
          filterString += ` blur(${effect.intensity * 10}px)`;
        } else if (effect.type === 'contrast') {
          filterString += ` contrast(${100 + effect.intensity * 100}%)`;
        }
      }
    }
    
    if (filterString.trim()) {
      (ctx as any).filter = filterString.trim();
    }

    // Base coordinate translation
    const centerX = clip.x + canvasWidth / 2;
    const centerY = clip.y + canvasHeight / 2;

    // We translate to the clip's center relative position to apply scale and rotation
    ctx.translate(centerX, centerY);
    ctx.rotate((anim.rotation * Math.PI) / 180);
    ctx.scale(anim.scaleX, anim.scaleY);
    // Translate back to draw
    ctx.translate(-centerX, -centerY);

    // Apply slide translation
    ctx.translate(anim.translateX, anim.translateY);

    // Render depending on Clip Type
    switch (clip.type) {
      case 'video': {
        const url = clip.sourceUrl;
        if (url) {
          try {
            const video = assetManager.getVideoElement(url);
            
            // Calculate source position
            const elapsed = time - clip.start;
            const sourceSeconds = clip.sourceStart + (elapsed * clip.playbackRate);

            // Synchronize video playback
            if (isExportingMode) {
              // During high-fidelity export, we block and seek precisely
              if (!video.paused) { video.pause(); }
              let targetTime = sourceSeconds;
              if (!isNaN(video.duration) && video.duration > 0) {
                 targetTime = Math.min(targetTime, video.duration - 0.001);
              }
              
              if (Math.abs(video.currentTime - targetTime) > 0.005) {
                video.currentTime = targetTime;
                await new Promise<void>((resolve) => {
                  let isResolved = false;
                  const onSeeked = () => {
                    if (isResolved) return;
                    isResolved = true;
                    video.removeEventListener('seeked', onSeeked);
                    resolve();
                  };
                  video.addEventListener('seeked', onSeeked);
                  // Failsafe timeout in case seeked doesn't fire (e.g., clamped value)
                  setTimeout(onSeeked, 150);
                });
              }
            } else {
              // Real-Time Playback Synchronization
              const editorState = useEditorStore.getState();
              const isPlaying = editorState.isPlaying;
              const playbackSpeed = editorState.playbackSpeed || 1.0;

              if (isPlaying) {
                // Ensure video is playing smoothly and matches the playhead rate
                if (video.paused) {
                  video.play().catch(err => console.warn('[Renderer] Cannot play video clip:', err));
                }
                const targetRate = clip.playbackRate * playbackSpeed;
                if (Math.abs(video.playbackRate - targetRate) > 0.01) {
                  video.playbackRate = targetRate;
                }
                // Only seek if we have a significant clock drift (e.g. scrubbing, loop bounds, delay spikes)
                if (Math.abs(video.currentTime - sourceSeconds) > 0.3) {
                  video.currentTime = sourceSeconds;
                }
              } else {
                // When paused, perfectly synchronize the playhead frame to match timeline scrubbing
                if (!video.paused) {
                  video.pause();
                }
                if (Math.abs(video.currentTime - sourceSeconds) > 0.02) {
                  video.currentTime = sourceSeconds;
                }
              }
            }

            if (video.readyState >= 2) {
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                const rect = getDrawDimensions(
                  video.videoWidth,
                  video.videoHeight,
                  canvasWidth,
                  canvasHeight,
                  clip
                );
                
                if (globalStyle.depthEnabled) {
                  // Find active caption segment for the current timeline position from track-text-1
                  const textTrack = useEditorStore.getState().tracks.find(t => t.id === 'track-text-1');
                  const activeClip = textTrack?.clips.find(c => time >= c.start && time <= c.end);
                  
                  if (activeClip) {
                    const textField = activeClip.textFields;
                    const activeText = textField ? textField.text : (activeClip as any).text || '';
                    
                    const frameId = `${video.src}_${Math.round(time * 30)}`;
                    let maskCanvas = getCachedMask(frameId);
                    
                    // Silently trigger background model inference if not already cached
                    if (!maskCanvas) {
                      triggerSegmentationBackground(video, frameId, globalStyle.depthModelSelection);
                    }
                    
                    if (maskCanvas) {
                      // Partition caption sentence into Large Keyword & Foreground caption
                      const overrideKeyword = textField?.style?.depthKeywordManualOverride || (globalStyle as any).depthKeywordManualOverride || '';
                      const { keyword, remaining } = partitionTextByKeyword(activeText, overrideKeyword);
                      
                      // Step 1: Draw Video Background
                      ctx.drawImage(video, rect.x, rect.y, rect.w, rect.h);
                      
                      // Step 2: Render Large Keyword behind subject
                      drawLargeKeyword(ctx, keyword, time, activeClip.start, globalStyle, canvasWidth, canvasHeight);
                      
                      // Step 3: Draw Segmented Person Overlay
                      const maskBuf = getSharedMaskBuffer(canvasWidth, canvasHeight);
                      
                      if (maskBuf) {
                        const { canvas: tempCanvas, ctx: tempCtx } = maskBuf;
                        // Draw video frame to temp coordinate space
                        tempCtx.drawImage(video, rect.x, rect.y, rect.w, rect.h);
                        
                        // Mask only the subject pixels using custom layer masking
                        tempCtx.globalCompositeOperation = 'destination-in';
                        const featherVal = globalStyle.depthMaskFeather !== undefined ? globalStyle.depthMaskFeather : 3;
                        if (featherVal > 0) {
                          tempCtx.filter = `blur(${featherVal}px)`;
                        }
                        tempCtx.drawImage(maskCanvas, rect.x, rect.y, rect.w, rect.h);
                        if (featherVal > 0) {
                          tempCtx.filter = 'none';
                        }
                        tempCtx.globalCompositeOperation = 'source-over';
                        
                        // Draw masked person back to primary canvas on top of Large Keyword!
                        ctx.save();
                        if (globalStyle.depthBlurAmount && globalStyle.depthBlurAmount > 0) {
                          ctx.filter = `blur(${globalStyle.depthBlurAmount}px)`;
                        }
                        ctx.drawImage(tempCanvas as any, 0, 0);
                        ctx.restore();
                      }
                      
                      // Step 4: Render Subtitle text on top (Foreground)
                      drawForegroundCaption(ctx, remaining, time, activeClip.start, globalStyle, canvasWidth, canvasHeight);
                    } else {
                      // Rotoscoping is not ready/possible here (loading, offline, processing, or no person detected).
                      // Draw full background video & standard/normal captions!
                      ctx.drawImage(video, rect.x, rect.y, rect.w, rect.h);

                      const capSegment = {
                        id: activeClip.id,
                        start: activeClip.start,
                        end: activeClip.end,
                        text: activeText,
                        words: (activeClip as any).words,
                      };
                      const activeStyle = {
                        ...globalStyle,
                        ...(textField?.style || {}),
                      };
                      renderCaptionFrame(ctx, capSegment, time, activeStyle, canvasWidth, canvasHeight);
                    }
                  } else {
                    // No active caption: Render pure video background frame
                    ctx.drawImage(video, rect.x, rect.y, rect.w, rect.h);
                  }
                } else {
                  ctx.drawImage(video, rect.x, rect.y, rect.w, rect.h);
                }
              }
            } else {
              // Draw placeholder if video isn't ready
              ctx.fillStyle = '#1e1e1e';
              ctx.fillRect(clip.x, clip.y, clip.width, clip.height);
            }
          } catch (e) {
            console.error('[Renderer] Error loading video frame:', e);
          }
        }
        break;
      }

      case 'image': {
        const url = clip.sourceUrl;
        if (url) {
          try {
            const img = assetManager.getImageElement(url);
            if (img.complete) {
              const rect = getDrawDimensions(
                img.naturalWidth,
                img.naturalHeight,
                canvasWidth,
                canvasHeight,
                clip
              );
              ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
            } else {
              // Render empty bounding box while loading
              ctx.fillStyle = '#2d2d2d';
              ctx.fillRect(clip.x, clip.y, clip.width, clip.height);
            }
          } catch (e) {
            console.error('[Renderer] Error drawing image:', e);
          }
        }
        break;
      }

      case 'text':
      case 'overlay': {
        // If Depth Captions is active, bypass standard title layers to avoid double-rendition
        if (globalStyle.depthEnabled) {
          const textTrack = useEditorStore.getState().tracks.find(t => t.id === 'track-text-1');
          const activeClip = textTrack?.clips.find(c => time >= c.start && time <= c.end);
          if (activeClip) {
            break;
          }
        }

        // Special case: check if it represents a caption/subtitle model
        const textField = clip.textFields;
        if (textField) {
          const capSegment = {
            id: clip.id,
            start: clip.start,
            end: clip.end,
            text: textField.text,
            words: (clip as any).words,
            emotion: (clip as any).emotion,
            emotionIntensity: (clip as any).emotionIntensity,
            speechStyle: (clip as any).speechStyle,
            tone: (clip as any).tone,
            speaker: (clip as any).speaker,
            bracketLabel: (clip as any).bracketLabel || (clip as any).bracket_label,
            confidence: (clip as any).confidence,
            emphasis: (clip as any).emphasis,
          };
          
          const activeStyle = {
            ...globalStyle,
            ...textField.style,
            // Keep coordinates relative if custom
            positionX: clip.x !== 0 ? (clip.x / canvasWidth) * 100 + 50 : globalStyle.positionX,
            positionY: clip.y !== 0 ? (clip.y / canvasHeight) * 100 + 50 : globalStyle.positionY,
          };

          if (true) {
            renderCaptionFrame(ctx, capSegment, time, activeStyle, canvasWidth, canvasHeight);
          }
        } else {
          // Standard subtitle clips loaded directly on titles layer
          const capSegment = {
            id: clip.id,
            start: clip.start,
            end: clip.end,
            text: (clip as any).text || '',
            words: (clip as any).words,
            emotion: (clip as any).emotion,
            emotionIntensity: (clip as any).emotionIntensity,
            speechStyle: (clip as any).speechStyle,
            tone: (clip as any).tone,
            speaker: (clip as any).speaker,
            bracketLabel: (clip as any).bracketLabel || (clip as any).bracket_label,
            confidence: (clip as any).confidence,
            emphasis: (clip as any).emphasis,
          };
          if (true) {
            renderCaptionFrame(ctx, capSegment, time, globalStyle, canvasWidth, canvasHeight);
          }
        }
        break;
      }


      case 'audio': {
        // Audio is silent/unrendered on canvas. Handled by playback engine.
        break;
      }

      case 'effect': {
        // Post processing custom canvas layers if needed
        break;
      }
    }

    ctx.restore();
  }

  if (isCacheable && ctx.canvas) {
    try {
      const bitmap = await createImageBitmap(ctx.canvas as HTMLCanvasElement);
      if (frameCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = frameCache.keys().next().value;
        if (oldestKey !== undefined) {
          const oldBitmap = frameCache.get(oldestKey);
          if (oldBitmap) {
            oldBitmap.close();
          }
          frameCache.delete(oldestKey);
        }
      }
      frameCache.set(frameKey, bitmap);
    } catch (e) {
      console.warn('[Cache] Could not capture frame bitmap:', e);
    }
  }
}
