create table if not exists public.pickup_orders (
  order_id text primary key,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  pickup_date text not null default '',
  order_summary text not null default '',
  notes text not null default '',
  total_due numeric not null default 0,
  created_at timestamptz not null default now(),
  status text not null default 'new',
  status_updated_at timestamptz not null default now(),
  picked_up_at timestamptz,
  follow_up_email_sent_at timestamptz
);

create table if not exists public.paid_orders (
  session_id text primary key,
  amount_total integer not null default 0,
  currency text not null default 'usd',
  payment_status text not null default 'unknown',
  customer_email text not null default '',
  customer_name text not null default '',
  phone text not null default '',
  pickup_date text not null default '',
  order_summary text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  status text not null default 'new',
  status_updated_at timestamptz not null default now(),
  picked_up_at timestamptz,
  follow_up_email_sent_at timestamptz
);
