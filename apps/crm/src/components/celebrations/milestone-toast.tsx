'use client';

import { toast } from 'sonner';
import { triggerConfetti, triggerConfettiCannon, triggerStarConfetti } from './confetti';

export type MilestoneType =
  | 'first-booking'
  | 'first-tour'
  | 'first-guide'
  | 'first-customer'
  | 'bookings-10'
  | 'bookings-50'
  | 'bookings-100'
  | 'revenue-1k'
  | 'revenue-10k'
  | 'revenue-100k'
  | 'guides-5'
  | 'tours-10'
  | 'perfect-day' // All tours completed without issues
  | 'streak-7' // 7 days in a row with bookings
  | 'five-star-review';

interface MilestoneConfig {
  title: string;
  description: string;
  confettiType: 'standard' | 'cannon' | 'star';
}

const MILESTONE_MESSAGES: Record<MilestoneType, MilestoneConfig> = {
  'first-booking': {
    title: 'First Booking!',
    description: "You're officially in business. Here's to many more!",
    confettiType: 'cannon',
  },
  'first-tour': {
    title: 'First Tour Created!',
    description: "Your first experience is ready for bookings.",
    confettiType: 'standard',
  },
  'first-guide': {
    title: 'Team Growing!',
    description: "You've added your first guide. Teamwork makes the dream work.",
    confettiType: 'standard',
  },
  'first-customer': {
    title: 'First Customer Added!',
    description: "Your customer database is officially started.",
    confettiType: 'standard',
  },
  'bookings-10': {
    title: '10 Bookings!',
    description: "Double digits! Your momentum is building.",
    confettiType: 'standard',
  },
  'bookings-50': {
    title: '50 Bookings!',
    description: "Half a century of happy customers!",
    confettiType: 'cannon',
  },
  'bookings-100': {
    title: '100 Bookings!',
    description: "Triple digits! You're a tour operation powerhouse.",
    confettiType: 'cannon',
  },
  'revenue-1k': {
    title: '$1,000 Revenue!',
    description: "Your first four figures. The sky's the limit!",
    confettiType: 'star',
  },
  'revenue-10k': {
    title: '$10,000 Revenue!',
    description: "Five figures! Your business is thriving.",
    confettiType: 'cannon',
  },
  'revenue-100k': {
    title: '$100,000 Revenue!',
    description: "Six figures! You've built something incredible.",
    confettiType: 'cannon',
  },
  'guides-5': {
    title: '5 Guides Strong!',
    description: "Your team is growing. Great things ahead!",
    confettiType: 'standard',
  },
  'tours-10': {
    title: '10 Tours!',
    description: "A diverse portfolio of experiences!",
    confettiType: 'star',
  },
  'perfect-day': {
    title: 'Perfect Day!',
    description: "Every tour completed flawlessly today.",
    confettiType: 'star',
  },
  'streak-7': {
    title: '7-Day Streak!',
    description: "A full week of bookings. You're on fire!",
    confettiType: 'cannon',
  },
  'five-star-review': {
    title: '5-Star Review!',
    description: "Another happy customer. Keep up the great work!",
    confettiType: 'star',
  },
};

/**
 * Celebrate a milestone with toast and confetti.
 * Call this when the user hits a significant achievement.
 */
export function celebrateMilestone(type: MilestoneType) {
  const config = MILESTONE_MESSAGES[type];

  // Show the toast first so users see what they achieved
  toast.success(config.title, {
    description: config.description,
    duration: 5000,
    className: 'milestone-toast',
  });

  // Trigger appropriate confetti based on milestone importance
  // Small delay for dramatic effect
  setTimeout(() => {
    switch (config.confettiType) {
      case 'cannon':
        triggerConfettiCannon();
        break;
      case 'star':
        triggerStarConfetti();
        break;
      default:
        triggerConfetti();
    }
  }, 100);
}

/**
 * Check if this is a milestone number and return the type.
 * Useful for automatic milestone detection.
 */
export function checkBookingMilestone(count: number): MilestoneType | null {
  if (count === 1) return 'first-booking';
  if (count === 10) return 'bookings-10';
  if (count === 50) return 'bookings-50';
  if (count === 100) return 'bookings-100';
  return null;
}

/**
 * Check if this is a revenue milestone.
 */
export function checkRevenueMilestone(revenue: number, previousRevenue: number): MilestoneType | null {
  if (previousRevenue < 1000 && revenue >= 1000) return 'revenue-1k';
  if (previousRevenue < 10000 && revenue >= 10000) return 'revenue-10k';
  if (previousRevenue < 100000 && revenue >= 100000) return 'revenue-100k';
  return null;
}

/**
 * Check if this is a tour milestone.
 */
export function checkTourMilestone(count: number): MilestoneType | null {
  if (count === 1) return 'first-tour';
  if (count === 10) return 'tours-10';
  return null;
}

/**
 * Check if this is a guide milestone.
 */
export function checkGuideMilestone(count: number): MilestoneType | null {
  if (count === 1) return 'first-guide';
  if (count === 5) return 'guides-5';
  return null;
}

/**
 * Check if this is a customer milestone.
 */
export function checkCustomerMilestone(count: number): MilestoneType | null {
  if (count === 1) return 'first-customer';
  return null;
}
