import { TimelineClip, TimelineAnimation } from '../types/timeline';

export interface AnimatedValues {
  opacity: number;
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  rotation: number;
}

// Ease calculations
const easingFunctions = {
  linear: (t: number) => t,
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => t * (2 - t),
  'ease-in-out': (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

export function getAnimatedValues(clip: TimelineClip, currentTime: number, canvasWidth: number, canvasHeight: number): AnimatedValues {
  const values: AnimatedValues = {
    opacity: clip.opacity,
    scaleX: clip.scaleX,
    scaleY: clip.scaleY,
    translateX: 0,
    translateY: 0,
    rotation: clip.rotation,
  };

  if (currentTime < clip.start || currentTime > clip.end) {
    return values;
  }

  const duration = clip.end - clip.start;
  const elapsed = currentTime - clip.start;
  const remaining = clip.end - currentTime;

  if (!clip.animations || clip.animations.length === 0) {
    return values;
  }

  for (const anim of clip.animations) {
    let progress = 1;
    const easeFunction = easingFunctions[anim.easing] || easingFunctions.linear;

    if (anim.trigger === 'start') {
      progress = Math.min(1, Math.max(0, elapsed / anim.duration));
    } else if (anim.trigger === 'end') {
      progress = Math.min(1, Math.max(0, remaining / anim.duration));
    }

    const value = easeFunction(progress);

    switch (anim.type) {
      case 'fade':
        // progress of 0 -> opacity is 0, progress of 1 -> opacity is original opacity
        values.opacity *= value;
        break;
      case 'zoom':
        // progress of 0 -> scale is 0, progress of 1 -> scale is original scale
        values.scaleX *= value;
        values.scaleY *= value;
        break;
      case 'slide': {
        // slide in from the left or slide out to the right
        // values are offset from position x, y
        if (anim.trigger === 'start') {
          // Slide in from left screen boundary
          const startX = -clip.x - clip.width;
          values.translateX += startX * (1 - value);
        } else {
          // Slide out to right screen boundary
          const endX = canvasWidth - clip.x;
          values.translateX += endX * (1 - value);
        }
        break;
      }
      case 'rotate':
        // rotate in 0 -> original rotation degrees
        if (anim.trigger === 'start') {
          values.rotation += 360 * (1 - value);
        } else {
          values.rotation += 360 * (1 - value);
        }
        break;
    }
  }

  return values;
}
