/**
 * Production Supabase Migration Script for Doorbly Customer Application
 * Safely extends existing tables and creates only missing tables with RLS & Indexes.
 * Safe to execute in Supabase SQL Editor:
 * https://supabase.com/dashboard/project/yvxplcqgvqxzwebhwmoc/sql
 */
export const DOORBLY_SUPABASE_SCHEMA_SQL = `-- 1. Enable required extensions
create extension if not exists "uuid-ossp";

-- 2. Customer Profiles Table (Preserves & Extends existing table)
create table if not exists public.doorbly_customer_profiles (
  id text primary key,
  full_name text,
  email text,
  mobile_number text,
  profile_photo text,
  address text,
  city text,
  district text,
  pincode text,
  latitude double precision,
  longitude double precision,
  fcm_token text,
  wallet_balance numeric(10, 2) default 0.00,
  referral_code text unique,
  referred_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.doorbly_customer_profiles
  add column if not exists fcm_token text,
  add column if not exists wallet_balance numeric(10, 2) default 0.00,
  add column if not exists referral_code text,
  add column if not exists referred_by text;

-- 3. Customer Saved Addresses / Locations (Preserves doorbly_customer_locations)
create table if not exists public.doorbly_customer_locations (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  label text not null default 'Home',
  address_line text not null,
  city text,
  district text,
  state text default 'Odisha',
  pincode text,
  latitude double precision,
  longitude double precision,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_doorbly_customer_locations_customer
  on public.doorbly_customer_locations(customer_id);

-- 4. Doorbly Partners Table (Shared with Doorbly Partner App)
create table if not exists public.doorbly_partners (
  id uuid primary key default gen_random_uuid(),
  user_id text unique,
  full_name text not null,
  phone text,
  photo_url text,
  rating numeric(3, 2),
  completed_jobs integer,
  experience_years integer,
  service_categories text[],
  skills text[],
  district text,
  city text,
  is_online boolean default false,
  is_available boolean default false,
  account_status text default 'ACTIVE',
  latitude double precision,
  longitude double precision,
  fcm_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_doorbly_partners_online_available
  on public.doorbly_partners(is_online, is_available, district);

-- 5. Customer Bookings Table (Preserves & Extends doorbly_bookings for Partner App sync)
create table if not exists public.doorbly_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  customer_name text,
  customer_phone text,
  service_id uuid,
  category_id uuid,
  service_name_snapshot text not null,
  category_name_snapshot text,
  customer_price numeric(10, 2) not null,
  tax_amount numeric(10, 2) default 0.00,
  discount_amount numeric(10, 2) default 0.00,
  final_amount numeric(10, 2),
  coupon_code text,
  pricing_unit text default 'per service',
  booking_type text default 'BOOK_NOW',
  address text not null,
  city text,
  district text,
  pincode text,
  latitude double precision,
  longitude double precision,
  preferred_date text not null,
  preferred_time text not null,
  instructions text,
  additional_details jsonb default '{}'::jsonb,
  status text not null default 'SEARCHING_PARTNER',
  payment_status text not null default 'PENDING',
  payment_method text default 'PAY_AFTER_SERVICE',
  payment_transaction_id text,
  partner_id uuid,
  partner_name text,
  partner_phone text,
  partner_photo text,
  partner_rating numeric(3, 2),
  partner_latitude double precision,
  partner_longitude double precision,
  partner_accepted_at timestamp with time zone,
  partner_arrived_at timestamp with time zone,
  service_started_at timestamp with time zone,
  service_completed_at timestamp with time zone,
  cancellation_reason text,
  cancelled_by text,
  cancelled_at timestamp with time zone,
  refund_status text default 'NONE',
  is_reviewed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.doorbly_bookings
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists category_id uuid,
  add column if not exists tax_amount numeric(10, 2) default 0.00,
  add column if not exists discount_amount numeric(10, 2) default 0.00,
  add column if not exists final_amount numeric(10, 2),
  add column if not exists coupon_code text,
  add column if not exists booking_type text default 'BOOK_NOW',
  add column if not exists additional_details jsonb default '{}'::jsonb,
  add column if not exists payment_method text default 'PAY_AFTER_SERVICE',
  add column if not exists payment_transaction_id text,
  add column if not exists partner_id uuid,
  add column if not exists partner_name text,
  add column if not exists partner_phone text,
  add column if not exists partner_photo text,
  add column if not exists partner_rating numeric(3, 2),
  add column if not exists partner_latitude double precision,
  add column if not exists partner_longitude double precision,
  add column if not exists partner_accepted_at timestamp with time zone,
  add column if not exists partner_arrived_at timestamp with time zone,
  add column if not exists service_started_at timestamp with time zone,
  add column if not exists service_completed_at timestamp with time zone,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_by text,
  add column if not exists cancelled_at timestamp with time zone,
  add column if not exists refund_status text default 'NONE',
  add column if not exists is_reviewed boolean default false;

create index if not exists idx_doorbly_bookings_customer_id on public.doorbly_bookings(customer_id);
create index if not exists idx_doorbly_bookings_partner_id on public.doorbly_bookings(partner_id);
create index if not exists idx_doorbly_bookings_service_id on public.doorbly_bookings(service_id);
create index if not exists idx_doorbly_bookings_status on public.doorbly_bookings(status);
create index if not exists idx_doorbly_bookings_created_at on public.doorbly_bookings(created_at desc);

-- 6. Booking Status History
create table if not exists public.doorbly_booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.doorbly_bookings(id) on delete cascade,
  status text not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_doorbly_status_history_booking
  on public.doorbly_booking_status_history(booking_id, created_at desc);

-- 7. Booking Messages (Customer <-> Partner Chat)
create table if not exists public.doorbly_booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.doorbly_bookings(id) on delete cascade,
  customer_id text not null,
  partner_id uuid,
  sender_role text not null check (sender_role in ('customer', 'partner')),
  sender_id text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_doorbly_booking_messages_booking
  on public.doorbly_booking_messages(booking_id, created_at asc);

-- 8. Customer Reviews & Partner Ratings
create table if not exists public.doorbly_customer_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.doorbly_bookings(id) on delete cascade,
  customer_id text not null,
  partner_id uuid,
  service_id uuid,
  rating integer not null check (rating >= 1 and rating <= 5),
  service_quality integer check (service_quality >= 1 and service_quality <= 5),
  partner_behaviour integer check (partner_behaviour >= 1 and partner_behaviour <= 5),
  timeliness integer check (timeliness >= 1 and timeliness <= 5),
  overall_experience integer check (overall_experience >= 1 and overall_experience <= 5),
  review_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_doorbly_reviews_customer on public.doorbly_customer_reviews(customer_id);
create index if not exists idx_doorbly_reviews_partner on public.doorbly_customer_reviews(partner_id);
create index if not exists idx_doorbly_reviews_service on public.doorbly_customer_reviews(service_id);

-- 9. Customer Support & Safety Tickets
create table if not exists public.doorbly_customer_support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  booking_id uuid references public.doorbly_bookings(id) on delete set null,
  issue_category text not null,
  subject text not null,
  description text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_doorbly_support_customer on public.doorbly_customer_support_tickets(customer_id, created_at desc);

-- 10. Customer Wallet Transactions
create table if not exists public.doorbly_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  type text not null check (type in ('CREDIT', 'DEBIT', 'REFUND', 'CASHBACK')),
  amount numeric(10, 2) not null check (amount >= 0),
  description text not null,
  booking_id uuid references public.doorbly_bookings(id) on delete set null,
  status text not null default 'COMPLETED' check (status in ('PENDING', 'COMPLETED', 'FAILED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_doorbly_wallet_tx_customer on public.doorbly_wallet_transactions(customer_id, created_at desc);

-- 11. Coupons & Offers
create table if not exists public.doorbly_coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text,
  discount_type text not null default 'PERCENTAGE' check (discount_type in ('FLAT', 'PERCENTAGE')),
  discount_value numeric(10, 2) not null,
  max_discount numeric(10, 2),
  min_booking_value numeric(10, 2) default 0,
  eligible_category text,
  eligible_service_id uuid,
  expires_at timestamp with time zone,
  usage_limit integer,
  active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Customer Notifications Center
create table if not exists public.doorbly_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  booking_id uuid references public.doorbly_bookings(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_doorbly_notifications_customer on public.doorbly_notifications(customer_id, created_at desc);

-- 13. Row Level Security & Realtime Publications
alter table public.doorbly_customer_profiles enable row level security;
alter table public.doorbly_customer_locations enable row level security;
alter table public.doorbly_partners enable row level security;
alter table public.doorbly_bookings enable row level security;
alter table public.doorbly_booking_status_history enable row level security;
alter table public.doorbly_booking_messages enable row level security;
alter table public.doorbly_customer_reviews enable row level security;
alter table public.doorbly_customer_support_tickets enable row level security;
alter table public.doorbly_wallet_transactions enable row level security;
alter table public.doorbly_coupons enable row level security;
alter table public.doorbly_notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'doorbly_bookings'
  ) then
    alter publication supabase_realtime add table public.doorbly_bookings;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'doorbly_booking_messages'
  ) then
    alter publication supabase_realtime add table public.doorbly_booking_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'doorbly_notifications'
  ) then
    alter publication supabase_realtime add table public.doorbly_notifications;
  end if;
end;
$$;
`;
