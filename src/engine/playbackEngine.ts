import { useEditorStore } from '../store/useEditorStore';
import { assetManager } from './assetManager';

/**
 * PlaybackEngine: Synchronizes rendering clocks, wall-time progression,
 * and audio/video hardware streams to prevent playback desynchronizations.
 */
class PlaybackEngine {
  private worker: Worker | null = null;
  private workerUrl: string | null = null;
  private lastTime: number = 0;
  private isInitialized = false;

  public start() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.lastTime = performance.now();
    
    const workerCode = `
      let interval;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          interval = setInterval(() => self.postMessage('tick'), 1000 / 60);
        } else if (e.data === 'stop') {
          clearInterval(interval);
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(this.workerUrl);
    
    this.worker.onmessage = () => {
      this.tick();
    };
    this.worker.postMessage('start');
    console.log('[PlaybackEngine] Started.');
  }

  public stop() {
    if (this.worker) {
      this.worker.postMessage('stop');
      this.worker.terminate();
      this.worker = null;
    }
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
    this.isInitialized = false;
    console.log('[PlaybackEngine] Stopped.');
  }

  private manageSecondaryAudio(storeTime: number, isPlaying: boolean, playbackSpeed: number) {
    const store = useEditorStore.getState();
    const activeAudioUrls = new Set<string>();

    store.tracks.forEach(track => {
      if (track.muted || !track.visible) return;
      track.clips.forEach(clip => {
        if (clip.muted || !clip.sourceUrl) return;
        // Skip the main video url, as it's handled by `#preview-video`
        if (clip.sourceUrl === store.videoUrl) return;

        if (storeTime >= clip.start && storeTime <= clip.end) {
          activeAudioUrls.add(clip.sourceUrl);
          const audio = assetManager.getAudioElement(clip.sourceUrl);
          
          if (isPlaying) {
            if (audio.paused) {
              audio.play().catch(e => console.warn('Could not play secondary audio:', e));
            }
            if (audio.playbackRate !== playbackSpeed) {
              audio.playbackRate = playbackSpeed;
            }
            
            // Sync time if drifted
            const elapsed = storeTime - clip.start;
            const expectedAudioTime = clip.sourceStart + (elapsed * clip.playbackRate);
            if (Math.abs(audio.currentTime - expectedAudioTime) > 0.1) {
               audio.currentTime = expectedAudioTime;
            }
          } else {
            if (!audio.paused) audio.pause();
            const elapsed = storeTime - clip.start;
            const expectedAudioTime = clip.sourceStart + (elapsed * clip.playbackRate);
            if (Math.abs(audio.currentTime - expectedAudioTime) > 0.05) {
               audio.currentTime = expectedAudioTime;
            }
          }
        }
      });
    });

    // Pause all playing audio elements that are not currently active
    // We don't have a direct list of all audio elements in playbackEngine,
    // but assetManager keeps them. Wait, if we can't iterate assetManager, 
    // we can just iterate all clips again and pause the inactive ones.
    store.tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.sourceUrl && clip.sourceUrl !== store.videoUrl && !activeAudioUrls.has(clip.sourceUrl)) {
           const audio = assetManager.getAudioElement(clip.sourceUrl);
           if (!audio.paused) audio.pause();
        }
      });
    });
  }

  private tick = () => {
    if (!this.isInitialized) return;
    const now = performance.now();
    let deltaSeconds = (now - this.lastTime) / 1000;
    // Cap delta to prevent huge jumps when the tab is backgrounded
    if (deltaSeconds > 0.1) {
      deltaSeconds = 0.1;
    }
    this.lastTime = now;

    const store = useEditorStore.getState();

    if (store.isPlaying) {
      const videoElement = document.getElementById('preview-video') as HTMLVideoElement | null;
      
      if (videoElement && !isNaN(videoElement.duration) && videoElement.duration > 0) {
        // Play video if paused and not ended
        if (videoElement.paused && !videoElement.ended && videoElement.currentTime < videoElement.duration - 0.05) {
          videoElement.play().catch((err) => {
            console.warn('[PlaybackEngine] Could not resume master video element:', err);
          });
        }

        // Keep playback rates aligned with playbackSpeed
        const targetRate = store.playbackSpeed;
        if (videoElement.playbackRate !== targetRate) {
          videoElement.playbackRate = targetRate;
        }

        // Use the physical hardware clock of the video to keep captions perfectly in sync with the sound
        let vTime = videoElement.currentTime;
        if ((videoElement.ended || videoElement.currentTime >= videoElement.duration - 0.05) && store.duration > videoElement.duration) {
            // Artificially advance time when video is physically over but timeline continues
            vTime = store.currentTime + deltaSeconds * store.playbackSpeed;
        }
        
        // Dynamic mute logic: if the user removes/mutes the audio layer or video layer, `#preview-video` should mute
        let shouldPlayMainAudio = false;
        store.tracks.forEach(track => {
          if (track.muted || !track.visible) return;
          track.clips.forEach(clip => {
            if (clip.muted) return;
            // Unmuted video or audio clips from the main source should enable audio
            if (clip.sourceUrl === store.videoUrl && vTime >= clip.start && vTime <= clip.end) {
              shouldPlayMainAudio = true;
            }
          });
        });
        videoElement.muted = !shouldPlayMainAudio;

        this.manageSecondaryAudio(vTime, true, store.playbackSpeed);

        if (vTime >= store.duration) {
          store.setIsPlaying(false);
          store.setCurrentTime(0);
          videoElement.currentTime = 0;
          videoElement.pause();
          this.manageSecondaryAudio(0, false, store.playbackSpeed);
        } else {
          useEditorStore.setState({ currentTime: vTime });
        }
      } else {
        // Fallback to delta system block if no physical video is bound
        const nextTime = store.currentTime + deltaSeconds * store.playbackSpeed;
        
        this.manageSecondaryAudio(nextTime, true, store.playbackSpeed);

        if (nextTime >= store.duration) {
          store.setIsPlaying(false);
          store.setCurrentTime(0);
          this.manageSecondaryAudio(0, false, store.playbackSpeed);
        } else {
          useEditorStore.setState({ currentTime: nextTime });
        }
      }
    } else {
      // Pause master video DOM element if playback stopped
      const videoElement = document.getElementById('preview-video') as HTMLVideoElement | null;
      if (videoElement) {
        if (!videoElement.paused) {
          videoElement.pause();
        }
        // Frame-accurate align on manual scrub / timeline pause
        const diff = Math.abs(videoElement.currentTime - store.currentTime);
        if (diff > 0.02) {
          videoElement.currentTime = store.currentTime;
        }
      }
      this.manageSecondaryAudio(store.currentTime, false, store.playbackSpeed);
    }

    // Removed requestAnimationFrame as we use web worker now
  };
}

export const playbackEngine = new PlaybackEngine();
export default playbackEngine;
