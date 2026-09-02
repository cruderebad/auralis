/**
 * Quota-safe local storage manager with IndexedDB support and base64 sanitization
 * Prevents QuotaExceededError when storing project data, thumbnails, and state.
 */

export function sanitizeProjectForStorage(project: any): any {
  if (!project || typeof project !== 'object') return project;

  try {
    const sanitized: any = {
      id: project.id,
      title: project.title || 'Untitled Project',
      time: project.time || 'Recently',
      tag: project.tag || 'Draft',
      duration: project.duration || '00:00',
      thumbnail: (typeof project.thumbnail === 'string' && project.thumbnail.length < 2000) ? project.thumbnail : '',
    };

    if (project.projectData && typeof project.projectData === 'object') {
      const pd = project.projectData;
      sanitized.projectData = {
        id: pd.id,
        title: pd.title,
        aspectRatio: pd.aspectRatio,
        fps: pd.fps,
        style: pd.style,
        captionMode: pd.captionMode || 'standard',
        semanticTimeline: pd.semanticTimeline !== undefined ? pd.semanticTimeline : null,
        soundEvents: Array.isArray(pd.soundEvents) ? pd.soundEvents : [],
        customAccessibilityConfig: pd.customAccessibilityConfig,
        accessibility: pd.accessibility,
        videoMetadata: pd.videoMetadata,
        captions: Array.isArray(pd.captions) ? pd.captions : [],
        rawCaptions: Array.isArray(pd.rawCaptions) ? pd.rawCaptions : (Array.isArray(pd.captions) ? pd.captions : []),
        tracks: Array.isArray(pd.tracks) ? pd.tracks.map((track: any) => ({
          ...track,
          clips: Array.isArray(track.clips) ? track.clips.map((clip: any) => {
            const cleanClip = { ...clip };
            delete cleanClip.sourceFile;
            if (typeof cleanClip.thumbnail === 'string' && cleanClip.thumbnail.length > 2000) {
              cleanClip.thumbnail = '';
            }
            if (typeof cleanClip.sourceUrl === 'string') {
              if (cleanClip.sourceUrl.startsWith('data:') && cleanClip.sourceUrl.length > 5000) {
                cleanClip.sourceUrl = '';
              } else if (cleanClip.sourceUrl.startsWith('blob:')) {
                cleanClip.sourceUrl = '';
              }
            }
            return cleanClip;
          }) : []
        })) : []
      };
    }

    return sanitized;
  } catch {
    return { id: project.id, title: project.title || 'Project' };
  }
}

/**
 * Creates an ultra-lightweight version of a project specifically for localStorage,
 * stripping heavy media blobs and excessive binary data while preserving captions.
 */
export function minimizeProjectForLocalStorage(project: any): any {
  if (!project) return project;

  const minProj: any = {
    id: project.id,
    title: project.title || 'Untitled Project',
    time: project.time || 'Recently',
    tag: project.tag || 'Draft',
    duration: project.duration || '00:00',
    thumbnail: (project.thumbnail && project.thumbnail.length < 1000) ? project.thumbnail : '',
  };

  if (project.projectData) {
    const pd = project.projectData;
    minProj.projectData = {
      id: pd.id,
      title: pd.title,
      aspectRatio: pd.aspectRatio,
      fps: pd.fps,
      style: pd.style,
      captionMode: pd.captionMode || 'standard',
      captions: Array.isArray(pd.captions) ? pd.captions : [],
      rawCaptions: Array.isArray(pd.rawCaptions) ? pd.rawCaptions : (Array.isArray(pd.captions) ? pd.captions : []),
      accessibility: pd.accessibility,
      videoMetadata: pd.videoMetadata,
    };
  }

  return minProj;
}

const DB_NAME = 'auralis_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveProjectsToIndexedDB(projects: any[]): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const p of projects) {
      store.put(p);
    }
  } catch {
    // Silent catch for IndexedDB
  }
}

export async function loadProjectsFromIndexedDB(): Promise<any[] | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Safe localStorage.setItem wrapper that swallows QuotaExceededError
 * and performs fallback trimming without throwing runtime errors or error logs.
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // First recovery attempt: if key is auralis_projects, trim aggressively
    if (key === 'auralis_projects') {
      try {
        let parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const ultraLight = parsed.slice(0, 5).map(minimizeProjectForLocalStorage);
          localStorage.setItem(key, JSON.stringify(ultraLight));
          return true;
        }
      } catch {
        // Silent recovery catch
      }
    }

    // Secondary recovery attempt: remove non-essential cache items and retry
    try {
      localStorage.removeItem('user-brand-kits');
      localStorage.removeItem('user-caption-presets');
      localStorage.removeItem('auralis-editor-settings');
      localStorage.setItem(key, value);
      return true;
    } catch {
      // Tertiary recovery attempt: store minimal items only
      if (key === 'auralis_projects') {
        try {
          let parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const bare = parsed.slice(0, 3).map((p: any) => ({
              id: p.id,
              title: p.title || 'Project',
              duration: p.duration || '00:00',
            }));
            localStorage.setItem(key, JSON.stringify(bare));
            return true;
          }
        } catch {}
      }
      return false;
    }
  }
}

export function safeSaveProjects(projects: any[]): void {
  // Always save full project details to IndexedDB first
  const sanitized = projects.map(sanitizeProjectForStorage);
  saveProjectsToIndexedDB(sanitized).catch(() => {});

  // Save lightweight version to localStorage
  const localStorageList = projects.map(minimizeProjectForLocalStorage);
  safeSetLocalStorage('auralis_projects', JSON.stringify(localStorageList));
}
