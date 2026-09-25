# Energize Backend — Live Demo API

Express backend for the two-device hackathon demo. Connects to your **existing Supabase Postgres** — no separate database needed.

## Quick Start (Local)

```bash
cd energize-backend
npm install
cp .env.example .env
```

Edit `.env` — set `DATABASE_URL` to your Supabase connection string:
1. Go to **Supabase Dashboard** → **Settings** → **Database**
2. Scroll to **Connection string** → **URI** tab
3. Copy it and paste into `.env` (replace `[YOUR-PASSWORD]` with your DB password)

Then run:
```bash
npm run dev
```

## Database Setup

The tables live in Supabase. Run migration `0005_live_demo_tables.sql` in the **Supabase SQL Editor** before starting.

## Deploy to Render

1. **Create a Web Service** on [dashboard.render.com](https://dashboard.render.com)
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `energize-backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Environment Variables:
   - `DATABASE_URL` — your Supabase connection string
   - `CORS_ORIGIN` — your Vercel URL (e.g. `https://energize-u.vercel.app`)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/simulate/grid-toggle` | Toggle grid `{ account_id, status }` |
| GET | `/api/status/:account_id` | Live state snapshot |
| GET | `/api/events/:account_id` | Event history |
| POST | `/api/simulate/reset` | Clear demo data |
