create extension if not exists pgcrypto;

create table if not exists public.shipping_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('pending', 'approved', 'rejected')),
  full_name text not null,
  email text not null,
  phone text not null default '',
  pickup_date text not null,
  shipping_request text not null,
  notes text not null default '',
  order_summary text not null,
  cart jsonb not null default '[]'::jsonb,
  approval_code text,
  approval_url text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz
);

create index if not exists shipping_requests_status_idx on public.shipping_requests (status);
create index if not exists shipping_requests_created_at_idx on public.shipping_requests (created_at desc);
create unique index if not exists shipping_requests_approval_code_idx on public.shipping_requests (approval_code) where approval_code is not null;
