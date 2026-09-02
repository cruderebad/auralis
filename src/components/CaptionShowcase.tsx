import React, { useEffect, useRef } from 'react';
import { renderCaptionFrame } from '../lib/RenderEngine';
import { CaptionSegment, GlobalStyle } from '../types';
import { DEFAULT_STYLE } from '../constants';

interface CaptionShowcaseProps {
  styleOverrides: Partial<GlobalStyle>;
  text: string;
  duration?: number; // total loop duration in seconds
  width?: number;
  height?: number;
}

export default function CaptionShowcase({
  styleOverrides,
  text,
  duration = 3,
  width = 400,
  height = 300,
}: CaptionShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const words = text.split(' ');
    const wordDuration = duration / words.length;

    const caption: CaptionSegment = {
      id: 'showcase-1',
      start: 0,
      end: duration,
      text: text,
      words: words.map((w, i) => ({
        text: w,
        start: i * wordDuration,
        end: (i + 1) * wordDuration,
      })),
    };

    const style: GlobalStyle = {
      ...DEFAULT_STYLE,
      ...styleOverrides,
    };

    let animationFrameId: number;
    let startTime: number | null = null;

    const render = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const time = elapsed % (duration + 1); // 1 second pause at the end

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw background if any
      if (style.backgroundColor && style.backgroundEnabled) {
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      // We only render if time is within duration
      // Skip rendering typewriter on canvas since we use DOM overlay now
      if (time <= duration) {
        renderCaptionFrame(ctx, caption, time, style, width, height);
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [styleOverrides, text, duration, width, height]);

  return (
    <div className="relative w-full h-full">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-contain" />
    </div>
  );
}
