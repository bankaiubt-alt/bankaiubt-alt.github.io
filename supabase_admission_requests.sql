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

drop policy if exists "Public can insert admission requests"
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
