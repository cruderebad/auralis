import { useEditorStore } from './store/useEditorStore';
export { useEditorStore as useStore } from './store/useEditorStore';

// Re-export compatible types
export type { TimelineClip, TimelineTrack } from './types/timeline';
export type { EditorStoreState as TimelineState } from './store/useEditorStore';
