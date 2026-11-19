# Lyxa Events Admin

Web admin panel for [Lyxa Events](https://github.com/mbonyeemma/events-app): organisers create events, issue tickets and manage the ticket checkers who scan them. It talks to the same API as the mobile app ([events-app-be](https://github.com/mbonyeemma/events-app-be)), using its `/admin` endpoints.

Stack (same as the sendcash admin): Vite, React 18, TypeScript, Tailwind CSS, TanStack Query, React Router, lucide-react, sonner.

## What it does

- **Sign in:** phone number and password. Only `admin` accounts get in; ticket checkers are told to use the app.
- **Dashboard:**
  - upcoming events, tickets issued and checked in, active ticket checkers
  - today's scans (admitted / rejected)
  - the next events with live progress, and the latest scans across events
- **Events:**
  - list with Upcoming / Past / All and search
  - create an event with a banner, type, venue and address, start and end, total tickets (optionally fixed for good), gates and an optional event code
- **Event page:** check-in progress overall and per tier, and these tabs:
  - **Tickets:**
    - search, filter (not in / checked in / void), export to CSV
    - issue tickets for one holder (with quantity), or many by pasting or uploading CSV
    - each ticket opens with its QR code (download PNG), editable holder details, void, and undo check-in
  - **Ticket checkers:**
    - assign several at once, optionally to a gate
    - change someone's gate inline, or remove them
  - **Gates:** add, rename, remove (checkers posted at a removed gate can pick any gate).
  - **Scan log:** every scan with gate, checker and result; filter by result; refreshes live while the event runs.
  - **Settings:**
    - edit the event details (banner, type, location, times, total tickets)
    - **ticket types**: e.g. Ordinary, VIP 1, VIP 2, Table, each with price (type 200k), quantity, notes and colour; turn off or delete unused ones
    - **ticket design**: colour and ticket image, with a live preview per type; "Ticket" in a ticket's panel downloads the designed ticket with its QR code
    - show, regenerate or set the event code
    - activate or deactivate
    - delete (only while the event has no tickets)
- **Ticket checkers (team):**
  - create accounts (a password is generated and shown once to share), edit, reset password
  - roles: ticket checker / admin
  - deactivate (signs them out at once) or reactivate
  - see each person's assigned events
- **Your account:** change password.

## API

The panel talks to the production API, **https://events-app-be-production.up.railway.app**, unless `VITE_API_URL` says otherwise. Sign in with an admin account; on Railway the first one comes from the `ADMIN_PHONE` / `ADMIN_PASSWORD` variables.

## Run

```bash
npm install
npm run dev          # http://localhost:5175, against the production API
npm run dev:local    # against a local API (proxied to http://localhost:4000, or VITE_DEV_API)
```

## Build and deploy

**Standalone (default), e.g. on Vercel:**

```bash
npm run build        # → dist/, a site at "/" that calls the production API
```

`vercel.json` is included. The API allows browser calls from other origins (`CORS_ORIGIN`, default `*`).

**Served by an API at `/panel` (one server, same origin):**

```bash
npm run build:api    # → dist/ with base /panel/ and same-origin API calls
```

The API serves it when it finds it next to the backend (`../admin/dist`) or in `ADMIN_PANEL_DIR`.

## Layout

```
src/
  lib/api.ts             fetch wrapper: token, {status, message, data} envelope, 401 → sign-in
  services/admin.ts      typed API calls and types (mirror the API's types)
  contexts/AuthContext   sign-in state (admins only)
  components/ui.tsx      buttons, inputs, tables, modal, confirm dialog, tabs…
  components/Layout.tsx  purple sidebar, page header, change password
  pages/                 Login, Dashboard, Events, EventDetail (+ event/ tabs), Checkers
```
