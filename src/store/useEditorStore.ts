import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GlobalStyle, CaptionSegment, SemanticTimeline, AccessibilityCaptionMode, CustomAccessibilityConfig } from '../types';
import { TimelineClip, TimelineTrack, TimelineMarker, AspectRatio, ClipType } from '../types/timeline';
import { DEFAULT_STYLE } from '../constants';
import { DEFAULT_CUSTOM_CONFIG } from '../lib/captionFormatter';
import { safeSetLocalStorage } from '../lib/projectStorage';

export interface AuralisProject {
  id: string;
  title: string;
  createdAt: string;
  lastModified: string;
  duration: number;
  thumbnail: string;
  tracks: TimelineTrack[];
  style: GlobalStyle;
  accessibility?: {
    profile: string;
    reduceMotion: boolean;
    customOverrides?: any;
  };
  captions?: CaptionSegment[];
  rawCaptions?: CaptionSegment[];
  captionMode?: AccessibilityCaptionMode;
  semanticTimeline?: SemanticTimeline | null;
  customAccessibilityConfig?: CustomAccessibilityConfig;
  soundEvents?: any[];
  settings: {
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
    resolution: string;
    fps: number;
  };
  videoMetadata?: {
    originalFilename: string;
    duration: number;
    size: number;
  };
}

export interface EditorStoreState {
  transcriptionLanguage: string;
  setTranscriptionLanguage: (lang: string) => void;
  // Project Info
  projectId: string;
  projectTitle: string;
  
  currentTime: number;
  duration: number;
  fps: number;
  zoom: number;
  isPlaying: boolean;
  playbackSpeed: number;

  tracks: TimelineTrack[];
  selectedClipId: string | null;
  videoUrl: string | null;
  videoFile: File | null;
  originalVideoMissing: boolean;
  originalVideoFilename?: string;

  style: GlobalStyle;
  hoverStyle: Partial<GlobalStyle> | null;
  accessibility: {
    profile: string;
    reduceMotion: boolean;
    customOverrides?: any;
  };
  setAccessibility: (updates: any) => void;

  // Auralis Adaptive Caption Engine
  semanticTimeline: SemanticTimeline | null;
  captionMode: AccessibilityCaptionMode;
  customAccessibilityConfig: CustomAccessibilityConfig;
  isAnalyzingSemantic: boolean;
  semanticAnalysisStep: string;
  semanticAnalysisError: string | null;

  setSemanticTimeline: (timeline: SemanticTimeline | null) => void;
  setCaptionMode: (mode: AccessibilityCaptionMode) => void;
  setCustomAccessibilityConfig: (config: Partial<CustomAccessibilityConfig>) => void;
  setIsAnalyzingSemantic: (isAnalyzing: boolean) => void;
  setSemanticAnalysisStep: (step: string) => void;
  setSemanticAnalysisError: (err: string | null) => void;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  resolution: string; // e.g., '1080p', '720p'
  resolutionSize: { width: number; height: number };
  timelineResolution: 'low' | 'medium' | 'high';

  isExporting: boolean;
  exportProgress: number;

  videoTrackHeight: number;
  audioTrackHeight: number;
  setVideoTrackHeight: (height: number) => void;
  setAudioTrackHeight: (height: number) => void;

  workspaceLayout: 'horizontal' | 'vertical';
  setWorkspaceLayout: (layout: 'horizontal' | 'vertical') => void;

  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

  // History for Undo/Redo
  history: TimelineTrack[][];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Track & Clip Operations
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;

  setTracks: (tracks: TimelineTrack[]) => void;
  addTrack: (type: 'video' | 'audio' | 'text' | 'overlay', name?: string) => string;
  removeTrack: (trackId: string) => void;
  
