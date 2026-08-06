begin;

alter table public.profiles
  drop constraint if exists profiles_kyc_status_allowed;

alter table public.profiles
  add constraint profiles_kyc_status_allowed
  check (
    kyc_status in (
      'unverified',
      'pending',
      'review_required',
      'approved',
      'rejected'
    )
  ) not valid;

alter table public.profiles
  validate constraint profiles_kyc_status_allowed;

comment on column public.profiles.kyc_status is
  'KYC lifecycle: unverified, pending, review_required, approved or rejected.';

commit;
