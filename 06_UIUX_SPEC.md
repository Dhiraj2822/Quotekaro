# UI/UX Specification — QuoteKaro

## 1. Design System
- **Primary color:** Deep blue `#1F3864` (trust, professionalism)
- **Accent color:** Green `#548235` (used for "verified", "completed", success states)
- **Warning/urgent color:** Amber `#BF8F00` (used for urgent job badges only — do not overuse)
- **Typography:** System default (San Francisco on iOS, Roboto on Android) — do not bundle custom fonts for MVP
- **Corner radius:** 12px for cards, 8px for buttons/inputs
- **Spacing scale:** 4 / 8 / 16 / 24 / 32 px

## 2. Customer App — Screens

1. **Splash → OTP Login** → phone number entry, OTP verification
2. **Home** — city/area selector at top, category grid below (Plumbing, Electrical, Painting, Cleaning), "My Bookings" shortcut
3. **Post a Job** — category pre-filled, description text field, photo upload (up to 5), urgent/planned toggle, address/pin-on-map
4. **Quote Comparison** — list of provider cards: name, photo, blended rating (not raw stars — show honesty/punctuality/quality as 3 small bars), price, ETA. Default sort = blended score. Toggle for "sort by price"
5. **Booking Confirmation** — selected provider, price, scheduled time (if planned) or "provider is on the way" (if urgent)
6. **Live Tracking** — map with provider's live location, ETA, chat button, call button (masked number)
7. **Job Completion & Rating** — before/after photos shown, 3-axis rating sliders (honesty/punctuality/quality), optional text review
8. **Payment** — method selection (UPI/card/cash), invoice summary
9. **Profile / My Bookings** — booking history, rebook shortcut

## 3. Provider App — Screens

1. **Splash → OTP Login + KYC Upload** (first-time only) — ID document upload, category selection, service area radius picker on map
2. **Home / Job Feed** — list of nearby open jobs matching provider's category, each with distance and customer's job photos
3. **Submit Quote** — price input, ETA input, optional message
4. **My Bookings** — accepted jobs, status update buttons (en route → in progress → completed)
5. **Job Completion** — after-photo upload, triggers wallet commission deduction
6. **Wallet** — balance, ledger history, top-up button
7. **Ratings Dashboard** — provider's own honesty/punctuality/quality scores over time

## 4. Admin Dashboard (Web) — Screens

1. **Provider Verification Queue** — pending KYC list, approve/reject with reason
2. **Disputes** — open disputes list, detail view, resolution notes field
3. **Analytics** — bookings over time, GMV, active providers, category breakdown (charts)
4. **Category & Pricing Bounds** — set min/max quote bounds per category to prevent outlier scams

## 5. Key UX Principles (do not deviate without asking)
- **Never show only price-sorted quotes by default** — this directly undermines the "cheapest wins" protection described in `01_PRD.md`. Rating must be visible in the same view as price, not buried in a tap-through.
- **Urgent jobs skip the comparison screen entirely** — go straight from "Post a Job" to "Booking Confirmation" with the auto-matched provider, per the urgency routing in `03_SYSTEM_DESIGN.md`.
- **Photo upload is mandatory for job posting on non-trivial categories** (painting, cleaning) — optional for simple urgent jobs (burst pipe) where speed matters more.

## 6. Out of scope for MVP UI
- Dark mode
- Tablet-optimized layouts
- Multi-language UI (structure text as translatable strings from day one, but only ship English for MVP)