  addClip: (trackId: string, clip: Omit<TimelineClip, 'trackId'>) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>, saveHistory?: boolean) => void;
  splitClip: (clipId: string, splitTime: number) => void;

  setSelectedClipId: (id: string | null) => void;
  setVideoData: (url: string | null, file: File | null) => void;
  setOriginalVideoMissing: (missing: boolean) => void;

  setStyle: (style: Partial<GlobalStyle>) => void;
  setHoverStyle: (hoverStyle: Partial<GlobalStyle> | null) => void;
  setAspectRatio: (ratio: '16:9' | '9:16' | '1:1' | '4:5') => void;
  setResolution: (res: string) => void;
  setFps: (fps: number) => void;
  setTimelineResolution: (res: 'low' | 'medium' | 'high') => void;
  
  setExportState: (isExporting: boolean, progress: number) => void;
  
  snappingEnabled: boolean;
  setSnappingEnabled: (enabled: boolean) => void;
  
  // Markers
  markers: TimelineMarker[];
  addMarker: (time?: number, label?: string, color?: string) => void;
  removeMarker: (id: string) => void;
  updateMarker: (id: string, updates: Partial<TimelineMarker>) => void;

  // Clip helpers
  duplicateClip: (clipId: string) => void;

  // Track helpers
  toggleTrackLock: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  renameTrack: (trackId: string, name: string) => void;
  
  uploadedImages: { id: string; name: string; url: string; file?: File }[];
  addUploadedImage: (name: string, url: string, file?: File) => void;
  removeUploadedImage: (id: string) => void;
  
  // Project Management
  setProjectInfo: (id: string, title: string) => void;
  resetProject: (id: string, title: string) => void;
  loadProject: (project: AuralisProject) => void;
  getProjectData: () => AuralisProject;
  
  // Advanced helpers
  snappedTime: (time: number, threshold?: number, excludeClipId?: string) => number;
}

const getResolutionSize = (ratio: '16:9' | '9:16' | '1:1' | '4:5', res: string) => {
  let baseDimension = 1080;
  if (res === '4K') baseDimension = 2160;
  if (res === '1440p') baseDimension = 1440;
  if (res === '720p') baseDimension = 720;
  if (res === '480p') baseDimension = 480;

  let width, height;
  if (ratio === '9:16') {
    width = baseDimension;
    height = Math.round((width * 16) / 9);
  } else if (ratio === '4:5') {
    width = baseDimension;
    height = Math.round((width * 5) / 4);
  } else if (ratio === '1:1') {
    width = baseDimension;
    height = baseDimension;
  } else {
    // 16:9
    height = baseDimension;
    width = Math.round((height * 16) / 9);
  }
  
  width = width % 2 === 0 ? width : width + 1;
  height = height % 2 === 0 ? height : height + 1;

  return { width, height };
};

const createDefaultTracks = (): TimelineTrack[] => [
  { id: 'track-text-1', name: 'Text Layer', type: 'text', visible: true, muted: false, clips: [] },
  { id: 'track-video-1', name: 'Video Layer', type: 'video', visible: true, muted: false, clips: [] },
  { id: 'track-audio-1', name: 'Audio Layer', type: 'audio', visible: true, muted: false, clips: [] }
];

