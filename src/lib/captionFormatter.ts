import { CaptionSegment, AudioSoundEvent, SemanticTimeline, AccessibilityCaptionMode, CustomAccessibilityConfig } from '../types';

export const DEFAULT_CUSTOM_CONFIG: CustomAccessibilityConfig = {
  showEmotions: true,
  showSounds: true,
  showSpeechEmphasis: true,
  showSpeakerNames: false,
  showWhisperingLabels: true,
  showShoutingLabels: true,
  showMusicCues: true,
  showEnvironmentalCues: true,
  adaptiveVisualEmphasis: true,
  emotionThreshold: 0.70,
  soundThreshold: 0.70,
  importanceThreshold: 0.65,
};

export const MODE_DEFAULT_WORDS_PER_SEGMENT: Record<AccessibilityCaptionMode, number> = {
  standard: 5,
  emotion: 4,
  sounds: 5,
  emotion_sounds: 4,
  adaptive: 4,
  full: 4,
  custom: 5,
};

export interface FormattedCaptionItem {
  id: string;
  start: number;
  end: number;
  type: 'caption' | 'sound_event';
  displayText: string;
  originalText: string;
  emotionLabel?: string;
  soundLabel?: string;
  speaker?: string;
  words?: any[];
  emotion?: string;
  emotionIntensity?: number;
  speechStyle?: string;
  isAdaptiveEmphasized?: boolean;
}

/**
 * Re-segments captions into optimal word chunks based on the active mode's target words per segment.
 * Preserves exact timing, word arrays, speaker diarization, and emotion classifications.
 */
export function rechunkCaptionSegments(
  segments: CaptionSegment[],
  targetWordsPerSegment: number = 5
): CaptionSegment[] {
  if (!segments || segments.length === 0) return [];

  const allWords: {
    text: string;
    start: number;
    end: number;
    emotion?: string;
    emphasis?: number;
    isFocus?: boolean;
    speaker?: string;
    speechStyle?: string;
    segRef?: CaptionSegment;
  }[] = [];

  segments.forEach((seg) => {
    let cleanText = (seg.text || '')
      .replace(/^\[[^\]]+\]\s*/, '')
      .replace(/^(?:\[(Speaker\s*\d+|[A-Za-z0-9_-]+)\]:?|(Speaker\s*\d+|[A-Za-z0-9_-]+):)\s*/i, '')
      .trim();

    if (seg.words && seg.words.length > 0) {
      seg.words.forEach((w) => {
        const wText = (w.text || '').replace(/^\[[^\]]+\]\s*/, '').trim();
        if (wText) {
          allWords.push({
            text: wText,
            start: w.start,
            end: w.end,
            emotion: w.emotion || seg.emotion,
            emphasis: w.emphasis,
            isFocus: w.isFocus,
            speaker: w.speaker || seg.speaker,
            speechStyle: seg.speechStyle,
            segRef: seg,
          });
        }
      });
    } else {
      const parts = cleanText.split(/\s+/).filter(Boolean);
      const duration = Math.max(0.1, seg.end - seg.start);
      const wordDur = duration / Math.max(1, parts.length);
      parts.forEach((p, idx) => {
        allWords.push({
          text: p,
          start: seg.start + idx * wordDur,
          end: seg.start + (idx + 1) * wordDur,
          emotion: seg.emotion,
          speaker: seg.speaker,
          speechStyle: seg.speechStyle,
          segRef: seg,
        });
      });
    }
  });

  if (allWords.length === 0) return segments;

  const chunked: CaptionSegment[] = [];
  let currentWords: typeof allWords = [];

  for (let i = 0; i < allWords.length; i++) {
    const word = allWords[i];
    currentWords.push(word);

    const isSplit = /[.?!]+$/.test(word.text);
    const nextWord = allWords[i + 1];
    const speakerChanged = !!(nextWord && word.speaker && nextWord.speaker && word.speaker !== nextWord.speaker);
    const reachedLimit = currentWords.length >= Math.max(1, targetWordsPerSegment);
    const isLast = i === allWords.length - 1;

    if (isSplit || speakerChanged || reachedLimit || isLast) {
      const start = currentWords[0].start;
      const end = currentWords[currentWords.length - 1].end;
      const refSeg = currentWords[0].segRef;
      const chunkEmotion = currentWords.find(w => w.emotion && w.emotion !== 'neutral')?.emotion || refSeg?.emotion || 'neutral';
      const chunkSpeaker = currentWords[0].speaker || refSeg?.speaker;
      const chunkSpeechStyle = currentWords[0].speechStyle || refSeg?.speechStyle || 'normal';

      chunked.push({
        id: `caption-${Date.now()}-${chunked.length}`,
        start,
        end,
        text: currentWords.map(w => w.text).join(' '),
        words: currentWords.map(w => ({
          text: w.text,
          start: w.start,
          end: w.end,
          emotion: w.emotion,
          emphasis: w.emphasis,
          isFocus: w.isFocus,
          speaker: w.speaker
        })),
        emotion: chunkEmotion,
        speechStyle: chunkSpeechStyle,
        speaker: chunkSpeaker,
        emotionIntensity: refSeg?.emotionIntensity ?? 0.8,
        confidence: refSeg?.confidence ?? 0.9,
        emphasis: refSeg?.emphasis || [],
      });

      currentWords = [];
    }
  }

  return chunked;
}

