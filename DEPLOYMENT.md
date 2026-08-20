# Fitness Gone Wild - Render Deployment

## Architecture

This repository is configured as one Render Node Web Service:

Browser
  -> Render Web Service
  -> Express API
  -> Hostinger MySQL

The same Express service serves the Vite production build from `apps/client/dist`.

## Render settings

Runtime:
Node

Root Directory:
`.`

Build Command:
```bash
python3 -m pip install -r apps/server/requirements.txt && pnpm install --frozen-lockfile && pnpm run build
```

Start Command:
```bash
pnpm start
```

Health Check Path:
```text
/health
```

## Required Render environment variables

Set these in Render. Never commit their real values to GitHub.

```text
NODE_ENV=production
NODE_VERSION=24.14.1

DB_HOST=<Hostinger MySQL host>
DB_PORT=3306
DB_NAME=<Hostinger database name>
DB_USER=<Hostinger database user>
DB_PASSWORD=<Hostinger database password>
DB_CONNECTION_LIMIT=10

CLIENT_URL=https://fitnessgonewild.in,https://www.fitnessgonewild.in

PHONEPE_CLIENT_ID=<PhonePe client id>
PHONEPE_CLIENT_SECRET=<PhonePe client secret>
PHONEPE_CLIENT_VERSION=1
PHONEPE_ENV=SANDBOX
PHONEPE_REDIRECT_URL=https://fitnessgonewild.in/payment-result
PHONEPE_WEBHOOK_USERNAME=<PhonePe webhook username>
PHONEPE_WEBHOOK_PASSWORD=<PhonePe webhook password>

PYTHON_COMMAND=python3
```

For PhonePe production, change `PHONEPE_ENV` to the production value only when your PhonePe merchant account and credentials are ready for live payments.

## Local development

Copy:

```text
apps/server/.env.example -> apps/server/.env
apps/client/.env.example -> apps/client/.env.local
```

Then install and run:

```bash
pnpm install
pnpm dev
```

Local frontend:
`http://localhost:5173`

Local API:
`http://localhost:4000`

## Important

Do not commit:

- `node_modules`
- `.env`
- `.env.local`
- PhonePe credentials
- database passwords
- API secrets

Commit:

- `package.json`
- `pnpm-lock.yaml`
- source code
- `.env.example`
- `render.yaml`
- `requirements.txt`

## Custom domain

Add `fitnessgonewild.in` and `www.fitnessgonewild.in` to the Render Web Service.

If using Hostinger DNS, use the exact DNS targets shown by Render for the custom domain.

## Database

Create the MySQL database in Hostinger, import the application SQL, enable Remote MySQL access, and then add the Hostinger database credentials to Render.

The application does not expose the database to the browser. Only the Render backend connects to MySQL.
