# Testing Strategy — QuoteKaro

## 1. Test Types & Coverage Expectations
| Type | Tool | Applies to | Target |
|---|---|---|---|
| Unit tests | Jest | Backend business logic (quote scoring, commission calc, matching logic) | Every function in `/quotes`, `/wallet`, `/jobs` matching logic |
| Integration tests | Jest + Supertest | API endpoints against a test database | Every endpoint in `05_API_SPEC.md` |
| Widget/UI tests | Flutter test | Key screens (quote comparison, job posting) | Critical user flows only, not every screen |
| End-to-end tests | Manual (MVP) / Cypress (admin dashboard, post-MVP) | Full user journeys | See §3 below |

## 2. Non-negotiable test cases (map directly to `01_PRD.md` acceptance criteria)

1. Customer can post a job and receive multiple provider quotes
2. Quotes are sorted by blended score by default, NOT price ascending
   (write an explicit test asserting this — it's easy to accidentally
   regress into a plain price sort)
3. A provider cannot submit more than one quote per job (DB constraint +
   API-level test)
4. Urgent jobs skip the bidding flow and auto-match a provider
5. Commission is correctly deducted from the wallet on `POST /bookings/{id}/complete`
   for BOTH cash and digital payment methods — write both cases explicitly
6. A provider whose wallet balance is below the minimum threshold cannot
   receive new job matches until they top up
7. A customer cannot view or modify another customer's job/booking (authorization test)
8. A provider cannot access any `/admin/*` endpoint (authorization test)
9. Payment webhook with an invalid signature is rejected
10. Rating submission correctly updates the provider's denormalized average scores

## 3. End-to-End Scenarios (test manually before each module gate, automate later)
- **Scenario A (Planned job):** Customer posts painting job → 3 providers quote → customer compares → books lowest-rated-but-cheapest vs. highest-rated → confirms blended sort is default → completes → rates → commission deducted
- **Scenario B (Urgent job):** Customer posts "burst pipe" → system auto-matches nearest provider → booking created directly, no quote comparison screen
- **Scenario C (Cash payment leakage prevention):** Booking completed with cash payment method → wallet ledger shows commission deduction identical to a digital payment scenario
- **Scenario D (KYC gate):** Unverified provider attempts to submit a quote → rejected with clear error

## 4. Definition of "tested" for each module
A module is not complete until:
- All unit tests for that module pass
- All integration tests for its endpoints pass
- The relevant end-to-end scenario above has been manually walked through
  and screenshotted/recorded for the project documentation/demo

## 5. Test data
- Use realistic but clearly fake data (e.g. `+919999900001` style test phone
  numbers, `Test Provider 1`, etc.) — never use real personal phone numbers
  or names in seed/test data, including your own
