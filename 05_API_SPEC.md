# API Specification — QuoteKaro

Base URL (local): `http://localhost:4000/api/v1`
Auth: `Authorization: Bearer <JWT>` on every endpoint except `/auth/*`
All request/response bodies are JSON. All money fields are in paise (integers).

## Auth Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/auth/otp/request` | `{ phone_number }` | `{ success: true }` |
| POST | `/auth/otp/verify` | `{ phone_number, otp, role }` | `{ token, user }` |
| GET | `/auth/me` | — | `{ user }` |

## Users Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/users/{id}` | — | `{ user }` |
| PATCH | `/users/{id}` | `{ name?, email?, city? }` | `{ user }` |

## Providers Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/providers/kyc` | `{ document_url }` | `{ provider_profile }` — status set to 'pending' |
| PATCH | `/providers/{id}/availability` | `{ is_available }` | `{ provider_profile }` |
| PATCH | `/providers/{id}/service-area` | `{ categories[], radius_km, lat, lng }` | `{ provider_profile }` |
| GET | `/providers/{id}` | — | `{ provider_profile }` — includes denormalized ratings |

## Jobs Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/jobs` | `{ category, urgency_type, description, photo_urls[], area, lat, lng }` | `{ job }` |
| GET | `/jobs/{id}` | — | `{ job }` |
| GET | `/jobs?customer_id=` | — | `{ jobs[] }` |
| GET | `/jobs/nearby?category=&lat=&lng=&radius_km=` | (provider-facing) | `{ jobs[] }` — open jobs matching provider's category/area |

## Quotes Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/jobs/{id}/quotes` | `{ price_paise, eta_minutes, message? }` | `{ quote }` |
| GET | `/jobs/{id}/quotes` | — | `{ quotes[] }` — sorted by blended score server-side, see note below |
| POST | `/jobs/{id}/accept-quote` | `{ quote_id }` | `{ booking }` |

**Sorting note:** `GET /jobs/{id}/quotes` must sort by a blended score
(price weighted against provider rating), NOT price ascending by default.
This is a deliberate product decision (see `01_PRD.md`) to prevent a race
to the bottom. Expose a `?sort=price_asc` query param for the user-facing
"sort by lowest price" toggle, but the default response order must be the
blended score.

## Bookings Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/bookings/{id}` | — | `{ booking }` |
| PATCH | `/bookings/{id}/status` | `{ status }` | `{ booking }` — provider updates en_route/in_progress |
| POST | `/bookings/{id}/complete` | `{ after_photo_url }` | `{ booking }` — triggers wallet commission deduction (see `04_DATABASE_SCHEMA.md`) |
| GET | `/bookings/{id}/track` | — | `{ provider_lat, provider_lng, eta_minutes }` — polled or via websocket |

## Payments Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/bookings/{id}/payment` | `{ method }` | `{ payment_intent }` — gateway session for upi/card; immediate record for cash |
| POST | `/payments/webhook` | (gateway callback) | `200 OK` — verifies signature, updates payment status |

## Wallet Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/providers/{id}/wallet` | — | `{ balance_paise, ledger[] }` |
| POST | `/providers/{id}/wallet/topup` | `{ amount_paise, method }` | `{ ledger_entry }` |

## Ratings Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/bookings/{id}/rating` | `{ rating_honesty, rating_punctuality, rating_quality, review_text? }` | `{ rating }` |

## Admin Module
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/admin/providers?kyc_status=pending` | — | `{ providers[] }` |
| PATCH | `/admin/providers/{id}/kyc` | `{ kyc_status, rejection_reason? }` | `{ provider_profile }` |
| GET | `/admin/disputes` | — | `{ disputes[] }` |
| PATCH | `/admin/disputes/{id}` | `{ status, resolution_notes }` | `{ dispute }` |
| GET | `/admin/analytics` | — | `{ city-wise booking counts, GMV, active providers }` |

## Standard Error Shape (use everywhere)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "price_paise is required" } }
```
