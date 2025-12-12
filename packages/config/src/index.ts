// Shared configuration
export const APP_NAME = "Tour Platform";

// URLs - these will be overridden by environment variables
export const config = {
  app: {
    name: APP_NAME,
    description: "Multi-tenant tour operations platform",
  },

  // Default settings (can be overridden per organization)
  defaults: {
    currency: "USD",
    language: "en",
    timezone: "UTC",
    dateFormat: "MMMM d, yyyy",
    timeFormat: "h:mm a",
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // File uploads
  uploads: {
    maxImageSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
    imageSizes: {
      thumbnail: 150,
      small: 400,
      medium: 800,
      large: 1200,
    },
  },

  // Booking settings
  booking: {
    minAdvanceHours: 24, // Minimum hours before tour to book
    maxAdvanceDays: 365, // Maximum days in advance to book
    expirationMinutes: 15, // Time to complete payment
  },
} as const;

export type Config = typeof config;
