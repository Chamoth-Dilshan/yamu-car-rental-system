# YAMU Reservation and Booking Management

This repo now covers the `Reservation / Booking Management` component for the wider YAMU car rental system.

## Scope

The project includes:

- JWT authentication and role switching
- user, driver, staff, and admin profile management
- vehicle catalog and vehicle detail booking flow
- customer booking history with payment and cancellation actions
- public driver advertisement listing and driver detail request flow
- driver-side advertisement management and booking request handling
- admin booking management with filtering and status controls

## Structure

- `server/` Express + MongoDB API with Mongoose models
- `client/` React + Vite frontend
- `scripts/run-service.cjs` root helper to run shared build and lint commands

## Run

### 1. Server

```bash
cd server
npm install
copy .env.example .env
npm run seed
npm run dev
```

### 2. Client

```bash
cd client
npm install
npm run dev
```

### 3. Optional root commands

```bash
npm install
npm run build
npm run lint
```

## Default Ports

- API: `http://localhost:5001`
- Client: `http://localhost:5174`

## Main Routes

- `/cars` vehicle listing
- `/cars/:id` vehicle details and booking
- `/drivers` public driver advertisement listing
- `/drivers/:id` driver profile and request form
- `/bookings` customer booking dashboard
- `/driver/ads` driver advertisement workspace
- `/driver/bookings` driver booking request dashboard
- `/admin/bookings` admin booking management

## Seeded Accounts

After `npm run seed` in `server/`:

- Admin: `admin@example.com` / `12345`
- Customer with vehicle bookings: `alex@example.com` / `12345`
- Driver workspace demo: `nadeesha@example.com` / `12345`
- Customer with driver requests: `deshan@example.com` / `12345`
- Pending driver applicant: `kasun@example.com` / `12345`

## Environment

Create `server/.env` from `server/.env.example` and provide a valid MongoDB connection string plus JWT secret.

