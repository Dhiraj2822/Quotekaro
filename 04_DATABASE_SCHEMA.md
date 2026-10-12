# Database Schema — QuoteKaro (PostgreSQL)

General rules for the agent:
- Every table has `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at`, `updated_at`
- Foreign keys are `ON DELETE RESTRICT` unless noted otherwise
- Money stored as `INTEGER` in paise (smallest currency unit) — never `FLOAT`
- Apply the indexes listed here in Module 2 — do not defer

## users
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| phone_number | VARCHAR(15) | UNIQUE, NOT NULL |
| role | ENUM('customer','provider','admin') | NOT NULL |
| name | VARCHAR(100) | |
| email | VARCHAR(150) | nullable |
| profile_photo_url | TEXT | nullable |
| city | VARCHAR(50) | |
| is_active | BOOLEAN | default true |

Index: `phone_number`, `role`

## provider_profiles
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, UNIQUE |
| kyc_status | ENUM('pending','approved','rejected') | default 'pending' |
| kyc_document_url | TEXT | |
| categories | TEXT[] | e.g. ['plumbing','electrical'] |
| service_area_radius_km | INTEGER | |
| base_location_lat | DECIMAL(9,6) | |
| base_location_lng | DECIMAL(9,6) | |
| is_available | BOOLEAN | default false |
| avg_rating_honesty | DECIMAL(2,1) | denormalized, updated via trigger/job |
| avg_rating_punctuality | DECIMAL(2,1) | denormalized |
| avg_rating_quality | DECIMAL(2,1) | denormalized |

Index: `kyc_status`, GIN index on `categories`, composite index on `(base_location_lat, base_location_lng)`

## jobs
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| customer_id | UUID | FK → users.id |
| category | VARCHAR(30) | NOT NULL |
| urgency_type | ENUM('urgent','planned') | NOT NULL |
| description | TEXT | |
| photo_urls | TEXT[] | |
| area | VARCHAR(100) | |
| lat | DECIMAL(9,6) | |
| lng | DECIMAL(9,6) | |
| status | ENUM('open','quoted','booked','in_progress','completed','cancelled') | default 'open' |

Index: `(category, area, status)`, `customer_id`

## quotes
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| job_id | UUID | FK → jobs.id |
| provider_id | UUID | FK → provider_profiles.id |
| price_paise | INTEGER | NOT NULL |
| eta_minutes | INTEGER | |
| message | TEXT | nullable |
| status | ENUM('pending','accepted','rejected') | default 'pending' |

Index: `job_id`, `provider_id`
Constraint: UNIQUE `(job_id, provider_id)` — one quote per provider per job

## bookings
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| job_id | UUID | FK → jobs.id, UNIQUE |
| quote_id | UUID | FK → quotes.id |
| customer_id | UUID | FK → users.id |
| provider_id | UUID | FK → provider_profiles.id |
| status | ENUM('confirmed','en_route','in_progress','completed','cancelled') | |
| scheduled_at | TIMESTAMP | nullable — null for urgent jobs |
| completed_at | TIMESTAMP | nullable |
| before_photo_url | TEXT | nullable |
| after_photo_url | TEXT | nullable |

Index: `provider_id`, `customer_id`, `status`

## payments
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK → bookings.id, UNIQUE |
| amount_paise | INTEGER | NOT NULL |
| method | ENUM('upi','card','cash') | |
| gateway_txn_id | VARCHAR(100) | nullable — null for cash |
| status | ENUM('pending','completed','failed') | |

## wallet_ledger
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| provider_id | UUID | FK → provider_profiles.id |
| booking_id | UUID | FK → bookings.id, nullable (nullable for manual top-ups) |
| entry_type | ENUM('commission_deduction','topup','payout') | |
| amount_paise | INTEGER | signed — negative for deductions |
| balance_after_paise | INTEGER | denormalized snapshot for audit trail |

Index: `provider_id`, `created_at`
**Design note:** commission is deducted from this ledger on every completed booking regardless of payment method (see `01_PRD.md` §4, wallet-based commission). If `balance_after_paise` drops below a configured minimum, the provider's `is_available` should be forced to `false` until they top up — implement this check in the `/bookings/{id}/complete` endpoint, not as an afterthought.

## ratings
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK → bookings.id, UNIQUE |
| rating_honesty | SMALLINT | 1–5 |
| rating_punctuality | SMALLINT | 1–5 |
| rating_quality | SMALLINT | 1–5 |
| review_text | TEXT | nullable |

## disputes
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK → bookings.id |
| raised_by | UUID | FK → users.id |
| reason | TEXT | |
| status | ENUM('open','under_review','resolved') | default 'open' |
| resolution_notes | TEXT | nullable |

## Entity Relationship Summary
```
users 1─┬─1 provider_profiles
        └─* jobs (as customer)
provider_profiles 1─* quotes
jobs 1─* quotes
jobs 1─1 bookings
quotes 1─1 bookings
bookings 1─1 payments
bookings 1─1 ratings
bookings 1─* disputes
provider_profiles 1─* wallet_ledger
```
