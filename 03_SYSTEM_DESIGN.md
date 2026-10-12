# System Design — QuoteKaro

## 1. Architecture Style
**Monolithic backend, modular internal structure.** Do NOT build this as
microservices. One Node.js/Express API server, organized into clearly
separated internal modules (folders), each owning one domain: `auth`,
`users`, `jobs`, `quotes`, `bookings`, `payments`, `wallet`, `ratings`,
`admin`. This gives clean separation without the operational overhead of
microservices, which is inappropriate for this project's scale and timeline.

## 2. High-Level Component Diagram (textual)

```
[Customer App (Flutter)]   [Provider App (Flutter)]   [Admin Dashboard (React)]
        |                          |                            |
        └──────────────┬───────────┴─────────────┬──────────────┘
                        |                         |
                 [REST API — Node.js/Express, stateless]
                        |
        ┌───────────────┼────────────────┬──────────────────┐
        |               |                |                  |
   [PostgreSQL]      [Redis]      [Payment Gateway]    [Google Maps API]
   (source of      (cache, live    (Razorpay/           (geocode, ETA,
   truth data)      location,       Cashfree —            distance)
                    pub/sub)        split payment)
        |
   [S3 / R2] (job photos, KYC docs, proof-of-work images)
        |
   [Firebase] (Auth — OTP login, FCM — push notifications)
```

## 3. Request Flow — Example: "Customer posts a job, provider quotes it"
1. Customer app → `POST /jobs` → API validates, writes to `jobs` table, returns `job_id`
2. API pushes a notification (FCM) to nearby eligible providers (matched via category + service area, computed using Redis geo-index)
3. Provider app → `POST /jobs/{id}/quotes` → API validates provider is KYC-approved, writes to `quotes` table
4. API pushes notification to customer: "New quote received"
5. Customer app → `GET /jobs/{id}/quotes` → returns all quotes sorted by blended score (price + provider rating), not price alone
6. Customer selects a quote → `POST /jobs/{id}/accept-quote` → creates a `booking`, marks other quotes as "not selected", notifies all providers who quoted

## 4. Urgent vs Planned Job Routing (core design decision)
Two distinct flows share the same data model but differ in matching logic:
- **Planned jobs** (painting, deep cleaning): open for bidding, customer waits for quotes, compares, selects.
- **Urgent jobs** (burst pipe, no power): system auto-matches the nearest available, highest-rated provider at a pre-set platform rate for that category — no bidding wait. This is a flag (`job.urgency_type`) on the same `jobs` table, not a separate system.

## 5. Scalability Approach (design for it now, don't over-build it now)
- Stateless API servers → can be horizontally scaled behind a load balancer whenever needed
- Redis caches: category list, provider availability status, live location pings (avoid hammering Postgres with location updates every few seconds)
- Heavy/slow operations (sending bulk notifications to nearby providers, generating payout reports) should be designed as background jobs from the start (a simple job queue — e.g., BullMQ on Redis — even in MVP), not blocking API requests
- Database indexing plan is defined in `04_DATABASE_SCHEMA.md` — apply it from Module 2, do not defer indexing to "later"

## 6. Module Boundaries (maps directly to folder structure)
```
/src
  /auth        — OTP login, JWT issuance, role middleware
  /users       — customer & provider profile management
  /providers   — KYC, service area, category, availability
  /jobs        — job posting, category/area matching
  /quotes      — quote submission, comparison, acceptance
  /bookings    — booking lifecycle, live tracking status
  /payments    — gateway integration, split payment/commission
  /wallet      — provider wallet balance, commission deduction ledger
  /ratings     — multi-axis ratings, photo-verified proof of work
  /admin       — provider verification, disputes, analytics
  /notifications — FCM push abstraction used by other modules
```

## 7. What NOT to build in MVP
- No microservices, no Kubernetes, no service mesh
- No custom-built maps/geocoding — use Google Maps Platform as-is
- No custom payment processing — use the gateway's split-payment feature, do not build your own ledger reconciliation system beyond the wallet table described in `04_DATABASE_SCHEMA.md`
