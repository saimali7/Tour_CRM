# Phase 7 Stabilization Release Notes

**Release Date:** February 18, 2026  
**Scope:** CRM operations hardening and dispatch stabilization

## What Changed

- Command Center is now the single assignment write surface.
- Legacy guide-assignment write endpoints are blocked and return a clear migration message.
- Dashboard and booking detail assignment CTAs now deep-link directly into Command Center context.
- Date/time handling in dispatch was hardened to organization-local day keys to prevent off-by-one day behavior.
- Temp guide lanes are day-scoped and no longer leak across dates.
- Command Center date switching was optimized with deduplicated reads and adjacent-day prefetch.

## Operator Impact

- Assign/reassign/unassign workflows should be done in Command Center only.
- Booking detail and dashboard now route operators straight into actionable command-center context.
- Dispatch day views should remain stable across timezone boundaries and future-day navigation.

## Validation Completed

- `pnpm --filter @tour/crm typecheck` passed.
- `pnpm --filter @tour/crm lint` passed with existing warning baseline.
- `pnpm --filter @tour/crm build` passed.
- Playwright UAT passed for:
  - Dashboard load and section clarity
  - Booking detail to Command Center assignment flow
  - Command Center day navigation
  - Temp guide day-scope correctness (present only on created date)
  - Mobile dashboard and command-center render paths

## Stabilization Window Policy

- Stabilization window is bugfix-only before Phase 8 starts.
- No new feature scope should be added in this window.
- Priority is operational reliability, dispatch correctness, and regression prevention.
