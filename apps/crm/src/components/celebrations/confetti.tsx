'use client';

import confetti from 'canvas-confetti';

// Brand-aligned colors for celebrations
const CELEBRATION_COLORS = [
  '#10b981', // emerald (success)
  '#3b82f6', // blue (primary)
  '#f59e0b', // amber (attention)
  '#8b5cf6', // violet (accent)
  '#ec4899', // pink (delight)
];

/**
 * Trigger a burst of confetti from the center of the screen.
 * Used for major achievements like first booking, milestone completions.
 */
export function triggerConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: CELEBRATION_COLORS,
    disableForReducedMotion: true,
  });
}

/**
 * Trigger confetti from both sides of the screen.
 * Used for extra special moments like revenue milestones.
 */
export function triggerConfettiCannon() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: CELEBRATION_COLORS,
      disableForReducedMotion: true,
    });

    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: CELEBRATION_COLORS,
      disableForReducedMotion: true,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

/**
 * Trigger a subtle celebration with fewer particles.
 * Used for smaller wins like completing a task.
 */
export function triggerSubtleConfetti() {
  confetti({
    particleCount: 40,
    spread: 50,
    origin: { y: 0.65 },
    colors: CELEBRATION_COLORS,
    scalar: 0.8,
    disableForReducedMotion: true,
  });
}

/**
 * Trigger confetti with stars for special achievements.
 */
export function triggerStarConfetti() {
  const defaults = {
    spread: 360,
    ticks: 60,
    gravity: 0.5,
    decay: 0.94,
    startVelocity: 20,
    colors: CELEBRATION_COLORS,
    disableForReducedMotion: true,
  };

  confetti({
    ...defaults,
    particleCount: 30,
    scalar: 1.2,
    shapes: ['star'],
  });

  confetti({
    ...defaults,
    particleCount: 20,
    scalar: 0.8,
    shapes: ['circle'],
  });
}
