# ParkEase Nairobi

## Overview

ParkEase Nairobi is a full-stack peer-to-peer parking marketplace where space owners list spots (driveways, compounds, basements, church compounds, etc.) and commuters search via map, book, and pay via simulated Mpesa. The platform takes 15% commission.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind + shadcn/ui components
- **Map**: react-leaflet + OpenStreetMap (no API key needed)
- **Fonts**: Plus Jakarta Sans + Space Mono
- **Theme**: Matatu Green (#00A957) primary, Amber secondary, Sand background

## Project Structure

```
artifacts/
  api-server/          — Express API on port 8080, served at /api
  nairobi-parking/     — React + Vite frontend SPA at /
lib/
  api-spec/            — OpenAPI spec (openapi.yaml)
  api-client-react/    — Generated React Query hooks + Zod schemas (via Orval)
  db/                  — Drizzle ORM schema + migrations
  api-zod/             — Generated Zod validators from OpenAPI spec
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Features

- **Map-first search**: react-leaflet + OpenStreetMap centered on Nairobi (-1.2921, 36.8219). Price markers on map.
- **Surge pricing**: Dynamic multipliers based on surge_events table. Shown with pulsing badge + explanation.
- **Simulated Mpesa**: Booking confirmation page simulates payment with random Mpesa code. Access instructions revealed only after confirmed payment.
- **Two-sided ratings**: Commuters rate spots; owners rate commuters. Stars visible on profiles and spot cards.
- **Waitlist**: Commuters join zone-level waitlists. Shown when zone has zero available spots or active surge.
- **Owner payout dashboard**: Earnings breakdown with 15% platform fee deducted. Payout history with Mpesa codes.
- **Demo auth**: No real auth — localStorage key `parkease_user` stores `{ userId, role }`. 6 demo personas on login page.

## Database Tables

- `users` — name, phone, email, role (commuter/owner/both), rating
- `spots` — owner_id, title, address, zone, lat/lng, price_per_hour, amenities, access_instructions
- `bookings` — spot_id, commuter_id, owner_id, date, hours, total_amount, platform_fee, owner_earning, mpesa_code, status
- `reviews` — booking_id, reviewer_id, reviewee_id, spot_id, rating, comment
- `waitlist` — user_id, zone, date, start_hour, end_hour
- `payouts` — owner_id, booking_id, gross_amount, platform_fee, net_amount, mpesa_code, status
- `surge_events` — zone, date, multiplier, reason, is_event_day

## Demo Data

Seeded with:
- 6 users (James Kamau, Grace Wanjiku, David Omondi, Faith Muthoni, Patrick Njoroge, Amina Hassan)
- 8 spots across Westlands, CBD, Upperhill, Kilimani, Hurlingham, Parklands, Karen
- 8 bookings (mix of completed, confirmed, pending, cancelled)
- 5 reviews with ratings
- 5 payouts (mix of paid and pending)
- 3 surge events (Safaricom concert at Kasarani, CBD public holiday, Westlands weekday surge)

## Auth Flow

- Users select a demo persona on `/login`
- `localStorage.setItem('parkease_user', JSON.stringify({ userId, role }))` 
- `useCurrentUser` hook reads this and provides `userId`, `role`, `login`, `logout`
- Owner pages check role and redirect to login if not owner/both
- API uses `x-user-id` header passed by the frontend for user-specific queries

## API Routes

All routes served under `/api`:
- `GET/POST /spots` — list/create spots
- `GET/PUT/DELETE /spots/:id` — spot CRUD
- `GET /spots/map` — spots with surge multiplier for map view
- `GET/POST /bookings` — list/create bookings
- `GET/PUT /bookings/:id` — booking detail + status update (Mpesa)
- `GET/POST /reviews` — reviews
- `GET/POST /waitlist`, `DELETE /waitlist/:id` — waitlist management
- `GET /payouts` — payout history
- `GET /analytics/owner-dashboard` — owner stats + revenue chart
- `GET /analytics/zones` — zone summary with surge + availability
- `GET /analytics/surge` — surge multiplier for a zone+date

## Platform Fee

15% on all bookings. Shown in:
- Spot detail booking form breakdown
- Booking confirmation page
- Payout dashboard (gross vs net)
