# Lyxa Events Admin

Organiser panel — events, tickets, gates, and ticket checkers. Uses the same API as the mobile app ([events-app-be](https://github.com/mbonyeemma/events-app-be)).

Defaults to production. Sign in with an admin phone + password.

## Run

```bash
npm install
npm run dev         # http://localhost:5175 → production API
npm run dev:local   # → local API (localhost:4000)
npm run build       # standalone (e.g. Vercel)
npm run build:api   # served by the API at /panel
```

## What it covers

- Dashboard (events, check-ins, latest scans)
- Events — create, ticket types, comps, gates, checkers, scan log
- Team — ticket checker / admin accounts