export const useEditorStore = create<EditorStoreState>()(persist((set, get) => ({
  transcriptionLanguage: 'hinglish',
  setTranscriptionLanguage: (lang) => set({ transcriptionLanguage: lang }),
  projectId: `proj_${Date.now()}`,
  projectTitle: 'Untitled Project',
  originalVideoMissing: false,

  currentTime: 0,
  duration: 60, // default placeholder (1 min)
  fps: 30,
  zoom: 0,
  isPlaying: false,
  playbackSpeed: 1.0,

  tracks: createDefaultTracks(),
  selectedClipId: null,
  videoUrl: null,
  videoFile: null,

  style: DEFAULT_STYLE,
  hoverStyle: null,
  accessibility: {
    profile: 'standard',
    reduceMotion: false,
    customOverrides: {}
  },
  setAccessibility: (updates) => set(state => ({
    accessibility: { ...state.accessibility, ...updates }
  })),

  // Auralis Adaptive Caption Engine initial state & setters
  semanticTimeline: null,
  captionMode: 'standard',
  customAccessibilityConfig: DEFAULT_CUSTOM_CONFIG,
  isAnalyzingSemantic: false,
  semanticAnalysisStep: '',
  semanticAnalysisError: null,

  setSemanticTimeline: (timeline) => set({ semanticTimeline: timeline }),
  setCaptionMode: (mode) => set({ captionMode: mode }),
  setCustomAccessibilityConfig: (config) => set((state) => ({
    customAccessibilityConfig: { ...state.customAccessibilityConfig, ...config }
  })),
  setIsAnalyzingSemantic: (isAnalyzing) => set({ isAnalyzingSemantic: isAnalyzing }),
  setSemanticAnalysisStep: (step) => set({ semanticAnalysisStep: step }),
  setSemanticAnalysisError: (err) => set({ semanticAnalysisError: err }),
  aspectRatio: '9:16',
  resolution: '1080p',
  resolutionSize: { width: 1080, height: 1920 },
  timelineResolution: 'high',

  isExporting: false,
  exportProgress: 0,
  videoTrackHeight: 80,
  audioTrackHeight: 80,
  setVideoTrackHeight: (height) => set({ videoTrackHeight: height }),
  setAudioTrackHeight: (height) => set({ audioTrackHeight: height }),
  
  workspaceLayout: 'horizontal',
  setWorkspaceLayout: (layout) => set({ workspaceLayout: layout }),

  theme: 'light',
  setTheme: (theme) => set({ theme }),

  history: [],
  historyIndex: -1,
  pushHistory: () => set((state) => {
    try {
      const cleanTracks = (state.tracks || []).map(t => ({
        ...t,
        clips: Array.isArray(t.clips) ? t.clips.map(c => {
          const clean = { ...c };
          delete clean.sourceFile;
          return clean;
        }) : []
      }));
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(cleanTracks);
      
      if (newHistory.length > 25) {
        newHistory.shift();
      }
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    } catch {
      return {};
    }
  }),
  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      return { tracks: state.history[newIndex] || [], historyIndex: newIndex };
    }
    return {};
  }),
  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      return { tracks: state.history[newIndex] || [], historyIndex: newIndex };
    }
    return {};
  }),

  snappingEnabled: true,
  setSnappingEnabled: (enabled) => set({ snappingEnabled: enabled }),

  markers: [],
  addMarker: (time, label, color) => set(state => {
    const markerTime = time !== undefined ? time : state.currentTime;
    const newMarker: TimelineMarker = {
      id: `marker-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      time: Math.max(0, Math.min(state.duration, markerTime)),
      label: label || `Marker ${state.markers.length + 1}`,
      color: color || '#DFAC24'
    };
    return {
      markers: [...state.markers, newMarker].sort((a, b) => a.time - b.time)
    };
  }),
  removeMarker: (id) => set(state => ({
    markers: state.markers.filter(m => m.id !== id)
  })),
  updateMarker: (id, updates) => set(state => ({
    markers: state.markers.map(m => m.id === id ? { ...m, ...updates } : m).sort((a, b) => a.time - b.time)
  })),

  duplicateClip: (clipId) => set(state => {
    let sourceClip: TimelineClip | null = null;
    let targetTrackId = '';

    for (const track of state.tracks) {
      const found = track.clips.find(c => c.id === clipId);
      if (found) {
        sourceClip = found;
        targetTrackId = track.id;
        break;
      }
    }

    if (!sourceClip) return {};

    const clipDuration = sourceClip.end - sourceClip.start;
    const newStart = sourceClip.end;
    const newEnd = newStart + clipDuration;
    const newId = `${sourceClip.type}-${Date.now().toString(36)}`;

    const duplicated: TimelineClip = {
      ...sourceClip,
      id: newId,
      start: newStart,
      end: newEnd,
      duration: clipDuration
    };

    const newTracks = state.tracks.map(track => {
      if (track.id !== targetTrackId) return track;
      return {
        ...track,
        clips: [...track.clips, duplicated].sort((a, b) => a.start - b.start)
      };
    });

    const allClips = newTracks.flatMap(t => t.clips);
    const duration = allClips.length > 0 ? Math.max(...allClips.map(c => c.end), state.duration) : state.duration;

    return {
      tracks: newTracks,
      duration,
      selectedClipId: newId
    };
  }),

  toggleTrackLock: (trackId) => set(state => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, locked: !t.locked } : t)
  })),

  toggleTrackSolo: (trackId) => set(state => {
    const isCurrentlySolo = state.tracks.find(t => t.id === trackId)?.solo;
    return {
      tracks: state.tracks.map(t => {
        if (t.id === trackId) {
          return { ...t, solo: !isCurrentlySolo };
        }
        return t;
      })
    };
  }),

  setTrackVolume: (trackId, volume) => set(state => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, volume: Math.max(0, Math.min(100, volume)) } : t)
  })),

  renameTrack: (trackId, name) => set(state => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, name: name.trim() || t.name } : t)
  })),

  uploadedImages: [],
  addUploadedImage: (name, url, file) => set(state => ({
    uploadedImages: [...state.uploadedImages, { id: `up-${Date.now().toString(36)}`, name, url, file }]
  })),
  removeUploadedImage: (id) => set(state => ({
    uploadedImages: state.uploadedImages.filter(img => img.id !== id)
  })),

  setProjectInfo: (id, title) => set({ projectId: id, projectTitle: title }),
  resetProject: (id, title) => {
    set({
      projectId: id,
      projectTitle: title,
      originalVideoMissing: false,
      currentTime: 0,
      duration: 60,
      tracks: createDefaultTracks(),
      selectedClipId: null,
      videoUrl: null,
      videoFile: null,
      style: DEFAULT_STYLE,
      hoverStyle: null,
      aspectRatio: '9:16',
      resolution: '1080p',
      resolutionSize: { width: 1080, height: 1920 },
      history: [createDefaultTracks()],
      historyIndex: 0
    });
  },
  setOriginalVideoMissing: (missing) => set({ originalVideoMissing: missing }),
  
  loadProject: (project) => {
    if (!project) return;
    const settings = (project.settings || {}) as any;
    const pd = (project as any).projectData || {};
    const aspectRatio = settings.aspectRatio || pd.aspectRatio || (project as any).aspectRatio || '9:16';
    const resolution = settings.resolution || pd.resolution || (project as any).resolution || '1080p';
    const fps = settings.fps || pd.fps || (project as any).fps || 30;
    const tracks = project.tracks || pd.tracks || createDefaultTracks();
    const captionMode = project.captionMode || pd.captionMode || 'standard';
    const semanticTimeline = project.semanticTimeline !== undefined ? project.semanticTimeline : (pd.semanticTimeline !== undefined ? pd.semanticTimeline : null);
    const customAccessibilityConfig = project.customAccessibilityConfig || pd.customAccessibilityConfig || DEFAULT_CUSTOM_CONFIG;

    set({
      projectId: project.id || 'project-' + Date.now(),
      projectTitle: project.title || pd.title || 'Untitled Project',
      duration: project.duration || pd.duration || 60,
      tracks: tracks,
      style: project.style || pd.style || DEFAULT_STYLE,
      captionMode,
      semanticTimeline,
      customAccessibilityConfig,
      accessibility: project.accessibility || pd.accessibility || {
        profile: 'standard',
        reduceMotion: false,
        customOverrides: {}
      },
      aspectRatio,
      resolution,
      fps,
      resolutionSize: getResolutionSize(aspectRatio, resolution),
      currentTime: 0,
      selectedClipId: null,
      history: [tracks],
      historyIndex: 0
    });
    
    // Check if the original video needs relinking
    const videoMeta = project.videoMetadata || pd.videoMetadata;
    if (videoMeta && videoMeta.originalFilename) {
      set({ 
        originalVideoMissing: true,
        originalVideoFilename: videoMeta.originalFilename 
      });
    } else {
      set({ 
        originalVideoMissing: false,
        originalVideoFilename: undefined
      });
    }
  },

  getProjectData: () => {
    const state = get();
    // Extract caption segments from text tracks if available
    const textTrack = state.tracks.find(t => t.type === 'text');
    const trackCaptions: CaptionSegment[] = (textTrack?.clips || []).map(c => ({
      id: c.id,
      start: c.start,
      end: c.end,
      text: c.textFields?.text || (c as any).text || '',
      words: (c as any).words,
      emotion: (c as any).emotion,
      emotionIntensity: (c as any).emotionIntensity,
      speechStyle: (c as any).speechStyle,
      tone: (c as any).tone,
      speaker: (c as any).speaker,
      bracketLabel: (c as any).bracketLabel || (c as any).bracket_label,
      confidence: (c as any).confidence,
      emphasis: (c as any).emphasis,
    }));

    return {
      id: state.projectId,
      title: state.projectTitle,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      duration: state.duration,
      thumbnail: '', // Base64 could be generated here
      tracks: state.tracks,
      style: state.style,
      accessibility: state.accessibility,
      captionMode: state.captionMode,
      semanticTimeline: state.semanticTimeline,
      customAccessibilityConfig: state.customAccessibilityConfig,
      captions: trackCaptions,
      settings: {
        aspectRatio: state.aspectRatio,
        resolution: state.resolution,
        fps: state.fps
      },
      videoMetadata: state.videoFile ? {
        originalFilename: state.videoFile.name,
        duration: state.duration,
        size: state.videoFile.size
      } : (state.originalVideoFilename ? {
        originalFilename: state.originalVideoFilename,
        duration: state.duration,
        size: 0
      } : undefined)
    };
  },

  setCurrentTime: (time) => set(state => ({ currentTime: Math.max(0, Math.min(state.duration, time)) })),
  setDuration: (duration) => set({ duration: Math.max(1, duration) }),
  setZoom: (zoom) => set({ zoom: Math.max(0, Math.min(1, zoom)) }),
  setIsPlaying: (isPlaying) => {
    set({ isPlaying });
    const videoElement = document.getElementById('preview-video') as HTMLVideoElement | null;
    if (videoElement) {
      if (isPlaying) {
        videoElement.play().catch(err => {
          console.warn('[Store] Programmatic play failed or blocked, background ticker will assist:', err);
        });
      } else {
        videoElement.pause();
      }
    }
  },
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setTracks: (tracks) => {
    set({ tracks });
    get().pushHistory();
  },

  addTrack: (type, name) => {
    const id = `track-${type}-${Date.now().toString(36)}`;
    const newTrack: TimelineTrack = {
      id,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      type,
      visible: true,
      muted: false,
      clips: []
    };
    set(state => ({ tracks: [...state.tracks, newTrack] }));
    get().pushHistory();
    return id;
  },

  removeTrack: (trackId) => {
    set(state => ({
      tracks: state.tracks.filter(t => t.id !== trackId)
    }));
    get().pushHistory();
  },

  addClip: (trackId, clipData) => {
    set(state => {
      const fullClip: TimelineClip = {
        ...clipData,
        trackId,
        opacity: clipData.opacity !== undefined ? clipData.opacity : 1.0,
        visible: clipData.visible !== undefined ? clipData.visible : true,
        muted: clipData.muted !== undefined ? clipData.muted : false,
        x: clipData.x !== undefined ? clipData.x : 0,
        y: clipData.y !== undefined ? clipData.y : 0,
        width: clipData.width !== undefined ? clipData.width : state.resolutionSize.width,
        height: clipData.height !== undefined ? clipData.height : state.resolutionSize.height,
        rotation: clipData.rotation !== undefined ? clipData.rotation : 0,
        scaleX: clipData.scaleX !== undefined ? clipData.scaleX : 1.0,
        scaleY: clipData.scaleY !== undefined ? clipData.scaleY : 1.0,
        playbackRate: clipData.playbackRate !== undefined ? clipData.playbackRate : 1.0,
        animations: clipData.animations || [],
        effects: clipData.effects || []
      };

      const newTracks = state.tracks.map(track => {
        if (track.id !== trackId) return track;
        return {
          ...track,
          clips: [...track.clips, fullClip]
        };
      });

      const allClips = newTracks.flatMap(t => t.clips);
      const duration = allClips.length > 0 
        ? Math.max(...allClips.map(c => c.end)) 
        : 60;

      return { tracks: newTracks, duration };
    });
    get().pushHistory();
  },

  removeClip: (clipId) => {
    set(state => {
      const newTracks = state.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(c => c.id !== clipId)
      }));

      const allClips = newTracks.flatMap(t => t.clips);
      const duration = allClips.length > 0 
        ? Math.max(...allClips.map(c => c.end)) 
        : 60;

      return {
        tracks: newTracks,
        duration,
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId
      };
    });
    get().pushHistory();
  },

  updateClip: (clipId, updates, saveHistory = true) => {
    set(state => {
      let changed = false;
      const newTracks = state.tracks.map(track => {
        let trackChanged = false;
        const updatedClips = track.clips.map(clip => {
          if (clip.id === clipId) {
            trackChanged = true;
            changed = true;
            const merged = { ...clip, ...updates };
            // Keep duration in sync
            merged.duration = merged.end - merged.start;
            return merged;
          }
          return clip;
        });
        return trackChanged ? { ...track, clips: updatedClips } : track;
      });

      if (!changed) return {};

      const allClips = newTracks.flatMap(t => t.clips);
      const duration = allClips.length > 0 
        ? Math.max(...allClips.map(c => c.end)) 
        : 60;

      return { 
        tracks: newTracks,
        duration 
      };
    });
    if (saveHistory) {
      get().pushHistory();
    }
  },

  splitClip: (clipId, splitTime) => {
    set(state => {
      let clipToSplit: TimelineClip | null = null;
      let parentTrackId = '';

    for (const track of state.tracks) {
      const found = track.clips.find(c => c.id === clipId);
      if (found) {
        clipToSplit = found;
        parentTrackId = track.id;
        break;
      }
    }

    if (!clipToSplit || splitTime <= clipToSplit.start || splitTime >= clipToSplit.end) {
      return {};
    }

    const currentClipDurationLeft = splitTime - clipToSplit.start;
    const rightDuration = clipToSplit.end - splitTime;

    const sourceSplitPoint = clipToSplit.sourceStart + (currentClipDurationLeft * clipToSplit.playbackRate);

    const leftClip: TimelineClip = {
      ...clipToSplit,
      id: `${clipToSplit.id}-left`,
      end: splitTime,
      duration: currentClipDurationLeft,
      sourceEnd: sourceSplitPoint
    };

    const rightClip: TimelineClip = {
      ...clipToSplit,
      id: `${clipToSplit.id}-right`,
      start: splitTime,
      duration: rightDuration,
      sourceStart: sourceSplitPoint
    };

    const newTracks = state.tracks.map(track => {
      if (track.id !== parentTrackId) return track;
      const filtered = track.clips.filter(c => c.id !== clipId);
      return {
        ...track,
        clips: [...filtered, leftClip, rightClip]
      };
    });

    return {
      tracks: newTracks,
      selectedClipId: rightClip.id
    };
    });
    get().pushHistory();
  },

  setSelectedClipId: (id) => set({ selectedClipId: id }),

  setVideoData: (url, file) => set(state => {
    // Update tracks with source media pointers
    const updatedTracks = state.tracks.map(t => {
      if (t.type === 'video') {
        const videoClips = t.clips.filter(c => c.type === 'video');
        if (videoClips.length > 0) {
          return {
            ...t,
            clips: t.clips.map(c => c.type === 'video' ? { ...c, sourceUrl: url || undefined, sourceFile: file || undefined } : c)
          };
        } else {
          const mainClip: TimelineClip = {
            id: 'video-main',
            type: 'video',
            trackId: t.id,
            start: 0,
            end: state.duration || 60,
            duration: state.duration || 60,
            sourceStart: 0,
            sourceEnd: state.duration || 60,
            layer: 10,
            opacity: 1,
            visible: true,
            muted: false,
            x: 0,
            y: 0,
            width: state.resolutionSize.width,
            height: state.resolutionSize.height,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            playbackRate: 1,
            sourceUrl: url || undefined,
            sourceFile: file || undefined
          };
          return { ...t, clips: [...t.clips, mainClip] };
        }
      }
      
      if (t.type === 'audio') {
        const audioClips = t.clips.filter(c => c.type === 'audio');
        if (audioClips.length > 0) {
          return {
            ...t,
            clips: t.clips.map(c => c.type === 'audio' ? { ...c, sourceUrl: url || undefined, sourceFile: file || undefined } : c)
          };
        } else {
          const mainAudioClip: TimelineClip = {
            id: 'audio-main',
            type: 'audio',
            trackId: t.id,
            start: 0,
            end: state.duration || 60,
            duration: state.duration || 60,
            sourceStart: 0,
            sourceEnd: state.duration || 60,
            layer: 10,
            opacity: 1,
            visible: true,
            muted: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            playbackRate: 1,
            sourceUrl: url || undefined,
            sourceFile: file || undefined
          };
          return { ...t, clips: [...t.clips, mainAudioClip] };
        }
      }

      return t;
    });

    return {
      videoUrl: url,
      videoFile: file,
      originalVideoMissing: false,
      tracks: updatedTracks,
      originalVideoFilename: file ? file.name : undefined
    };
  }),

  setStyle: (newStyle) => set(state => ({ style: { ...state.style, ...newStyle } })),
  setHoverStyle: (hoverStyle) => set({ hoverStyle }),

  setAspectRatio: (ratio) => set(state => {
    const size = getResolutionSize(ratio, state.resolution);
    return {
      aspectRatio: ratio,
      resolutionSize: size
    };
  }),

  setFps: (fps) => set({ fps }),

  setResolution: (res) => set(state => {
    const size = getResolutionSize(state.aspectRatio, res);
    return {
      resolution: res,
      resolutionSize: size
    };
  }),

  setTimelineResolution: (res) => set({ timelineResolution: res }),

  setExportState: (isExporting, progress) => set({
    isExporting,
    exportProgress: progress
  }),

  snappedTime: (time, threshold = 0.15, excludeClipId) => {
    const state = get();
    const snapPoints: number[] = [0, state.duration, state.currentTime];

    state.tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.id !== excludeClipId) {
          snapPoints.push(clip.start);
          snapPoints.push(clip.end);
        }
      });
    });

    let closestPoint = time;
    let minDiff = Infinity;

    for (const point of snapPoints) {
      const diff = Math.abs(time - point);
      if (diff < threshold && diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    return closestPoint;
  }
}), {
  name: 'auralis-editor-settings',
  storage: createJSONStorage(() => ({
    getItem: (name) => {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      safeSetLocalStorage(name, value);
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch {}
    }
  })),
  partialize: (state) => ({
    style: state.style,
    fps: state.fps,
    resolution: state.resolution,
    aspectRatio: state.aspectRatio,
    captionMode: state.captionMode,
    customAccessibilityConfig: state.customAccessibilityConfig,
  })
}));
