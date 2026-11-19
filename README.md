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
  - create an event with its gates and an optional event code
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
    - edit name, venue and start
    - show, regenerate or set the event code
    - activate or deactivate
    - delete (only while the event has no tickets)
- **Ticket checkers (team):**
  - create accounts (a password is generated and shown once to share), edit, reset password
  - roles: ticket checker / admin
  - deactivate (signs them out at once) or reactivate
  - see each person's assigned events
- **Your account:** change password.

## Run

The API must be running (see events-app-be), with an admin account (`ADMIN_PHONE` / `ADMIN_PASSWORD` in its `.env`).

```bash
npm install
npm run dev        # http://localhost:5175/panel/  (API calls are proxied to http://localhost:4000)
```

Point the proxy at another API with `VITE_DEV_API=http://host:4000 npm run dev`.

## Build and deploy

**Served by the API (one server):**

```bash
npm run build      # → dist/
```

The API serves `dist/` at `/panel` when it finds it next to the backend (`../admin/dist`), or wherever `ADMIN_PANEL_DIR` points. The panel then calls the API on the same origin, so no CORS setup is needed.

**Standalone (e.g. Vercel):** set `VITE_BASE=/` and `VITE_API_URL=https://your-api.example.com` when building (`vercel.json` is included). Add the panel's origin to the API's `CORS_ORIGIN`.

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
