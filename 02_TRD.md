# Technical Requirements Document (TRD) — QuoteKaro

## 1. Technology Stack (locked — do not substitute without asking the user)

| Layer | Technology | Notes |
|---|---|---|
| Customer & Provider apps | Flutter | Single codebase, Android + iOS |
| Admin dashboard | React.js | Web only |
| Backend | Node.js + Express (or NestJS) | REST API |
| Primary database | PostgreSQL | Source of truth |
| Cache / real-time / geo | Redis | Live location, session cache |
| Auth | Firebase Auth | Phone/OTP login |
| Push notifications | Firebase Cloud Messaging (FCM) | |
| Payments | Razorpay (Route) *or* Cashfree (Easy Split) | Must support split payments for commission routing — pick ONE before Module 5 |
| Maps / geocoding | Google Maps Platform | Distance, live tracking |
| File/image storage | AWS S3 or Cloudflare R2 | Job photos, KYC docs, proof-of-work photos |
| Hosting | AWS or GCP | |

## 2. Non-Functional Requirements

### Performance
- API response time: p95 under 500ms for read endpoints, under 1.5s for write/transaction endpoints
- App cold start: under 3 seconds on a mid-range Android device

### Scalability
- Must support horizontal scaling of the backend (stateless API servers behind a load balancer)
- Database read replicas to be introduced only if/when read load requires it — not in MVP
- Redis used for caching hot reads (category lists, provider availability) and for live-location pub/sub

### Availability
- Target 99.5% uptime post-launch (not required for MVP/college submission, but design should not preclude it)

### Security
- See `07_SECURITY.md` — non-negotiable

### Data Retention
- KYC documents retained per provider account lifecycle; deleted within 30 days of account deletion request
- Job photos retained for 1 year for dispute resolution purposes

## 3. Environments
- `local` — developer machines, local Postgres/Redis via Docker Compose
- `staging` — mirrors production, used for testing before demo/submission
- `production` — only after staging sign-off (post-MVP concern, but keep environment configs separate from Module 1 onward)

## 4. Third-Party Dependencies (confirm before Module 5)
- Payment gateway account (Razorpay or Cashfree) — sandbox/test mode is sufficient through the whole build
- Google Maps Platform API key (billing must be enabled even for test usage — use with quota caps)
- Firebase project (Auth + FCM)

## 5. Constraints
- This is a student PBL (Project-Based Learning) project — prioritize a working, demonstrable MVP over production-grade infrastructure. Docker/microservices/Kubernetes are explicitly **not required** for MVP; a monolithic backend is correct and expected at this stage (see `03_SYSTEM_DESIGN.md`).
- Budget assumption: all third-party services used in free/sandbox tier.
