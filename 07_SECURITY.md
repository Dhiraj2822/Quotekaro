# Security Requirements — QuoteKaro (non-negotiable)

These rules apply from Module 1 onward. Do not defer security "until later" —
retrofitting auth/validation after the fact is how real breaches happen.

## 1. Authentication & Authorization
- OTP-based login only (no passwords stored) via Firebase Auth
- Every API request (except `/auth/*`) requires a valid JWT
- Role-based access control (RBAC) enforced server-side on every endpoint —
  a provider must never be able to call an admin endpoint even if they guess
  the URL. Check `user.role` in middleware, not just in the UI.
- A customer can only access their own jobs/bookings (`customer_id` must
  match the authenticated user) — enforce this in the query, not just by
  trusting the client-supplied ID

## 2. Data Protection
- KYC documents (ID proofs) stored in S3/R2 with **private** ACLs only —
  never publicly readable URLs. Generate short-lived signed URLs when the
  admin dashboard needs to view them.
- Phone numbers and KYC data are PII — do not log them in plaintext
  application logs
- Passwords are never applicable (OTP-only), so no password storage risk —
  but JWT secrets must be stored in environment variables, never committed
  to the repository

## 3. Payment Security
- Never handle raw card numbers — all card/UPI payment collection happens
  through the gateway's hosted checkout/SDK, never a custom form
- Verify payment gateway webhook signatures before trusting any payment
  status update (`/payments/webhook` in `05_API_SPEC.md`) — an unverified
  webhook is a direct fraud vector
- Wallet ledger entries are append-only — never allow an UPDATE or DELETE
  on `wallet_ledger` rows from the application layer; corrections are new
  offsetting entries, not edits

## 4. Input Validation
- Validate every request body against a schema (e.g. Zod/Joi) before it
  touches the database — reject unexpected fields, wrong types, out-of-range
  values (e.g. `price_paise` must be positive and within the admin-configured
  category bounds from `06_UIUX_SPEC.md` §4)
- Sanitize any user-supplied text (job descriptions, reviews) before storage
  to prevent stored XSS if ever rendered in a web view (admin dashboard)

## 5. Rate Limiting & Abuse Prevention
- Rate-limit `/auth/otp/request` per phone number (e.g. max 5 requests per
  hour) to prevent SMS-bombing abuse
- Rate-limit quote submission per provider per job (already constrained to
  one quote per provider per job at the database level — see
  `04_DATABASE_SCHEMA.md` — but also rate-limit at the API layer)

## 6. Infrastructure
- All API traffic over HTTPS only, no exceptions, including local dev
  tunnels used for demoing
- Environment secrets (DB credentials, JWT secret, payment gateway keys,
  Google Maps API key) in `.env`, excluded via `.gitignore` — never commit
  these to GitHub even in a private repo

## 7. If a security requirement conflicts with a feature request
Flag it to the user immediately rather than silently weakening the security
rule to make the feature work (Rule 4 in `00_AGENT_INSTRUCTIONS.md`).
