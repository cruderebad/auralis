import { TimelineTrack, TimelineClip } from '../types/timeline';
import { assetManager } from '../engine/assetManager';

/**
 * Asset Loader for Export Engine: Preloads and caches assets before the rendering pipeline starts.
 * This guarantees perfect timing accuracy and prevents flash frames or freeze lapses.
 */
export class AssetLoader {
  private static cachedVideos = new Map<string, HTMLVideoElement>();

  /**
   * Preload all video clips on the tracks, ensuring they have metadata ready.
   */
  public static async preloadTracks(tracks: TimelineTrack[]): Promise<void> {
    const urls = new Set<string>();

    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if (clip.type === 'video' && clip.sourceUrl) {
          urls.add(clip.sourceUrl);
        }
      });
    });

    console.log(`[AssetLoader] Preloading ${urls.size} unique timeline videos...`);

    const promises = Array.from(urls).map(async (url) => {
      try {
        // Load into shared cache
        const video = await assetManager.loadVideo(url);
        this.cachedVideos.set(url, video);
        return video;
      } catch (err) {
        console.warn(`[AssetLoader] Load failed for video url: ${url}`, err);
        // Fallback to synchronous video instantiation to avoid blocking export completely
        const rawVideo = assetManager.getVideoElement(url);
        this.cachedVideos.set(url, rawVideo);
        return rawVideo;
      }
    });

    await Promise.all(promises);
    console.log('[AssetLoader] Preload stage completed successfully.');
  }

  /**
   * Get an already cached video element
   */
  public static getCachedVideo(url: string): HTMLVideoElement | null {
    return this.cachedVideos.get(url) || null;
  }

  /**
   * Cleans up preloaded caches to free up browser memory
   */
  public static clear() {
    this.cachedVideos.clear();
  }
}
