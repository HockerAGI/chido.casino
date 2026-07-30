revoke all privileges on table public.agis_public_catalog from anon;
revoke all privileges on table public.agis_public_catalog from authenticated;
grant select on table public.agis_public_catalog to anon;
grant select on table public.agis_public_catalog to authenticated;
