# QuoteKaro (कोट करो) 🛠️
> **Hyperlocal Home-Services Bidding Marketplace with Wallet-Based Commission Deduction**  
> *MIT ADT University — Project-Based Learning (PBL)*

---

## 🌟 Executive Summary
QuoteKaro connects urban homeowners with vetted local service professionals across Pune. Unlike fixed-rate directories or lead-generation platforms with off-platform transaction leakage, QuoteKaro combines:
1. **Dynamic Bidding with Blended Scoring**: Balances price competitiveness and multi-axis verified ratings (Honesty, Punctuality, Quality) so low-cost outliers do not crowd out quality craftsmen.
2. **Instant Emergency Routing**: Urgent home disasters (e.g. burst pipes) skip bidding entirely and auto-match the closest available vetted professional at standard transparent rates.
3. **Universal 10% Wallet Commission Deduction**: Auto-deducts a flat 10% platform commission from the provider's prepaid wallet upon job completion for **both cash and digital payments**, preventing platform disintermediation.
4. **End-to-End Operational Dashboard**: Live KYC verification queue, dispute arbitration with proof-of-work evidence review, and city-wise performance metrics.

---

## 🏗️ Architecture & Technology Stack

```
                        ┌────────────────────────────────────────┐
                        │      Flutter Mobile Application        │
                        │    (Customer & Provider Dual UI)      │
                        └───────────────────┬────────────────────┘
                                            │ REST API / JWT
                                            ▼
┌───────────────────────┐        ┌───────────────────────────────────┐
│ React + Vite Web      │        │        Node.js / Express          │
│ Admin Operations Hub  │◄──────►│      REST API Microservice        │
│ (Port 5173)           │  Auth  │           (Port 4000)             │
└───────────────────────┘        └──────┬────────────────────┬───────┘
                                        │                    │
                          SQL Trigger / │                    │ Razorpay Webhooks
                          ACID Ledger   ▼                    ▼
                                ┌───────────────┐     ┌───────────────┐
                                │  PostgreSQL   │     │   Razorpay    │
                                │   Database    │     │Payment Gateway│
                                └───────────────┘     └───────────────┘
```

- **Backend**: Node.js, Express, PostgreSQL 16, Zod, JWT, pg-mem (for hermetic unit/integration tests).
- **Mobile App**: Flutter 3.x (Dart), Provider state management, Custom widgets for dual Customer/Provider flows.
- **Admin Portal**: React 18, Vite, CSS Custom Properties Design System.
- **Payment & Escrow**: Razorpay payment intents, HMAC SHA256 webhook verification, append-only PostgreSQL wallet ledger.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Node.js (v18+)
- Flutter SDK (v3.19+)
- Docker & Docker Compose (optional for local PostgreSQL)

### 2. Start PostgreSQL & Run Migrations
```bash
# Optional: start local database with docker compose
docker compose up -d

# Run backend database migrations
cd backend
npm install
npm run migrate
```

### 3. Seed Demo Data for Presentation
Populate all 4 End-to-End scenarios, test credentials, and demo bookings with one command:
```bash
cd backend
npm run seed
```

### 4. Run Backend Server (Port 4000)
```bash
cd backend
npm run dev
# Server listening on http://localhost:4000
```

### 5. Run Admin Dashboard (Port 5173)
```bash
cd admin
npm install
npm run dev
# Dashboard available at http://localhost:5173
```

### 6. Run Mobile App (Flutter)
```bash
cd mobile
flutter pub get
flutter run -d chrome # or run on Android/iOS emulator
```

---

## 🔑 Demo Credentials & Test Accounts

> Standard Dev OTP for all accounts: **`123456`**

