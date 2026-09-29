-- 003_expenditure — mirrors original Finance Expenses (ExpenseID→uuid, Amount→amount, etc.)
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'JALO',
  date date not null,
  category text not null,
  sub_category text default '',
  amount numeric default 0,
  supplier text default '',
  document_id text default '',
  notes text default '',
  created_at timestamptz default now()
);
alter table expenses enable row level security;
drop policy if exists "auth full" on expenses;
create policy "auth full" on expenses for all to authenticated using (true) with check (true);
