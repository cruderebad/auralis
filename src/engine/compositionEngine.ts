import { TimelineClip, TimelineTrack, ClipType } from '../types/timeline';
import { useEditorStore } from '../store/useEditorStore';
import { assetManager } from './assetManager';
import { CaptionSegment } from '../types';

/**
 * Composition Engine: Oversees the layout of clips, track creation,
 * asset preparation, splitting, trimming, and duration synchronization.
 */
export class CompositionEngine {
  private static getOrCreateTrack(type: 'video' | 'audio' | 'text' | 'overlay', name?: string): TimelineTrack {
    let store = useEditorStore.getState();
    let track = store.tracks.find(t => t.type === type);
    if (!track) {
      const trackId = store.addTrack(type, name);
      store = useEditorStore.getState();
      track = store.tracks.find(t => t.id === trackId);
    }
    if (!track) {
      track = {
        id: `track-${type}-${Date.now().toString(36)}`,
        name: name || `${type} Track`,
        type,
        visible: true,
        muted: false,
        clips: []
      };
    }
    return track;
  }

  /**
   * Add a Media Asset (Video or Image) onto the Timeline
   */
  public static async registerMediaAsset(file: File, type: 'video' | 'image') {
    const url = URL.createObjectURL(file);
    const store = useEditorStore.getState();

    const track = CompositionEngine.getOrCreateTrack('video', 'Video Layer');

    if (type === 'video') {
      try {
        const videoElement = await assetManager.loadVideo(url);
        const fileDuration = videoElement.duration || 10;
        
        const videoTrack = CompositionEngine.getOrCreateTrack('video', 'Video Layer');
        const audioTrack = CompositionEngine.getOrCreateTrack('audio', 'Audio Layer');

        const clipId = `video-${Date.now().toString(36)}`;
        const videoClip: TimelineClip = {
          id: clipId,
          trackId: videoTrack.id,
          type: 'video',
          start: 0,
          end: fileDuration,
          duration: fileDuration,
          sourceStart: 0,
          sourceEnd: fileDuration,
          layer: 10,
          opacity: 1,
          visible: true,
          muted: true, // Mute the video layer since audio is played on the audio layer
          x: 0,
          y: 0,
          width: store.resolutionSize.width,
          height: store.resolutionSize.height,
          rotation: 0,
          scaleX: 1.0,
          scaleY: 1.0,
          playbackRate: 1.0,
          sourceUrl: url,
          sourceFile: file,
        };

        const audioClip: TimelineClip = {
          ...videoClip,
          id: `audio-${Date.now().toString(36)}`,
          trackId: audioTrack.id,
          type: 'audio',
          muted: false,
        };

        const currentTracks = useEditorStore.getState().tracks;
        const updatedTracks = currentTracks.map(t => {
          if (t.id === videoTrack.id) {
            return { ...t, clips: [videoClip] };
          }
          if (t.id === audioTrack.id) {
            return { ...t, clips: [audioClip] };
          }
          return t;
        });

        store.setTracks(updatedTracks);
        store.setDuration(fileDuration);
        store.setVideoData(url, file);
        store.setOriginalVideoMissing(false);
        console.log('[CompositionEngine] Loaded video clip of duration:', fileDuration);
      } catch (err) {
        console.error('[CompositionEngine] Failed loading video element:', err);
      }
    } else {
      // Type is Image
      try {
        await assetManager.loadImage(url);
        const clipId = `image-${Date.now().toString(36)}`;
        const defaultImageDuration = 5.0; // 5 seconds default for image
        
        const newClip: Omit<TimelineClip, 'trackId'> = {
          id: clipId,
          type: 'image',
          start: store.currentTime,
          end: store.currentTime + defaultImageDuration,
          duration: defaultImageDuration,
          sourceStart: 0,
          sourceEnd: defaultImageDuration,
          layer: 15,
          opacity: 1,
          visible: true,
          muted: false,
          x: 0,
          y: 0,
          width: store.resolutionSize.width,
          height: store.resolutionSize.height,
          rotation: 0,
          scaleX: 0.5, // 50% scale default for floating graphics
          scaleY: 0.5,
          playbackRate: 1.0,
          sourceUrl: url,
          sourceFile: file,
        };

        const overlayTrack = CompositionEngine.getOrCreateTrack('overlay', 'Graphics Overlay');

        store.addClip(overlayTrack.id, newClip);
        store.setDuration(Math.max(store.duration, store.currentTime + defaultImageDuration));
        console.log('[CompositionEngine] Loaded image graphic onto overlay track.');
      } catch (err) {
        console.error('[CompositionEngine] Failed loading image element:', err);
      }
    }
  }

