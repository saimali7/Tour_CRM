// Schema barrel file - exports all tables and relations

// Core entities
export * from "./organizations";
export * from "./users";
export * from "./customers";
export * from "./tours";
export * from "./tour-availability"; // NEW: Availability-based scheduling
export * from "./guides";
export * from "./bookings";
export * from "./activity-logs";
export * from "./refunds";
export * from "./payments";

// Phase 2: Communications & Customer engagement
export * from "./communications";

// Phase 3: Guide Operations
export * from "./guide-operations";
export * from "./guide-tokens";

// Phase 4: Pricing & Promotions
export * from "./pricing";

// High-Impact Features: Reviews & Feedback
export * from "./reviews";

// High-Impact Features: Digital Waivers
export * from "./waivers";

// High-Impact Features: Add-ons & Gift Vouchers
export * from "./add-ons";

// Phase 7: Operations Excellence - Goals
export * from "./goals";

// Phase 7: Operations Excellence - Tour Command Center
export * from "./pickup-addresses";
export * from "./pickup-assignments";

// Booking System v2: Customer-first booking with options
export * from "./booking-options";

// Tour Command Center: Dispatch & Route Optimization
export * from "./pickup-zones";
export * from "./dispatch-status";

// Products
export * from "./products";
