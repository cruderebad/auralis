import React, { useState, useEffect, useRef } from 'react';
import { KineticCaption, CaptionWord } from './KineticCaption';
import { Play, Pause, RotateCcw } from 'lucide-react';

const SAMPLE_WORDS: CaptionWord[] = [
  { text: 'This', startTime: 0.5, endTime: 2.5 },
  { text: 'is', startTime: 0.8, endTime: 2.5 },
  { text: 'a', startTime: 1.1, endTime: 2.5 },
  { text: 'beautiful', startTime: 1.4, endTime: 2.5 },
  { text: 'world', startTime: 1.9, endTime: 2.5 },
];

export const KineticCaptionDemo = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const DURATION = 4.0; // Loop duration in seconds

  const updateTime = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setCurrentTime((prev) => {
      let nextTime = prev + delta;
      if (nextTime > DURATION) {
        nextTime = 0; // loop
      }
      return nextTime;
    });

    animationRef.current = requestAnimationFrame(updateTime);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const reset = () => {
    setCurrentTime(0);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto my-12 bg-[#111] p-8 rounded-2xl border border-white/10 shadow-2xl">
      <div className="flex justify-between items-center w-full mb-6">
        <h2 className="text-xl font-semibold text-white">Kinetic Typography Showcase</h2>
        <div className="flex gap-4 items-center">
          <div className="text-white/50 font-mono text-sm">
            {currentTime.toFixed(2)}s
          </div>
          <button onClick={reset} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button 
            onClick={togglePlay}
            className="p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="relative w-full aspect-video bg-[#222] rounded-xl overflow-hidden shadow-inner border border-white/5">
        {/* Fake video background to show contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-black pointer-events-none"></div>
        
        {/* The target component */}
        <KineticCaption words={SAMPLE_WORDS} currentTime={currentTime} />
        
        {/* Timeline visualization */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
          <div 
            className="h-full bg-white transition-all duration-75 ease-linear"
            style={{ width: `${(currentTime / DURATION) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="mt-8 text-white/70 text-sm max-w-2xl text-center">
        <p>
          <strong className="text-white">Entry:</strong> Word-by-word fade in with a snap-up translation.
        </p>
        <p className="mt-2">
          <strong className="text-white">Exit:</strong> Triggered at 2.5s. The entire sentence stretches horizontally and blurs out simultaneously.
        </p>
      </div>
    </div>
  );
};
