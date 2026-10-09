const fs = require('fs');
const path = require('path');

const masterSqlPath = path.resolve(__dirname, '../doorbly_service_master.sql');
let masterSql = fs.readFileSync(masterSqlPath, 'utf-8');

// Ensure tables are included
const bookingsAndProfiles = `
-- ============================================================
-- 33. CUSTOMER BOOKINGS TABLE
-- ============================================================
create table if not exists public.doorbly_bookings (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid,
    service_id uuid references public.doorbly_services(id) on delete set null,
    service_name_snapshot text not null,
    category_name_snapshot text,
    customer_price numeric(10,2) not null,
    pricing_unit text default 'hour',
    address text not null,
    city text default 'Bhubaneswar',
    district text default 'Khordha',
    pincode text,
    latitude numeric,
    longitude numeric,
    preferred_date text not null,
    preferred_time text not null,
    instructions text,
    status text not null default 'Pending',
    payment_status text not null default 'Pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.doorbly_bookings enable row level security;
drop policy if exists "Allow public access to doorbly_bookings" on public.doorbly_bookings;
create policy "Allow public access to doorbly_bookings"
on public.doorbly_bookings for all using (true) with check (true);


-- ============================================================
-- 34. CUSTOMER PROFILES TABLE
-- ============================================================
create table if not exists public.customer_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    full_name text,
    mobile_number text,
    address text,
    city text default 'Bhubaneswar',
    district text default 'Khordha',
    pincode text,
    latitude numeric,
    longitude numeric,
    fcm_token text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;
drop policy if exists "Allow public access to customer_profiles" on public.customer_profiles;
create policy "Allow public access to customer_profiles"
on public.customer_profiles for all using (true) with check (true);
`;

if (!masterSql.includes('doorbly_bookings')) {
  masterSql += '\n\n' + bookingsAndProfiles;
  fs.writeFileSync(masterSqlPath, masterSql);
  fs.writeFileSync(path.resolve(__dirname, '../supabase/migrations/20261001_doorbly_service_master.sql'), masterSql);
}

// Clean SQL string for in-app copy button
let cleanMasterSql = masterSql.split('-- DOORBLY BRAND ASSETS')[0].trim();
cleanMasterSql += '\n\n' + bookingsAndProfiles;

// Brand assets
cleanMasterSql += `
-- ============================================================
-- 35. BRAND ASSETS TABLE (Stores Official Logo)
-- ============================================================
create table if not exists public.doorbly_brand_assets (
    id uuid primary key default gen_random_uuid(),
    asset_key text unique not null,
    asset_name text not null,
    file_type text not null,
    public_path text not null,
    data_url text not null,
    metadata jsonb default '{"aspect_ratio": "16:9", "format": "png"}'::jsonb,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.doorbly_brand_assets enable row level security;
drop policy if exists "Allow public read access to doorbly_brand_assets" on public.doorbly_brand_assets;
create policy "Allow public read access to doorbly_brand_assets"
on public.doorbly_brand_assets for select using (true);

insert into public.doorbly_brand_assets (asset_key, asset_name, file_type, public_path, data_url, active)
values ('official_logo', 'Doorbly Official Brand Logo Lockup', 'image/png', '/doorbly-official-logo.png', '/doorbly-official-logo.png', true)
on conflict (asset_key) do nothing;
`;

const tsContent = '// Auto-generated complete SQL migration for Doorbly\nexport const DOORBLY_MASTER_SQL = ' + JSON.stringify(cleanMasterSql) + ';\n';
fs.writeFileSync(path.resolve(__dirname, '../src/lib/doorblyFullSql.ts'), tsContent);
console.log('SUCCESS: Written src/lib/doorblyFullSql.ts');
