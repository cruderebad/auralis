import { CaptionSegment, GlobalStyle } from "../types";
import { getFormattedCaptionText } from "./captionFormatter";
import { useEditorStore } from "../store/useEditorStore";
import { getSpeakerColor } from "./speakerColors";

export const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

export const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);
export const easeInQuart = (x: number): number => Math.pow(x, 4);
export const easeInOutQuart = (x: number): number => x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
export const linear = (x: number): number => x;
export const easeOutExpo = (x: number): number => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
export const easeInOutCubic = (x: number): number => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);
export const easeOutBack = (x: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const easeOutElastic = (x: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
};

export const popSpring = (progress: number) => {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  return 1 - Math.exp(-6 * progress) * Math.cos(12 * progress);
};

export const applyAccessibilityOverrides = (style: GlobalStyle, accessibility?: any): GlobalStyle => {
  const overrides = { ...style };
  const profile = accessibility?.profile || style.accessibilityPreset;
  const reduceMotion = accessibility?.reduceMotion;
  
  if (reduceMotion && profile !== 'dyslexia') {
    overrides.animationEnabled = false;
    overrides.animationStyle = 'flat';
    overrides.aeEmotionSensitivity = 0;
    overrides.aeShakeStrength = 0;
    overrides.aeBounceStrength = 0;
    overrides.aeSlideIntensity = 0;
    overrides.aeZoomIntensity = 0;
    overrides.aeAutoColorToggle = false;
    overrides.aeAutoScaleToggle = false;
  }

  if (profile === 'dyslexia' || style.accessibilityPreset === 'dyslexia') {
    overrides.accessibilityPreset = 'dyslexia';
    overrides.fontFamily = 'Open Sans, sans-serif'; // Highly legible font
    overrides.fontSize = Math.max(style.fontSize, 50); // Larger font
    overrides.lineHeight = Math.max(style.lineHeight, 1.5);
    overrides.letterSpacing = Math.max(style.letterSpacing, 2);
    overrides.wordSpacing = Math.max(style.wordSpacing || 0, 10);
    overrides.shadowEnabled = true;
    overrides.shadowIntensity = 8;
    overrides.shadowColor = '#000000';
    // Suppress harsh disorienting motions while keeping subtle accessible emotions active
    overrides.aeShakeStrength = 0;
    overrides.aeBounceStrength = 0;
    overrides.aeSlideIntensity = 0;
    overrides.aeZoomIntensity = 0;
  } else if (style.accessibilityPreset === 'focus') {
    // keep ai-reactive
    overrides.aiAdaptiveLines = false;
    overrides.highlightColor = '#FFD700';
  } else if (style.accessibilityPreset === 'calm') {
    // keep ai-reactive
    overrides.highlightColor = '#FFFFFF'; // Mute colors
    overrides.aeEmotionSensitivity = 0; // Disable AI reaction intensity
    overrides.aeAutoColorToggle = false;
    overrides.aeAutoScaleToggle = false;
    overrides.fadeInDuration = 0.5; // Slower fade
  } else if (style.accessibilityPreset === 'hearing') {
    overrides.shadowEnabled = true;
    overrides.shadowIntensity = 10;
    overrides.shadowColor = '#000000';
    overrides.highlightColor = '#FFFF00'; // High contrast yellow
    overrides.aeAutoColorToggle = false;
  } else if (style.accessibilityPreset === 'vision') {
    overrides.fontSize = Math.max(style.fontSize, 60);
    overrides.fontWeight = '900';
    overrides.textColor = '#FFFFFF';
    overrides.highlightColor = '#FFFF00';
    overrides.shadowEnabled = true;
    overrides.shadowIntensity = 15;
    overrides.shadowColor = '#000000';
    overrides.aeAutoColorToggle = false;
    overrides.lineHeight = Math.max(style.lineHeight, 1.4);
    overrides.wordSpacing = Math.max(style.wordSpacing || 0, 5);
  } else if (style.accessibilityPreset === 'color-vision') {
    // Rely on animation and typography, use high contrast colors
    overrides.textColor = '#FFFFFF';
    overrides.highlightColor = '#FFD700'; // distinct yellow
    overrides.aeAutoColorToggle = false; // Disable color shifts
  } else if (style.accessibilityPreset === 'reduced-motion') {
    // keep ai-reactive
    overrides.highlightColor = '#E6E6FA'; // Soft pastel
    overrides.textColor = '#E6E6FA';
    overrides.aeAutoColorToggle = false;
    overrides.aeAutoScaleToggle = false;
    overrides.fadeInDuration = 0.5;
    overrides.lineHeight = Math.max(style.lineHeight, 1.6);
  }

  return overrides;
};

export const renderCaptionFrame = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  caption: CaptionSegment,
  time: number,
  baseStyle: GlobalStyle,
  width: number,
  height: number,
) => {
  if (time < caption.start || time > caption.end) return;

  const style = applyAccessibilityOverrides(baseStyle);

  const posX = width * (style.positionX / 100);
  const posY = height * (style.positionY / 100);

  const storeState = useEditorStore.getState();
  const activeCaptionMode = storeState.captionMode || 'standard';
  const customAccessibilityConfig = storeState.customAccessibilityConfig;

  const formattedText = getFormattedCaptionText(caption, activeCaptionMode, customAccessibilityConfig);

  // --- KINETIC CAPTION EXPORT IMPLEMENTATION ---
  if (style.animationStyle === 'kinetic') {
    // 1. Convert caption to words and determine roles
    let lineBreaks = new Set<number>();
    const textSource = formattedText || caption.text || '';
    if (textSource.includes('\n')) {
       const chunks = textSource.split('\n');
       let wordCount = 0;
       chunks.forEach(chunk => {
          const count = chunk.trim().split(/\s+/).filter(Boolean).length;
          if (count > 0) {
             wordCount += count;
             lineBreaks.add(wordCount - 1);
          }
       });
    }

    const items = caption.words && caption.words.length > 0 ? caption.words : textSource.replace(/\n/g, ' ').split(/\s+/).filter(Boolean).map((text, idx, arr) => {
      const duration = caption.end - caption.start;
      const step = duration / Math.max(1, arr.length);
      return { text, start: caption.start + (step * idx), end: caption.start + (step * (idx + 1)) };
    });

    let mostImportantIndex = 0;
    let maxScore = -1;
    items.forEach((w, index) => {
      const cleanText = w.text.replace(/[^a-zA-Z0-9]/g, '');
      let score = cleanText.length;
      if (cleanText === cleanText.toUpperCase() && cleanText.length > 1) score += 5;
      if (/^\d+$/.test(cleanText)) score += 5;
      if (score > maxScore) { maxScore = score; mostImportantIndex = index; }
    });

    let yellowAssigned = false;
    const wordObjects = items.map((w, index) => {
      const cleanText = w.text.replace(/[^a-zA-Z0-9]/g, '');
      const isImportant = index === mostImportantIndex;
      let role: 'primary' | 'secondary' | 'tertiary' = 'tertiary';
      let color = '#FFFFFF';
      const isAllUppercase = cleanText === cleanText.toUpperCase() && cleanText.length > 1;
      const isNumber = /^\d+$/.test(cleanText);
      if (isImportant || isAllUppercase || isNumber || cleanText.length > 6) {
        role = 'primary';
        if (isImportant || (!yellowAssigned && (cleanText.charCodeAt(0) % 2 === 0))) {
           color = '#FFC700';
           yellowAssigned = true;
        }
      } else if (cleanText.length > 3) {
        role = 'secondary';
      }
      if (cleanText.length <= 3 && !isAllUppercase && !isNumber && !isImportant) {
         role = 'tertiary';
      }
      return { ...w, role, color, isLineBreak: lineBreaks.has(index), globalIndex: index };
    });

    const linesArr: typeof wordObjects[] = [];
    let curLine: typeof wordObjects = [];
    wordObjects.forEach((wo) => {
      curLine.push(wo);
      if (wo.isLineBreak) { linesArr.push(curLine); curLine = []; }
    });
    if (curLine.length > 0) linesArr.push(curLine);

    // 2. Setup rendering state
    const scale = ((style.fontSize || 64) / 64) * (width / 1080);
    const baseRem = 16;
    const primarySize = 6 * baseRem * scale;
    const secondarySize = 3.5 * baseRem * scale;
    const tertiarySize = 2.2 * baseRem * scale;

    ctx.save();
    ctx.translate(posX, posY);
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.shadowOffsetX = 0;

    let totalHeight = 0;
    const lineHeights: number[] = [];
    const lineYOffsets: number[] = [];

    // Measure heights and widths
    const lineData = linesArr.map((lineWords) => {
      let maxH = 0;
      let totalW = 0;
      const spaceW = 12 * scale; // approximate gap-x-3 gap
      
      const wordsData = lineWords.map(wo => {
        let fSize = tertiarySize;
        let fontStr = `bold ${fSize}px "Inter", sans-serif`;
        if (wo.role === 'primary') {
          fSize = primarySize;
          fontStr = `${fSize}px "Bebas Neue", sans-serif`;
        } else if (wo.role === 'secondary') {
          fSize = secondarySize;
          fontStr = `italic ${fSize}px "Playfair Display", serif`;
        }
        ctx.font = fontStr;
        let textToMeasure = wo.role === 'primary' ? wo.text.toUpperCase() : wo.text;
        const width = ctx.measureText(textToMeasure).width;
        if (fSize > maxH) maxH = fSize;
        totalW += width;
        return { ...wo, fontStr, width, textToDraw: textToMeasure };
      });
      
      totalW += spaceW * Math.max(0, lineWords.length - 1);
      return { wordsData, totalW, maxH };
    });

    // Compute line Y offsets
    const maxKineticWidth = width * 0.88;
    let maxKLineW = 0;
    lineData.forEach(ld => { if (ld.totalW > maxKLineW) maxKLineW = ld.totalW; });
    if (maxKLineW > maxKineticWidth && maxKLineW > 0) {
      const kScale = maxKineticWidth / maxKLineW;
      ctx.scale(kScale, kScale);
    }

    lineData.forEach((ld, i) => {
      const gapY = i > 0 ? 8 * scale : 0; // gap-y-2
      const lineH = ld.maxH * 1.1; // generous leading
      lineYOffsets.push(totalHeight + lineH / 2 + gapY);
      totalHeight += lineH + gapY;
    });

    const startYOffset = -totalHeight / 2;

    // 3. Render words
    lineData.forEach((ld, lIdx) => {
      const lineY = startYOffset + lineYOffsets[lIdx];
      let currentX = -ld.totalW / 2;
      
      ld.wordsData.forEach((wd) => {
        const isVisible = time >= wd.start;
        const totalW = wordObjects.length;
        
        ctx.save();
        ctx.font = wd.fontStr;
        ctx.fillStyle = wd.color || '#FFFFFF';
        
        let wScale = 1;
        let wAlpha = 1;
        let dx = 0;
        
        if (!isVisible) {
          wAlpha = 0;
        } else {
          // Calculate entrance animation
          const p = clamp((time - wd.start) / 0.25, 0, 1);
          // Ease out cubic
          const easeCubic = 1 - Math.pow(1 - p, 3);
          
          wAlpha = easeCubic;
          wScale = 0.95 + 0.05 * easeCubic;
          
          if (totalW > 1) {
             if (wd.globalIndex === 0) {
                dx = -30 * (1 - easeCubic);
             } else if (wd.globalIndex === totalW - 1) {
                dx = 30 * (1 - easeCubic);
             }
          }
        }
        
        ctx.globalAlpha = wAlpha;
        ctx.translate(currentX + wd.width / 2 + dx, lineY);
        ctx.scale(wScale, wScale);
        
        if (style.glowEnabled) {
          ctx.shadowColor = style.adaptiveGlow ? (ctx.fillStyle as string) : (style.glowColor || style.highlightColor || '#FFD700');
          ctx.shadowBlur = style.glowSize || 10;
          ctx.shadowOffsetY = 0;
          ctx.shadowOffsetX = 0;
          ctx.fillText(wd.textToDraw, -wd.width / 2, 0);
        }

        if (style.shadowEnabled) {
          ctx.shadowColor = style.shadowColor || "#000000";
          ctx.shadowBlur = style.shadowIntensity || 4;
          ctx.shadowOffsetY = (style.shadowIntensity || 4) / 2;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
        }

        if (style.outlineEnabled) {
          ctx.strokeStyle = style.outlineColor || "#000000";
          ctx.lineWidth = (style.outlineWidth !== undefined ? style.outlineWidth : 3) * (width / 1080);
          ctx.strokeText(wd.textToDraw, -wd.width / 2, 0);
        }

        ctx.fillText(wd.textToDraw, -wd.width / 2, 0);
        ctx.restore();
        
        currentX += wd.width + (12 * scale);
      });
    });

    ctx.restore();
    return; // End of kinetic render!
  }


  // Basic styling
  const fontSize = (style.fontSize || 48) * (width / 1080); // scale based on width
  ctx.font = `${style.fontStyle === "italic" ? "italic " : ""}${style.fontWeight === "bold" ? "bold " : ""}${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  ctx.textAlign = style.textAlign as CanvasTextAlign;
  ctx.textBaseline = "middle";
  let currentLetterSpacing = style.letterSpacing || 0;
  if (style.animationStyle === 'follow-up' && (style.followUpStretch ?? true)) {
    const stretchMax = style.followUpStretchAmount ?? 15;
    const captionDuration = Math.max(0.01, caption.end - caption.start);
    // Smoothly stretch over the duration of the entire caption
    let captionProgress = clamp((time - caption.start) / captionDuration, 0, 1);
    const spline = style.followUpStretchSpline || 'ease-in';
    
    if (spline === 'ease-in') captionProgress = easeInQuart(captionProgress);
    else if (spline === 'ease-out') captionProgress = easeOutQuart(captionProgress);
    else if (spline === 'ease-in-out') captionProgress = easeInOutQuart(captionProgress);
    else if (spline === 'linear') captionProgress = linear(captionProgress);
    
    currentLetterSpacing += stretchMax * captionProgress;
  }

  if ('letterSpacing' in ctx) {
    (ctx as any).letterSpacing = `${currentLetterSpacing}px`;
  }


  const isFlat = style.animationStyle === "flat";
  const inDuration = style.fadeInDuration !== undefined ? style.fadeInDuration : 0.25;
  const outDuration = style.fadeOutDuration !== undefined ? style.fadeOutDuration : 0.25;
  const clipProgress = clamp((time - caption.start) / Math.max(0.01, inDuration), 0, 1);
  const clipOutProgress = clamp((caption.end - time) / Math.max(0.01, outDuration), 0, 1);
  const textAlpha = (style.animationEnabled && !isFlat)
    ? Math.min(clipProgress, clipOutProgress)
    : 1;
  ctx.globalAlpha = (style.animationStyle === "word-by-word" || style.animationStyle === "fade-in-word" || style.animationStyle === "play-typo" || isFlat) ? 1 : textAlpha;

  let text = formattedText;
  
  const EMOJI_MAP: Record<string, string> = {
    fire: "🔥",
    hot: "🔥",
    wow: "😮",
    cool: "😎",
    love: "❤️",
    heart: "❤️",
    rocket: "🚀",
    money: "💰",
    gold: "💰",
    win: "🏆",
    laugh: "😂",
    funny: "😂",
    mind: "🤯",
    blown: "🤯",
    stop: "🛑",
    go: "✅",
    warn: "⚠️",
  };

  if (style.autoEmoji) {
    const clean = text.toLowerCase().replace(/[^a-z]/g, "");
    if (EMOJI_MAP[clean]) {
      text = `${text} ${EMOJI_MAP[clean]}`;
    }
  }

  let isEmphasized = false;
  if (
    style.aiEmphasis &&
    (text.length > 7 ||
      ["amazing", "fast", "easy", "build", "auralis", "future"].includes(
        text.toLowerCase()
      ))
  ) {
    isEmphasized = true;
  }

  const baseTextColor = isEmphasized ? "#FF7067" : (style.textColor || "#ffffff");

  let lines = text.split("\n");
  if (style.casing === "uppercase") lines = lines.map((l) => l.toUpperCase());
  if (style.casing === "lowercase") lines = lines.map((l) => l.toLowerCase());

  const isWordBased = [
    'word-by-word',
    'word-highlight-box',
    'word-highlight-color',
    'fade-in-word',
    'karaoke',
    'play-typo',
    'follow-up'
  ].includes(style.animationStyle);

  ctx.translate(posX, posY);

  let baseScale = 1;
  if (style.animationEnabled && !isWordBased && !isFlat) {
    if (style.animationStyle === "pop-up") {
      const intensity = style.popupIntensity !== undefined ? style.popupIntensity : 1.0;
      
      let scaleX = 1;
      let scaleY = 1;
      let rotation = 0;

      let popProgress = clipProgress;
      // Squash and stretch, elastic overshoot
      if (popProgress < 0.2) {
        const sq = popProgress / 0.2;
        scaleX = 1 + 0.1 * sq * intensity;
        scaleY = 1 - 0.1 * sq * intensity;
      } else {
        const sp = (popProgress - 0.2) / 0.8;
        const elastic = easeOutElastic(sp);
        scaleX = 1 + (elastic - 1) * intensity;
        scaleY = 1 + (elastic - 1) * intensity;
      }
      
      const dir = style.popupDirection || 'center';
      if (dir === 'left') {
        ctx.translate(-150 * (1 - easeOutExpo(clipProgress)), 0);
        rotation = -0.1 * (1 - easeOutExpo(clipProgress));
      } else if (dir === 'right') {
        ctx.translate(150 * (1 - easeOutExpo(clipProgress)), 0);
        rotation = 0.1 * (1 - easeOutExpo(clipProgress));
      }

      if (style.popupMotionBlur && style.popupMotionBlur > 0) {
        const blurAmount = Math.max(0, style.popupMotionBlur * (1 - Math.min(1, clipProgress * 3)));
        if (blurAmount > 0.01) ctx.filter = `blur(${blurAmount}px)`;
      }
      
      ctx.rotate(rotation);
      ctx.scale(scaleX, scaleY);
      baseScale = scaleX;
    } else {
      const t = clipProgress * 10;
      let pop = 1;
      if (t < 1) pop = easeOutQuart(t) * 1.1;
      else pop = 1.1 - 0.1 * easeOutQuart(Math.min(1, t - 1));
      baseScale = pop;
      ctx.scale(baseScale, baseScale);
    }
  }
  
  if (style.animationStyle === "aesthetic" && !isFlat) {
    const waveSt = style.atWaveStrength ?? 20;
    // Organic floating, wavy deformation
    const yOffset = waveSt * (1 - easeOutExpo(clipProgress)) + Math.sin(time * 3) * 5;
    const xOffset = Math.cos(time * 2) * 3;
    ctx.translate(xOffset, yOffset);
    const rotation = Math.sin(time * 1.5) * 0.02 * (style.animationEnabled ? 1 : 0);
    ctx.rotate(rotation);
  }

  ctx.globalAlpha = 1;

  // Render Words/Lines
  const lineHeight = fontSize * (style.lineHeight || 1.2);
  const startY = (-(lines.length - 1) * lineHeight) / 2;

  let wordCounter = 0;
  const wordsTotal = lines.reduce(
    (acc, l) => acc + l.split(/\s+/).filter(Boolean).length,
    0,
  );

  // AI Reactive Emotion Analyzer
  let computedEmotion: string = caption.emotion || 'neutral';
  let computedIntensity = caption.emotionIntensity ?? 0.5;

  if (baseStyle.animationStyle === 'ai-reactive' || style.accessibilityPreset === 'hearing') {
    if (!caption.emotion || caption.emotion === 'neutral') {
      const rawLower = text.toLowerCase();
      if (rawLower.includes('!') || rawLower.match(/(hate|kill|angry|furious|stop|bad|wrong|danger|fight|wtf|break)/)) {
        computedEmotion = 'anger';
      } else if (rawLower.match(/(sad|cry|sorry|alone|lost|hurt|pain|tears|dark|death|die)/)) {
        computedEmotion = 'sadness';
      } else if (rawLower.match(/(amazing|yes|woo|awesome|perfect|excited|happy|champion|winner|love|future|gold|crazy)/)) {
        computedEmotion = 'excitement';
      } else if (rawLower.match(/(secret|shh|quiet|whisper|slept|soft|silence)/)) {
        computedEmotion = 'whisper';
      } else if (rawLower.match(/(funny|joke|lol|laugh|haha|funny|fun)/)) {
        computedEmotion = 'funny';
      }
    }
  }

  // Draw Speaker Diarization badge if speaker is available
  if (caption.speaker && style.showSpeakerBadges !== false) {
    const spkInfo = getSpeakerColor(caption.speaker, style.speakerColorMap);
    ctx.save();
    const spkFontSize = Math.max(14, fontSize * 0.38);
    ctx.font = `bold ${spkFontSize}px ${style.fontFamily || 'Inter, sans-serif'}`;
    const spkLabel = `[ ${caption.speaker.toUpperCase()} ]`;
    const spkWidth = ctx.measureText(spkLabel).width;
    
    // Explicitly set text alignment and baseline to ensure perfect centering
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const padX = 12;
    const padY = 6;
    const pillBoxWidth = spkWidth + padX * 2;
    const pillBoxHeight = spkFontSize + padY * 2;

    let badgeCenterX = 0;
    if (style.textAlign === 'left') {
      badgeCenterX = pillBoxWidth / 2;
    } else if (style.textAlign === 'right') {
      badgeCenterX = -pillBoxWidth / 2;
    } else {
      badgeCenterX = 0;
    }

    const badgeCenterY = startY - fontSize * 0.75 - pillBoxHeight / 2 - 6;

    const boxLeft = badgeCenterX - pillBoxWidth / 2;
    const boxTop = badgeCenterY - pillBoxHeight / 2;
    
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = spkInfo.hex;
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(boxLeft, boxTop, pillBoxWidth, pillBoxHeight, 6);
    } else {
      ctx.rect(boxLeft, boxTop, pillBoxWidth, pillBoxHeight);
    }
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = spkInfo.hex;
    ctx.fillText(spkLabel, badgeCenterX, badgeCenterY);
    ctx.restore();
  }

  // Draw emotion indicator for hearing accessibility mode
  if (style.accessibilityPreset === 'hearing' && computedEmotion !== 'neutral') {
    ctx.save();
    const emoFontSize = Math.max(12, fontSize * 0.4);
    ctx.font = `bold ${emoFontSize}px ${style.fontFamily || 'Inter, sans-serif'}`;
    ctx.fillStyle = '#FFFF00';
    const label = `[${computedEmotion.toUpperCase()}]`;
    const labelWidth = ctx.measureText(label).width;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let emoCenterX = 0;
    if (style.textAlign === 'left') emoCenterX = labelWidth / 2 + 8;
    else if (style.textAlign === 'right') emoCenterX = -labelWidth / 2 - 8;
    else emoCenterX = 0;

    const padX = 10;
    const padY = 5;
    const boxW = labelWidth + padX * 2;
    const boxH = emoFontSize + padY * 2;
    const offsetAboveSpeaker = (caption.speaker && style.showSpeakerBadges !== false) ? (boxH + 8) : 0;
    const emoCenterY = startY - lineHeight * 0.55 - offsetAboveSpeaker - boxH / 2;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(emoCenterX - boxW / 2, emoCenterY - boxH / 2, boxW, boxH);
    
    ctx.fillStyle = '#FFFF00';
    ctx.fillText(label, emoCenterX, emoCenterY);
    ctx.restore();
  }

  if (style.accessibilityPreset === 'vision') {
    const maxWidth = Math.max(...lines.map(l => {
      if (isWordBased) {
        const lineWords = l.split(/\s+/).filter(Boolean);
        const wordWidths = lineWords.map(w => ctx.measureText(w).width);
        const spaceWidth = ctx.measureText(" ").width + (style.wordSpacing || 0);
        return wordWidths.reduce((a, b) => a + b, 0) + spaceWidth * Math.max(0, lineWords.length - 1);
      }
      return ctx.measureText(l).width;
    }));
    
    const paddingX = fontSize * 0.6;
    const paddingY = fontSize * 0.4;
    const totalHeight = lines.length * lineHeight;
    
    let bgX = 0;
    if (style.textAlign === 'center') bgX = -maxWidth / 2 - paddingX;
    else if (style.textAlign === 'right') bgX = -maxWidth - paddingX;
    else bgX = -paddingX;

    // Adjust bgY to perfectly encapsulate the text lines
    const bgY = startY - fontSize * 0.8 - paddingY;
    const bgWidth = maxWidth + paddingX * 2;
    const bgHeight = totalHeight + paddingY * 2;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    if (typeof ctx.roundRect === 'function') {
       ctx.beginPath();
       ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 20);
       ctx.fill();
    } else {
       ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    }
    ctx.restore();
  }

  // Draw globally enabled Glow on Text
  // (We now apply glow per-word/line so it stacks properly with drop shadow)

  // Canvas Frame Boundary Protection: ensure caption lines never exceed 88% canvas width
  const maxAllowedWidth = width * 0.88;
  let maxLineWidth = 0;
  lines.forEach((l) => {
    let lWidth = 0;
    if (isWordBased) {
      const lWords = l.split(/\s+/).filter(Boolean);
      const wWidths = lWords.map((w) => ctx.measureText(w).width);
      const sWidth = ctx.measureText(" ").width + (style.wordSpacing || 0);
      lWidth = wWidths.reduce((a, b) => a + b, 0) + sWidth * Math.max(0, lWords.length - 1);
    } else {
      lWidth = ctx.measureText(l).width;
    }
    if (lWidth > maxLineWidth) maxLineWidth = lWidth;
  });

  if (maxLineWidth > maxAllowedWidth && maxLineWidth > 0) {
    const frameScale = maxAllowedWidth / maxLineWidth;
    ctx.scale(frameScale, frameScale);
  }

  lines.forEach((line, lIdx) => {
    let lineY = startY + lIdx * lineHeight;



    if (isWordBased) {
      const lineWords = line.split(/\s+/).filter(Boolean);
      let xOffset = 0;

      // Calculate total line width for horizontal justification
      const wordWidths = lineWords.map((w) => ctx.measureText(w).width);
      const spaceWidth = ctx.measureText(" ").width + (style.wordSpacing || 0);

      const totalWidth =
        wordWidths.reduce((a, b) => a + b, 0) +
        spaceWidth * (lineWords.length - 1);

      if (style.textAlign === "center") xOffset = -totalWidth / 2;
      else if (style.textAlign === "right") xOffset = -totalWidth;

      const isFadeInWordStyle = style.animationStyle === "fade-in-word";

      // Focus Word logic: determine focus word indices for this line (ensures AT LEAST ONE focus word per line)
      const lineStartCounter = wordCounter;
      const lineFocusIndices = new Set<number>();

      const defaultStopWords = new Set([
        'is', 'am', 'are', 'was', 'were', 'be', 'been', 'a', 'an', 'the', 'and', 'or', 'but', 
        'if', 'of', 'in', 'on', 'at', 'by', 'for', 'to', 'with', 'from', 'as', 'that', 'this', 
        'these', 'those', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i', 'my', 'your', 'their'
      ]);

      if (style.aiLineFocusHighlighting ?? true) {
        lineWords.forEach((w, wIdx) => {
          const actualW = caption.words?.[lineStartCounter + wIdx];
          if (actualW?.isFocus || (actualW?.emphasis ?? 0) >= 0.7) {
            lineFocusIndices.add(wIdx);
          }
        });

        if (lineFocusIndices.size === 0 && lineWords.length > 0) {
          let bestIdx = 0;
          let highestEmph = -1;
          lineWords.forEach((w, wIdx) => {
            const actualW = caption.words?.[lineStartCounter + wIdx];
            const emph = actualW?.emphasis ?? 0;
            if (emph > highestEmph) {
              highestEmph = emph;
              bestIdx = wIdx;
            }
          });

          if (highestEmph > 0) {
            lineFocusIndices.add(bestIdx);
          } else {
            let maxScore = -1;
            let fallbackIdx = 0;
            lineWords.forEach((w, wIdx) => {
              const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
              const isStop = defaultStopWords.has(clean);
              const score = (isStop ? 0 : 100) + clean.length;
              if (score > maxScore) {
                maxScore = score;
                fallbackIdx = wIdx;
              }
            });
            lineFocusIndices.add(fallbackIdx);
          }
        }
      }

      // Calculate the prominent target keyword
      const manualKeyword = style.depthKeywordManualOverride || '';
      let targetKeyword = '';
      if (manualKeyword) {
        targetKeyword = manualKeyword;
      } else {
        const trimmed = caption.text.trim();
        const wordsList = trimmed.split(/\s+/);
        let candidateIndex = 0;
        for (let i = 0; i < wordsList.length; i++) {
          const cleanW = wordsList[i].toLowerCase().replace(/[^a-z]/g, '');
          if (!defaultStopWords.has(cleanW)) {
            candidateIndex = i;
            break;
          }
        }
        targetKeyword = wordsList[candidateIndex] || wordsList[0] || '';
      }
      const targetKeywordClean = targetKeyword.replace(/[.,\/#!$%\^&\*;:{}=\-_ `~()?"']/g, "").toLowerCase();

      lineWords.forEach((word, wIdx) => {
        const index = wordCounter++;
        const actualWord = caption.words?.[index];
        
        const isLineFocusWord = lineFocusIndices.has(wIdx);

        // AI Reactive Word-Level Emotion override
        let wordEmotion = computedEmotion;
        let wordIntensity = computedIntensity;
        if (style.animationStyle === 'ai-reactive' && actualWord) {
           if (actualWord.emotion && actualWord.emotion !== 'neutral') {
             wordEmotion = actualWord.emotion;
           }
           if (actualWord.emphasis !== undefined) {
             wordIntensity = actualWord.emphasis;
           }
        }
        const wordStart = actualWord
          ? actualWord.start
          : caption.start +
            (index * (caption.end - caption.start)) / wordsTotal;
        const wordEnd = actualWord
          ? actualWord.end
          : caption.start +
            ((index + 1) * (caption.end - caption.start)) / wordsTotal;

        let wProgress = 1;
        let isActive = time >= wordStart && time <= wordEnd;
        let hasSpoken = time > wordEnd;

        const speakerName = actualWord?.speaker || caption.speaker;
        const speakerColorInfo = speakerName ? getSpeakerColor(speakerName, style.speakerColorMap) : null;
        let color = (style.speakerColorEnabled !== false && speakerColorInfo) 
          ? speakerColorInfo.hex 
          : baseTextColor;

        const wordClean = word.replace(/[.,\/#!$%\^&\*;:{}=\-_ `~()?"']/g, "").toLowerCase();
        const isSelectedKeyword = targetKeywordClean && wordClean === targetKeywordClean;

        let isActiveHighlight = isActive;
        if (style.onlyHighlightKeyword) {
          isActiveHighlight = isSelectedKeyword && isActive;
        } else {
          isActiveHighlight = (isLineFocusWord || isSelectedKeyword || isActive);
        }

        const isFocusActive = isLineFocusWord && isActive;

        if (style.animationEnabled) {
          wProgress = clamp(
            (time - wordStart) / (style.fadeInDuration || 0.15),
            0,
            1,
          );
        }

        const p = easeOutQuart(wProgress);
        const activeProgress = clamp(
          (time - wordStart) / (wordEnd - wordStart),
          0,
          1,
        );

        let ySlide = 0;
        let wScale = 1;
        let wordOpacity = 1;
        
        ctx.save();
        ctx.filter = 'none';

        if (style.animationEnabled) {
          if (isFadeInWordStyle) {
            // Fade-In Word: blur-to-sharp, soft opacity curve, slight upward drift, smooth overlap
            if (time < wordStart - 0.3) {
              wordOpacity = 0;
            } else if (time < wordStart) {
              // Pre-reveal overlap
              const pre = (time - (wordStart - 0.3)) / 0.3;
              wordOpacity = 0.3 * easeOutQuart(pre);
              ySlide = 10 * (1 - easeOutBack(pre));
              ctx.filter = `blur(${5 * (1 - pre)}px)`;
            } else if (isActive) {
              wordOpacity = 0.3 + 0.7 * easeOutQuart(p);
              wScale = 0.98 + 0.02 * easeOutQuart(p);
              ySlide = 2 * (1 - easeOutBack(p));
            } else {
              wordOpacity = 1;
            }
            wordOpacity *= clipOutProgress;
          } else if (style.animationStyle === 'play-typo') {
            if (time < wordStart - 0.15) {
              wordOpacity = 0;
            } else if (time < wordStart) {
              const ant = (time - (wordStart - 0.15)) / 0.15;
              wordOpacity = ant;
              wScale = 0.9 + 0.1 * ant;
              ySlide = 15 * (1 - ant);
              ctx.filter = `blur(${10 * (1 - ant)}px)`;
            } else if (isActiveHighlight) {
              const boost = easeOutQuart(activeProgress);
              wScale = 1.0 + 0.03 * (1 - boost);
              ctx.filter = `blur(${2 * (1 - boost)}px)`;
            } else {
              wordOpacity = 1;
            }
            wordOpacity *= clipOutProgress;
          } else if (style.animationStyle === 'follow-up') {
            const inDur = style.fadeInDuration || 0.2;
            if (time < wordStart) {
              wordOpacity = 0;
            } else if (time < wordStart + inDur) {
              wordOpacity = easeOutQuart((time - wordStart) / inDur);
            } else {
              wordOpacity = 1;
            }
            
            // Block level fade out handles the out animation, multiply here
            wordOpacity *= clipOutProgress;
          } else if (style.animationStyle === 'ai-reactive') {
            const ant = time < wordStart ? Math.max(0, (time - (wordStart - 0.15)) / 0.15) : 1;
            wordOpacity = time < wordStart - 0.15 ? 0 : ant;
            
            // Map intensities (0.0 to 1.0)
            const inten = wordIntensity;
            
            const currentEmotion = wordEmotion;

            if (style.accessibilityPreset === 'dyslexia') {
              // Dyslexia Mode: Extremely subtle emotions that override normal flashy emotion effects
              wordOpacity = time < wordStart - 0.2 ? 0 : easeOutQuart(Math.max(0, (time - (wordStart - 0.2)) / 0.2));
              ySlide = 0; // No vertical shaking, sliding, or disorienting movement
              
              if (currentEmotion === 'anger' || currentEmotion === 'frustration') {
                // Anger: Do NOT shake the entire caption.
                // Receives a slightly stronger highlight and very subtle weight/scale increase.
                if (isActive) {
                  wScale = 1.035; // Subtle weight/scale increase (~3.5%)
                }
              } else if (currentEmotion === 'surprise') {
                // Surprise: Tiny scale increase around 5% (1.05) instead of a giant pop
                if (isActive) {
                  wScale = 1.05;
                }
              } else if (currentEmotion === 'happiness' || currentEmotion === 'funny' || currentEmotion === 'excitement') {
                // Happiness: Soft warm highlight, clean steady layout
                if (isActive) {
                  wScale = 1.02;
                }
              } else if (currentEmotion === 'sadness' || currentEmotion === 'tiredness') {
                // Sadness: Slightly cooler highlight, clean steady layout
                if (isActive) {
                  wScale = 1.0;
                }
              } else if (isActive) {
                wScale = 1.02;
              }
            } else if (style.accessibilityPreset === 'calm') {
              if (time < wordStart) {
                ySlide = 5 * (1 - easeOutQuart(ant));
                ctx.filter = `blur(${3 * (1 - ant)}px)`;
              }
            } else if (style.accessibilityPreset === 'reduced-motion' || style.accessibilityPreset === 'vision') {
              wordOpacity = time < wordStart - 0.5 ? 0 : easeOutQuart(Math.max(0, (time - (wordStart - 0.5)) / 0.5));
            } else {
              // start of standard emotions
              const speechStyle = caption.speechStyle || 'normal';
              const pitchFactor = style.pitchModulation ?? true;
              const jitterFactor = style.kineticJitter ?? 1.0;

              if (pitchFactor) {
                if (speechStyle === 'shouting' || currentEmotion === 'anger') {
                  wScale *= 1.22;
                  if (isActive) {
                    ySlide += Math.sin(time * 90) * (3 * jitterFactor);
                  }
                } else if (speechStyle === 'whispering' || currentEmotion === 'whisper') {
                  wScale *= 0.88;
                  if (isActive) {
                    wordOpacity *= 0.9;
                  }
                } else if (speechStyle === 'hesitation') {
                  if (isActive) {
                    ctx.rotate(Math.sin(time * 20) * 0.04);
                  }
                } else if (speechStyle === 'laughing') {
                  if (isActive) {
                    ySlide -= Math.abs(Math.sin(time * 25)) * (5 * jitterFactor);
                  }
                }
              }
            
            if (currentEmotion === 'anger' || currentEmotion === 'frustration') {
              // Shake for anger
              if (time < wordStart) {
                 ySlide = 15 * (1 - easeOutCubic(ant)); // fast drop from bottom
                 wScale = 1.0 + (0.1 * (1 - ant));
              } else if (isActive) {
                 const shake = Math.sin(time * 85) * (4 + 5 * inten);
                 const shakeY = Math.cos(time * 70) * (2 + 2 * inten);
                 ySlide = shakeY;
                 ctx.translate(shake, 0);
                 wScale = isFocusActive ? 1.15 + (0.05 * inten) : 1.05 + (0.05 * inten);
              }
            } else if (currentEmotion === 'calmness' || currentEmotion === 'whisper' || currentEmotion === 'calm') {
              // Fade in + glow in yellow for calm
              if (time < wordStart) {
                const fadeProgress = clamp((time - (wordStart - 0.2)) / 0.2, 0, 1);
                wordOpacity = easeOutQuart(fadeProgress);
                ySlide = 5 * (1 - fadeProgress);
                ctx.filter = `blur(${3 * (1 - fadeProgress)}px)`;
              } else if (isActive) {
                wordOpacity = 1.0;
                wScale = isFocusActive ? 1.10 : 1.04;
                ySlide = -2 * Math.sin(activeProgress * Math.PI);
              }
            } else if (currentEmotion === 'surprise') {
              // Pop up + mild shake for surprise
              if (time < wordStart) {
                ySlide = 15 * (1 - easeOutElastic(ant));
                wScale = ant;
              } else if (isActive) {
                const boost = easeOutElastic(1 - activeProgress) * (0.12 + 0.1 * inten); // pop out effect
                wScale = 1.12 + boost;
                ySlide = -8 * (1 - activeProgress);
                const mildShake = Math.sin(time * 45) * 2.5;
                ctx.translate(mildShake, 0);
              }
            } else if (currentEmotion === 'happiness' || currentEmotion === 'funny') {
              // Gentle bounce / upward float
              if (time < wordStart) {
                 ySlide = 10 * (1 - easeOutBack(ant)); // bounce up
              } else if (isActiveHighlight) {
                 ySlide = -4 * Math.sin(activeProgress * Math.PI) * (1 + inten);
              }
            } else if (currentEmotion === 'sadness') {
              // Slow fade-in / downward drift
              if (time < wordStart) {
                 wordOpacity = time < wordStart - 0.3 ? 0 : easeOutQuart((time - (wordStart - 0.3)) / 0.3);
                 ySlide = -5 * (1 - ant); // drift down from top
              } else {
                 ySlide = 3 + 2 * inten;
              }
            } else if (currentEmotion === 'fear') {
              // Tremble in
              if (time < wordStart) {
                 ySlide = 5 * (1 - ant);
                 ctx.translate((Math.random() - 0.5) * (1 - ant) * 5, 0);
              } else if (isActive) {
                 const jitter = (Math.random() - 0.5) * (2 + 2 * inten);
                 ctx.translate(jitter, 0);
              }
            } else if (currentEmotion === 'excitement') {
              // Quick scale + jump
              if (time < wordStart) {
                 ySlide = 20 * (1 - easeOutBack(ant));
                 wScale = 0.8 + 0.2 * ant;
              } else if (isActiveHighlight) {
                wScale = 1.0 + 0.1 * inten;
                ySlide = -8 * Math.sin(activeProgress * Math.PI) * inten; // jump curve
              }
            } else if (currentEmotion === 'love') {
              // Soft scale-up / float
              if (time < wordStart) {
                 wScale = 0.9 + 0.1 * ant;
                 ctx.filter = `blur(${(1 - ant)}px)`;
              } else if (isActiveHighlight) {
                wScale = 1.0 + 0.05 * Math.sin(activeProgress * Math.PI) * inten;
                ySlide = -2 * Math.sin(activeProgress * Math.PI);
              }
            } else if (currentEmotion === 'confusion') {
              // Slight wobble
              if (time < wordStart) {
                 ySlide = 5 * (1 - ant);
                 ctx.rotate(0.05 * (1 - ant));
              } else if (isActive) {
                const wobble = Math.sin(time * 10) * (2 + 3 * inten);
                ctx.rotate(wobble * 0.01);
                ySlide = Math.cos(time * 12) * 2;
              }
            } else if (currentEmotion === 'frustration') {
              // Short shake / impact
              if (time < wordStart) {
                 wScale = 1.0 + (0.2 * (1 - ant));
              } else if (isActive) {
                const shake = Math.sin(time * 60) * (3 + 5 * inten);
                ctx.translate(shake, shake * 0.5);
              }
            } else if (currentEmotion === 'tiredness') {
              // Slow fade / downward slide
              if (time < wordStart) {
                 wordOpacity = ant * 0.8; // never fully 1.0
                 ySlide = -2 * (1 - ant);
              } else if (isActive) {
                 ySlide = 3 * activeProgress * (1 + inten);
                 wordOpacity = 0.8 - (0.3 * activeProgress);
              }
            } else {
              // Neutral: simple fade/slide
              if (time < wordStart) {
                 ySlide = 4 * (1 - easeOutBack(ant)); // slight pop
              }
              if (isActiveHighlight && inten > 0.5) {
                 wScale = 1.0 + 0.08 * inten; // highlight important words
              }
            }
            } // end of else standard logic
            
            if (style.accessibilityPreset === 'focus') {
               const dimOpacity = 0.2;
               if (!isActive) {
                 wordOpacity = dimOpacity;
               }
            }

            wordOpacity *= clipOutProgress;
          } else if (style.animationStyle === 'word-by-word') {
            // Word-by-word: slight anticipation, micro fade-in, small scale-up, organic pacing
            if (time < wordStart - 0.1) {
              wordOpacity = 0;
            } else if (time < wordStart) {
              const ant = (time - (wordStart - 0.1)) / 0.1;
              wordOpacity = ant;
              wScale = 0.8 + 0.2 * ant;
              ySlide = 8 * (1 - easeOutBack(ant));
            } else if (isActiveHighlight) {
              const boost = (((style.wwScaleInAmount ?? 100) - 100) / 100 + 0.1);
              const elasticBoost = easeOutElastic(activeProgress) * boost;
              wScale = 1.0 + elasticBoost;
              ySlide = -4 * Math.sin(activeProgress * Math.PI);
            }
            wordOpacity *= clipOutProgress;
          } else {
            // Keep spoken/highlighted fully visible, smoothly brighten upcoming words
            const dimOpacity = style.accessibilityPreset === 'focus' ? 0.2 : 0.35;
            wordOpacity = (style.accessibilityPreset === 'focus' && hasSpoken) ? dimOpacity : (!isActive && !hasSpoken) ? dimOpacity : (dimOpacity + (1 - dimOpacity) * p);
            wordOpacity *= clipOutProgress;
            
            if (isActive) {
              const shouldScale = !style.onlyHighlightKeyword || isSelectedKeyword;
              if (shouldScale) {
                if (style.animationStyle === 'word-highlight-color') {
                  const scaleVal = (((style.hcScaleBoost ?? 100) - 100) / 100) + 0.1;
                  wScale = 1.0 + easeOutElastic(activeProgress) * scaleVal;
                } else if (style.animationStyle === 'word-highlight-box') {
                  wScale = 1.0 + Math.sin(activeProgress * Math.PI) * 0.05;
                } else {
                  wScale = 1.0 + Math.sin(activeProgress * Math.PI) * 0.08;
                }
              }
            }
            
            if (!isWordBased) {
              ySlide = 10 * (1 - p);
            }
          }
        }

        ctx.translate(xOffset + wordWidths[wIdx] / 2, lineY + ySlide);
        ctx.scale(wScale, wScale);

        // BOX HIGHLIGHT preset: Smooth expansion, glowing, soft shadow
        if (style.animationStyle === 'word-highlight-box' && isActiveHighlight) {
          const padX = style.highlightBoxPadding ?? 6;
          const padY = style.highlightBoxPadding ?? 6;
          ctx.save();
          ctx.globalAlpha = wordOpacity; 
          
          const shadowIntensity = style.hbShadowIntensity ?? 0;
          if (shadowIntensity > 0) {
            ctx.shadowColor = `rgba(0, 0, 0, ${shadowIntensity / 100})`;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 6;
          } else {
            ctx.shadowBlur = 0;
          }
          
          ctx.fillStyle = style.highlightBoxColor || '#DFAC24';
          
          // dynamic magnetic expanding effect
          const dynPadX = padX + Math.sin(activeProgress * Math.PI) * 2;
          const dynPadY = padY + Math.sin(activeProgress * Math.PI) * 1;
          
          const boxW = wordWidths[wIdx] + dynPadX * 2;
          const boxH = fontSize * 1.1 + dynPadY * 2;
          
          const rx = -boxW / 2;
          const ry = -fontSize * 0.55 - dynPadY;
          const r = Math.min((boxH) / 2, style.highlightBoxRadius ?? 8);
          
          ctx.beginPath();
          ctx.moveTo(rx + r, ry);
          ctx.lineTo(rx + boxW - r, ry);
          ctx.quadraticCurveTo(rx + boxW, ry, rx + boxW, ry + r);
          ctx.lineTo(rx + boxW, ry + boxH - r);
          ctx.quadraticCurveTo(rx + boxW, ry + boxH, rx + boxW - r, ry + boxH);
          ctx.lineTo(rx + r, ry + boxH);
          ctx.quadraticCurveTo(rx, ry + boxH, rx, ry + boxH - r);
          ctx.lineTo(rx, ry + r);
          ctx.quadraticCurveTo(rx, ry, rx + r, ry);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          
          color = '#000000';
        } else if (style.animationStyle === 'word-highlight-color' && isActiveHighlight) {
          color = style.hcColor || style.highlightColor || '#FFD700';
          if (style.hcGlowStrength && style.hcGlowStrength > 0) {
            ctx.shadowColor = color;
            ctx.shadowBlur = style.hcGlowStrength + Math.sin(activeProgress * Math.PI) * 5; // glowing pulse
          }
        } else if (style.animationStyle === 'karaoke') {
          const sweepEnabled = !style.onlyHighlightKeyword || isSelectedKeyword;
          const shouldFollow = style.ksFollowAudio ?? true;
          if (isActive && sweepEnabled) {
            const sweepSpeed = style.ksSpeed ?? 1.0;
            // liquid easing progression
            const progressRatio = shouldFollow ? easeOutQuart(clamp((time - wordStart) / (wordEnd - wordStart), 0, 1)) : easeOutQuart(clamp((time - wordStart) * sweepSpeed, 0, 1));
            const sweepProgress = progressRatio;
            const wordW = wordWidths[wIdx];
            
            // gradient flow
            const grad = ctx.createLinearGradient(-wordW / 2 - 10, 0, wordW / 2 + 10, 0);
            grad.addColorStop(0, style.highlightColor || '#FFD700');
            grad.addColorStop(Math.max(0, sweepProgress - 0.1), style.highlightColor || '#FFD700'); 
            grad.addColorStop(Math.min(1, sweepProgress + 0.1), baseTextColor);
            grad.addColorStop(1, baseTextColor);
            color = grad as any;
          } else if (hasSpoken && sweepEnabled) {
            color = style.highlightColor || '#FFD700';
          } else {
            color = baseTextColor;
          }
        } else if (isActiveHighlight) {
          if (isFadeInWordStyle) {
            color = baseTextColor;
          } else if (style.accessibilityPreset === 'dyslexia') {
            const currentEmotion = wordEmotion;
            if (currentEmotion === 'happiness' || currentEmotion === 'funny' || currentEmotion === 'excitement') {
              color = '#FFE0B2'; // Soft warm highlight (e.g. [great])
            } else if (currentEmotion === 'sadness' || currentEmotion === 'tiredness') {
              color = '#C5CAE9'; // Slightly cooler highlight (e.g. [lost])
            } else if (currentEmotion === 'anger' || currentEmotion === 'frustration') {
              color = '#FFCDD2'; // Slightly stronger highlight (e.g. [STOP])
            } else if (currentEmotion === 'surprise') {
              color = '#FFF9C4'; // Soft bright highlight (e.g. [WHAT?!])
            } else if (currentEmotion === 'love') {
              color = '#F8BBD0'; // Soft warm pink highlight
            } else if (currentEmotion === 'calmness' || currentEmotion === 'whisper') {
              color = '#E0F7FA'; // Soft cyan highlight
            } else {
              color = style.highlightColor || '#FFD700';
            }
          } else if (style.animationStyle === 'ai-reactive') {
            if (style.aiSentimentColors ?? style.aeAutoColorToggle ?? true) {
              const currentEmotion = wordEmotion;
              const speechStyle = caption.speechStyle || 'normal';

              if (isFocusActive || isActive) {
                if (speechStyle === 'shouting' || currentEmotion === 'anger' || currentEmotion === 'frustration') {
                  color = '#FF2E63'; // Neon Crimson
                  ctx.shadowColor = '#FF1E56';
                  ctx.shadowBlur = (style.emotionGlow ?? true) ? 28 + 8 * wordIntensity : 12;
                } else if (speechStyle === 'whispering' || currentEmotion === 'calmness' || currentEmotion === 'whisper' || currentEmotion === 'calm') {
                  color = '#E0E7FF'; // Soft Electric Ice Blue
                  ctx.shadowColor = '#A5B4FC';
                  ctx.shadowBlur = (style.emotionGlow ?? true) ? 22 : 8;
                } else if (currentEmotion === 'surprise') {
                  color = '#00F5FF'; // Electric Cyan
                  ctx.shadowColor = '#00F5FF';
                  ctx.shadowBlur = (style.emotionGlow ?? true) ? 26 : 10;
                } else if (currentEmotion === 'happiness' || currentEmotion === 'funny' || currentEmotion === 'excitement' || speechStyle === 'laughing') {
                  color = '#FFD32A'; // Electric Gold
                  ctx.shadowColor = '#FFD32A';
                  ctx.shadowBlur = (style.emotionGlow ?? true) ? 25 : 10;
                } else if (currentEmotion === 'sadness' || currentEmotion === 'tiredness' || speechStyle === 'crying') {
                  color = '#8A99AD'; // Slate Lavender
                  ctx.shadowColor = '#64748B';
                  ctx.shadowBlur = (style.emotionGlow ?? true) ? 18 : 6;
                } else if (currentEmotion === 'love') {
                  color = '#FF6584'; // Neon Soft Coral
                  ctx.shadowColor = '#FF6584';
                  ctx.shadowBlur = (style.emotionGlow ?? true) ? 24 : 10;
                } else if (currentEmotion === 'warning' || currentEmotion === 'critical') {
                  color = '#FF3838'; // Alert Crimson
                  ctx.shadowColor = '#FF3838';
                  ctx.shadowBlur = 30;
                } else {
                  color = style.highlightColor || '#FFD700';
                  ctx.shadowColor = style.highlightColor || '#FFD700';
                  ctx.shadowBlur = (style.emotionGlow ?? true) ? 22 : 8;
                }
              } else {
                color = baseTextColor;
              }
            } else {
              color = isFocusActive ? (style.highlightColor || '#FFD700') : (isActive ? (style.highlightColor || '#FFD700') : baseTextColor);
            }
          } else {
            color = isFocusActive ? (style.highlightColor || '#FFD700') : (isActive ? (style.highlightColor || '#FFD700') : baseTextColor);
          }
        }

        // Stroke / Shadow / Fill
        ctx.globalAlpha = wordOpacity;

        if (style.glowEnabled) {
          ctx.shadowColor = style.adaptiveGlow ? color : (style.glowColor || style.highlightColor || '#FFD700');
          ctx.shadowBlur = style.glowSize || 10;
          ctx.shadowOffsetY = 0;
          ctx.shadowOffsetX = 0;
          ctx.fillStyle = color;
          ctx.fillText(word, 0, 0);
        }

        if (style.shadowEnabled && style.animationStyle !== 'word-highlight-box') {
          ctx.shadowColor = style.shadowColor || "#000000";
          ctx.shadowBlur = style.shadowIntensity || 4;
          ctx.shadowOffsetY = style.animationStyle === 'play-typo' ? 0 : (style.shadowIntensity || 4) / 2;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
        }

        if (style.outlineEnabled) {
          ctx.strokeStyle = style.outlineColor || "#000000";
          ctx.lineWidth = (style.outlineWidth !== undefined ? style.outlineWidth : 3) * (width / 1080);
          ctx.strokeText(word, 0, 0);
        }

        ctx.fillStyle = color;
        ctx.fillText(word, 0, 0);

        ctx.restore();

        xOffset += wordWidths[wIdx] + spaceWidth;
      });
    } else {
      ctx.save();

      let textToRender = line;
      let lineAlpha = textAlpha;

      // 1. KINETIC TYPEWRITER (natural acceleration, cursor blinking, momentum, shake)
      if (style.animationStyle === 'typewriter') {
        const segDuration = caption.end - caption.start;
        // natural typing easing (easeOutQuart creates faster initial typing, slowing at end)
        const typeProgress = easeOutQuart(clamp((time - caption.start) / segDuration, 0, 1));
        const charDelay = style.twCharDelay ?? 50; 
        const speedRatio = charDelay / 50;
        const charsLimit = Math.floor(typeProgress * line.length * (1.35 / speedRatio));
        textToRender = line.slice(0, Math.max(0, charsLimit));

        const blinkSpeed = (style.twCursorBlinkSpeed ?? 500) / 1000;
        if (time < caption.end + 1.0) { 
           if (charsLimit < line.length || Math.floor(time / blinkSpeed) % 2 === 0) {
             textToRender += '▮'; // Cursor visible while typing or blinking at end
           }
        }
        
        if (isEmphasized && charsLimit > 0 && charsLimit < line.length) {
          const shakeFactor = 3 * Math.random();
          ctx.translate(shakeFactor, shakeFactor * 0.3);
        }
      }

      // 2. CINEMATIC NETFLIX (cinematic blur entrance, soft depth of field, slow drift, depth separation)
      if (style.animationStyle === 'netflix') {
        const entryMax = style.fadeInDuration || 0.4;
        const entryProgress = clamp((time - caption.start) / entryMax, 0, 1);
        const exitProgress = clamp((caption.end - time) / (style.fadeOutDuration || 0.4), 0, 1);
        lineAlpha = easeOutQuart(entryProgress) * exitProgress;
        
        const elapsed = time - caption.start;
        const nxSlideDist = style.nxSlideDistance ?? 12;
        // ultra-smooth drift + entry
        const yMotion = nxSlideDist * (1 - easeOutQuart(entryProgress)) - (elapsed * (nxSlideDist * 0.4));
        ctx.translate(0, yMotion);

        if (entryProgress < 1.0) {
          const nxBlurAmt = style.nxBlurAmount ?? 8;
          const blurRadius = (1.0 - easeOutCubic(entryProgress)) * nxBlurAmt;
          ctx.filter = `blur(${blurRadius}px)`;
        }
        
        // Deep cinematic background shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 5;
      }

      // 3. LAYERED 3D DEPTH (parallax floating, perspective correction, dynamic lighting)
      if (style.animationStyle === '3d-depth') {
        // smooth environmental drift
        const driftX = Math.sin(time * 1.2) * 8;
        const driftY = Math.cos(time * 0.9) * 5;
        
        const depthScale = 1.0 + Math.sin(time * 1.5) * 0.03;
        ctx.scale(depthScale, depthScale);

        // Backdrop 3D shadow layer (distant layer)
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 15; // depth-based blur
        ctx.shadowOffsetY = 10;
        ctx.translate(driftX * 0.5 + 8, lineY + driftY * 0.5 + 8);
        ctx.scale(0.95, 0.95); // perspective correction
        ctx.fillText(textToRender, 0, 0);
        ctx.restore();

        // Foreground floating layer (close layer, catches light)
        ctx.translate(driftX, lineY + driftY);
        ctx.fillStyle = baseTextColor;
        
        // dynamic lighting response
        const lightGlow = Math.abs(Math.sin(time * 2));
        ctx.shadowColor = `rgba(255, 255, 255, ${0.2 * lightGlow})`;
        ctx.shadowBlur = 10 * lightGlow;
        
        ctx.fillText(textToRender, 0, 0);
      } else {
        const speakerName = caption.speaker;
        const speakerColorInfo = speakerName ? getSpeakerColor(speakerName, style.speakerColorMap) : null;
        ctx.fillStyle = (style.speakerColorEnabled !== false && speakerColorInfo) ? speakerColorInfo.hex : baseTextColor;
        if (style.animationStyle === "aesthetic") {
          ctx.fillStyle = style.highlightColor || baseTextColor;
        } else if (style.accessibilityPreset === 'dyslexia') {
          const currentEmotion = computedEmotion;
          if (currentEmotion === 'happiness' || currentEmotion === 'funny' || currentEmotion === 'excitement') {
            ctx.fillStyle = '#FFE0B2'; // Soft warm highlight
          } else if (currentEmotion === 'sadness' || currentEmotion === 'tiredness') {
            ctx.fillStyle = '#C5CAE9'; // Slightly cooler highlight
          } else if (currentEmotion === 'anger' || currentEmotion === 'frustration') {
            ctx.fillStyle = '#FFCDD2'; // Slightly stronger highlight
          } else if (currentEmotion === 'surprise') {
            ctx.fillStyle = '#FFF9C4'; // Soft bright highlight
          } else {
            ctx.fillStyle = style.highlightColor || '#FFD700';
          }
        } else if (style.animationStyle === 'ai-reactive') {
          if (style.aeAutoColorToggle ?? true) {
            const currentEmotion = computedEmotion;
            if (currentEmotion === 'anger' || currentEmotion === 'frustration') {
              ctx.fillStyle = '#FF453A'; 
            } else if (currentEmotion === 'sadness' || currentEmotion === 'tiredness') {
              ctx.fillStyle = '#AEAEB2'; 
            } else if (currentEmotion === 'excitement' || currentEmotion === 'surprise') {
              ctx.fillStyle = style.highlightColor || '#FFD700'; 
            } else if (currentEmotion === 'calmness' || currentEmotion === 'whisper') {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; 
            } else if (currentEmotion === 'funny' || currentEmotion === 'happiness') {
              ctx.fillStyle = '#FF9500';
            } else if (currentEmotion === 'love') {
              ctx.fillStyle = '#FF69B4'; // Pink for love
            } else if (currentEmotion === 'fear') {
              ctx.fillStyle = '#8B0000'; // Dark red for fear
            } else if (currentEmotion === 'confusion') {
              ctx.fillStyle = '#9370DB'; // Purple for confusion
            }
          }
        }

        ctx.globalAlpha = lineAlpha;

        if (style.glowEnabled) {
          ctx.shadowColor = style.adaptiveGlow ? (ctx.fillStyle as string) : (style.glowColor || style.highlightColor || '#FFD700');
          ctx.shadowBlur = style.glowSize || 10;
          ctx.shadowOffsetY = 0;
          ctx.shadowOffsetX = 0;
          ctx.fillText(textToRender, 0, lineY);
        }

        if (style.shadowEnabled && style.animationStyle !== 'netflix') {
          ctx.shadowColor = style.shadowColor || "#000000";
          ctx.shadowBlur = style.shadowIntensity || 4;
          ctx.shadowOffsetY = style.animationStyle === 'play-typo' ? 0 : (style.shadowIntensity || 4) / 2;
        } else if (style.animationStyle !== 'netflix') {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
        }

        if (style.outlineEnabled) {
          ctx.strokeStyle = style.outlineColor || "#000000";
          ctx.lineWidth = (style.outlineWidth !== undefined ? style.outlineWidth : 3) * (width / 1080);
          ctx.strokeText(textToRender, 0, lineY);
        }

        ctx.fillText(textToRender, 0, lineY);
      }

      ctx.restore();
      ctx.filter = 'none';
    }
  });

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.resetTransform();
};
