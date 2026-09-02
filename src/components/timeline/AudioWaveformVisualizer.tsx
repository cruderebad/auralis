import React, { useMemo } from 'react';

interface AudioWaveformVisualizerProps {
  seed?: string | number;
  color?: string;
  height?: number;
  barsCount?: number;
  className?: string;
  isAudio?: boolean;
}

export function AudioWaveformVisualizer({
  seed = 42,
  color = '#DFAC24',
  height = 24,
  barsCount = 64,
  className = '',
  isAudio = false
}: AudioWaveformVisualizerProps) {
  // Generate deterministic audio peak heights
  const peaks = useMemo(() => {
    const numericSeed = typeof seed === 'string' 
      ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      : seed;
    
    const values: number[] = [];
    let state = numericSeed;
    
    const pseudoRandom = () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };

    for (let i = 0; i < barsCount; i++) {
      // Natural speech cadence envelope modulation
      const envelope = 0.35 + 0.65 * Math.sin((i / barsCount) * Math.PI * 3.5);
      const noise = pseudoRandom();
      const peak = Math.max(0.15, Math.min(0.95, (noise * 0.7 + 0.3) * Math.abs(envelope)));
      values.push(peak);
    }
    return values;
  }, [seed, barsCount]);

  return (
    <div className={`flex items-center justify-between w-full h-full gap-[1.5px] px-1 pointer-events-none select-none opacity-40 overflow-hidden ${className}`}>
      {peaks.map((peak, idx) => (
        <div
          key={idx}
          className="flex-1 rounded-full transition-all"
          style={{
            height: `${Math.max(4, peak * 100)}%`,
            backgroundColor: color,
            minWidth: '1.5px',
            maxWidth: '4px'
          }}
        />
      ))}
    </div>
  );
}
