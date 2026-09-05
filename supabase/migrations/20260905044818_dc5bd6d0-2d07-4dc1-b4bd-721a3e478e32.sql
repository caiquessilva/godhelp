create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid references auth.users(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  place_id text,
  place_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.push_devices to authenticated;
grant all on public.push_devices to service_role;

alter table public.push_devices enable row level security;

create policy "users manage own devices"
on public.push_devices for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.push_alerts_sent (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  alert_key text not null,
  sent_at timestamptz not null default now(),
  unique (token, alert_key)
);

grant all on public.push_alerts_sent to service_role;
alter table public.push_alerts_sent enable row level security;

create index if not exists push_devices_updated_idx on public.push_devices (updated_at desc);
create index if not exists push_alerts_sent_at_idx on public.push_alerts_sent (sent_at desc);