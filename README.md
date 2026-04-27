# Agent Guardian Dashboard — Phase 2

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
```

Both are safe client-side Supabase values. Do **not** put service-role keys in this Vite app.

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

The app shows mock data when:

- `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, or
- Supabase table reads fail during demo/dev.

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
7. Add `https://agentbotguardian.com/dashboard` and any Vercel preview callback URLs to Supabase auth redirect URLs.
8. Deploy.

`vercel.json` is included with an SPA rewrite to support direct visits to `/login`, `/dashboard`, and `/history`.

## Notes for Phase 3

No backend server is included yet. Reads/writes go directly from the browser to Supabase. Backup creation can later be connected to the Phase 1 API or the existing `guardian-core` jobs that produce real Pinata CIDs.
