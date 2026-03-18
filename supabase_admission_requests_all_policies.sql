create extension if not exists pgcrypto;

create table if not exists public.admission_requests (
	id uuid primary key default gen_random_uuid(),
	full_name text not null check (char_length(trim(full_name)) >= 2),
	phone text not null check (char_length(trim(phone)) >= 7),
	basis text not null check (basis in ('9-сынып', '11-сынып')),
	specialty text not null check (char_length(trim(specialty)) >= 2),
	source text not null default 'website',
	created_at timestamptz not null default now()
);

alter table public.admission_requests enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.admission_requests to anon, authenticated;
grant select on table public.admission_requests to authenticated;
grant delete on table public.admission_requests to authenticated;
revoke select on table public.admission_requests from anon;

drop policy if exists "Public can insert admission requests"
on public.admission_requests;

drop policy if exists "Authenticated users can read admission requests"
on public.admission_requests;

drop policy if exists "Only one admin can read admission requests"
on public.admission_requests;

drop policy if exists "Authenticated users can delete admission requests"
on public.admission_requests;

create policy "Public can insert admission requests"
on public.admission_requests
for insert
to anon, authenticated
with check (
	source = 'website'
	and char_length(trim(full_name)) >= 2
	and char_length(trim(phone)) >= 7
	and char_length(trim(specialty)) >= 2
	and basis in ('9-сынып', '11-сынып')
);

create policy "Authenticated users can read admission requests"
on public.admission_requests
for select
to authenticated
using (true);

create policy "Authenticated users can delete admission requests"
on public.admission_requests
for delete
to authenticated
using (true);
