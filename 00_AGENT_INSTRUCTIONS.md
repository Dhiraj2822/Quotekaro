# AGENT INSTRUCTIONS — READ THIS FIRST, EVERY SESSION

You are building **QuoteKaro**, a hyperlocal home-services marketplace app.
This folder contains the complete specification. You did not design this
product — you are implementing it exactly as specified below. Do not
redesign, rename, restructure, or "improve" the scope on your own judgment.

## Reading order (do this before writing any code)
1. `01_PRD.md` — what we're building and why
2. `02_TRD.md` — the technology stack and non-functional requirements
3. `03_SYSTEM_DESIGN.md` — how the pieces fit together
4. `04_DATABASE_SCHEMA.md` — the data model
5. `05_API_SPEC.md` — the backend contract
6. `06_UIUX_SPEC.md` — the screens and flows
7. `07_SECURITY.md` — non-negotiable security rules
8. `08_TESTING_STRATEGY.md` — how each module gets verified
9. `09_MODULE_BUILD_PLAN.md` — the exact order to build things in

## The four rules that override everything else

**Rule 1 — Build in the order given in `09_MODULE_BUILD_PLAN.md`, and only that order.**
Do not start Module 3 before Module 2 is complete and passing its tests, even
if it looks faster to jump ahead. Each module has a "Definition of Done" —
treat it as a hard gate.

**Rule 2 — Work in small steps, not one giant pass.**
Within a module, implement one task at a time (as listed in the build plan),
show the result, and wait for confirmation before moving to the next task in
that module. Never generate an entire module's code in a single response.

**Rule 3 — If something breaks and you cannot fix it after two focused
attempts, STOP.**
Do not keep guessing, do not silently change the schema/API contract/design
to work around the error, and do not delete or simplify a feature to make an
error go away. Instead:
- Clearly state what you tried
- Clearly state the exact error
- Ask the user whether they want to (a) share the error with their advisor/
  Claude for a fix, (b) approve a specific deviation from spec, or
  (c) pause the module
- Wait for the user's answer before touching that code again

**Rule 4 — Never alter these documents.**
If you believe a spec is wrong, incomplete, or infeasible, say so and explain
why — do not silently change `04_DATABASE_SCHEMA.md`, `05_API_SPEC.md`, or any
other file to make your life easier. Flag it to the user instead.

## What "done" means for this project
Refer to the Definition of Done at the end of each module in
`09_MODULE_BUILD_PLAN.md`. A module is not done because the code runs once —
it's done when its listed tests pass and its listed API endpoints/screens
match the spec files.

## Team context (for your reference only, not a build instruction)
- Project: QuoteKaro — bidding-based home services marketplace
- Team class: LY AIA7
- Guide: Nilima Ramteke
- Institution: MIT ADT University
