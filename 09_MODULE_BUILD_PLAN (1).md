# Module Build Plan — QuoteKaro

Build strictly in this order. Do not begin a module until the previous
module's "Definition of Done" is fully met. Within a module, do the tasks
one at a time, in order, and pause for confirmation after each task
(see `00_AGENT_INSTRUCTIONS.md`, Rule 2).

---

## Module 0 — Project Scaffolding
**Tasks:**
1. Initialize backend repo (Node.js/Express), folder structure per `03_SYSTEM_DESIGN.md` §6
2. Initialize Flutter project (customer + provider apps can start as one
   Flutter project with role-based navigation, or two separate projects —
   ask the user which they prefer before proceeding)
3. Initialize React admin dashboard project
4. Set up Docker Compose for local Postgres + Redis
5. Set up `.env.example` files for all three projects (never commit real `.env`)

**Definition of Done:** All three projects run locally with a "Hello World" health-check endpoint/screen. No business logic yet.

---

## Module 1 — Auth & User Foundations
**Tasks:**
1. Implement `users` table migration (from `04_DATABASE_SCHEMA.md`)
2. Implement Firebase OTP integration: `/auth/otp/request`, `/auth/otp/verify`
3. Implement JWT issuance and role-based middleware (see `07_SECURITY.md` §1)
4. Implement `GET /auth/me`, `GET/PATCH /users/{id}`
5. Build the OTP login screen in both Flutter apps

**Definition of Done:** A test user can log in via OTP on both apps and receive a valid JWT; role middleware correctly blocks cross-role access (write the authorization test from `08_TESTING_STRATEGY.md` §2.7–2.8 now, even though there's little to protect yet — establish the pattern early).

---

## Module 2 — Provider Profiles & KYC
**Tasks:**
1. Implement `provider_profiles` table + indexes (from `04_DATABASE_SCHEMA.md`)
2. Implement `POST /providers/kyc`, `PATCH /providers/{id}/availability`, `PATCH /providers/{id}/service-area`
3. Build KYC upload screen + service area picker in the provider app
4. Implement admin KYC approval queue: `GET /admin/providers?kyc_status=pending`, `PATCH /admin/providers/{id}/kyc`
5. Build the admin dashboard's provider verification screen

**Definition of Done:** A provider can complete KYC, an admin can approve/reject it, and only approved providers can be marked `is_available`. Test case 4 (KYC gate) from `08_TESTING_STRATEGY.md` passes.

---

## Module 3 — Job Posting & Matching
**Tasks:**
1. Implement `jobs` table + indexes
2. Implement `POST /jobs`, `GET /jobs/{id}`, `GET /jobs?customer_id=`
3. Implement `GET /jobs/nearby` (category + area + radius matching)
4. Build "Post a Job" screen (customer app) — category, description, photos, urgent/planned toggle
5. Build "Job Feed" screen (provider app) — nearby open jobs

**Definition of Done:** A customer can post a job and it correctly appears in the job feed of providers whose category and service area match.

---

## Module 4 — Quotes & Booking
**Tasks:**
1. Implement `quotes` and `bookings` tables + constraints (one quote per provider per job)
2. Implement `POST /jobs/{id}/quotes`, `GET /jobs/{id}/quotes` (**blended sort — test this explicitly**), `POST /jobs/{id}/accept-quote`
3. Implement the urgent-job auto-match logic (bypasses the quote-comparison flow per `03_SYSTEM_DESIGN.md` §4)
4. Build "Submit Quote" screen (provider app) and "Quote Comparison" screen (customer app)
5. Build "Booking Confirmation" screen (both apps)

**Definition of Done:** Scenario A and Scenario B from `08_TESTING_STRATEGY.md` §3 both pass manually end-to-end.

---

## Module 5 — Live Tracking, Chat & Booking Lifecycle
**Tasks:**
1. Implement `PATCH /bookings/{id}/status`, `GET /bookings/{id}/track`
2. Integrate Google Maps Platform for live location + ETA
3. Implement basic in-app chat (can be a simple polling-based message table for MVP — do not over-engineer with websockets unless the team is comfortable with them)
4. Build "Live Tracking" screen with map view

**Definition of Done:** A booking's status can be updated by the provider and reflected live on the customer's tracking screen.

---

## Module 6 — Payments & Wallet Commission
**⚠️ Confirm payment gateway choice (Razorpay vs Cashfree) with the user before starting this module — see `02_TRD.md` §1.**

**Tasks:**
1. Implement `payments` and `wallet_ledger` tables (append-only, per `07_SECURITY.md` §3)
2. Integrate chosen gateway's sandbox/test mode for UPI/card payment
3. Implement `POST /bookings/{id}/payment`, `POST /payments/webhook` (with signature verification)
4. Implement `POST /bookings/{id}/complete` — this must trigger the wallet commission deduction for BOTH cash and digital payments (this is the core differentiator from `01_PRD.md` — do not skip the cash case)
5. Implement wallet balance threshold check (blocks new job matches if too low)
6. Build "Payment" screen (customer app) and "Wallet" screen (provider app)

**Definition of Done:** Scenario C (cash payment leakage prevention) from `08_TESTING_STRATEGY.md` §3 passes — commission deduction is identical whether payment was cash or digital.

---

## Module 7 — Ratings & Proof of Work
**Tasks:**
1. Implement `ratings` table + denormalized average update logic
2. Implement `POST /bookings/{id}/rating`
3. Implement before/after photo upload on job completion
4. Build the rating screen (3-axis sliders, per `06_UIUX_SPEC.md`) and provider ratings dashboard

**Definition of Done:** Test case 10 from `08_TESTING_STRATEGY.md` passes; the quote comparison screen from Module 4 now visibly reflects real multi-axis ratings, not placeholder data.

---

## Module 8 — Disputes & Admin Analytics
**Tasks:**
1. Implement `disputes` table
2. Implement `GET/PATCH /admin/disputes`
3. Implement `GET /admin/analytics`
4. Build the admin dashboard's disputes and analytics screens

**Definition of Done:** An admin can view and resolve a test dispute, and see basic city-wise booking analytics.

---

## Module 9 — Security Hardening & Final Testing Pass
**Tasks:**
1. Walk through every checklist item in `07_SECURITY.md` and confirm each is actually implemented, not assumed
2. Run the full test suite (`08_TESTING_STRATEGY.md`) end-to-end
3. Fix any failing test — do not mark this module done with known failing tests
4. Prepare demo data / seed script for the jury presentation

**Definition of Done:** All test cases in `08_TESTING_STRATEGY.md` §2 pass; all four end-to-end scenarios in §3 have been walked through and recorded.

---

## After Module 9
Stop and check in with the user before considering any post-MVP feature
from `01_PRD.md` §5 ("Out of Scope"). Do not silently start building
subscription plans, multi-city support, or anything else not in this plan.
