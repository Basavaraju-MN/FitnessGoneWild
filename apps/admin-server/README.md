# Fitness Gone Wild — Admin portal

| App | Folder | Local | Production |
|---|---|---|---|
| Admin UI (React) | `apps/admin` | http://localhost:5175 | https://thefitnessgonewild.in/admin |
| Admin API (Express) | `apps/admin-server` | http://localhost:4100/api/admin | https://thefitnessgonewild.in/api/admin |

Both use the **same MySQL database** as the website.

## First-time setup (local)

1. **Database** — run `apps/admin-server/sql/admin_portal.sql` once
   (after the earlier `move_booking_to_bookings_table.sql` and
   `add_departure_booking.sql`).
2. **Config** — copy `apps/admin-server/.env.example` to `.env` and fill in
   the database details and a long random `JWT_SECRET`.
3. **Install** — from the repo root: `pnpm install`
4. **First admin login**:

       pnpm --filter admin-server create-admin <username> <email> <password> "Full Name"

   Running it again for the same username resets that password.

## Run (local)

From the repo root:

    pnpm dev          # website + admin together
    pnpm dev:site     # website only
    pnpm dev:admin    # admin only

Admin: http://localhost:5175 · Website: http://localhost:5173

The website server also serves the built admin at http://localhost:4000/admin
(after `pnpm run build`), exactly like production.

## Roles

| Role | Sections |
|---|---|
| Admin | Everything |
| Sales Team | Dashboard, Bookings, Customers, Enquiries, Brochure Downloads, Reports |
| Operations Team | Dashboard, Bookings, Trip Coordination, Customers, Master Data, Reports |

Access is enforced by the API (`config.js` → `permissions`), not only hidden in the menu.

## Production: thefitnessgonewild.in/admin

The admin runs **inside the website's Render service** — no extra service:

- The website server (`apps/server/src/server.js`) mounts this folder's API
  router at `/api/admin` and serves `apps/admin/dist` at `/admin`.
- `pnpm run build` (Render's build step) builds both the website and the admin
  (the admin is built with base path `/admin/`).

Render environment (website service):

| Variable | Value |
|---|---|
| `ADMIN_JWT_SECRET` | Generated automatically by `render.yaml`. If the service was created by hand, add any long random string. |
| `DB_*` | Already set for the website; the admin uses the same database. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_EMAIL` | Brochure download alert emails. |

Then, once, on the Hostinger database:

1. Run `sql/admin_portal.sql`.
2. Create the first login. From your computer, point `DB_*` in
   `apps/admin-server/.env` at Hostinger, then run:

       pnpm --filter admin-server create-admin <username> <email> <password> "Full Name"

   Put the local `DB_*` values back afterwards.

If `ADMIN_JWT_SECRET` is missing, the website still runs; only `/api/admin` is
not mounted (the Render log shows "Admin API not mounted").
