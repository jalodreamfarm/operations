# Farm Operations (standalone clone)

Clone of the Operations page as its own system: React + Vite + Supabase, free tier.

## 1. Database (one-time)
1. Open Supabase project → SQL Editor → paste `supabase/schema.sql` → Run.
2. Authentication → Users → Add user (farm staff email + password).

## 2. Local dev
```bash
cp .env.example .env
# fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## 3. Deploy (free)
Vercel → Add New → Project → Import `jalodreamfarm/operations` →
set env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → Deploy.

No service_role key in frontend. Never commit `.env`.