export function inferEmotionFromText(text: string): string | null {
  const clean = text.trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();

  if (/\b(stop|no|don't|never|shut up|hate|angry|mad|furious)\b/i.test(lower) || /!{2,}/.test(clean)) return '[angry]';
  if (/\b(quiet|whisper|shh|secret|softly|hush)\b/i.test(lower)) return '[whispering]';
  if (/\b(wow|omg|what|crazy|unbelievable|no way|shock)\b/i.test(lower) || /\?{2,}/.test(clean)) return '[shocked]';
  if (/\b(haha|lmao|lol|funny|laugh|hilarious|giggle)\b/i.test(lower)) return '[laughing]';
  if (/\b(amazing|great|awesome|love|happy|yay|win|fantastic)\b/i.test(lower)) return '[excited]';
  if (/\b(sorry|sad|cry|pain|hurt|unfortunately|loss)\b/i.test(lower)) return '[sad]';
  if (/\b(scared|fear|run|help|danger|terrible)\b/i.test(lower)) return '[scared]';
  if (/\b(maybe|um|uh|well|hesitate|confused)\b/i.test(lower)) return '[hesitating]';
  
  if (clean.endsWith('!')) return '[excited]';
  if (clean.endsWith('?')) return '[curious]';
  
  return '[expressive]';
}

/**
 * Normalizes emotion string into concise square bracket label
 * e.g. "shock" -> "shocked", "anger" -> "angry", "whisper" -> "whispering"
 */
export function formatEmotionBracket(emotion?: string, speechStyle?: string): string | null {
  if (emotion && emotion.startsWith('[') && emotion.endsWith(']')) {
    return emotion;
  }

  if (speechStyle && speechStyle !== 'normal') {
    if (speechStyle === 'whispering') return '[whispering]';
    if (speechStyle === 'shouting') return '[shouting]';
    if (speechStyle === 'laughing') return '[laughing]';
    if (speechStyle === 'crying') return '[crying]';
    if (speechStyle === 'hesitation') return '[hesitating]';
  }

  if (!emotion || emotion === 'neutral' || emotion === 'calmness') return null;

  const map: Record<string, string> = {
    anger: '[angry]',
    angry: '[angry]',
    shock: '[shocked]',
    shocked: '[shocked]',
    surprise: '[surprised]',
    surprised: '[surprised]',
    excitement: '[excited]',
    excited: '[excited]',
    sadness: '[sad]',
    sad: '[sad]',
    fear: '[scared]',
    scared: '[scared]',
    frustration: '[frustrated]',
    frustrated: '[frustrated]',
    confusion: '[confused]',
    confused: '[confused]',
    happiness: '[happy]',
    happy: '[happy]',
    love: '[loving]',
    whisper: '[whispering]',
    whispering: '[whispering]',
    shout: '[shouting]',
    shouting: '[shouting]',
    laughter: '[laughing]',
    laughing: '[laughing]',
  };

  const key = emotion.toLowerCase().trim();
  return map[key] || `[${key}]`;
}

/**
 * Main function to transform raw or semantic segments & sound events into formatted captions
 * according to the active accessibility mode.
 */
export function getFormattedCaptionsForMode(
  segments: CaptionSegment[],
  soundEvents: AudioSoundEvent[] = [],
  mode: AccessibilityCaptionMode = 'standard',
  customConfig: Partial<CustomAccessibilityConfig> = {},
  wordsPerSegment?: number
): FormattedCaptionItem[] {
  const config: CustomAccessibilityConfig = {
    ...DEFAULT_CUSTOM_CONFIG,
    ...customConfig,
  };

  const targetWords = wordsPerSegment || MODE_DEFAULT_WORDS_PER_SEGMENT[mode] || 5;
  const processedSegments = rechunkCaptionSegments(segments, targetWords);

  const result: FormattedCaptionItem[] = [];

  // Determine what features are enabled for the selected mode
  let includeEmotions = false;
  let includeSounds = false;
  let includeAdaptiveEmphasis = false;
  let includeSpeaker = false;

  switch (mode) {
    case 'standard':
      includeEmotions = false;
      includeSounds = false;
      includeAdaptiveEmphasis = false;
      includeSpeaker = false;
      break;
    case 'emotion':
      includeEmotions = true;
      includeSounds = false;
      includeAdaptiveEmphasis = false;
      includeSpeaker = false;
      break;
    case 'sounds':
      includeEmotions = false;
      includeSounds = true;
      includeAdaptiveEmphasis = false;
      includeSpeaker = false;
      break;
    case 'emotion_sounds':
      includeEmotions = true;
      includeSounds = true;
      includeAdaptiveEmphasis = false;
      includeSpeaker = false;
      break;
    case 'adaptive':
      includeEmotions = false;
      includeSounds = false;
      includeAdaptiveEmphasis = true;
      includeSpeaker = false;
      break;
    case 'full':
      includeEmotions = true;
      includeSounds = true;
      includeAdaptiveEmphasis = true;
      includeSpeaker = true;
      break;
    case 'custom':
      includeEmotions = config.showEmotions;
      includeSounds = config.showSounds;
      includeAdaptiveEmphasis = config.adaptiveVisualEmphasis;
      includeSpeaker = config.showSpeakerNames;
      break;
  }

  // 1. Process Caption Segments
  processedSegments.forEach((seg) => {
    let prefixParts: string[] = [];

    // Strip any existing leading bracket from text to prevent double brackets
    let cleanText = seg.text;
    let existingBracket: string | null = null;
    const bracketMatch = cleanText.match(/^(\[[^\]]+\])\s*/);
    if (bracketMatch) {
      existingBracket = bracketMatch[1];
      cleanText = cleanText.replace(/^\[[^\]]+\]\s*/, '').trim();
    }

    // Speaker label
    if (includeSpeaker && seg.speaker) {
      prefixParts.push(`${seg.speaker}:`);
    }

    // Emotion bracket
    let emotionBracket: string | null = null;

    if (includeEmotions) {
      emotionBracket = formatEmotionBracket(seg.emotion, seg.speechStyle) || 
                       (seg.bracketLabel ? (seg.bracketLabel.startsWith('[') ? seg.bracketLabel : `[${seg.bracketLabel}]`) : null) ||
                       ((seg as any).bracket_label ? ((seg as any).bracket_label.startsWith('[') ? (seg as any).bracket_label : `[${(seg as any).bracket_label}]`) : null) ||
                       existingBracket;

      if (!emotionBracket) {
        emotionBracket = inferEmotionFromText(cleanText);
      }

      if (emotionBracket) {
        prefixParts.push(emotionBracket);
      }
    }

    let displayText = cleanText;

    // Adaptive Emphasis formatting
    if (includeAdaptiveEmphasis) {
      if (seg.words && seg.words.length > 0) {
        // Format words with emphasis
        const formattedWords = seg.words.map((w) => {
          const isEmphasized = w.isFocus || (w.emphasis && w.emphasis >= 0.75) || (seg.emphasis && seg.emphasis.some((e: string) => w.text.toLowerCase().includes(e.toLowerCase())));
          if (isEmphasized) {
            return w.text.toUpperCase();
          }
          return w.text;
        });
        
        // Break lines at high-emphasis words if suitable
        if (formattedWords.length > 3) {
          const mid = Math.floor(formattedWords.length / 2);
          const firstHalf = formattedWords.slice(0, mid).join(' ');
          const secondHalf = formattedWords.slice(mid).join(' ');
          displayText = `${firstHalf}\n${secondHalf}`;
        } else {
          displayText = formattedWords.join(' ');
        }
      } else if (seg.emphasis && seg.emphasis.length > 0) {
        let textCopy = cleanText;
        seg.emphasis.forEach((phrase) => {
          const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
          textCopy = textCopy.replace(regex, phrase.toUpperCase());
        });
        displayText = textCopy;
      }
    }

    if (prefixParts.length > 0) {
      displayText = `${prefixParts.join(' ')} ${displayText}`;
    }

    result.push({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      type: 'caption',
      displayText: displayText.trim(),
      originalText: cleanText,
      emotionLabel: emotionBracket || undefined,
      speaker: seg.speaker,
      words: seg.words,
      emotion: seg.emotion || (emotionBracket ? emotionBracket.replace(/[\[\]]/g, '') : 'neutral'),
      emotionIntensity: seg.emotionIntensity || 0.8,
      speechStyle: seg.speechStyle || 'normal',
      isAdaptiveEmphasized: includeAdaptiveEmphasis,
    });
  });

  // 2. Interleave Non-Speech Sound Events
  if (includeSounds && soundEvents.length > 0) {
    soundEvents.forEach((ev) => {
      // Apply confidence and importance thresholds
      if (ev.confidence >= config.soundThreshold && ev.importance >= config.importanceThreshold) {
        const soundText = ev.label.startsWith('[') ? ev.label : `[${ev.label}]`;
        
        // Check if there is already a speech caption at the exact same start time
        const overlappingCaptionIndex = result.findIndex(
          (item) => item.type === 'caption' && Math.abs(item.start - ev.start) < 0.5
        );

        if (overlappingCaptionIndex !== -1 && (mode === 'sounds' || mode === 'emotion_sounds' || mode === 'full' || mode === 'custom')) {
          // Append sound event bracket on a new line or prefix
          const existing = result[overlappingCaptionIndex];
          if (!existing.displayText.includes(soundText)) {
            existing.displayText = `${existing.displayText}\n${soundText}`;
            existing.soundLabel = soundText;
          }
        } else {
          // Add as standalone sound event item
          result.push({
            id: ev.id || `sound-${ev.event}-${ev.start}`,
            start: ev.start,
            end: ev.end,
            type: 'sound_event',
            displayText: soundText,
            originalText: soundText,
            soundLabel: soundText,
          });
        }
      }
    });
  }

  // Sort by start time
  return result.sort((a, b) => a.start - b.start);
}

