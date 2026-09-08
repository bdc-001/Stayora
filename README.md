# Stayora

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-TypeScript-black)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF)](https://vitejs.dev/)
[![Stripe](https://img.shields.io/badge/Stripe-INR-635BFF)](https://stripe.com/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000)](https://vercel.com/)

**Stayora** — stays across India & the subcontinent.

A MERN hotel booking monorepo with **INR (₹)** pricing, India-focused inventory, optional Google OAuth, Stripe PaymentIntents, Cloudinary images, a Business Insights dashboard, and a **human-approved itinerary agent** (Plan Trip).

| | |
| --- | --- |
| **Repo** | [github.com/bdc-001/Stayora](https://github.com/bdc-001/Stayora) |
| **Frontend** | Vite React SPA → **Vercel** (root `vercel.json`) |
| **Backend** | Express API → your host (e.g. Coolify / VPS) |
| **Agent** | FastAPI itinerary service (`itinerary-agent/`, port **8001**) |
| **Ports (local)** | API `5001` · SPA `5174` · Agent `8001` |

> Security: report vulnerabilities privately — see [SECURITY.md](./SECURITY.md).

---

## Features

### Guests
- Browse India & neighbour destinations; search by city, dates, guests, price, stars, facilities
- Register / sign in (email + password or Google)
- Book stays with **Stripe in INR** (amounts in **paise** = ₹ × 100)
- **My Bookings** and cancellations with refunds when paid
- **Plan Trip** — chat with the itinerary agent, review a proposal, approve, then pay bookable hotels on-platform

### Owners & admin
- Add / edit hotels (Cloudinary images)
- My Hotels + booking logs
- Admin area and **Business Insights** (Recharts)

### Platform
- JWT Bearer auth (`localStorage.session_id`)
- Swagger UI (`/api-docs`), health (`/api/health`)
- Helmet, rate limits, CORS (incl. `*.vercel.app`)

---

## Architecture

```text
Browser (Stayora SPA :5174 / Vercel)
        │  HTTPS JSON + JWT Bearer
        ▼
Express API (:5001)
        ├── MongoDB (replica set recommended for trips)
        ├── Stripe (currency: inr)
        ├── Cloudinary
        ├── Google OAuth (optional)
        └── Itinerary agent (:8001)  ← LLM keys live here / on API host only
```

- Bookable hotels come from **Mongo inventory** + Stripe.
- Flights/activities in Plan Trip are **market references** (arrange separately), not tickets.

Deeper notes: [`docs/PROJECT_WALKTHROUGH.md`](./docs/PROJECT_WALKTHROUGH.md) · [`docs/ITINERARY_AGENT_SPEC.md`](./docs/ITINERARY_AGENT_SPEC.md)

---

## Monorepo layout

```text
Stayora/
├── hotel-booking-backend/      # Express + Mongoose + Stripe
│   ├── src/routes/             # auth, hotels, bookings, trips, …
│   ├── src/services/           # trip-planner, travel-market, trip-policy
│   └── .env.example
├── hotel-booking-frontend/     # Vite React + Tailwind + Figtree
│   ├── src/pages/PlanTrip.tsx
│   ├── src/lib/brand.ts        # Stayora name / tagline
│   ├── src/lib/currency.ts     # formatMoney → INR (en-IN)
│   ├── .env.vercel.example     # Vercel dashboard vars
│   └── vercel.json
├── itinerary-agent/            # FastAPI + PydanticAI travel planner
│   ├── app/agents/itinerary.py
│   └── .env.example
├── shared/                     # types.ts, itinerary.ts
├── e2e-tests/                  # Playwright
├── vercel.json                 # monorepo Vercel build (frontend)
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** (local Docker replica set for trips, or Atlas)
- **Stripe** test keys (INR-capable account)
- **Cloudinary** account
- (Optional) Google OAuth client
- (Optional) LLM API key for Plan Trip / listing assist — **server-side only**, never on Vercel
- (Optional) [uv](https://github.com/astral-sh/uv) for the itinerary agent

---

## Environment variables

Never commit real `.env` files. Copy the examples below.

### Backend — `hotel-booking-backend/.env`

```bash
cd hotel-booking-backend && cp .env.example .env
```

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `MONGODB_CONNECTION_STRING` | Yes | Mongo URI (replica set for trip transactions) |
| `JWT_SECRET_KEY` | Yes | Sign JWTs (`openssl rand -base64 64`) |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Yes | Hotel images |
| `STRIPE_API_KEY` | Yes | Secret key `sk_test_…` / `sk_live_…` (INR) |
| `PORT` | — | Default `5001` |
| `FRONTEND_URL` | Recommended | CORS + OAuth — local `http://localhost:5174`, prod = your Vercel URL |
| `BACKEND_URL` | Prod OAuth | Public API origin |
| `GOOGLE_ID` / `GOOGLE_SECRET` | Optional | Google sign-in |
| `AGENT_SERVICE_URL` | Plan Trip | e.g. `http://127.0.0.1:8001` |
| `AGENT_SERVICE_TOKEN` | Plan Trip | Shared secret (≥32 chars) with the agent |
| `AI_ASSIST_ENABLED` | Optional | Listing description assist |
| `OPENAI_API_KEY` | Optional | LLM for assist / agent proxy |
| `OPENAI_BASE_URL` | Optional | e.g. `https://api.meta.ai/v1` |
| `OPENAI_MODEL` | Optional | e.g. `muse-spark-1.3-contributor` |

### Itinerary agent — `itinerary-agent/.env`

```bash
cd itinerary-agent && cp .env.example .env
```

| Variable | Purpose |
| -------- | ------- |
| `OPENAI_API_KEY` or `MODEL_API_KEY` | LLM key (**not** for Vercel) |
| `OPENAI_BASE_URL` | Model API base URL |
| `AGENT_MODEL` | Model id |
| `AGENT_SERVICE_TOKEN` | Must match backend |

### Frontend (local) — `hotel-booking-frontend/.env.local`

```bash
cd hotel-booking-frontend && cp .env.local.example .env.local
```

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_BASE_URL` | `http://localhost:5001` |
| `VITE_STRIPE_PUB_KEY` | Publishable `pk_test_…` |

### Frontend (Vercel)

See [`hotel-booking-frontend/.env.vercel.example`](./hotel-booking-frontend/.env.vercel.example).

| Variable | Value |
| -------- | ----- |
| `VITE_API_BASE_URL` | Public API origin, **no** trailing slash |
| `VITE_STRIPE_PUB_KEY` | Stripe publishable key |

Do **not** put `sk_…`, Mongo, JWT, Cloudinary secrets, or LLM keys on Vercel.

---

## Run locally

### 1. MongoDB (trips need a replica set)

Example with Docker:

```bash
docker run -d --name stayora-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
docker exec stayora-mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
```

Connection string example:

```text
mongodb://127.0.0.1:27017/stayora?replicaSet=rs0&directConnection=true
```

### 2. Backend

```bash
cd hotel-booking-backend
npm install
npm run seed    # India hotels + demo users (wipes demo collections)
npm run dev     # http://localhost:5001
```

Seed logins (password `12345678`):

| Email | Role |
| ----- | ---- |
| `test@user.com` | admin |
| `owner@hotel.com` | owner |
| `guest@user.com` | guest |

### 3. Itinerary agent (Plan Trip)

```bash
cd itinerary-agent
uv sync
uv run uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8001
```

### 4. Frontend

```bash
cd hotel-booking-frontend
npm install
npm run dev     # http://localhost:5174
```

### Verify builds

```bash
cd hotel-booking-backend && npm run build
cd hotel-booking-frontend && npm run build && npm run lint
```

---

## Key product flows

### Auth
1. `POST /api/auth/login` → JWT → `localStorage.session_id`
2. Axios sends `Authorization: Bearer …`
3. Optional Google OAuth via `/api/auth/google`

### Hotel booking (INR)
```text
Detail → /hotel/:id/booking
  → POST …/payment-intent   (amount in paise, currency: inr)
  → stripe.confirmCardPayment
  → POST …/bookings         (only if PaymentIntent succeeded)
```

Display uses `formatMoney` (`en-IN` / ₹). Nightly rates and booking totals are stored in **rupees**; Stripe uses **paise**.

### Plan Trip
1. Guest chats on `/plan-trip`
2. Express calls the itinerary agent with hotel inventory + India market context
3. Guest **approves** a revision
4. Checkout for bookable hotel line items via Stripe INR
5. Non-hotel items stay “arrange separately”

---

## API surface (summary)

| Prefix | Notes |
| ------ | ----- |
| `/api/auth` | Login, OAuth, validate-token, logout |
| `/api/users` | Register, `/me` |
| `/api/hotels` | Search, detail, payment-intent, book |
| `/api/my-hotels` | Owner CRUD + images |
| `/api/my-bookings` | Guest bookings |
| `/api/bookings` | Manage / cancel |
| `/api/trips` | Plan Trip create, message, approve, checkout |
| `/api/business-insights` | Dashboard / forecast |
| `/api/health` | Liveness (detailed requires JWT) |
| `/api-docs` | Swagger UI |

---

## Testing (Playwright)

```bash
# Backend + frontend running
cd e2e-tests && npm install && npx playwright test
```

Includes auth, search, manage-hotels, and itinerary specs.

---

## Deployment

### Frontend — Vercel

1. Import [bdc-001/Stayora](https://github.com/bdc-001/Stayora)
2. Use **repo root** (root `vercel.json` builds `hotel-booking-frontend/`), **or** set Root Directory to `hotel-booking-frontend`
3. Set env: `VITE_API_BASE_URL`, `VITE_STRIPE_PUB_KEY`
4. Deploy; then set backend `FRONTEND_URL` to the Vercel URL

### Backend — Coolify / VPS / Docker

1. Build from **repo root** so `shared/` is included (`hotel-booking-backend/Dockerfile`)
2. Configure all backend env vars (see `.env.example`)
3. Health check: `GET /api/health`
4. Host the itinerary agent separately if Plan Trip is enabled; set `AGENT_SERVICE_URL` + matching token

### Production checklist

- [ ] No secrets in git or Vercel `VITE_*` beyond publishable Stripe + API URL
- [ ] `FRONTEND_URL` matches the live SPA
- [ ] Stripe test/live keys match; account supports **INR**
- [ ] Google OAuth redirect = `{BACKEND_URL}/api/auth/callback/google`
- [ ] Mongo replica set if using trips transactions

---

## Brand & UI

- Product name / tagline: `hotel-booking-frontend/src/lib/brand.ts`
- Typography: self-hosted **Figtree**
- Currency helpers: `hotel-booking-frontend/src/lib/currency.ts`

---

## Related docs

| Doc | Topic |
| --- | ----- |
| [docs/PROJECT_WALKTHROUGH.md](./docs/PROJECT_WALKTHROUGH.md) | Architecture walkthrough |
| [docs/ITINERARY_AGENT_SPEC.md](./docs/ITINERARY_AGENT_SPEC.md) | Plan Trip / agent |
| [itinerary-agent/README.md](./itinerary-agent/README.md) | Agent setup |
| [SECURITY.md](./SECURITY.md) | Vulnerability reporting |
| [AGENTS.md](./AGENTS.md) | Agent / Agile V notes |

---

## License

[MIT](https://opensource.org/licenses/MIT)

---

## Happy coding

Fork, run locally, book a Goa weekend in ₹, then try **Plan Trip**. Issues and PRs welcome on [Stayora](https://github.com/bdc-001/Stayora).
