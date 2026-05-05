# Agent Guardian Dashboard — Phase 3

Browser dashboard for Agent Guardian at `agentbotguardian.com`.

Locked stack:

- React + Vite
- Tailwind CSS
- React Router
- Supabase magic-link auth and Postgres reads
- Vercel deployment

## Routes

- `/login` — email magic-link form
- `/dashboard` — protected dashboard with agent cards
- `/history` — protected version history table

If Supabase env vars are missing, the app runs in demo mode with realistic mock data for `MEMORY.md`, `SOUL.md`, and `AGENTS.md`.

## Local Development

```bash
cd ~/guardian-dashboard
npm install
cp .env.example .env
npm run dev
```

Open the URL Vite prints, usually:

```text
http://localhost:5173/login
```

## Environment Variables

Create `.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=https://your-guardian-api.up.railway.app
```

The Supabase values are safe client-side values. `VITE_API_URL` points the dashboard at the live Guardian API. Do **not** put service-role keys in this Vite app.

## Supabase Setup

1. Create a Supabase project.
2. Go to **SQL Editor**.
3. Run `supabase/migration.sql`.
4. Go to **Authentication → URL Configuration** and add local/dev and production redirect URLs:
   - `http://localhost:5173/dashboard`
   - `https://agentbotguardian.com/dashboard`
   - your Vercel preview URL if needed
5. Confirm magic-link email auth is enabled under **Authentication → Providers → Email**.
6. Optional if emails do not arrive reliably: configure SMTP in Supabase. This requires dashboard credentials and is the main setup step that may need owner access.

The migration creates:

- `profiles`
  - `id uuid references auth.users`
  - `email text`
  - `tier text default 'free'`
  - `created_at timestamptz`
- `agent_backups`
  - `id uuid`
  - `user_id uuid references profiles`
  - `file_name text`
  - `cid text`
  - `ipfs_url text`
  - `status text`
  - `backed_up_at timestamptz`

It also enables RLS so users can only read/write their own profile/backups.

## Mock Data Behavior

The app shows mock data only when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing. When Supabase is configured, the dashboard uses the signed-in user's Supabase session token to call the live Guardian API and displays explicit auth/API error states instead of silently falling back to mock data.

Mock cards:

- `MEMORY.md`
- `SOUL.md`
- `AGENTS.md`

## Deploy to Vercel

1. Push `~/guardian-dashboard` to a GitHub repo.
2. Import the repo in Vercel.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add env vars in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` — the Railway Guardian API base URL, with no trailing slash preferred
7. Add `https://agentbotguardian.com/dashboard` and any Vercel preview callback URLs to Supabase auth redirect URLs.
8. Deploy.

`vercel.json` is included with an SPA rewrite to support direct visits to `/login`, `/dashboard`, and `/history`.

## Phase 3 Live API Path

Authenticated dashboard reads now go through the Guardian API instead of direct browser database reads:

1. Supabase magic-link login creates a browser session.
2. The dashboard sends `Authorization: Bearer <supabase-access-token>` to:
   - `GET /api/agents/:email`
   - `GET /api/tier/:email`
3. The API validates the token with Supabase, confirms the requested email matches the authenticated user, then reads trusted Guardian data.
4. The dashboard renders live backups, empty states, or explicit session/API errors.

Required backend support: `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` on the Guardian API deployment.