// Fast LRU / Map cache for formatted caption text to avoid re-running regex on every frame
const captionFormatCache = new Map<string, string>();
const MAX_FORMAT_CACHE = 500;

/**
 * Utility to format a single CaptionSegment into text based on mode
 */
export function getFormattedCaptionText(
  seg: CaptionSegment,
  mode: AccessibilityCaptionMode = 'standard',
  customConfig: Partial<CustomAccessibilityConfig> = {}
): string {
  if (!seg) return '';
  const cacheKey = `${seg.id || ''}_${seg.text || ''}_${mode}_${seg.emotion || ''}_${seg.speaker || ''}_${seg.speechStyle || ''}_${seg.bracketLabel || ''}_${customConfig?.showEmotions}_${customConfig?.showSounds}_${customConfig?.showSpeakerNames}_${customConfig?.adaptiveVisualEmphasis}`;
  const cached = captionFormatCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const items = getFormattedCaptionsForMode([seg], [], mode, customConfig);
  const result = items.length > 0 ? items[0].displayText : (seg.text || '');

  if (captionFormatCache.size >= MAX_FORMAT_CACHE) {
    const firstKey = captionFormatCache.keys().next().value;
    if (firstKey !== undefined) captionFormatCache.delete(firstKey);
  }
  captionFormatCache.set(cacheKey, result);
  return result;
}


