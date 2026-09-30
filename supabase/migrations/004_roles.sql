-- 004_roles — admin (everything) + vet (health write, daily read-only)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','vet')),
  created_at timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "own read" on profiles;
create policy "own read" on profiles for select to authenticated using (auth.uid() = id);

create or replace function app_role() returns text
language sql security definer set search_path = public stable as
$$ select role from profiles where id = auth.uid() $$;

drop policy if exists "admin read all" on profiles;
create policy "admin read all" on profiles for select to authenticated using (app_role() = 'admin');

-- vet writes ONLY health tables; admin writes everything; reads stay open
do $$ declare t text; begin
  foreach t in array array['daily_production','expenses','feed_inventory','feed_purchases','flock_events','flock_sections','health_events','health_options','inventory','sales','staff_notes','vaccination_schedule','weekly_feed_mix','workers']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth full" on %I', t);
    execute format('create policy "ops read" on %I for select to authenticated using (true)', t);
    if t in ('health_events', 'health_options', 'vaccination_schedule') then
      execute format('create policy "ops write" on %I for all to authenticated using (app_role() in (''admin'',''vet'')) with check (app_role() in (''admin'',''vet''))', t);
    else
      execute format('create policy "ops write" on %I for all to authenticated using (app_role() = ''admin'') with check (app_role() = ''admin'')', t);
    end if;
  end loop;
end $$;

-- seed roles: existing owner -> admin, new vet -> vet
insert into profiles (id, email, role) values
 ('a478d479-5214-4895-88be-e19f9b44a5be', 'net.jalodreamfarm@gmail.com', 'admin'),
 ('fa20c303-d11a-411c-93d6-4c23545f1a4e', 'net.vet@jalodreamfarm.com', 'vet')
on conflict (id) do update set role = excluded.role, email = excluded.email;
