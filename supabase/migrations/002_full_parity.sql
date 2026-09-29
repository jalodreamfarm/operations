-- 002_full_parity — columns/tables matching original Operations backend
alter table daily_production
  add column if not exists breakages numeric default 0,
  add column if not exists eggs_lost numeric default 0,
  add column if not exists document_ids text default '';

alter table sales
  add column if not exists sale_category text default 'Eggs',
  add column if not exists egg_type text default '',
  add column if not exists breakage_trays_sold numeric default 0,
  add column if not exists damaged_trays_sold numeric default 0,
  add column if not exists lost_trays numeric default 0,
  add column if not exists payment_ref text default '',
  add column if not exists document_id text default '';

alter table weekly_feed_mix
  add column if not exists week_end date,
  add column if not exists lime_powder_kg numeric default 0,
  add column if not exists limestone_kg numeric default 0,
  add column if not exists soya_kg numeric default 0,
  add column if not exists sunflower_kg numeric default 0,
  add column if not exists broken_kg numeric default 0,
  add column if not exists maize_kg numeric default 0,
  add column if not exists others_kg numeric default 0;

alter table feed_inventory
  add column if not exists opening_stock numeric default 0,
  add column if not exists purchases numeric default 0,
  add column if not exists consumption numeric default 0;

create table if not exists health_options (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  kind text not null,
  value text not null,
  created_at timestamptz default now(),
  unique(project_id, kind, value)
);
alter table health_options enable row level security;
drop policy if exists "auth full" on health_options;
create policy "auth full" on health_options for all to authenticated using (true) with check (true);

-- receipts bucket for sale evidence
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "auth read receipts" on storage.objects;
create policy "auth read receipts" on storage.objects for select to authenticated
  using (bucket_id = 'receipts');
drop policy if exists "auth write receipts" on storage.objects;
create policy "auth write receipts" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts');
drop policy if exists "auth delete receipts" on storage.objects;
create policy "auth delete receipts" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts');
