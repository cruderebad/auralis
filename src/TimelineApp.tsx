/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CaptionSegment, GlobalStyle } from './types';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { PreviewCanvas } from './components/PreviewCanvas';
import { Timeline } from './components/Timeline';
import { ExportPanel } from './components/layout/ExportPanel';
import { CaptionsListPanel } from './components/layout/CaptionsListPanel';
import { UploadTab } from './components/layout/UploadTab';
import { parseSRT } from './lib/srt-parser';
import { cn } from './lib/utils';
import { useStore } from './store';
import { CompositionEngine } from './engine/compositionEngine';
import { playbackEngine } from './engine/playbackEngine';

import { useLocation } from 'react-router-dom';
import { safeSaveProjects, sanitizeProjectForStorage, safeSetLocalStorage } from './lib/projectStorage';

export default function TimelineApp() {
  const workspaceLayout = useStore((s) => s.workspaceLayout);
  const theme = useStore((s) => s.theme);
  const isLight = theme === 'light';
  const isExporting = useStore((s) => s.isExporting);
  const tracks = useStore((s) => s.tracks);
  const duration = useStore((s) => s.duration);
  const style = useStore((s) => s.style);
  const resolution = useStore((s) => s.resolution);
  const aspectRatio = useStore((s) => s.aspectRatio);
  const projectId = useStore((s) => s.projectId);
  const projectTitle = useStore((s) => s.projectTitle);
  const captionMode = useStore((s) => s.captionMode);
  const semanticTimeline = useStore((s) => s.semanticTimeline);
  const videoUrl = useStore((s) => s.videoUrl);
  const videoFile = useStore((s) => s.videoFile);

  const setStyle = useStore((s) => s.setStyle);
  const setResolution = useStore((s) => s.setResolution);
  const setAspectRatio = useStore((s) => s.setAspectRatio);

  const location = useLocation();

  const [activeTab, setActiveTab] = useState('depth-captions');
  const [mainTab, setMainTab] = useState<'upload' | 'edit' | 'export'>(
    location.state?.action === 'upload_srt' ? 'edit' : 'upload'
  );

  const [timelineHeight, setTimelineHeight] = useState(() => {
    const saved = localStorage.getItem('auralis_timeline_height');
    return saved ? parseInt(saved, 10) : 256;
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Store raw captions locally for processing logic
  const [rawCaptions, setRawCaptions] = useState<CaptionSegment[]>([]);

  useEffect(() => {
    safeSetLocalStorage('auralis_timeline_height', timelineHeight.toString());
    // Trigger a resize event to allow canvases (preview and timeline) to reflow
    window.dispatchEvent(new Event('resize'));
  }, [timelineHeight]);

  useEffect(() => {
    const storeState = useStore.getState();
    if (location.state?.isNew) {
      storeState.resetProject(location.state.projectId, location.state.title);
      if (location.state.aspectRatio) {
        storeState.setAspectRatio(location.state.aspectRatio);
      }
      setMainTab('upload');
    } else if (location.state?.action === 'upload_video' || location.state?.action === 'upload_srt') {
      setMainTab('upload');
    } else if (location.state?.projectData) {
      const pd = location.state.projectData;
      storeState.loadProject(pd);
      if (location.state.aspectRatio) {
        storeState.setAspectRatio(location.state.aspectRatio);
      }
      if (Array.isArray(pd.rawCaptions) && pd.rawCaptions.length > 0) {
        setRawCaptions(pd.rawCaptions);
      } else if (Array.isArray(pd.captions) && pd.captions.length > 0) {
        setRawCaptions(pd.captions);
      }
      setMainTab('edit');
    } else if (location.state?.projectId && location.state?.title) {
      storeState.setProjectInfo(location.state.projectId, location.state.title);
      if (location.state.aspectRatio) {
        storeState.setAspectRatio(location.state.aspectRatio);
      }
    }
  }, []);

  // Auto-save project logic
  useEffect(() => {
    if (projectId) {
      const timer = setTimeout(() => {
        try {
          const saved = localStorage.getItem('auralis_projects');
          let projects = saved ? JSON.parse(saved) : [];
          if (!Array.isArray(projects)) projects = [];

          const rawProjectData = useStore.getState().getProjectData();
          if (rawCaptions.length > 0) {
            rawProjectData.rawCaptions = rawCaptions;
            if (!rawProjectData.captions || rawProjectData.captions.length === 0) {
              rawProjectData.captions = rawCaptions;
            }
          }
          const cleanProjectData = sanitizeProjectForStorage(rawProjectData);

          const existingIndex = projects.findIndex((p: any) => p.id === projectId);
          const updatedProj = {
            id: projectId,
            title: projectTitle,
            time: 'Just now',
            tag: 'Draft',
            duration: Math.floor(duration / 60).toString().padStart(2, '0') + ':' + Math.floor(duration % 60).toString().padStart(2, '0'),
            thumbnail: '',
            projectData: cleanProjectData
          };

          if (existingIndex >= 0) {
            projects[existingIndex] = { ...projects[existingIndex], ...updatedProj };
          } else {
            projects.unshift(updatedProj);
          }

          safeSaveProjects(projects);
        } catch (err) {
          console.warn('Error during auto-saving project:', err);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tracks, duration, style, projectTitle, projectId, captionMode, semanticTimeline, rawCaptions]);

  // Initialize rawCaptions from store if they exist but rawCaptions is empty
  useEffect(() => {
    if (rawCaptions.length === 0 && tracks.length > 0) {
      const textTrack = tracks.find(t => t.type === 'text');
      if (textTrack && textTrack.clips.length > 0) {
        const reconstructed: CaptionSegment[] = textTrack.clips.map(c => ({
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
        
        // Ensure there's actually some content to avoid loop issues
        if (reconstructed.some(r => r.text || r.words?.length)) {
          setRawCaptions(reconstructed);
        }
      }
    }
  }, [tracks, rawCaptions.length]);

  // Start real-time master clock engine on startup
  useEffect(() => {
    playbackEngine.start();
    return () => {
      playbackEngine.stop();
    };
  }, []);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          // Redo
          e.preventDefault();
          useStore.getState().redo();
        } else {
          // Undo
          e.preventDefault();
          useStore.getState().undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        // Redo alternative
        e.preventDefault();
        useStore.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSplitterPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
    document.body.style.userSelect = 'none';
    const startY = e.clientY;
    const startHeight = timelineHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(150, Math.min(window.innerHeight - 300, startHeight - deltaY));
      setTimelineHeight(newHeight);
    };

    const handlePointerUp = () => {
      setIsDraggingSplitter(false);
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const processCaptions = useCallback((raw: CaptionSegment[], wordsPerSegment: number, useOriginalSRT: boolean, aiAdaptiveLines: boolean, aiAdaptiveEmphasis: boolean, maxLines: number, aiAdaptivePunctuation: boolean) => {
    // 1. Retrieve the exact physical duration from the store
    const videoDuration = useStore.getState().duration || Infinity;

    const distributeIntoLines = (words: string[], targetMaxLines: number) => {
      if (words.length <= 1) return words.join(' ');
      const totalChars = words.reduce((sum, w) => sum + w.length, 0) + words.length - 1;
      let effectiveMaxLines = targetMaxLines;
      if (effectiveMaxLines <= 1 && totalChars > 26 && words.length >= 5) {
        effectiveMaxLines = 2;
      } else if (effectiveMaxLines <= 2 && totalChars > 48 && words.length >= 8) {
        effectiveMaxLines = 3;
      }

      if (effectiveMaxLines <= 1) return words.join(' ');
      const targetLineCount = Math.min(effectiveMaxLines, words.length);
      const wordsPerLine = Math.ceil(words.length / targetLineCount);
      const lines = [];
      for (let j = 0; j < words.length; j += wordsPerLine) {
        const lineWords = words.slice(j, Math.min(j + wordsPerLine, words.length));
        if (lineWords.length > 0) {
          lines.push(lineWords.join(' '));
        }
      }
      return lines.join('\n');
    };

    if (useOriginalSRT) {
      let offset = 0;
      if (raw.length > 0 && raw[0].start >= 3600) {
        offset = raw[0].start;
      }
      return raw.map(c => ({
        ...c,
        start: Math.max(0, c.start - offset),
        end: Math.min(c.end - offset, videoDuration),
        text: distributeIntoLines(c.text.split(' '), maxLines),
      }));
    }

    let offset = 0;
    if (raw.length > 0 && raw[0].start >= 3600) {
      offset = raw[0].start;
    }

    const allWords: { text: string, start: number, end: number, emotion?: string, emphasis?: number, isFocus?: boolean, segRef?: CaptionSegment }[] = [];
    raw.forEach(seg => {
      const startTime = seg.start - offset;
      const endTime = seg.end - offset;
      const duration = endTime - startTime;

      if (seg.words && seg.words.length > 0) {
        seg.words.forEach((word) => {
          const wStart = word.start - offset;
          const wEnd = word.end - offset;
          if (wStart < videoDuration) {
            allWords.push({
              start: Math.max(0, wStart),
              end: Math.min(wEnd, videoDuration),
              text: word.text,
              emotion: word.emotion || seg.emotion,
              emphasis: word.emphasis,
              isFocus: word.isFocus || (word.emphasis != null && word.emphasis >= 0.8),
              segRef: seg
            });
          }
        });
      } else {
        const parts = seg.text.split(/\s+/).filter(Boolean);
        const wordDur = duration / parts.length;
        parts.forEach((p, i) => {
          const wStart = startTime + (i * wordDur);
          const wEnd = startTime + ((i + 1) * wordDur);
          if (wStart < videoDuration) {
            allWords.push({
              start: Math.max(0, wStart),
              end: Math.min(wEnd, videoDuration),
              text: p,
              emotion: seg.emotion,
              segRef: seg
            });
          }
        });
      }
    });

    // Timing sanitization pipeline: enforce monotonically increasing, strictly non-overlapping words
    const sanitizedWords: typeof allWords = [];
    for (let w = 0; w < allWords.length; w++) {
      const cur = { ...allWords[w] };
      
      // Ensure positive physical duration
      if (cur.end <= cur.start) {
        cur.end = cur.start + 0.12;
      }
      
      // Prevent clashing with the next word's onset
      if (w < allWords.length - 1) {
        const nextStart = allWords[w + 1].start;
        if (cur.end > nextStart) {
          cur.end = Math.max(cur.start + 0.05, nextStart);
        }
      }

      // Ensure word doesn't start after video ends
      if (cur.start >= videoDuration) continue;
      cur.end = Math.min(cur.end, videoDuration);

      sanitizedWords.push(cur);
    }

    const effectiveWordsPerSegment = wordsPerSegment * maxLines;
    const wordNodes: CaptionSegment[] = [];
    let currentChunk: typeof allWords = [];
    let chunkIndex = 0;

    for (let i = 0; i < sanitizedWords.length; i++) {
      const isEmphasized = aiAdaptiveEmphasis && /[A-Z]{2,}/.test(sanitizedWords[i].text) && sanitizedWords[i].text.length > 3;

      if (isEmphasized && currentChunk.length > 0) {
        let start = currentChunk[0].start;
        let end = currentChunk[currentChunk.length - 1].end;
        
        const minDuration = wordsPerSegment === 1 ? 0.15 : 0.4;
        if (end - start < minDuration) {
          const nextSegmentStart = (i < sanitizedWords.length)
            ? sanitizedWords[i].start
            : videoDuration;
          end = Math.min(start + minDuration, nextSegmentStart);
        }

        end = Math.min(end, videoDuration);
        
        let chunkToSave = [...currentChunk];
        
        if (aiAdaptivePunctuation) {
            chunkToSave = chunkToSave.map((w, idx) => {
                let txt = w.text.replace(/[,]+$/, ''); // remove commas
                if (idx === chunkToSave.length - 1) {
                    if (!/[.!?]+$/.test(txt)) txt += '.';
                } else {
                    txt = txt.replace(/[.!?]+$/, '');
                }
                return { ...w, text: txt };
            });
        }

        const chunkText = distributeIntoLines(chunkToSave.map(c => c.text), maxLines);
        const refSeg1 = chunkToSave[0]?.segRef;
        const chunkEmotion1 = chunkToSave.find(w => w.emotion && w.emotion !== 'neutral')?.emotion || refSeg1?.emotion;

        wordNodes.push({
          id: `node-chunk-${chunkIndex++}-${Math.random().toString(36).substring(2, 7)}`,
          start: start,
          end: end,
          text: chunkText,
          words: chunkToSave,
          emotion: chunkEmotion1,
          speechStyle: refSeg1?.speechStyle,
          speaker: refSeg1?.speaker,
          bracketLabel: refSeg1?.bracketLabel || (refSeg1 as any)?.bracket_label,
          emotionIntensity: refSeg1?.emotionIntensity,
          confidence: refSeg1?.confidence,
          emphasis: refSeg1?.emphasis,
        });
        currentChunk = [];
      }

      if (isEmphasized) {
        let chunk = [sanitizedWords[i]];
        let start = chunk[0].start;
        let end = chunk[0].end;
        
        const minDuration = wordsPerSegment === 1 ? 0.15 : 0.4;
        if (end - start < minDuration) {
          const nextSegmentStart = (i + 1 < sanitizedWords.length)
            ? sanitizedWords[i + 1].start
            : videoDuration;
          end = Math.min(start + minDuration, nextSegmentStart);
        }

        end = Math.min(end, videoDuration);

        let chunkToSave = [...chunk];
        if (aiAdaptivePunctuation) {
            chunkToSave = chunkToSave.map((w, idx) => {
                let txt = w.text.replace(/[,]+$/, ''); // remove commas
                if (idx === chunkToSave.length - 1) {
                    if (!/[.!?]+$/.test(txt)) txt += '.';
                } else {
                    txt = txt.replace(/[.!?]+$/, '');
                }
                return { ...w, text: txt };
            });
        }

        const chunkText = distributeIntoLines(chunkToSave.map(c => c.text), maxLines);
        const refSeg2 = chunkToSave[0]?.segRef;
        const chunkEmotion2 = chunkToSave.find(w => w.emotion && w.emotion !== 'neutral')?.emotion || refSeg2?.emotion;

        wordNodes.push({
          id: `node-chunk-${chunkIndex++}-${Math.random().toString(36).substring(2, 7)}`,
          start: start,
          end: end,
          text: chunkText,
          words: chunkToSave,
          emotion: chunkEmotion2,
          speechStyle: refSeg2?.speechStyle,
          speaker: refSeg2?.speaker,
          bracketLabel: refSeg2?.bracketLabel || (refSeg2 as any)?.bracket_label,
          emotionIntensity: refSeg2?.emotionIntensity,
          confidence: refSeg2?.confidence,
          emphasis: refSeg2?.emphasis,
        });
        continue;
      }

      currentChunk.push(sanitizedWords[i]);
      
      const text = sanitizedWords[i].text;
      const endsWithPunctuation = aiAdaptiveLines ? /[.!?]+$/.test(text) : false;
      
      let shouldBreak = currentChunk.length >= effectiveWordsPerSegment || endsWithPunctuation || i === sanitizedWords.length - 1 || isEmphasized;

      if (aiAdaptiveLines && i < sanitizedWords.length - 1 && !isEmphasized) {
        const chunkDuration = sanitizedWords[i].end - currentChunk[0].start;
        if (chunkDuration < 0.4) {
          shouldBreak = false; // keep adding words if duration is too short
        }
      }

      if (shouldBreak) {
        const chunk = currentChunk;
        currentChunk = [];
        
        let shouldMerge = false;
        if (wordNodes.length > 0 && chunk.length <= 1 && effectiveWordsPerSegment > 1 && i === sanitizedWords.length - 1) {
          const lastNode = wordNodes[wordNodes.length - 1];
          const lastWordText = lastNode.words ? lastNode.words[lastNode.words.length - 1].text : lastNode.text;
          const lastWordEndsWithPunctuation = /[.!?]+$/.test(lastWordText);
          if (!lastWordEndsWithPunctuation) {
            shouldMerge = true;
          }
        }
        
        if (aiAdaptiveLines && wordNodes.length > 0 && i === sanitizedWords.length - 1) {
          const chunkDuration = chunk[chunk.length - 1].end - chunk[0].start;
          if (chunkDuration < 0.4) {
            shouldMerge = true;
          }
        }
        
        if (shouldMerge) {
          const lastNode = wordNodes[wordNodes.length - 1];
          let chunkToSave = [...chunk];
          if (aiAdaptivePunctuation) {
            chunkToSave = chunkToSave.map((w, idx) => {
                let txt = w.text.replace(/[,]+$/, ''); // remove commas
                if (idx === chunkToSave.length - 1) {
                    if (!/[.!?]+$/.test(txt)) txt += '.';
                } else {
                    txt = txt.replace(/[.!?]+$/, '');
                }
                return { ...w, text: txt };
            });
            // Update the last word of lastNode if we merge
            if (lastNode.words && lastNode.words.length > 0) {
                lastNode.words[lastNode.words.length - 1].text = lastNode.words[lastNode.words.length - 1].text.replace(/[.!?]+$/, '');
            }
          }

          lastNode.words = [...(lastNode.words || []), ...chunkToSave];
          lastNode.end = Math.min(chunkToSave[chunkToSave.length - 1].end, videoDuration);
          lastNode.text = distributeIntoLines(lastNode.words.map(w => w.text), maxLines);
          continue;
        }

        let start = chunk[0].start;
        let end = chunk[chunk.length - 1].end;
        
        const minDuration = wordsPerSegment === 1 ? 0.15 : 0.4;
        if (end - start < minDuration) {
          const nextSegmentStart = (i + 1 < sanitizedWords.length)
            ? sanitizedWords[i + 1].start
            : videoDuration;
          end = Math.min(start + minDuration, nextSegmentStart);
        }

        end = Math.min(end, videoDuration);

        let chunkToSave = [...chunk];
        if (aiAdaptivePunctuation) {
            chunkToSave = chunkToSave.map((w, idx) => {
                let txt = w.text.replace(/[,]+$/, ''); // remove commas
                const isEndsWithQuestion = /[?]+$/.test(w.text);
                const isEndsWithExclamation = /[!]+$/.test(w.text);

                if (idx === chunkToSave.length - 1) {
                    if (isEndsWithQuestion) {
                        txt = txt.replace(/[?]+$/, '') + '?';
                    } else if (isEndsWithExclamation) {
                        txt = txt.replace(/[!]+$/, '') + '!';
                    } else if (!/[.!?]+$/.test(txt)) {
                        txt += '.';
                    }
                } else {
                    txt = txt.replace(/[.!?]+$/, '');
                }
                return { ...w, text: txt };
            });
        }

        const chunkText = distributeIntoLines(chunkToSave.map(c => c.text), maxLines);
        const refSeg3 = chunkToSave[0]?.segRef;
        const chunkEmotion3 = chunkToSave.find(w => w.emotion && w.emotion !== 'neutral')?.emotion || refSeg3?.emotion;

        wordNodes.push({
          id: `node-chunk-${chunkIndex++}-${Math.random().toString(36).substring(2, 7)}`,
          start: start,
          end: end,
          text: chunkText,
          words: chunkToSave,
          emotion: chunkEmotion3,
          speechStyle: refSeg3?.speechStyle,
          speaker: refSeg3?.speaker,
          bracketLabel: refSeg3?.bracketLabel || (refSeg3 as any)?.bracket_label,
          emotionIntensity: refSeg3?.emotionIntensity,
          confidence: refSeg3?.confidence,
          emphasis: refSeg3?.emphasis,
        });
      }
    }

    return wordNodes;
  }, []);

  const updateStoreCaptions = useCallback((nodes: CaptionSegment[]) => {
    CompositionEngine.setCaptions(nodes);
    const maxEnd = Math.max(...nodes.map(c => c.end), 0);
    const store = useStore.getState();
    let videoTrack = store.tracks.find(t => t.type === 'video');
    if (videoTrack && videoTrack.clips[0] && maxEnd > videoTrack.clips[0].end) {
       store.updateClip(videoTrack.clips[0].id, { end: maxEnd });
    }
    if (maxEnd > store.duration) {
       store.setDuration(maxEnd);
    }
  }, []);

  useEffect(() => {
    if (rawCaptions.length > 0) {
      const newCaptions = processCaptions(rawCaptions, style.wordsPerSegment, style.useOriginalSRT, style.aiAdaptiveLines, style.aiAdaptiveEmphasis, style.maxLines, style.aiAdaptivePunctuation || false);
      updateStoreCaptions(newCaptions);
    }
  }, [style.wordsPerSegment, style.useOriginalSRT, style.aiAdaptiveLines, style.aiAdaptiveEmphasis, style.maxLines, style.aiAdaptivePunctuation]);

  const handleVideoUpload = async (file: File) => {
    await CompositionEngine.registerMediaAsset(file, 'video');
  };

  const handleSRTUpload = async (file: File) => {
    const text = await file.text();
    const parsedCaptions = parseSRT(text);
    const wordNodes = processCaptions(parsedCaptions, style.wordsPerSegment, style.useOriginalSRT, style.aiAdaptiveLines, style.aiAdaptiveEmphasis, style.maxLines, style.aiAdaptivePunctuation || false);
    
    setRawCaptions(parsedCaptions);

    const maxEnd = Math.max(...wordNodes.map(c => c.end), 0);
    const firstCaptionStart = wordNodes.length > 0 ? wordNodes[0].start : 0;

    updateStoreCaptions(wordNodes);

    if (useStore.getState().currentTime === 0) useStore.getState().setCurrentTime(firstCaptionStart);
  };

  // Convert subtitle track clips to older format array so that Sidebar/TopBar maps clean
  const legacyCaptions = React.useMemo(() => {
    return tracks
      .find(t => t.type === 'text')
      ?.clips.map(c => ({
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
      })) || [];
  }, [tracks]);

  const handleUpdateCaptions = useCallback((caps: CaptionSegment[]) => {
    setRawCaptions(caps);
    updateStoreCaptions(caps);
  }, [updateStoreCaptions]);

  const hasMediaOrCaptions = tracks.some(t => t.clips.length > 0) || rawCaptions.length > 0 || !!videoUrl || !!videoFile;

  const handleTabChange = useCallback((tab: 'upload' | 'edit' | 'export') => {
    if (tab !== 'upload' && (mainTab === 'upload' || !hasMediaOrCaptions)) {
      return;
    }
    setMainTab(tab);
  }, [mainTab, hasMediaOrCaptions]);

  return (
    <div className={cn(
      "flex flex-col h-screen font-sans selection:bg-auralis/25 transition-colors duration-300",
      isLight ? "bg-[#FFFFFF] text-[#0D1B2A]" : "bg-[#070708] text-[#E0E0E6]"
    )}>
      <TopBar 
        activeTab={mainTab} 
        onTabChange={handleTabChange} 
        disabled={isTranscribing || isExporting} 
        hasMediaOrCaptions={hasMediaOrCaptions}
      />
      
      <main className={cn(
        "flex-1 items-center justify-center transition-colors duration-300",
        isLight ? "bg-[#F5F7FA]" : "bg-[#0C0C0E]",
        mainTab === 'upload' ? "flex" : "hidden"
      )}>
        <UploadTab 
          onVideoUpload={handleVideoUpload}
          onSRTUpload={handleSRTUpload}
          onUploadStateChange={setIsTranscribing}
          onTranscriptionComplete={(captions, rawStr) => {
            setRawCaptions(captions);
            const wordNodes = processCaptions(captions, style.wordsPerSegment, style.useOriginalSRT, style.aiAdaptiveLines, style.aiAdaptiveEmphasis, style.maxLines, style.aiAdaptivePunctuation || false);
            const maxEnd = Math.max(...wordNodes.map(c => c.end), 0);
            const firstCaptionStart = wordNodes.length > 0 ? wordNodes[0].start : 0;
            
            updateStoreCaptions(wordNodes);

            if (useStore.getState().currentTime === 0) useStore.getState().setCurrentTime(firstCaptionStart);
            setMainTab('edit');
          }}
        />
      </main>

      <main className={cn(
        "flex-1 overflow-hidden transition-colors duration-300",
        isLight ? "bg-[#F5F7FA]" : "bg-[#0A0A0C]",
        mainTab === 'export' ? "flex" : "hidden"
      )}>
        <div className="flex-1 overflow-y-auto">
          <ExportPanel onClose={() => setMainTab('edit')} />
        </div>
      </main>

      <main className={cn(
        "flex-col md:flex-row flex-1 overflow-hidden transition-colors duration-300",
        isLight ? "bg-[#F5F7FA]" : "bg-[#0A0A0C]",
        mainTab === 'edit' ? "flex" : "hidden"
      )}>
        {workspaceLayout === 'vertical' ? (
          <>
            <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
              <div className="flex-1 flex overflow-hidden">
                {!isExporting && (
                  <div className="z-50 h-full w-auto shrink-0">
                    <Sidebar 
                      onVideoUpload={handleVideoUpload}
                      onSRTUpload={handleSRTUpload}
                      updateStyle={setStyle}
                      currentStyle={style}
                      resolution={resolution}
                      onUpdateResolution={setResolution}
                      aspectRatio={aspectRatio}
                      onUpdateAspectRatio={setAspectRatio}
                      captions={legacyCaptions}
                      onUpdateCaptions={handleUpdateCaptions}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                    />
                  </div>
                )}
                <div className={cn(
                  "flex-1 transition-colors duration-300 min-w-0 overflow-hidden",
                  isLight ? "bg-[#FFFFFF]" : "bg-[#0F0F12]"
                )}>
                  <CaptionsListPanel 
                    captions={legacyCaptions} 
                    onUpdateCaptions={handleUpdateCaptions}
                  />
                </div>
              </div>

              {/* Draggable Horizontal Splitter */}
              <div 
                className={cn(
                  "h-2 w-full cursor-row-resize flex flex-col justify-center items-center group relative z-10",
                  isLight ? "bg-zinc-100/50 hover:bg-zinc-200" : "bg-[#1C1C1E]/50 hover:bg-[#2A2A2E]",
                  isDraggingSplitter && "bg-auralis/20"
                )}
                onPointerDown={handleSplitterPointerDown}
              >
                <div className={cn(
                  "w-12 h-0.5 rounded-full transition-colors",
                  isLight ? "bg-zinc-300 group-hover:bg-auralis" : "bg-white/10 group-hover:bg-auralis",
                  isDraggingSplitter && "bg-auralis"
                )} />
              </div>

              <div 
                className="flex flex-col shrink-0 relative z-20 w-full"
                style={{ height: `${timelineHeight}px` }}
              >
                <Timeline />
              </div>
            </div>
            
            <div className={cn(
              "w-[35%] min-w-[320px] max-w-[600px] flex flex-col relative border-l border-zinc-200 dark:border-white/10 pb-16 md:pb-0 shrink-0",
              isLight ? "bg-[#FFFFFF]" : "bg-[#0F0F12]",
              isExporting && "pointer-events-none"
            )}>
              <div className="flex-1 flex items-center justify-center p-2 pt-4 overflow-hidden w-full h-full">
                <PreviewCanvas />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left Sidebar styling for subtitle alignments and uploading */}
            {!isExporting && (
              <div className="order-last md:order-first md:static z-50 md:h-full w-full md:w-auto">
                <Sidebar 
                  onVideoUpload={handleVideoUpload}
                  onSRTUpload={handleSRTUpload}
                  updateStyle={setStyle}
                  currentStyle={style}
                  resolution={resolution}
                  onUpdateResolution={setResolution}
                  aspectRatio={aspectRatio}
                  onUpdateAspectRatio={setAspectRatio}
                  captions={legacyCaptions}
                  onUpdateCaptions={handleUpdateCaptions}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              </div>
            )}

            {/* Center Professional NLE Canvas Panel */}
            <div className={cn(
              "flex-1 flex flex-col min-w-0 min-h-0 relative transition-colors duration-300 pb-16 md:pb-0",
              isLight ? "bg-[#FFFFFF]" : "bg-[#0F0F12]",
              isExporting && "pointer-events-none"
            )}>
              <div className="flex-1 flex items-center justify-center p-0.5 pt-1.5 overflow-hidden w-full max-w-[1000px] mx-auto min-h-[200px]">
                <PreviewCanvas />
              </div>

              {/* Draggable Horizontal Splitter */}
              <div 
                className={cn(
                  "h-2 w-full cursor-row-resize flex flex-col justify-center items-center group relative z-10",
                  isLight ? "bg-zinc-100/50 hover:bg-zinc-200" : "bg-[#1C1C1E]/50 hover:bg-[#2A2A2E]",
                  isDraggingSplitter && (isLight ? "bg-auralis/20" : "bg-auralis/20")
                )}
                onPointerDown={handleSplitterPointerDown}
              >
                <div className={cn(
                  "w-12 h-0.5 rounded-full transition-colors",
                  isLight ? "bg-zinc-300 group-hover:bg-auralis" : "bg-white/10 group-hover:bg-auralis",
                  isDraggingSplitter && "bg-auralis"
                )} />
              </div>

              {/* Precision Non-Linear Multi-Track Timeline */}
              <div 
                className="flex flex-col shrink-0 relative z-20 w-full"
                style={{ height: `${timelineHeight}px` }}
              >
                <Timeline />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
