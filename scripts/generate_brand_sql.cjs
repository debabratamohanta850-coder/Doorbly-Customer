const fs = require('fs');
const path = require('path');

const imgPath = path.resolve(__dirname, '../public/doorbly-official-logo.png');
const buf = fs.readFileSync(imgPath);
const b64 = 'data:image/png;base64,' + buf.toString('base64');

const sql = `-- ============================================================
-- DOORBLY BRAND ASSETS
-- Supabase PostgreSQL Migration
-- ============================================================

-- 1. BRAND ASSETS TABLE
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

-- 2. ENABLE ROW LEVEL SECURITY & ALLOW PUBLIC READ
alter table public.doorbly_brand_assets enable row level security;

drop policy if exists "Allow public read access to doorbly_brand_assets" on public.doorbly_brand_assets;
create policy "Allow public read access to doorbly_brand_assets"
on public.doorbly_brand_assets for select using (true);

-- 3. INSERT THE OFFICIAL DOORBLY LOGO
insert into public.doorbly_brand_assets (
    asset_key,
    asset_name,
    file_type,
    public_path,
    data_url,
    active
)
values (
    'official_logo',
    'Doorbly Official Brand Logo Lockup',
    'image/png',
    '/doorbly-official-logo.png',
    '${b64}',
    true
)
on conflict (asset_key)
do update set
    asset_name = excluded.asset_name,
    file_type = excluded.file_type,
    public_path = excluded.public_path,
    data_url = excluded.data_url,
    updated_at = now();

-- 4. VIEW FOR APP BRANDING
create or replace view public.doorbly_active_logo as
select
    asset_key,
    asset_name,
    public_path,
    data_url,
    updated_at
from public.doorbly_brand_assets
where asset_key = 'official_logo' and active = true
limit 1;
`;

fs.writeFileSync(path.resolve(__dirname, '../doorbly_brand_assets.sql'), sql);
fs.writeFileSync(path.resolve(__dirname, '../supabase/migrations/20261001_doorbly_brand_assets.sql'), sql);
console.log('SUCCESS: Written doorbly_brand_assets.sql successfully!');