| Role | Name | Phone Number | Scenario Focus |
|---|---|---|---|
| **Admin** | Operations Admin | `+919999900000` | KYC Approval Queue, Disputes Arbitration, City Analytics |
| **Customer 1** | Kavita Patil | `+919999900010` | **Scenario A**: Planned Painting Job with 3 Bids (Blended Sort) |
| **Customer 2** | Rahul Deshmukh | `+919999900020` | **Scenario B**: Urgent Burst Pipe Emergency Auto-Match |
| **Customer 3** | Pooja Kulkarni | `+919999900030` | **Scenario C**: Completed Cash Booking, Commission & Rating |
| **Provider 1** | Suresh Electrician | `+919999900001` | Active, Verified, Wallet: ₹350 |
| **Provider 2** | Ramesh Plumber | `+919999900002` | Active, Verified, Wallet: ₹750 (Urgent responder) |
| **Provider 3** | Mahesh Painter | `+919999900003` | Active, Verified, Wallet: ₹1,200 (High rating) |
| **Provider 4** | Ganesh Appliances | `+919999900004` | **Scenario D**: Pending KYC Gate (Quotes blocked) |
| **Provider 5** | Dinesh Carpentry | `+919999900005` | **Scenario D**: Low Balance Gate (< ₹100 threshold) |

---

## 🧪 Verification & Test Suite

QuoteKaro features comprehensive automated test suites covering backend business logic, database migrations, security rules, and mobile UI flows.

```bash
# 1. Run full backend test suite (32 suites, 241 tests)
cd backend
npm test

# 2. Run mobile widget test suite (24 test groups)
cd mobile
flutter test

# 3. Build admin web dashboard
cd admin
npm run build
```

### Non-Negotiable Test Cases Status:
1. Customer can post a job and receive multiple provider quotes — **PASS**
2. Quotes sorted by blended score by default, not price ascending — **PASS**
3. Provider cannot submit more than one quote per job — **PASS**
4. Urgent jobs skip bidding and auto-match closest provider — **PASS**
5. Commission correctly deducted on completion for cash and digital — **PASS**
6. Provider below wallet threshold (< ₹100) blocked from job matches — **PASS**
7. Customer cannot view or modify another customer's job/booking — **PASS**
8. Provider cannot access any `/admin/*` endpoint (RBAC) — **PASS**
9. Payment webhook with invalid HMAC signature rejected — **PASS**
10. Rating submission atomically updates denormalized averages — **PASS**

---

## 📁 Repository Structure

```
├── admin/                    # React 18 + Vite Operations Portal
│   ├── src/
│   │   ├── components/       # DisputesView.jsx, AnalyticsView.jsx
│   │   ├── App.jsx           # Main admin console with tabs & live API
│   │   └── index.css         # Visual design tokens & styles
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── admin/            # KYC, disputes arbitration, city analytics
│   │   ├── auth/             # OTP-based authentication & JWT
│   │   ├── bookings/         # Booking state machine, chat, proof of work
│   │   ├── jobs/             # Job posting & geospatial discovery
│   │   ├── migrations/       # 001-008 idempotent SQL schema migrations
│   │   ├── payments/         # Razorpay gateway & webhook handler
│   │   ├── quotes/           # Blended scoring & bidding engine
│   │   ├── ratings/          # Multi-axis ratings & atomic averages
│   │   ├── seeds/            # Jury presentation seed script
│   │   ├── utils/            # Geo calculations & text sanitization (XSS)
│   │   └── wallet/           # Prepaid wallet balance & append-only ledger
│   └── tests/                # 31 Jest test suites (234 tests)
├── mobile/                   # Flutter Mobile Client
│   ├── lib/
│   │   ├── screens/          # Customer & Provider role-tailored screens
│   │   ├── services/         # API client & local state persistence
│   │   └── widgets/          # Proof-of-work photo pickers, star rating
│   └── test/                 # 24 Flutter widget test suites
├── docker-compose.yml        # PostgreSQL & Redis infrastructure
└── 00_AGENT_INSTRUCTIONS.md  # Core engineering directives
```

---

## 📜 Academic Attribution
**MIT ADT University — Project-Based Learning (PBL)**  
QuoteKaro Home Services Marketplace Platform  
*All 9 Modules completed in full compliance with specification.*
