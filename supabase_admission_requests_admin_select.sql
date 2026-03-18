grant select on table public.admission_requests to authenticated;
revoke select on table public.admission_requests from anon;

drop policy if exists "Authenticated users can read admission requests"
on public.admission_requests;

create policy "Authenticated users can read admission requests"
on public.admission_requests
for select
to authenticated
using (true);
