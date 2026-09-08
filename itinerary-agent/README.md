# Stayora itinerary agent

REQ-0055 adds `/plan-trip` to the existing Stayora website. It uses a generated-and-adapted Vstorm PydanticAI service, with Express owning trip persistence, human approval and hotel booking. Template version, commit, generation command and MIT attribution are in `provenance/`.

## Run locally

1. In this directory run `uv sync --frozen` and copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY` (or `MODEL_API_KEY`), optionally `OPENAI_BASE_URL` / `AGENT_MODEL`, and a random `AGENT_SERVICE_TOKEN` of at least 32 characters. Generate a token with `python3 -c 'import secrets; print(secrets.token_urlsafe(48))'`.
   - **Meta Muse:** `OPENAI_BASE_URL=https://api.meta.ai/v1`, `AGENT_MODEL=muse-spark-1.3-contributor`, key from Meta Model API.
3. Run `uv run uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8001` (use `8001` if another app already owns `8000`).
4. In `hotel-booking-backend/.env`, set `AGENT_SERVICE_URL=http://127.0.0.1:8001` and the same `AGENT_SERVICE_TOKEN`, alongside the existing backend settings. Start the backend with `npm run dev`.
5. The backend requires MongoDB Atlas or a replica set because reservation creation, trip updates and counters commit in a transaction. Standalone MongoDB cannot complete trip confirmation. Use Stripe test keys while testing.
6. In `hotel-booking-frontend/.env.local`, set `VITE_API_BASE_URL=http://localhost:5001` and `VITE_STRIPE_PUB_KEY` to the matching Stripe publishable key. Run `npm run dev` and visit `http://localhost:5174/plan-trip`.

No model key is committed or inferred. `/health` reports whether a model key is present; it does not verify that the key works. Missing credentials produce explicit errors, never a fabricated plan. Both the agent and Express need their own deployment; deploying the React frontend alone does not enable planning.

## User flow

Describe a trip → answer missing-detail questions → inspect the complete day-by-day proposal → request edits/remove items → review the terms and approve that revision → explicitly pay for each hotel stay → the backend creates the reservation and updates My Bookings.

Drafts and conversations belong to the signed-in account and resume from `?trip=...` or saved journeys. Account-scoped frontend caches and backend ownership checks prevent cross-account access. Approvals append an audit entry containing actor, timestamp, revision, item IDs, currency and total. Editing invalidates approval.

Hotel quotes use server-side property pricing in GBP and expire after 15 minutes. After checkout begins, initiated payments retain the originally approved price and revision. Refreshing the remaining unpaid items issues a new revision and requires approval again. Existing reservation/payment data is preserved with version-checked writes.

For an uncertain response, retry checkout to retrieve the same Stripe intent. After a successful charge with an interrupted confirmation, use **Recover reservation**. Confirmation is transactional and repeated calls do not create duplicate reservations. Do not create another payment to recover a successful one. Definite pre-creation Stripe errors unlock approval; ambiguous network/provider errors retain the same idempotency key. Persistent provider failures require resolving the provider issue before retrying; never replace an uncertain payment blindly.

Cancelled/refunded/deleted bookings are reconciled into the trip status on reads. Cancellation still uses the existing My Bookings flow; the agent never autonomously cancels other stays after a partial failure.

## Current capabilities and limits

- Agent tools: current date, search supplied hotel inventory, and prepare a human clarification. Structured output is validated in Python and repriced/validated again in Express.
- Hotel booking: integrated with the site's existing Booking collection and Stripe, with separate payment confirmation for each stay. The site has no room-level inventory feed, so quotes represent property listings, not an external availability guarantee.
- Flights, rail, transfers and activities: planning suggestions only. The UI labels these **Arrange separately / Not booked** and excludes them from the bookable total. They require supplier adapters and commercial credentials before real reservations are possible.
- The inventory snapshot is limited to 150 active properties ordered by nightly price, and each tool search returns up to 12 matches. Large catalogs need a scoped search service rather than a snapshot.
- Planning has an 80-second service timeout, 8 model request limit, 16 tool-call limit and 24,000-token run budget. Conversations allow 40 messages, user input 4,000 characters, and stays 1–30 nights.
- No production model, Stripe payment, live supplier booking, or deployment was exercised during implementation. Python uses a PydanticAI TestModel; HTTP tests use a disposable replica set and simulated Stripe responses; UI tests intercept API calls.

## Tests

From the repository root:

```sh
npm run build --prefix hotel-booking-backend
npm run test:trips --prefix hotel-booking-backend
npm run build --prefix hotel-booking-frontend
npm run lint --prefix hotel-booking-frontend
cd itinerary-agent && uv run pytest -q
```

With the frontend running, from `e2e-tests`:

```sh
npm ci
npx playwright install chromium
npx playwright test --config itinerary.config.ts
```

The backend test runner downloads MongoDB on first use and launches an isolated local replica set. It never uses application database credentials. UI tests cover desktop and phone layouts, guest prompts, approval, revision invalidation, removal, resume and errors. They do not enter real card data.

## API

Authenticated Express endpoints:

- `GET /api/trips` — own recent trips.
- `POST /api/trips` with `message` — plan a new trip.
- `GET /api/trips/:id` — resume and reconcile reservation statuses.
- `POST /api/trips/:id/messages` with `revision`, `message` — revise a draft.
- `POST /api/trips/:id/remove` with `revision`, `itemId` — remove an item before checkout.
- `POST /api/trips/:id/refresh` with `revision` — reprice remaining unpaid items and invalidate approval.
- `POST /api/trips/:id/approve` with `revision`, `approvedTotal` (pence) — record human approval.
- `POST /api/trips/:id/checkout` with `revision`, `itemId` — recover/create an idempotent payment for a quoted stay.
- `POST /api/trips/:id/confirm` with `revision`, `itemId` — verify persisted payment and finalize the reservation.

Private agent endpoint: `POST /itinerary/plan` with a Bearer service token. Keep this service on the internal deployment network; do not expose provider keys to the browser. The model has no tools that mutate bookings or payments.
