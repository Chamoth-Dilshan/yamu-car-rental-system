# User Profile and Role Management

Standalone extraction of the `User profile and role management` component from the main YAMU project.

## Scope

This mini-project contains only:

- user registration and login
- JWT-based authentication
- user profile management
- driver/staff profile fields
- active role switching for assigned roles
- admin user and role management

## Structure

- `server/` Express + MongoDB API
- `client/` React + Vite UI

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

## Default Ports

- API: `http://localhost:5001`
- Client: `http://localhost:5174`

## Seeded Accounts

After `npm run seed` in `server/`:

- Admin: `admin@example.com` / `12345`
- Multi-role user: `alex@example.com` / `12345`
- Staff user: `staff@example.com` / `12345`

## Environment

Create `server/.env` from `server/.env.example`.

