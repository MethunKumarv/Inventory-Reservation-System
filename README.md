# Inventory Reservation System

An inventory reservation system for ecommerce checkout flows. Stock is reserved temporarily during checkout, then either confirmed on successful payment or released on cancel or expiry.

## Overview

This project is built for submission as a production-style Next.js + Prisma application. It uses PostgreSQL for real inventory storage and implements transaction-safe reservation logic so concurrent users cannot oversell the same item.

### Core behavior

- Reserve stock for a short TTL window.
- Confirm a reservation to permanently deduct inventory.
- Release or expire a reservation to return the reserved stock.
- Keep stock accounting correct under concurrent requests.

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Prisma ORM 7
- PostgreSQL
- Tailwind CSS
- shadcn/ui-style components
- Zod validation

## Setup

Install dependencies:

```bash
npm install
```

Create your local environment file:

```bash
copy .env.example .env.local
```

Set your PostgreSQL connection string in `.env.local`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
```

Optional local debug flag for reservation logging:

```bash
RESERVATION_DEBUG="false"
```

This project uses a single `DATABASE_URL`. There is no separate shadow database configuration.

## Prisma Commands

Generate Prisma client:

```bash
npm run prisma:generate
```

Validate the schema:

```bash
npm run prisma:validate
```

Apply development migrations:

```bash
npm exec prisma migrate dev --name init
```

Apply deployed migrations against the real database:

```bash
npm run prisma:deploy
```

Seed demo data:

```bash
npm run prisma:seed
```

The seed script creates 6 products, 3 warehouses, and realistic inventory quantities.

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string used by Prisma and the app.
- `RESERVATION_DEBUG` - optional local flag to enable reservation service logs when set to `"true"`.

The example file [`.env.example`](.env.example) is included for local setup.

## Project Structure

- [app](app)
- [components](components)
- [lib](lib)
- [prisma](prisma)
- [schemas](schemas)

## API Routes

- `GET /api/products` - product list with warehouse stock.
- `GET /api/warehouses` - warehouse list.
- `GET /api/reservations` - reservation list.
- `GET /api/reservations/[id]` - single reservation fetch with lazy expiration.
- `POST /api/reservations` - create reservation.
- `POST /api/reservations/[id]/confirm` - confirm reservation.
- `POST /api/reservations/[id]/release` - release reservation.
- `POST /api/cron/release-expired` - release expired reservations.

## Concurrency Safety

Reservation creation is concurrency-safe because the service locks the inventory row inside a PostgreSQL transaction before calculating availability.

### Why `SELECT ... FOR UPDATE` is used

`SELECT ... FOR UPDATE` acquires a row-level lock on the inventory row being reserved. That means two overlapping requests for the same product and warehouse cannot both read and modify the row at the same time.

If two users request the last available unit concurrently:

1. The first transaction locks the inventory row.
2. The second transaction waits.
3. The first transaction increments `reservedQuantity` and commits.
4. The second transaction resumes, re-reads the row inside its own transaction, and sees no stock remaining.
5. The second request fails with `409 Conflict`.

This prevents overselling without relying on frontend validation.

### Transaction Boundaries

Each reservation operation is fully transactional:

- Reserve: read locked inventory, check availability, increment `reservedQuantity`, create `PENDING` reservation.
- Confirm: lock reservation, lock inventory, decrement `reservedQuantity`, decrement `totalQuantity`, mark `CONFIRMED`.
- Release: lock reservation, lock inventory, decrement `reservedQuantity`, mark `RELEASED`.

These updates happen in one transaction so partial inventory changes cannot leak through.

## Expiry Cleanup

Expired reservations are handled in two ways:

- Lazy checks during reservation fetch, confirmation, and release.
- A cron-compatible cleanup endpoint at `POST /api/cron/release-expired`.

The cleanup endpoint finds expired `PENDING` reservations, releases inventory transactionally, and marks reservations as `RELEASED`. This keeps stock accurate even if no user revisits the reservation page.

## UI Summary

- Responsive product listing and reservation pages.
- Loading skeletons for route transitions and product fetching.
- Inline alerts for API errors and success states.
- Countdown timer for reservation expiry.
- Clear disabled button states during requests.
- Warehouse dropdown keeps out-of-stock warehouses visible but non-selectable, and lists them after in-stock warehouses.
- Reservation page shows both `Available` and `Reserved` stock values side by side, with a small legend for first-time users.
- Reservation details highlights the selected warehouse name so users clearly see where confirmation applies.
- Reservation details includes one-click copy-to-clipboard icons for Reservation, Product, and Warehouse IDs.
- Home page hydrates product cards from server-fetched data to avoid a duplicate initial client-side fetch.
- Product cards and stock badges are memoized to reduce unnecessary re-renders while sorting and interacting.
- Full-screen transition loaders appear during home-to-reservation and reservation-to-home navigation for immediate feedback.
- Product sorting precomputes stock totals so sort comparisons do less repeated work.
- Hover-heavy effects are tuned down and applied only on hover-capable devices to improve responsiveness on low-end/touch devices.
- Responsive breakpoints are adjusted so tablet and mobile layouts stack more naturally instead of jumping to dense multi-column arrangements too early.
- Desktop hover feedback is restored on product cards and the three home stat boxes.
- Warehouse selection and quantity input now share the same cyan-tinted hover surface for a consistent form feel.
- Touch screens do not have true hover, so the controls now also show the same cyan state on tap/active for better mobile feedback.
- Warehouse names in the dropdown now wrap instead of truncating, and the dropdown panel can expand wider so long names stay readable.
- Opening a warehouse dropdown now automatically closes any other open dropdown so only one stays open at a time.
- The warehouse dropdown now stays constrained to its card/trigger width instead of overflowing the product card.
- The active dropdown root is raised above neighboring cards so the menu is not hidden behind the next product card.

## UI Performance Notes

- The transition loader is lightweight (single overlay + spinner) and only shown during navigation. It should not reduce steady-state page speed.
- The loader overlay avoids blur-heavy effects to reduce GPU cost during transitions.
- Different devices still use different breakpoints, so the interface adapts to screen size rather than looking identical everywhere. The goal is a consistent structure and workflow, not pixel-for-pixel sameness.
- Hover effects are intentionally stronger on desktop and lighter on touch devices so the UI stays responsive without losing interactive feedback.

## DevTools Profiling (Quick Steps)

1. Open Chrome DevTools `Performance` tab.
2. Enable screenshots and web vitals.
3. Start recording, then perform: sort products, reserve item, navigate to reservation, return home.
4. Stop recording and inspect:
	- Long tasks above 50ms.
	- Recalculate Style / Layout spikes during hover-heavy interactions.
	- Paint/Composite bursts during transitions.
5. Use React DevTools `Profiler` to capture `ProductListClient` interactions and verify minimal re-renders for unaffected product cards.

## Error Semantics

API responses use JSON in the form:

```json
{ "error": "message" }
```

Status codes:

- `400` invalid input.
- `404` missing reservation or inventory record.
- `409` insufficient stock or other concurrency conflict.
- `410` expired reservation.
- `500` unexpected failure.

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Add `DATABASE_URL` in Project Settings.
3. Keep the default build command: `npm run build`.
4. Allow the `postinstall` script to run Prisma generate automatically.
5. Run `npm run prisma:deploy` during deployment or in a migration step before traffic is switched on.
6. Configure Vercel Cron or another scheduler to call `POST /api/cron/release-expired`.

### PostgreSQL Provider

Use a real PostgreSQL provider such as Neon. The app expects a live database and does not use mock storage.

## Verification Checklist

- [x] Reservation concurrency safety implemented.
- [x] `409` handling for insufficient stock.
- [x] `410` handling for expired reservations.
- [x] Expiration cleanup endpoint implemented.
- [x] Stock updates remain transactionally consistent.
- [x] Prisma transactions are used for all reservation state changes.

## Tradeoffs and Future Improvements

- Add idempotency keys for repeated reservation submissions.
- Add authentication and per-user reservation ownership.
- Add admin views for inventory and reservation monitoring.
- Add metrics for expiry rate and confirmation rate.
- Add richer catalog filters once the core workflow is stable.
