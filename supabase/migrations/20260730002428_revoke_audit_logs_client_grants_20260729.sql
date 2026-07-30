revoke all privileges on table public.audit_logs from anon;
revoke all privileges on table public.audit_logs from authenticated;
alter table public.audit_logs enable row level security;
