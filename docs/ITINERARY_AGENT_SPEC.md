# Itinerary booking assistant — REQ-0055

Status: Gate 1 approved in chat on 2026-09-09; implementation and automated verification recorded in itinerary-agent/README.md.

## User experience

Add a “Plan my trip” entry to desktop/mobile navigation and a homepage entry card. The `/plan-trip` page uses Stayora typography, colors, existing layout, and accessible controls. Desktop shows a conversation beside an itinerary; mobile stacks them.

The user describes destinations, travel dates, origin, party size, budget, and preferences in natural language. The assistant asks for missing details and prepares a day-by-day trip. Each itinerary item shows its date, destination, supplier, price/currency, cancellation terms when available, and booking status. Distinguish estimates from bookable supplier quotes.

Users can request changes, remove items, and review the updated total. “Approve itinerary” accepts a specific revision. “Review and book” presents the current supplier quotes and explicit payment confirmation. Any change in dates, items, terms, or prices invalidates the previous approval and requires another review. Show individual confirmations and unresolved items if only part of a trip succeeds.

## Integration

Use https://github.com/vstorm-co/full-stack-ai-agent-template as the generator for a separate FastAPI agent service with its supported PydanticAI framework. Record the exact generator version/commit and preserve applicable license attribution during implementation. Retain the existing React/Vite UI and Express/Mongoose booking system; expose the agent through authenticated Express routes. Do not generate a replacement website or a separate user login system.

The agent produces validated structured trip proposals and invokes narrowly scoped search tools. Express owns authorization, persisted trip revisions, approval records, supplier quotes, and booking execution. The model cannot directly charge a card or mark a reservation confirmed. Server-to-server access uses a service credential; browser clients never receive provider keys.

Persist trips, conversation messages, itinerary items, quote expiry, approval revision, execution attempts, and per-item confirmation references. Authenticate every trip operation and enforce trip ownership. Resume existing drafts after reload. Bound prompt size, trip duration, tool calls, request timeouts, and generation cost.

## Booking coverage

Existing implementation supports hotel bookings and Stripe in GBP. Reuse that integration after validating server-calculated amounts, dates, guest capacity, property status, and payment ownership. Audit and harden duplicate-payment and duplicate-booking handling before agent execution uses it.

Flights, rail, transfers, and activities require supplier search/quote/book/status/cancel adapters and credentials. Implement explicit adapter contracts and capability reporting. Unconnected suppliers must display “Booking unavailable”; proposed activities can still appear as unbooked suggestions. Never fabricate availability, prices, or confirmation numbers. If all items cannot be booked, the UI must state that the trip is only partially bookable.

Before executing any item, verify the current approved revision and unexpired quote. Use persistent idempotency keys and atomic execution claims. Reconcile uncertain payment or supplier responses before retrying. Do not automatically cancel successful reservations on partial failure; show the user cancellation options and any applicable terms.

## States and approval boundaries

Trip states: collecting details → planning → awaiting review → approved → awaiting payment → booking → completed / partially completed / failed. Draft edits return to awaiting review. Cancellation is a separate explicit user action. Persist approval actor, timestamp, revision, item scope, currency, and total.

Disabled or failed AI services return an actionable error and allow retry. A development fixture mode may support local UI testing, but must be visibly labeled and unable to execute real payments or bookings.

## Acceptance evidence

- Build the Express backend and React frontend; run frontend lint.
- Verify trip ownership isolation and unauthenticated rejection.
- Test missing details, invalid dates/budgets, empty inventory, provider failures, and expired quotes.
- Test that unapproved or stale revisions cannot book; changed prices require renewed approval.
- Test concurrent clicks, retries, partial success, and payment/supplier reconciliation without duplicate reservations.
- Exercise the responsive UI with Playwright: trip input, follow-up, proposal, edits, approval, checkout, progress, reload, and errors.
- Verify unavailable supplier categories remain explicitly unbooked and cannot produce a completed-trip claim.
- Document service startup, required environment variable names, provider setup, template provenance, and actual live versus fixture verification.

## Gate decision requested

Approve the existing baseline Gate 1 (`INT-0001`, resume token `c1-gate1-baseline-blueprint`) and REQ-0055 with this integration scope. Supplier credentials and provider choices can be configured during implementation; their absence prevents live reservations for those categories, not the UI and adapter implementation.
