# Project Structure

## Why This Refactor Exists

YAMU is a MERN car rental system shared across six assignment components. The project was refactored into module-based backend folders and feature-based frontend folders so each member can work in a clear ownership area without changing existing routes or behavior.

This refactor only moves files, updates imports, adds thin placeholders for future modules, and documents where new work should go.

## Backend Structure

Backend code lives in `server/src`.

- `app.js` creates the Express app, applies middleware, mounts routes, serves uploads, exposes `/api/health`, and attaches the error handler.
- `config/` contains infrastructure setup such as MongoDB connection code.
- `middleware/` contains shared Express middleware.
- `utils/` contains shared helpers used across modules.
- `modules/` contains business areas. Each active module owns its models, controllers, routes, services, and validation files.
- `seed/` contains database seed scripts using the moved module models.
- `uploads/` is the runtime upload directory served at `/uploads`.

Current preserved API mounts:

- `/api/auth`
- `/api/users`
- `/api/admin`
- `/api/vehicles`
- `/api/driver-ads`
- `/api/bookings`

Future modules are mounted with health routes only:

- `/api/payments/health`
- `/api/reviews/health`
- `/api/maintenance/health`
- `/api/promotions/health`

## Frontend Structure

Frontend code lives in `client/src`.

- `routes/` owns route composition and keeps URL paths stable.
- `api/` owns the shared Axios client, API config, and endpoint constants.
- `context/` contains app-level React context.
- `components/layout/` contains shell layout components such as `Layout`, `Sidebar`, `Footer`, and `BrandLogo`.
- `components/common/`, `forms/`, `cards/`, and `tables/` are shared UI component areas.
- `features/` groups pages and feature API files by business area.
- `hooks/`, `utils/`, `assets/`, and `styles/` hold shared frontend utilities, assets, and CSS.

## Assignment Component Mapping

1. User / Role / Profile Management
   - Backend: `server/src/modules/auth`, `server/src/modules/users`, `server/src/modules/admin`
   - Frontend: `client/src/features/auth`, `client/src/features/users`, `client/src/features/admin`

2. Reservation / Booking Management
   - Backend: `server/src/modules/reservations`
   - Frontend: `client/src/features/reservations`

3. Reviews, Complaints & Dispute Management
   - Backend: `server/src/modules/reviews`
   - Frontend: `client/src/features/reviews`

4. Payment & Transaction Management
   - Backend: `server/src/modules/payments`
   - Frontend: `client/src/features/payments`

5. Vehicle Maintenance & Inventory Management
   - Backend: `server/src/modules/maintenance`
   - Frontend: `client/src/features/maintenance`

6. Campaigns, Promotions & Dynamic Pricing Management
   - Backend: `server/src/modules/promotions`
   - Frontend: `client/src/features/promotions`

Supporting vehicle and driver catalog work lives in:

- Backend: `server/src/modules/vehicles`, `server/src/modules/drivers`
- Frontend: `client/src/features/vehicles`, `client/src/features/drivers`

## Future Development Rules

- Keep existing API and frontend URL paths stable unless the team agrees to a migration.
- Put new backend behavior inside the owning `server/src/modules/<module>` folder.
- Put new frontend pages and components inside the owning `client/src/features/<feature>` folder.
- Keep shared helpers in `utils/` only when more than one module needs them.
- Keep request validation in `*.validation.js` files and reusable business operations in `*.service.js` files.
- Do not place new pages in `client/src/pages`; use feature folders instead.
- Do not place new backend controllers, routes, or models in root-level `server` folders; use `server/src/modules`.
- Add tests or build checks when changing shared middleware, authentication, routing, or cross-module helpers.
