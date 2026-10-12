# Product Requirements Document (PRD) — QuoteKaro

## 1. Problem Statement
Homeowners in India struggle to find trustworthy plumbers, electricians,
painters, and cleaners at a fair price. Existing platforms either:
- Fix one company-set price with no comparison (Urban Company, NoBroker), or
- Allow open bidding with little to no verification (Thumbtack-style models)

Customers cannot judge whether a quoted price is fair, and skilled
independent professionals have no transparent way to price complex or
urgent jobs.

## 2. Vision
QuoteKaro is a two-sided, hyperlocal marketplace where **verified providers
submit their own competitive quotes** for a job, and **customers compare
multiple quotes side-by-side** — backed by multi-axis ratings and photo-
verified proof of work — before booking.

## 3. Users / Personas

### Persona A — Customer ("Priya", homeowner)
Needs a plumber for a leaking tap or a painter for a 2BHK. Wants to know
the price *before* someone shows up, wants to trust the person coming into
her home, and wants urgent jobs handled fast without waiting for quotes.

### Persona B — Provider ("Ramesh", independent electrician)
Wants fair pay for his skill level instead of one flat corporate rate.
Wants a steady stream of nearby job leads and a fast, transparent payout.

### Persona C — Admin (platform operations team)
Needs to verify new providers, resolve disputes, monitor city-wise
performance, and manage category pricing bounds so quotes stay reasonable.

## 4. Core Features (MVP scope)

| Feature | Description | Priority |
|---|---|---|
| Area/category search | Customer selects city/area + service category | P0 |
| Job posting | Customer describes job, attaches photos | P0 |
| Quote submission | Verified providers submit price + ETA | P0 |
| Quote comparison | Side-by-side view sorted by blended score (price+rating), not price alone | P0 |
| Instant-match (urgent) | For urgent categories, auto-assign nearest available provider at a platform rate instead of waiting for bids | P0 |
| Booking & live tracking | Confirm booking, track provider en route | P0 |
| In-app chat | Customer↔provider messaging, masked numbers | P1 |
| Payments | UPI/card via gateway + cash option | P0 |
| Wallet-based commission | Auto-deduct commission on job completion regardless of payment method | P0 |
| Multi-axis ratings | Separate scores: honesty, punctuality, quality | P0 |
| Photo-verified proof of work | Before/after photos tied to job completion | P1 |
| Provider KYC | ID verification, background check status | P0 |
| Admin dashboard | Provider verification, dispute handling, analytics | P0 |
| Warranty / re-visit guarantee | Free re-visit if same issue recurs within 7 days | P2 |

## 5. Out of Scope (MVP)
- Multiple cities (launch is single-city)
- More than 4 categories (plumbing, electrical, painting, cleaning only)
- Full insurance-backed warranty underwriting
- Regional language localization (post-MVP)
- Subscription plans for recurring services (post-MVP)

## 6. Success Metrics
- Time from job post to first quote received (target: under 10 minutes for planned jobs)
- % of urgent jobs matched within 15 minutes
- Provider quote-acceptance rate
- Repeat booking rate (customer books same or another provider again)
- Commission leakage rate (cash jobs not reported vs. total cash jobs)

## 7. Assumptions
- Initial launch city and exact category list to be confirmed by the team before Module 1 begins.
- Payment gateway (Razorpay or Cashfree) to be finalized in `02_TRD.md`.
- Provider verification (KYC) is manual/admin-approved in MVP, not automated.
