import { CaptionSegment, WordTiming } from "../types";

export function parseSRT(data: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  
  // Clean carriage returns and split into lines
  const lines = data.replace(/\r/g, '').split('\n').map(l => l.trim());
  
  let i = 0;
  while (i < lines.length) {
    // Skip empty lines
    if (!lines[i]) {
      i++;
      continue;
    }
    
    // An SRT block starts with an index (number), but the most reliable marker is the timecode line: HH:MM:SS,MS --> HH:MM:SS,MS
    const timeMatch = lines[i].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    
    if (timeMatch) {
      let id = String(segments.length + 1);
      // Apply a global offset (-0.3s) to fix the delay between spoken words and written text
      const SYNC_OFFSET = -0.3;
      const start = Math.max(0, timeToSeconds(timeMatch[1]) + SYNC_OFFSET);
      const end = Math.max(0, timeToSeconds(timeMatch[2]) + SYNC_OFFSET);
      
      // Let's gather the text lines for this block
      i++;
      const textLines: string[] = [];
      while (i < lines.length) {
        const nextLine = lines[i];
        if (!nextLine) {
          i++;
          break;
        }
        
        // If the next line is a timestamp line, stop
        if (nextLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)) {
          break;
        }
        
        // If the next line is an integer and is followed by a timestamp line, stop
        const isNextInteger = /^\d+$/.test(nextLine);
        if (isNextInteger && i + 1 < lines.length) {
          const lineAfter = lines[i + 1];
          if (lineAfter.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/)) {
            id = nextLine;
            break;
          }
        }
        
        textLines.push(nextLine);
        i++;
      }
      
      const text = textLines.join(' ').replace(/<\/?[^>]+(>|$)/g, "").trim();
      
      if (text) {
        let bracketLabel: string | undefined = undefined;
        let emotion: string | undefined = undefined;
        let speaker: string | undefined = undefined;
        let cleanText = text;

        // 1. Detect Speaker tags like "[Speaker 1]" or "Speaker 1:" or "[Speaker A]:"
        const speakerMatch = cleanText.match(/^(?:\[(Speaker\s*\d+|Speaker\s*[A-Z]|Person\s*\d+|[A-Z][a-z]+)\]:?|(Speaker\s*\d+|Speaker\s*[A-Z]):)\s*/i);
        if (speakerMatch) {
          speaker = (speakerMatch[1] || speakerMatch[2]).trim();
          cleanText = cleanText.substring(speakerMatch[0].length).trim();
        }

        // 2. Match bracketed emotion / acoustic markers like [excited], [whispering], [applause], [screaming]
        const bracketMatch = cleanText.match(/\[([^\]]+)\]/);
        if (bracketMatch) {
          const content = bracketMatch[1].trim();
          if (/^speaker\s*\d+/i.test(content)) {
            if (!speaker) speaker = content;
            cleanText = cleanText.replace(bracketMatch[0], '').trim();
          } else {
            bracketLabel = `[${content}]`;
            emotion = content;
            cleanText = cleanText.replace(bracketMatch[0], '').trim();
          }
        }

        const wordList = cleanText.split(/\s+/).filter(Boolean);
        const duration = end - start;
        const wordDuration = Math.max(0.01, duration / Math.max(1, wordList.length));
        const words: WordTiming[] = wordList.map((word, wIdx) => ({
          text: word,
          start: start + wIdx * wordDuration,
          end: start + (wIdx + 1) * wordDuration,
          emotion: emotion,
          speaker: speaker,
        }));
        
        segments.push({
          id: id || Math.random().toString(36).substr(2, 9),
          start,
          end,
          text: cleanText,
          words,
          speaker: speaker || 'Speaker 1',
          emotion: emotion || "neutral",
          bracketLabel: bracketLabel,
        });
      }
    } else {
      i++;
    }
  }
  
  return segments;
}

function timeToSeconds(time: string): number {
  const [hms, ms] = time.split(',');
  const [h, m, s] = hms.split(':').map(Number);
  return h * 3600 + m * 60 + s + Number(ms) / 1000;
}

