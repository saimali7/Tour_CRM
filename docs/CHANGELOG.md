# Changelog

All notable changes to the Tour CRM project.

---

## January 2026

### January 2, 2026 - Technical Debt Remediation

Comprehensive technical debt sprint addressing types, performance, errors, and observability:

**Type Safety:**
- Created `pricing-type-guards.ts` with runtime validators for all JSONB pricing models
- Type guards for PricingModel, Money, CapacityModel, BookingOptionSnapshot
- Utility functions: `extractPricingModel()`, `getBasePriceFromModel()`, `getCurrencyFromModel()`

**Performance:**
- Fixed N+1 queries in waiver-service, availability-service, wishlist-service
- Added Promise.all parallelization for independent async operations
- Added database indexes: guideOrgIdx, orgCreatedAtIdx, customerOrgIdx

**Error Handling:**
- Replaced console.* with structured pino logger across 15+ files
- Added Sentry integration to webhooks, tRPC, Inngest, upload API, auth
- Standardized error classes (ServiceError, NotFoundError, ValidationError) in 20+ services

**Code Organization:**
- Extracted `tour-run-utils.ts`: createTourRunKey(), parseTourRunKey()
- Extracted `correlation.ts`: AsyncLocalStorage-based request context
- Extracted `validation-helpers.ts`: requireEntity(), requireEntitySync()
- Extracted `inngest/helpers.ts`: sendEvent(), sendEvents() with fire-and-forget logging

**Score improvement:** 4.85/10 → 7.20/10

---

## December 2025

### December 16, 2025 - Phase 7.2 Complete (60-Second Phone Booking)

Completed the remaining 25% of Phase 7.2:

**Quick Booking Enhancements:**
- Added `⌘+Enter` keyboard shortcut to submit booking form
- Form targeting via `data-quick-booking-form` attribute

**Command Palette Updates:**
- Added "Phone Booking" as top quick action (`⌘P`)
- Phone icon with blue styling
- Renamed "New Booking" to "New Booking (Full Form)" for clarity

**Bookings Page Integration:**
- Global `⌘P` shortcut opens phone booking
- URL query param support (`?phone=1`) for deep linking
- Auto-opens when accessed from command palette

**Phone Booking Flow:**
- Visual tour cards selection
- Horizontal 14-day date scroller
- Time slots with color-coded capacity
- Inline customer search + quick create
- Live price calculation
- `⌘+Enter` to submit

---

### December 16, 2025 - Phase 7.1 + 7.4 Implementation Complete

Implemented backend services and UI for high-impact features:

**Backend Services:**
- `CheckInService`: Participant check-in, no-show, undo, bulk check-in
- `VoucherService`: Gift vouchers with amounts, codes, expiration, redemption
- `WaiverService`: Digital waiver templates, signing, PDF generation
- `DepositService`: Configurable deposits with balance tracking
- `AddOnService`: Optional extras for tours with inventory

**Database Schema:**
- `add-ons.ts`: Tour add-ons with pricing and inventory
- `waivers.ts`: Waiver templates and signed waivers

**tRPC Routers:**
- `check-in.ts`: Schedule/booking check-in endpoints
- `voucher.ts`: Voucher CRUD, redemption, balance
- `waiver.ts`: Template management, signing
- `deposit.ts`: Deposit collection, balance updates
- `add-on.ts`: Add-on management for tours

**UI Features:**
- Voucher management page (`/settings/vouchers`)
- Waiver management page (`/settings/waivers`)
- Check-in functionality on schedule manifest with progress bar
- Customer 360 Sheet integration on customers page

---

### December 16, 2025 - Phase 7: Operations Excellence Planning

Created comprehensive implementation plan for Phase 7:

**Strategic Analysis:**
- Created `docs/STRATEGIC_ANALYSIS.md` with first-principles CRM evaluation
- Analyzed 4 user personas (Operations Manager, Customer Service, Business Owner, Guide)
- Mapped daily/weekly/monthly/annual operations gaps
- Identified transformation path: Work → Fast → Smart → Unique

**Phase 7 Sub-Phases:**
| Sub-Phase | Focus | Key Deliverables |
|-----------|-------|------------------|
| 7.1 | Production Completion | Payment UI, email triggers, pricing tiers |
| 7.2 | Operational Speed | Quick booking (<60s), Customer 360, batch ops |
| 7.3 | Intelligence Surface | Forecasting, goal tracking, proactive alerts |
| 7.4 | High-Impact Features | Waivers, deposits, check-in, add-ons, vouchers |
| 7.5 | Guide Mobile PWA | Offline manifests, push notifications |

---

### December 13, 2025 - Phase 6 UX Overhaul Complete

- Created comprehensive UX Overhaul plan
- Identified 6 system-wide interaction patterns
- Built foundation components (Combobox, SlideOver, CommandPalette)
- Created quick view components for all entities
- Replaced 23+ browser dialogs with ConfirmModal
- Reduced walk-in booking from 12+ clicks to ~6-8 clicks

---

### December 13, 2025 - Production Readiness Fixes

- Comprehensive production audit completed
- Fixed 6+ security issues (JWT, magic links, env vars)
- Fixed 20+ multi-tenant isolation gaps across services
- Fixed database schema (booking_participants org_id, indexes)
- Changed 15+ mutations to adminProcedure authorization
- Fixed various bugs (currency logic, date handling, URLs)

---

### December 13, 2025 - Phase 5 Complete

- Created 3 new services (Analytics, Dashboard, CustomerIntelligence)
- Built Operations Dashboard with today's tours, activity feed, alerts
- Built Business Dashboard with revenue trends, booking metrics
- Built Reports hub with 5 report types
- Added customer scoring (0-100) and segment assignment
- Added CLV calculation (historical and predicted)
- Added CSV export for all reports

---

### December 13, 2025 - Phase 4 Complete

- Added 4 new database tables (pricing.ts schema)
- Created 4 new services (SeasonalPricing, PromoCode, GroupDiscount, PricingCalculation)
- Built Pricing Settings page with Seasonal Pricing and Group Discounts tabs
- Built Promo Codes management page with full CRUD
- Implemented PricingCalculationService for unified pricing logic
- Discount stacking: Seasonal → Group → Promo codes

---

### December 13, 2025 - Phase 3 Complete

- Added 5 new database tables (guide-operations schema + guide_tokens)
- Created 4 new services (GuideAvailability, TourGuideQualification, GuideAssignment, Manifest)
- Built complete Guide Management UI (list, create, edit, detail pages)
- Implemented Guide Availability system with weekly patterns and overrides
- Created Guide Portal with magic link authentication
- Implemented Manifest system with print support
- Created 4 Inngest functions for guide notifications

---

### December 13, 2025 - Phase 2 Complete

- Added 9 new database tables (communications schema)
- Created 5 new services
- Built Communications page with 4 tabs
- Enhanced Customer profile with Notes tab
- GDPR data export and anonymization
- Inngest automation functions

---

### December 12, 2025 - Phase 1 Complete

- Phase 1 completed at 97%
- Tour form enhancements
- Booking reschedule and refund
- Calendar view with react-big-calendar
- Activity logging system

---

*This changelog is maintained alongside PROGRESS.md. See [PROGRESS.md](./PROGRESS.md) for current status.*
