import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CaptionWord {
  id?: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface KineticCaptionProps {
  words: CaptionWord[];
  currentTime: number;
  className?: string;
}

export const KineticCaption: React.FC<KineticCaptionProps> = ({ words, currentTime, className = '' }) => {
  if (!words || words.length === 0) return null;

  const phraseStartTime = Math.min(...words.map(w => w.startTime));
  const phraseEndTime = Math.max(...words.map(w => w.endTime));
  
  // Determine the overall state of the caption block based on currentTime
  let containerState = "hidden";
  
  if (currentTime >= phraseStartTime && currentTime <= phraseEndTime) {
    containerState = "visible";
  } else if (currentTime > phraseEndTime && currentTime < phraseEndTime + 1.0) {
    // Keep exit state active for 1 second after the phrase ends before hiding completely
    containerState = "exit";
  }

  // Define variants for the container (handles the exit stretch-and-blur)
  const containerVariants = {
    hidden: { 
      opacity: 0,
      scaleX: 1,
      x: '0%',
      filter: 'blur(0px)',
      transition: { duration: 0 } // instant hide when out of range
    },
    visible: { 
      opacity: 1, 
      scaleX: 1,
      x: '0%',
      filter: 'blur(0px)',
      transition: { duration: 0 } // instant show
    },
    exit: { 
      opacity: 0, 
      scaleX: 3,
      x: '10%',
      filter: 'blur(4px)',
      transition: { 
        duration: 0.2, // 200ms
        ease: [0.55, 0.085, 0.68, 0.53] // cubic-bezier ease-in for rapid pull apart
      } 
    }
  };

  // Define variants for individual words (handles the entry snap)
  const wordVariants = {
    hidden: { 
      opacity: 0, 
      y: 15, 
      scale: 0.9,
      filter: 'blur(10px)',
      transition: { duration: 0 } // instant reset if scrubbed backward
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      filter: 'blur(0px)',
      transition: { 
        duration: 0.25, // 250ms
        ease: [0.175, 0.885, 0.32, 1.275] // snap effect
      }
    }
  };

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-end pb-24 md:pb-32 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={containerState}
        style={{
          fontFamily: '"gnf", "Press Start 2P", monospace',
          color: '#FFFFFF',
          textShadow: '2px 2px 0px rgba(0,0,0,0.7)',
        }}
        className="flex flex-wrap justify-center text-center px-6 md:px-12 w-full max-w-5xl text-4xl md:text-5xl lg:text-6xl origin-center"
      >
        {words.map((word, index) => {
          // Word is active if currentTime has reached its startTime
          const isWordActive = currentTime >= word.startTime;
          
          return (
            <motion.span
              key={word.id || index}
              variants={wordVariants}
              initial="hidden"
              // Even during container exit, keep word "visible" so the stretch effect smears the visible text
              animate={isWordActive && (containerState === "visible" || containerState === "exit") ? "visible" : "hidden"}
              className="mr-3 mb-2 inline-block whitespace-pre-wrap origin-bottom"
            >
              {word.text}
            </motion.span>
          );
        })}
      </motion.div>
    </div>
  );
};
