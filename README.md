# ParkEase Nairobi

> Peer-to-peer parking marketplace for Nairobi — find, book, and pay for parking in seconds.

![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20PostgreSQL-green)
![Language](https://img.shields.io/badge/language-TypeScript-blue)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## What Is This?

ParkEase Nairobi connects **space owners** (driveways, compounds, church grounds, basements) with **commuters** who need parking across Nairobi. The platform takes a 15% commission on every booking. Payments are simulated via Mpesa.

**Live demo personas:**

| Name | Role | Description |
|---|---|---|
| James Kamau | Commuter | Books parking in CBD and Westlands |
| Grace Wanjiku | Commuter | Regular Kilimani commuter |
| David Omondi | Owner | Has 2 spots in Parklands and Karen |
| Faith Muthoni | Owner + Commuter | Owns 2 Westlands spots, also books |
| Patrick Njoroge | Owner | CBD basement + Upperhill compound |
| Amina Hassan | Owner | Kilimani plot + Hurlingham bay |

---

## Features

### For Commuters
- **Map-first search** — React Leaflet + OpenStreetMap, centered on Nairobi. Price bubble markers on real geography.
- **Surge pricing badges** — animated pulsing badge when a zone has a surge multiplier, with reason text (e.g. "Safaricom concert at Kasarani")
- **Live price breakdown** — booking form shows hourly rate × hours, 15% platform fee, and final total
- **Simulated Mpesa payment** — generates a random Mpesa transaction code, unlocks access instructions on confirmation
- **Access instructions** — revealed only after confirmed payment (gate codes, guard names, directions)
- **My Bookings** — tabbed view: Active / Completed / Cancelled, with one-click pay for pending bookings
- **Zone waitlists** — join a zone-level waitlist for a specific date/time window
- **Leave reviews** — star rating + comment after a completed booking

### For Owners
- **Dashboard** — total earnings, pending payouts, occupancy rate, earnings-by-month chart
- **Spot management** — create, edit, toggle active/inactive, delete listings
- **Booking management** — confirm or decline incoming booking requests
- **Payout history** — gross amount, 15% platform fee, net payout, Mpesa confirmation codes

### Platform
- **Surge events** — table-driven surge pricing per zone/date. Seeded with 3 events.
- **Two-sided ratings** — commuters rate spots, owners rate commuters
- **15% commission** — applied to all bookings, shown transparently in every price breakdown

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Language | TypeScript 5.9 |
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui |
| Map | react-leaflet + OpenStreetMap (no API key) |
| Fonts | Plus Jakarta Sans + Space Mono |
| Backend | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (v4) |
| API contract | OpenAPI 3.1 → Orval codegen → React Query hooks |
| Build | esbuild (CJS bundle) |

---

## Project Structure

```
parkease-nairobi/
├── artifacts/
│   ├── api-server/          # Express API — serves at /api (port 8080)
│   │   └── src/routes/      # analytics, bookings, health, payouts, reviews, spots, users, waitlist
│   └── nairobi-parking/     # React + Vite SPA — serves at /
│       └── src/
│           ├── pages/
│           │   ├── home.tsx                  # Hero + zone grid
│           │   ├── map-explorer.tsx          # Leaflet map with price markers
│           │   ├── spot-detail.tsx           # Spot info + booking form
│           │   ├── booking-confirmation.tsx  # Mpesa sim + access instructions
│           │   ├── my-bookings.tsx           # Commuter booking history
│           │   ├── waitlist.tsx              # Zone waitlist
│           │   ├── login.tsx                 # Demo persona picker
│           │   └── owner/
│           │       ├── dashboard.tsx         # Earnings + stats
│           │       ├── spots.tsx             # Spot listing + toggle/edit/delete
│           │       ├── new-spot.tsx          # Create spot form
│           │       ├── edit-spot.tsx         # Edit spot form
│           │       ├── bookings.tsx          # Incoming booking requests
│           │       └── payouts.tsx           # Payout history
│           ├── hooks/
│           │   └── use-current-user.ts       # localStorage-backed demo auth
│           └── components/layout/
│               └── main-layout.tsx           # Nav + layout shell
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 spec (openapi.yaml)
│   ├── api-client-react/    # Generated React Query hooks (via Orval)
│   ├── api-zod/             # Generated Zod validators (via Orval)
│   └── db/                  # Drizzle schema + migrations + seed
└── scripts/
    └── src/
        ├── seed.ts           # Database seeder
        └── push-to-github.sh # GitHub sync script
```

---

## Database Schema

```
users         — id, name, phone, email, role (commuter|owner|both), rating
spots         — id, owner_id, title, address, zone, lat, lng, price_per_hour,
                spot_type, amenities (hasCctv, hasRoofing, hasGate),
                available_from/to, available_days, access_instructions, is_active
bookings      — id, spot_id, commuter_id, owner_id, date, start_hour, end_hour,
                total_amount, platform_fee (15%), owner_earning, mpesa_code, status
reviews       — id, booking_id, reviewer_id, reviewee_id, spot_id, rating, comment
waitlist      — id, user_id, zone, date, start_hour, end_hour
payouts       — id, owner_id, booking_id, gross_amount, platform_fee, net_amount,
                mpesa_code, status (pending|paid)
surge_events  — id, zone, date, multiplier, reason, is_event_day
```

---

## API Reference

All routes are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| GET | `/healthz` | Health check |
| GET/POST | `/spots` | List all spots / Create a spot |
| GET/PUT/DELETE | `/spots/:id` | Get, update, or delete a spot |
| GET | `/spots/map` | Spots with surge data for map view |
| GET/POST | `/bookings` | List bookings (filtered by user) / Create booking |
| GET/PUT | `/bookings/:id` | Get booking / Update status + Mpesa code |
| GET/POST | `/reviews` | List reviews / Create review |
| GET/POST | `/waitlist` | List waitlist entries / Join waitlist |
| DELETE | `/waitlist/:id` | Leave waitlist |
| GET | `/payouts` | List payouts (filtered by owner) |
| GET | `/analytics/owner-dashboard` | Owner earnings + stats |
| GET | `/analytics/zones` | Zone summary with surge + availability |
| GET | `/analytics/surge` | Surge multiplier for zone+date |
| GET/POST | `/users` | List users / Create user |
| GET | `/users/:id` | Get user profile |

---

## Seeded Demo Data

| Entity | Count | Details |
|---|---|---|
| Users | 6 | 2 commuters, 3 owners, 1 owner+commuter |
| Spots | 8 | Westlands (×2), CBD, Kilimani, Upperhill, Hurlingham, Parklands, Karen |
| Bookings | 8 | Mix of completed, confirmed, pending, cancelled |
| Reviews | 5 | Star ratings + comments |
| Payouts | 5 | Mix of paid + pending |
| Surge events | 3 | Safaricom concert (×2.0), CBD public holiday (×1.8), Westlands weekday (×1.3) |

---

## Auth

Demo-only authentication. No JWT or sessions.

- Users pick a persona on `/login`
- `localStorage` stores `{ userId, role }` under key `parkease_user`
- `useCurrentUser()` hook reads it globally
- Owner pages redirect to login if no `owner` or `both` role
- API receives `x-user-id` header for user-specific queries

---

## Getting Started (Local Dev)

### Prerequisites
- Node.js 24+
- pnpm 10+
- PostgreSQL (or set `DATABASE_URL` to a cloud DB)

### Setup

```bash
# Install dependencies
pnpm install

# Push DB schema
pnpm --filter @workspace/db run push

# Seed demo data
pnpm --filter @workspace/db run seed

# Start API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start frontend (Vite, reads PORT env var)
pnpm --filter @workspace/nairobi-parking run dev
```

### Code Generation

If you change the OpenAPI spec (`lib/api-spec/openapi.yaml`), regenerate the client:

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Typechecking

```bash
pnpm run typecheck
```

---

## GitHub Sync

A push script is included at `scripts/src/push-to-github.sh`. It commits all staged changes and pushes to this repo:

```bash
bash scripts/src/push-to-github.sh "feat: add new feature"
```

Requires `GITHUB_PERSONAL_ACCESS_TOKEN` in environment.

---

## Design System

| Token | Value |
|---|---|
| Primary (Matatu Green) | `hsl(149 100% 33%)` — `#00A957` |
| Secondary (Amber) | `hsl(45 100% 50%)` |
| Background (Sand) | `hsl(45 30% 96%)` |
| Font (UI) | Plus Jakarta Sans |
| Font (Mono / brand) | Space Mono |

---

## Roadmap

- [ ] Real Mpesa Daraja API integration (STK Push)
- [ ] Photo uploads for spot listings (Cloudinary / S3)
- [ ] Real-time spot availability via WebSockets
- [ ] SMS notifications via Africa's Talking
- [ ] Owner verification (ID + KRA PIN)
- [ ] Google Maps integration for directions to spot
- [ ] Mobile app (React Native / Expo)
- [ ] Admin panel for dispute resolution + payouts

---

## License

MIT
