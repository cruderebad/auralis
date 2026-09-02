/**
 * Centralized Asset Manager for preloading and caching media elements (videos, images)
 * to avoid duplicate loadings, manage browser memory, and reuse elements safely.
 */
class AssetManager {
  private videoCache = new Map<string, HTMLVideoElement>();
  private imageCache = new Map<string, HTMLImageElement>();
  private audioCache = new Map<string, HTMLAudioElement>();
  private loadPromises = new Map<string, Promise<void>>();

  /**
   * Preload video and store in cache
   */
  public async loadVideo(url: string): Promise<HTMLVideoElement> {
    if (this.videoCache.has(url)) {
      return this.videoCache.get(url)!;
    }

    const cachedPromise = this.loadPromises.get(url);
    if (cachedPromise) {
      await cachedPromise;
      return this.videoCache.get(url)!;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const promise = new Promise<void>((resolve, reject) => {
      video.oncanplaythrough = () => {
        resolve();
      };
      video.onerror = (e) => {
        console.error('[AssetManager] Failed to load video:', url, e);
        reject(new Error(`Failed to load video: ${url}`));
      };
      video.src = url;
      video.load();
    });

    this.loadPromises.set(url, promise);
    this.videoCache.set(url, video);

    try {
      await promise;
      return video;
    } catch (err) {
      this.videoCache.delete(url);
      throw err;
    } finally {
      this.loadPromises.delete(url);
    }
  }

  /**
   * Preload image and store in cache
   */
  public async loadImage(url: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    const cachedPromise = this.loadPromises.get(url);
    if (cachedPromise) {
      await cachedPromise;
      return this.imageCache.get(url)!;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const promise = new Promise<void>((resolve, reject) => {
      img.onload = () => {
        resolve();
      };
      img.onerror = () => {
        console.error('[AssetManager] Failed to load image:', url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });

    this.loadPromises.set(url, promise);
    this.imageCache.set(url, img);

    try {
      await promise;
      return img;
    } catch (err) {
      this.imageCache.delete(url);
      throw err;
    } finally {
      this.loadPromises.delete(url);
    }
  }

  /**
   * Synchronously get a video element if it exists in the cache,
   * otherwise create it lazily, assign src, and return it.
   */
  public getVideoElement(url: string): HTMLVideoElement {
    let video = this.videoCache.get(url);
    if (!video) {
      video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      video.load();
      this.videoCache.set(url, video);
    }
    return video;
  }

  /**
   * Synchronously get an image element if it exists in the cache,
   * otherwise create it lazily and return it.
   */
  public getImageElement(url: string): HTMLImageElement {
    let img = this.imageCache.get(url);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      this.imageCache.set(url, img);
    }
    return img;
  }

  /**
   * Synchronously get an audio element if it exists in the cache,
   * otherwise create it lazily and return it.
   */
  public getAudioElement(url: string): HTMLAudioElement {
    let audio = this.audioCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.load();
      this.audioCache.set(url, audio);
    }
    return audio;
  }

  /**
   * Clean up all loaded assets to free memory
   */
  public clear() {
    this.videoCache.forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    this.audioCache.forEach((audio) => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    });
    this.videoCache.clear();
    this.imageCache.clear();
    this.audioCache.clear();
    this.loadPromises.clear();
    console.log('[AssetManager] Caches cleared.');
  }
}

export const assetManager = new AssetManager();
