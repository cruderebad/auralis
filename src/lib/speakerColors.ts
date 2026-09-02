/**
 * Speaker Diarization Color Palette & Utility
 */

export interface SpeakerColorInfo {
  name: string;
  bg: string;
  text: string;
  border: string;
  hex: string;
}

export const SPEAKER_COLOR_PALETTE: SpeakerColorInfo[] = [
  { name: 'Cyan', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40', hex: '#00f0ff' },
  { name: 'Amber', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', hex: '#ffb700' },
  { name: 'Emerald', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', hex: '#10b981' },
  { name: 'Violet', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40', hex: '#a855f7' },
  { name: 'Rose', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40', hex: '#f43f5e' },
  { name: 'Sky', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/40', hex: '#0284c7' },
];

export function getSpeakerColor(speakerName?: string, customMap?: Record<string, string>): SpeakerColorInfo {
  if (!speakerName) return SPEAKER_COLOR_PALETTE[0];
  if (customMap && customMap[speakerName]) {
    const hex = customMap[speakerName];
    return { name: speakerName, bg: 'bg-auralis/20', text: 'text-auralis', border: 'border-auralis/40', hex };
  }
  let hash = 0;
  for (let i = 0; i < speakerName.length; i++) {
    hash = speakerName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SPEAKER_COLOR_PALETTE.length;
  return SPEAKER_COLOR_PALETTE[index];
}
