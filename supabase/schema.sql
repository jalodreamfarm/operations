-- Farm Operations clone — run once in Supabase SQL Editor
-- Creates all tables + open authenticated access (single farm, few users)

create extension if not exists "pgcrypto";

-- helper: updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

-- DAILY
create table if not exists daily_production (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null,
  section text default 'Combined',
  opening_birds numeric default 0, mortality numeric default 0, closing_birds numeric default 0,
  eggs_trays numeric default 0, eggs_collected numeric default 0,
  feed_issued_kg numeric default 0, notes text default '',
  created_at timestamptz default now()
);

-- FLOCK
create table if not exists flock_events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null, event_type text not null,
  quantity numeric default 0, notes text default '',
  created_at timestamptz default now()
);
create table if not exists flock_sections (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  section_id text not null, label text default '',
  bird_count numeric default 0,
  updated_at timestamptz default now(),
  unique(project_id, section_id)
);

-- FEED
create table if not exists feed_purchases (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null, product text not null,
  qty_kg numeric default 0, unit_cost numeric default 0, total_cost numeric default 0,
  supplier text default '', created_at timestamptz default now()
);
create table if not exists feed_inventory (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  product text not null, closing_stock numeric default 0, unit_cost numeric default 0,
  updated_at timestamptz default now(),
  unique(project_id, product)
);
create table if not exists weekly_feed_mix (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  week_start date not null, week_end date,
  brand_kg numeric default 0, concentrate_kg numeric default 0,
  total_kg numeric default 0, notes text default '',
  created_at timestamptz default now()
);

-- SALES
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null, customer text default '',
  quantity_trays numeric default 0, quantity_eggs numeric default 0,
  unit_price numeric default 0, total_revenue numeric default 0,
  payment_status text default 'Cash', notes text default '',
  created_at timestamptz default now()
);

-- HEALTH
create table if not exists health_events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null, type text not null, product text not null,
  notes text default '', created_at timestamptz default now()
);
create table if not exists vaccination_schedule (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  week int default 1, vaccine text not null,
  planned_date date, status text default 'Pending', notes text default ''
);

-- GENERAL
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  name text not null, quantity numeric default 0, unit text default 'pcs',
  updated_at timestamptz default now(),
  unique(project_id, name)
);
create table if not exists staff_notes (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null, content text not null, category text default 'General',
  created_at timestamptz default now()
);
create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  name text not null, payroll numeric default 0, bonus numeric default 0,
  advance numeric default 0, notes text default '',
  created_at timestamptz default now()
);

-- RLS: authenticated full access (single-farm simplicity)
do $$ declare t text; begin
  foreach t in array array['daily_production','flock_events','flock_sections','feed_purchases','feed_inventory','weekly_feed_mix','sales','health_events','vaccination_schedule','inventory','staff_notes','workers']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth full" on %I', t);
    execute format('create policy "auth full" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- seed sections + schedule
insert into flock_sections (project_id, section_id, label, bird_count) values
 ('LUK54','A','Section A — Young',0),('LUK54','B','Section B — Medium',0),
 ('LUK54','C','Section C — Grown',0),('LUK54','Others','Others',0)
on conflict (project_id, section_id) do nothing;

insert into vaccination_schedule (project_id, week, vaccine, planned_date, status) values
 ('LUK54',1,'NEWCASTLE IB','2026-06-01','Pending'),('LUK54',2,'GUMBOLO 1','2026-06-08','Pending'),
 ('LUK54',3,'GUMBOLO 2','2026-06-15','Pending'),('LUK54',4,'NEWCASTLE LASOTA','2026-06-22','Pending'),
 ('LUK54',8,'NEWCASTLE LASOTA','2026-07-20','Pending'),('LUK54',12,'NEWCASTLE LASOTA','2026-08-17','Pending')
on conflict do nothing;
