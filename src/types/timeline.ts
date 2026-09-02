import { GlobalStyle } from "../types";

export type ClipType = 'video' | 'text' | 'image' | 'audio' | 'overlay' | 'effect';

export interface TimelineAnimation {
  id: string;
  type: 'fade' | 'zoom' | 'slide' | 'rotate';
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  duration: number; // in seconds
  trigger: 'start' | 'end'; // when the animation triggers
}

export interface TimelineEffect {
  id: string;
  type: 'blur' | 'grayscale' | 'vintage' | 'sepia' | 'contrast';
  intensity: number; // 0 to 1 scaling
}

export interface TimelineClip {
  id: string;
  type: ClipType;
  trackId: string;
  start: number; // starting position on global timeline (seconds)
  end: number; // ending position on global timeline (seconds)
  duration: number; // calculated as end - start, or original source duration
  sourceStart: number; // crop start within the original asset
  sourceEnd: number; // crop end within the original asset
  layer: number; // drawing/eval order (higher layer draws on top)
  opacity: number; // 0 to 1
  visible: boolean;
  muted: boolean;

  // Spatial coordinates & sizing (relative to composition resolution, e.g. 1080x1920 or 1920x1080)
  x: number;
  y: number;
  width: number;
  height: number;

  rotation: number; // in degrees
  scaleX: number;
  scaleY: number;

  playbackRate: number; // speed multiplier (e.g. 0.5, 1.0, 2.0)

  // Custom metadata for specific types
  textFields?: {
    text: string;
    style?: Partial<GlobalStyle>;
  };

  animations?: TimelineAnimation[];
  effects?: TimelineEffect[];

  sourceUrl?: string; // object URL or local assets
  sourceFile?: File; // full original file
  thumbnail?: string; // canvas frame thumbnail base64/url
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color?: string; // e.g. '#DFAC24', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6'
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'overlay';
  visible: boolean;
  muted: boolean;
  locked?: boolean;
  solo?: boolean;
  volume?: number; // 0 to 100
  clips: TimelineClip[];
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface EditorState {
  tracks: TimelineTrack[];
  currentTime: number;
  duration: number; // overall duration of timeline in seconds
  isPlaying: boolean;
  fps: number;
  zoom: number; // pixel width multiplier for timeline canvas zoom
  selectedClipId: string | null;
  playbackSpeed: number;
  aspectRatio: AspectRatio;
  resolution: { width: number; height: number };
  isExporting: boolean;
  exportProgress: number;
}