  /**
   * Insert a custom text clip (title overlay) at the current timeline position
   */
  public static addTextOverlay(text: string) {
    const store = useEditorStore.getState();
    const defaultDuration = 4.0; // 4 seconds

    const titleTrack = CompositionEngine.getOrCreateTrack('text', 'Title Layer');

    const clipId = `text-clip-${Date.now().toString(36)}`;
    const newClip: Omit<TimelineClip, 'trackId'> = {
      id: clipId,
      type: 'text',
      start: store.currentTime,
      end: store.currentTime + defaultDuration,
      duration: defaultDuration,
      sourceStart: 0,
      sourceEnd: defaultDuration,
      layer: 20, // highest drawing order
      opacity: 1,
      visible: true,
      muted: false,
      x: 0,
      y: 0,
      width: store.resolutionSize.width,
      height: 300,
      rotation: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      playbackRate: 1.0,
      textFields: {
        text,
        style: {
          fontSize: 60,
          textColor: '#FFFFFF',
          fontFamily: 'Outfit',
          fontWeight: 'bold',
          textAlign: 'center',
          outlineEnabled: true,
          outlineColor: '#000000',
          shadowEnabled: true,
          backgroundEnabled: false,
        }
      }
    };

    store.addClip(titleTrack.id, newClip);
  }

  /**
   * Helper function to map emotion and emphasis to a visual CSS class
   */
  private static mapEmotionToVisualEffect(emotion?: string, emphasis?: number): string | undefined {
    if (!emotion) return undefined;
    const intensity = emphasis ?? 1;
    
    switch (emotion.toLowerCase()) {
      case 'anger':
      case 'frustration':
        return intensity > 0.7 ? 'animate-shake-hard' : 'animate-shake';
      case 'excitement':
      case 'surprise':
        return intensity > 0.7 ? 'animate-pop-hard' : 'animate-pop';
      case 'sadness':
      case 'tiredness':
        return 'animate-fade-slow';
      case 'calmness':
      case 'whisper':
        return 'animate-fade-soft';
      case 'happiness':
      case 'funny':
        return 'animate-bounce';
      case 'fear':
        return 'animate-tremble';
      default:
        return undefined;
    }
  }

  /**
   * Inserts predefined caption lines into subtitles track
   */
  public static setCaptions(segments: CaptionSegment[]) {
    const store = useEditorStore.getState();
    
    // Find text track or create it
    const titleTrack = CompositionEngine.getOrCreateTrack('text', 'Subtitles / Titles');

    // Map segments to timeline clips
    const clips: TimelineClip[] = segments.map((seg) => {
      // Map emotion/emphasis to cssClass for each word
      const mappedWords = seg.words?.map(word => ({
        ...word,
        cssClass: CompositionEngine.mapEmotionToVisualEffect(word.emotion, word.emphasis)
      }));

      return {
        id: seg.id,
        type: 'text',
        trackId: titleTrack.id,
        start: seg.start,
        end: seg.end,
        duration: seg.end - seg.start,
        sourceStart: 0,
        sourceEnd: seg.end - seg.start,
        layer: 25,
        opacity: 1,
        visible: true,
        muted: false,
        x: 0,
        y: 0,
        width: store.resolutionSize.width,
        height: 200,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        playbackRate: 1,
        textFields: {
          text: seg.text,
        },
        // Keep words timings and emotion metadata
        words: mappedWords as any,
        emotion: seg.emotion,
        emotionIntensity: seg.emotionIntensity,
        speechStyle: seg.speechStyle,
        tone: seg.tone,
        speaker: seg.speaker,
        bracketLabel: seg.bracketLabel || (seg as any).bracket_label,
        confidence: seg.confidence,
        emphasis: seg.emphasis,
      } as any;
    });

    // Update track with new clips
    const currentTracks = useEditorStore.getState().tracks;
    const updatedTracks = currentTracks.map(t => {
      if (t.id === titleTrack.id) {
        return { ...t, clips };
      }
      return t;
    });

    store.setTracks(updatedTracks);
  }
}
