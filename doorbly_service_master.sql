-- ============================================================
-- DOORBLY SERVICE MASTER
-- Supabase PostgreSQL
-- ============================================================

-- 1. SERVICE CATEGORIES
create table if not exists public.doorbly_service_categories (
    id uuid primary key default gen_random_uuid(),
    category_name text not null unique,
    description text,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- 2. SERVICE MASTER
create table if not exists public.doorbly_services (
    id uuid primary key default gen_random_uuid(),

    category_id uuid not null
        references public.doorbly_service_categories(id)
        on delete restrict,

    subcategory text,
    service_name text not null,
    description text,

    -- Provider's actual earning rate
    provider_hourly_rate numeric(10,2) not null
        check (provider_hourly_rate >= 0),

    -- Doorbly service charge percentage
    doorbly_charge_percent numeric(5,2) not null default 20.00
        check (doorbly_charge_percent >= 0),

    -- Automatically calculated Doorbly charge
    doorbly_charge numeric(10,2)
        generated always as
        (
            round(
                provider_hourly_rate *
                doorbly_charge_percent / 100,
                2
            )
        ) stored,

    -- Automatically calculated customer price
    customer_hourly_price numeric(10,2)
        generated always as
        (
            round(
                provider_hourly_rate *
                (1 + doorbly_charge_percent / 100),
                2
            )
        ) stored,

    unit text not null default 'hour',

    skill_level text
        check (
            skill_level in (
                'Unskilled',
                'Semi-Skilled',
                'Skilled',
                'Highly Skilled',
                'Professional'
            )
        ),

    active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique(category_id, service_name)
);


-- ============================================================
-- 3. CATEGORIES
-- ============================================================

insert into public.doorbly_service_categories
(category_name, description)
values
('Home Repair & Maintenance',
 'General home repair, maintenance and handyman services'),

('Appliance Services',
 'Repair, installation and maintenance of household appliances'),

('Cleaning Services',
 'Home, office, commercial and vehicle cleaning'),

('Gardening & Agriculture',
 'Gardening, landscaping, farming and agricultural assistance'),

('Pest Control',
 'Pest, insect, termite and rodent control services'),

('Moving & Labour',
 'Loading, unloading, packing, shifting and general labour'),

('Personal & Care Services',
 'Personal assistance, childcare, elderly care and home assistance'),

('Beauty & Wellness',
 'Beauty, fitness, wellness, yoga and personal care'),

('IT & Computer Services',
 'Computer, laptop, network, CCTV and technical support'),

('Digital Freelance Services',
 'Data entry, virtual assistance, writing, research and digital work'),

('Graphic & Creative Services',
 'Graphic design, video editing, animation and creative services'),

('Website & Software Services',
 'Website, software, mobile application and development services'),

('Photography, Video & Events',
 'Photography, videography, events and event support'),

('Education & Training',
 'Tutoring, coaching, training and educational services'),

('Business & Corporate Services',
 'Office, administrative, sales, HR and corporate services'),

('Legal, Financial & Professional Services',
 'Accounting, taxation, legal and professional consulting'),

('Automobile Services',
 'Bike, car, vehicle repair, maintenance and detailing'),

('Security & Facility Services',
 'Security, housekeeping and facility management'),

('Logistics & Delivery',
 'Delivery, courier, warehouse and local logistics'),

('Real Estate & Property Services',
 'Property inspection, supervision, documentation and media'),

('Construction & Skilled Trades',
 'Construction, masonry, electrical, plumbing and skilled trades'),

('Government & Documentation Assistance',
 'Online forms, documentation and digital assistance'),

('Other Freelance Services',
 'Additional freelance, field and business support services')

on conflict (category_name) do nothing;


-- ============================================================
-- 4. HELPER FUNCTION
--    Automatically inserts services using category name
-- ============================================================

create or replace function public.doorbly_add_service(
    p_category text,
    p_subcategory text,
    p_service_name text,
    p_description text,
    p_provider_rate numeric,
    p_skill_level text default 'Skilled'
)
returns void
language plpgsql
as $$
declare
    v_category_id uuid;
begin

    select id
    into v_category_id
    from public.doorbly_service_categories
    where category_name = p_category;

    if v_category_id is null then
        raise exception 'Category does not exist: %', p_category;
    end if;

    insert into public.doorbly_services (
        category_id,
        subcategory,
        service_name,
        description,
        provider_hourly_rate,
        doorbly_charge_percent,
        skill_level
    )
    values (
        v_category_id,
        p_subcategory,
        p_service_name,
        p_description,
        p_provider_rate,
        20.00,
        p_skill_level
    )
    on conflict (category_id, service_name)
    do update set
        subcategory = excluded.subcategory,
        description = excluded.description,
        provider_hourly_rate = excluded.provider_hourly_rate,
        skill_level = excluded.skill_level,
        updated_at = now();

end;
$$;


-- ============================================================
-- 5. HOME REPAIR & MAINTENANCE
-- ============================================================

select public.doorbly_add_service(
'Home Repair & Maintenance','Handyman',
'General Handyman','General household repair and maintenance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Carpentry',
'Carpenter','Furniture and wooden work',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Carpentry',
'Furniture Repair','Furniture repair and restoration',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Carpentry',
'Furniture Assembly','Furniture assembly and installation',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Doors & Windows',
'Door Repair','Door repair and adjustment',
350,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Doors & Windows',
'Window Repair','Window repair and adjustment',
350,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Locks',
'Lock Repair','Lock repair and replacement assistance',
350,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Plumbing',
'Plumbing','General plumbing work',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Plumbing',
'Pipe Repair','Water pipe repair',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Plumbing',
'Tap Repair','Tap and faucet repair',
350,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Plumbing',
'Toilet Repair','Toilet repair and maintenance',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Plumbing',
'Bathroom Repair','General bathroom repair',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Plumbing',
'Water Leakage Repair','Water leakage detection and repair',
450,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Electrical',
'Electrical Repair','General electrical repair',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Electrical',
'Switch & Socket Repair','Switch and socket repair',
350,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Electrical',
'Fan Repair','Ceiling and exhaust fan repair',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Electrical',
'Fan Installation','Fan installation',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Electrical',
'Light Installation','Light fixture installation',
350,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Electrical',
'Wiring Work','Electrical wiring work',
450,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Electrical',
'MCB & DB Work','MCB and distribution board work',
500,'Highly Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Painting',
'Painting Helper','Painting assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Painting',
'Wall Painting','Interior and exterior wall painting',
450,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Masonry',
'Tile Repair','Tile repair and replacement',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Masonry',
'Masonry Work','General masonry work',
400,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Welding',
'Welding','General welding work',
500,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Welding',
'Metal Repair','Metal repair work',
500,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Roofing',
'Roof Repair','Roof repair and maintenance',
500,'Skilled');

select public.doorbly_add_service(
'Home Repair & Maintenance','Waterproofing',
'Waterproofing Work','Waterproofing and leakage prevention',
500,'Skilled');


-- ============================================================
-- 6. APPLIANCE SERVICES
-- ============================================================

select public.doorbly_add_service(
'Appliance Services','Air Conditioner',
'AC Technician','AC technical service',
500,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Air Conditioner',
'AC Installation','AC installation',
500,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Air Conditioner',
'AC Repair','AC repair',
500,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Air Conditioner',
'AC Cleaning','AC cleaning and maintenance',
400,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Refrigerator',
'Refrigerator Repair','Refrigerator repair',
500,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Washing Machine',
'Washing Machine Repair','Washing machine repair',
500,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Dishwasher',
'Dishwasher Repair','Dishwasher repair',
500,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Kitchen Appliances',
'Microwave Repair','Microwave repair',
450,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Kitchen Appliances',
'Oven Repair','Oven repair',
450,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Television',
'TV Repair','Television repair',
450,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Water Purifier',
'Water Purifier Repair','RO and water purifier repair',
450,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Geyser',
'Geyser Repair','Geyser repair',
450,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Cooler',
'Cooler Repair','Air cooler repair',
400,'Skilled');

select public.doorbly_add_service(
'Appliance Services','Chimney',
'Chimney Repair','Kitchen chimney repair',
450,'Skilled');

select public.doorbly_add_service(
'Appliance Services','General',
'Kitchen Appliance Repair','General kitchen appliance repair',
450,'Skilled');

select public.doorbly_add_service(
'Appliance Services','General',
'Small Appliance Repair','Small household appliance repair',
350,'Skilled');


-- ============================================================
-- 7. CLEANING SERVICES
-- ============================================================

select public.doorbly_add_service(
'Cleaning Services','Home',
'General Home Cleaning','General household cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Home',
'Deep Cleaning','Deep household cleaning',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Kitchen',
'Kitchen Cleaning','Kitchen cleaning',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Bathroom',
'Bathroom Cleaning','Bathroom cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Rooms',
'Bedroom Cleaning','Bedroom cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Rooms',
'Living Room Cleaning','Living room cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Floor',
'Floor Cleaning','Floor cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Furniture',
'Sofa Cleaning','Sofa cleaning',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Furniture',
'Mattress Cleaning','Mattress cleaning',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Floor & Carpet',
'Carpet Cleaning','Carpet cleaning',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Windows',
'Window Cleaning','Window cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Windows',
'Glass Cleaning','Glass cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Outdoor',
'Balcony Cleaning','Balcony cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Outdoor',
'Terrace Cleaning','Terrace cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Outdoor',
'Garage Cleaning','Garage cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Commercial',
'Office Cleaning','Office cleaning',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Commercial',
'Shop Cleaning','Shop cleaning',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Commercial',
'Warehouse Cleaning','Warehouse cleaning',
400,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Vehicle',
'Vehicle Interior Cleaning','Vehicle interior cleaning',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Cleaning Services','Vehicle',
'Bike Cleaning','Two-wheeler cleaning',
250,'Semi-Skilled');


-- ============================================================
-- 8. GARDENING & AGRICULTURE
-- ============================================================

select public.doorbly_add_service(
'Gardening & Agriculture','Gardening',
'Gardener','General gardening work',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Gardening',
'Lawn Maintenance','Lawn maintenance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Gardening',
'Plant Maintenance','Plant care and maintenance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Tree Care',
'Tree Trimming','Tree trimming',
400,'Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Tree Care',
'Tree Pruning','Tree pruning',
400,'Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Gardening',
'Hedge Cutting','Hedge cutting',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Gardening',
'Garden Cleaning','Garden cleaning',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Gardening',
'Planting','Planting work',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Gardening',
'Potting','Plant potting',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Gardening',
'Terrace Gardening','Terrace garden maintenance',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Agriculture',
'Kitchen Garden Work','Kitchen garden work',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Agriculture',
'Nursery Helper','Nursery assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Agriculture',
'Farm Helper','Farm assistance',
300,'Unskilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Agriculture',
'Agricultural Labour','Agricultural labour',
300,'Unskilled');

select public.doorbly_add_service(
'Gardening & Agriculture','Agriculture',
'Irrigation Assistance','Irrigation assistance',
350,'Semi-Skilled');


-- ============================================================
-- 9. PEST CONTROL
-- ============================================================

select public.doorbly_add_service(
'Pest Control','General',
'General Pest Control','General pest control',
400,'Skilled');

select public.doorbly_add_service(
'Pest Control','Insects',
'Cockroach Control','Cockroach control',
400,'Skilled');

select public.doorbly_add_service(
'Pest Control','Insects',
'Ant Control','Ant control',
350,'Skilled');

select public.doorbly_add_service(
'Pest Control','Mosquito',
'Mosquito Control','Mosquito control',
400,'Skilled');

select public.doorbly_add_service(
'Pest Control','Termite',
'Termite Treatment','Termite treatment',
500,'Skilled');

select public.doorbly_add_service(
'Pest Control','Bed Bugs',
'Bed Bug Treatment','Bed bug treatment',
500,'Skilled');

select public.doorbly_add_service(
'Pest Control','Rodents',
'Rodent Control','Rodent control',
450,'Skilled');

select public.doorbly_add_service(
'Pest Control','Insects',
'Fly Control','Fly control',
400,'Skilled');

select public.doorbly_add_service(
'Pest Control','Garden',
'Garden Pest Control','Garden pest control',
400,'Skilled');


-- ============================================================
-- 10. MOVING & LABOUR
-- ============================================================

select public.doorbly_add_service(
'Moving & Labour','General',
'General Labour','General labour',
300,'Unskilled');

select public.doorbly_add_service(
'Moving & Labour','Moving',
'Loading Labour','Loading assistance',
300,'Unskilled');

select public.doorbly_add_service(
'Moving & Labour','Moving',
'Unloading Labour','Unloading assistance',
300,'Unskilled');

select public.doorbly_add_service(
'Moving & Labour','Packing',
'Packing Worker','Packing assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Moving & Labour','Packing',
'Unpacking Worker','Unpacking assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Moving & Labour','Moving',
'Furniture Moving','Furniture moving assistance',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Moving & Labour','Shifting',
'House Shifting Helper','House shifting assistance',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Moving & Labour','Shifting',
'Office Shifting Helper','Office shifting assistance',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Moving & Labour','Warehouse',
'Warehouse Labour','Warehouse labour',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Moving & Labour','Delivery',
'Delivery Helper','Delivery assistance',
300,'Unskilled');

select public.doorbly_add_service(
'Moving & Labour','Events',
'Event Labour','Event labour',
300,'Unskilled');


-- ============================================================
-- 11. PERSONAL & CARE
-- ============================================================

select public.doorbly_add_service(
'Personal & Care Services','Elderly Care',
'Elderly Care Assistant','Non-medical elderly assistance',
400,'Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Patient Care',
'Patient Care Assistant','Patient assistance by qualified personnel where applicable',
450,'Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Home Care',
'Home Attendant','Home assistance',
400,'Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Child Care',
'Babysitter','Childcare assistance',
350,'Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Child Care',
'Child Care Assistant','Childcare assistance',
350,'Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Home Assistance',
'New Mother Helper','Household assistance for new mothers',
400,'Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Companion',
'Companion Service','Non-medical companionship',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Personal Assistance',
'Personal Assistant','Personal assistance',
400,'Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Food',
'Home Cook','Home cooking',
350,'Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Food',
'Kitchen Helper','Kitchen assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Laundry',
'Laundry Helper','Laundry assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Personal & Care Services','Laundry',
'Ironing Service','Clothing ironing',
300,'Semi-Skilled');


-- ============================================================
-- 12. BEAUTY & WELLNESS
-- ============================================================

select public.doorbly_add_service(
'Beauty & Wellness','Beauty',
'Home Salon Professional','Home salon service',
400,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Hair',
'Hair Stylist','Hair styling',
400,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Makeup',
'Makeup Artist','Professional makeup',
600,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Beauty',
'Beautician','Beauty services',
400,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Mehendi',
'Mehendi Artist','Mehendi application',
400,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Nails',
'Nail Technician','Nail services',
400,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Skin Care',
'Facial Specialist','Facial and skincare',
400,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Wellness',
'Massage Therapist','Massage and wellness service',
500,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Fitness',
'Yoga Instructor','Yoga instruction',
500,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Fitness',
'Fitness Trainer','Personal fitness training',
500,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Dance',
'Dance Instructor','Dance instruction',
500,'Professional');

select public.doorbly_add_service(
'Beauty & Wellness','Wellness',
'Meditation Instructor','Meditation instruction',
500,'Professional');


-- ============================================================
-- 13. IT & COMPUTER
-- ============================================================

select public.doorbly_add_service(
'IT & Computer Services','Computer',
'Computer Technician','Computer technical support',
400,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Laptop',
'Laptop Technician','Laptop technical support',
450,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Desktop',
'Desktop Technician','Desktop technical support',
400,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Printer',
'Printer Technician','Printer repair and support',
400,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','CCTV',
'CCTV Technician','CCTV installation and maintenance',
450,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Networking',
'Network Technician','Network setup and support',
500,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Networking',
'Wi-Fi Setup','Wi-Fi setup and configuration',
400,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Software',
'Software Installation','Software installation and configuration',
350,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Computer',
'Computer Troubleshooting','Computer troubleshooting',
400,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Data',
'Data Backup','Data backup assistance',
400,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Data',
'Data Recovery Assistance','Data recovery assistance',
600,'Highly Skilled');

select public.doorbly_add_service(
'IT & Computer Services','IT Support',
'IT Support','General IT support',
500,'Skilled');

select public.doorbly_add_service(
'IT & Computer Services','Cybersecurity',
'Cybersecurity Consultant','Cybersecurity consulting',
1000,'Professional');

select public.doorbly_add_service(
'IT & Computer Services','Cloud',
'Cloud Support','Cloud technical support',
800,'Professional');

select public.doorbly_add_service(
'IT & Computer Services','Technical',
'Technical Support','General technical support',
500,'Skilled');


-- ============================================================
-- 14. DIGITAL FREELANCE
-- ============================================================

select public.doorbly_add_service(
'Digital Freelance Services','Data',
'Data Entry','Data entry services',
250,'Semi-Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Typing',
'Typing','Typing services',
250,'Semi-Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Office',
'Excel Work','Excel spreadsheet work',
300,'Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Office',
'Word Processing','Word processing',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Presentation',
'PowerPoint Creation','Presentation creation',
350,'Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Research',
'Internet Research','Online research',
300,'Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Virtual Assistant',
'Virtual Assistant','Virtual assistance',
400,'Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Support',
'Customer Chat Support','Online customer chat support',
350,'Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Administration',
'Email Management','Email management',
350,'Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Marketing',
'Social Media Management','Social media management',
500,'Professional');

select public.doorbly_add_service(
'Digital Freelance Services','Marketing',
'Social Media Assistant','Social media assistance',
350,'Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Writing',
'Content Writing','Content writing',
500,'Professional');

select public.doorbly_add_service(
'Digital Freelance Services','Writing',
'Copywriting','Copywriting',
600,'Professional');

select public.doorbly_add_service(
'Digital Freelance Services','Writing',
'Proofreading','Proofreading and editing',
400,'Professional');

select public.doorbly_add_service(
'Digital Freelance Services','Translation',
'Translation','Translation services',
400,'Professional');

select public.doorbly_add_service(
'Digital Freelance Services','Transcription',
'Transcription','Audio and video transcription',
350,'Skilled');

select public.doorbly_add_service(
'Digital Freelance Services','Career',
'Resume Writing','Resume and CV writing',
500,'Professional');

select public.doorbly_add_service(
'Digital Freelance Services','Research',
'Research Assistant','Research assistance',
500,'Professional');


-- ============================================================
-- 15. GRAPHIC & CREATIVE
-- ============================================================

select public.doorbly_add_service(
'Graphic & Creative Services','Graphic Design',
'Graphic Designer','Graphic design',
500,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','Graphic Design',
'Logo Designer','Logo design',
600,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','Graphic Design',
'Poster Designer','Poster design',
500,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','Graphic Design',
'Banner Designer','Banner design',
500,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','Graphic Design',
'Brochure Designer','Brochure design',
500,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','UI/UX',
'UI Designer','User interface design',
700,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','UI/UX',
'UX Designer','User experience design',
700,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','Video',
'Video Editor','Video editing',
600,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','Photo',
'Photo Editor','Photo editing',
500,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','Animation',
'Motion Graphics Designer','Motion graphics',
800,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','Animation',
'Animator','Animation',
800,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','3D',
'3D Designer','3D design',
900,'Professional');

select public.doorbly_add_service(
'Graphic & Creative Services','Illustration',
'Illustrator','Digital illustration',
600,'Professional');


-- ============================================================
-- 16. WEBSITE & SOFTWARE
-- ============================================================

select public.doorbly_add_service(
'Website & Software Services','Website',
'WordPress Developer','WordPress development',
600,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Website',
'Website Designer','Website design',
600,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Development',
'Frontend Developer','Frontend development',
800,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Development',
'Backend Developer','Backend development',
900,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Development',
'Full Stack Developer','Full stack development',
1000,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Mobile',
'Mobile App Developer','Mobile application development',
900,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Mobile',
'Android Developer','Android application development',
800,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Mobile',
'iOS Developer','iOS application development',
1000,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Database',
'Database Developer','Database development',
900,'Professional');

select public.doorbly_add_service(
'Website & Software Services','API',
'API Developer','API development',
900,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Software',
'Software Developer','Software development',
900,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Testing',
'QA Tester','Software quality testing',
500,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Technical Writing',
'Technical Writer','Technical documentation',
500,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Marketing',
'SEO Specialist','Search engine optimization',
600,'Professional');

select public.doorbly_add_service(
'Website & Software Services','Marketing',
'Digital Marketing Specialist','Digital marketing',
600,'Professional');


-- ============================================================
-- 17. PHOTOGRAPHY VIDEO EVENTS
-- ============================================================

select public.doorbly_add_service(
'Photography, Video & Events','Photography',
'Photographer','Photography service',
700,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Video',
'Videographer','Videography service',
800,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Photography',
'Wedding Photographer','Wedding photography',
1000,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Photography',
'Event Photographer','Event photography',
800,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Photography',
'Product Photographer','Product photography',
700,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Drone',
'Drone Operator','Drone operation where legally permitted',
1000,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Video',
'Video Editor','Video editing',
600,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Events',
'Event Coordinator','Event coordination',
500,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Events',
'Event Manager','Event management',
700,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Events',
'Decoration Worker','Event decoration assistance',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Photography, Video & Events','Entertainment',
'DJ','DJ service',
600,'Professional');

select public.doorbly_add_service(
'Photography, Video & Events','Entertainment',
'Anchor / Host','Event anchoring and hosting',
600,'Professional');


-- ============================================================
-- 18. EDUCATION & TRAINING
-- ============================================================

select public.doorbly_add_service(
'Education & Training','School',
'School Tutor','School subject tutoring',
300,'Professional');

select public.doorbly_add_service(
'Education & Training','Mathematics',
'Mathematics Tutor','Mathematics tutoring',
400,'Professional');

select public.doorbly_add_service(
'Education & Training','Science',
'Science Tutor','Science tutoring',
400,'Professional');

select public.doorbly_add_service(
'Education & Training','English',
'English Tutor','English tutoring',
400,'Professional');

select public.doorbly_add_service(
'Education & Training','Computer',
'Computer Tutor','Computer tutoring',
400,'Professional');

select public.doorbly_add_service(
'Education & Training','Language',
'Spoken English Trainer','Spoken English training',
400,'Professional');

select public.doorbly_add_service(
'Education & Training','Coding',
'Coding Tutor','Programming and coding instruction',
600,'Professional');

select public.doorbly_add_service(
'Education & Training','Music',
'Music Teacher','Music instruction',
500,'Professional');

select public.doorbly_add_service(
'Education & Training','Music',
'Guitar Teacher','Guitar instruction',
500,'Professional');

select public.doorbly_add_service(
'Education & Training','Dance',
'Dance Teacher','Dance instruction',
500,'Professional');

select public.doorbly_add_service(
'Education & Training','Art',
'Art Teacher','Art instruction',
400,'Professional');

select public.doorbly_add_service(
'Education & Training','Career',
'Career Trainer','Career training',
700,'Professional');

select public.doorbly_add_service(
'Education & Training','Corporate',
'Corporate Trainer','Corporate training',
1000,'Professional');


-- ============================================================
-- 19. BUSINESS & CORPORATE
-- ============================================================

select public.doorbly_add_service(
'Business & Corporate Services','Administration',
'Office Assistant','Office assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Business & Corporate Services','Administration',
'Receptionist','Reception and front desk work',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Business & Corporate Services','Administration',
'Office Coordinator','Office coordination',
400,'Skilled');

select public.doorbly_add_service(
'Business & Corporate Services','Administration',
'Administrative Assistant','Administrative assistance',
400,'Skilled');

select public.doorbly_add_service(
'Business & Corporate Services','Data',
'Data Entry Operator','Data entry',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Business & Corporate Services','Sales',
'Telecaller','Telecalling',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Business & Corporate Services','Support',
'Customer Support Executive','Customer support',
350,'Skilled');

select public.doorbly_add_service(
'Business & Corporate Services','Sales',
'Sales Executive','Sales work',
400,'Skilled');

select public.doorbly_add_service(
'Business & Corporate Services','Field',
'Field Executive','Field work',
400,'Skilled');

select public.doorbly_add_service(
'Business & Corporate Services','Business Development',
'Business Development Executive','Business development',
500,'Professional');

select public.doorbly_add_service(
'Business & Corporate Services','HR',
'HR Assistant','HR assistance',
500,'Professional');

select public.doorbly_add_service(
'Business & Corporate Services','HR',
'Recruitment Executive','Recruitment services',
500,'Professional');

select public.doorbly_add_service(
'Business & Corporate Services','Finance',
'Accountant','Accounting services',
600,'Professional');

select public.doorbly_add_service(
'Business & Corporate Services','Finance',
'Bookkeeper','Bookkeeping',
500,'Professional');

select public.doorbly_add_service(
'Business & Corporate Services','MIS',
'MIS Executive','MIS and reporting',
500,'Professional');

select public.doorbly_add_service(
'Business & Corporate Services','Operations',
'Operations Executive','Operations support',
500,'Professional');

select public.doorbly_add_service(
'Business & Corporate Services','Project',
'Project Coordinator','Project coordination',
600,'Professional');

select public.doorbly_add_service(
'Business & Corporate Services','Consulting',
'Business Consultant','Business consulting',
1000,'Professional');


-- ============================================================
-- 20. LEGAL, FINANCIAL & PROFESSIONAL
-- ============================================================

select public.doorbly_add_service(
'Legal, Financial & Professional Services','Accounting',
'CA Consultation','Chartered accountant consultation',
1000,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','Tax',
'Tax Consultant','Tax consultation',
800,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','GST',
'GST Consultant','GST consultation',
800,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','Accounting',
'Accounting Consultant','Accounting consultation',
700,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','Finance',
'Financial Consultant','Financial consultation',
1000,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','Business',
'Business Consultant','Business consultation',
1000,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','Legal',
'Legal Consultant','Legal consultation by qualified professionals',
1000,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','Documentation',
'Documentation Consultant','Documentation assistance',
500,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','Business',
'Company Registration Assistance','Company registration assistance',
700,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','Compliance',
'Compliance Consultant','Compliance consulting',
800,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','IP',
'Patent / Trademark Consultant','IP consultation',
1000,'Professional');

select public.doorbly_add_service(
'Legal, Financial & Professional Services','HR',
'HR Consultant','Human resources consulting',
800,'Professional');


-- ============================================================
-- 21. AUTOMOBILE SERVICES
-- ============================================================

select public.doorbly_add_service(
'Automobile Services','Bike',
'Bike Mechanic','Two-wheeler mechanical service',
400,'Skilled');

select public.doorbly_add_service(
'Automobile Services','Car',
'Car Mechanic','Car mechanical service',
500,'Skilled');

select public.doorbly_add_service(
'Automobile Services','Electrical',
'Auto Electrical Technician','Vehicle electrical service',
500,'Skilled');

select public.doorbly_add_service(
'Automobile Services','AC',
'Car AC Technician','Vehicle AC service',
500,'Skilled');

select public.doorbly_add_service(
'Automobile Services','Bike',
'Bike Electrical Repair','Bike electrical repair',
400,'Skilled');

select public.doorbly_add_service(
'Automobile Services','Battery',
'Battery Technician','Vehicle battery service',
400,'Skilled');

select public.doorbly_add_service(
'Automobile Services','Tyres',
'Tyre Technician','Tyre service',
350,'Skilled');

select public.doorbly_add_service(
'Automobile Services','Tyres',
'Puncture Technician','Puncture repair',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Automobile Services','Cleaning',
'Car Washing','Car washing',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Automobile Services','Cleaning',
'Bike Washing','Bike washing',
250,'Semi-Skilled');

select public.doorbly_add_service(
'Automobile Services','Detailing',
'Vehicle Detailing','Vehicle detailing',
500,'Skilled');

select public.doorbly_add_service(
'Automobile Services','Cleaning',
'Vehicle Interior Cleaning','Vehicle interior cleaning',
400,'Semi-Skilled');

select public.doorbly_add_service(
'Automobile Services','Inspection',
'Vehicle Inspection','Vehicle inspection',
400,'Skilled');


-- ============================================================
-- 22. SECURITY & FACILITY
-- ============================================================

select public.doorbly_add_service(
'Security & Facility Services','Security',
'Security Guard','Security services',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Security & Facility Services','Security',
'Security Supervisor','Security supervision',
400,'Skilled');

select public.doorbly_add_service(
'Security & Facility Services','Events',
'Event Security','Event security',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Security & Facility Services','Security',
'Bouncer','Event security personnel',
500,'Skilled');

select public.doorbly_add_service(
'Security & Facility Services','Security',
'Gatekeeper','Gatekeeping',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Security & Facility Services','Facility',
'Facility Supervisor','Facility supervision',
450,'Skilled');

select public.doorbly_add_service(
'Security & Facility Services','Housekeeping',
'Housekeeping Staff','Housekeeping service',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Security & Facility Services','Housekeeping',
'Office Housekeeping','Office housekeeping',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Security & Facility Services','Facility',
'Building Maintenance Staff','Building maintenance',
400,'Skilled');


-- ============================================================
-- 23. LOGISTICS & DELIVERY
-- ============================================================

select public.doorbly_add_service(
'Logistics & Delivery','Delivery',
'Delivery Executive','Delivery service',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Logistics & Delivery','Delivery',
'Pickup Executive','Pickup service',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Logistics & Delivery','Courier',
'Courier Runner','Local courier service',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Logistics & Delivery','Delivery',
'Bike Delivery Partner','Local bike delivery',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Logistics & Delivery','Documents',
'Document Delivery','Document delivery',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Logistics & Delivery','Errands',
'Local Errand Runner','Local errands',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Logistics & Delivery','Warehouse',
'Warehouse Picker','Warehouse picking',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Logistics & Delivery','Warehouse',
'Warehouse Packer','Warehouse packing',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Logistics & Delivery','Warehouse',
'Inventory Assistant','Inventory assistance',
350,'Skilled');

select public.doorbly_add_service(
'Logistics & Delivery','Warehouse',
'Dispatch Assistant','Dispatch assistance',
350,'Skilled');


-- ============================================================
-- 24. REAL ESTATE & PROPERTY
-- ============================================================

select public.doorbly_add_service(
'Real Estate & Property Services','Inspection',
'Property Inspection','Property inspection assistance',
500,'Skilled');

select public.doorbly_add_service(
'Real Estate & Property Services','Property Visit',
'Property Visit Assistant','Property visit assistance',
400,'Semi-Skilled');

select public.doorbly_add_service(
'Real Estate & Property Services','Documentation',
'Property Documentation Assistant','Property documentation assistance',
500,'Skilled');

select public.doorbly_add_service(
'Real Estate & Property Services','Construction',
'Site Supervisor','Construction site supervision',
600,'Skilled');

select public.doorbly_add_service(
'Real Estate & Property Services','Construction',
'Construction Supervisor','Construction supervision',
600,'Skilled');

select public.doorbly_add_service(
'Real Estate & Property Services','Interior',
'Interior Site Supervisor','Interior project supervision',
600,'Skilled');

select public.doorbly_add_service(
'Real Estate & Property Services','Media',
'Property Photographer','Property photography',
600,'Professional');

select public.doorbly_add_service(
'Real Estate & Property Services','Media',
'Property Video Creator','Property videography',
700,'Professional');

select public.doorbly_add_service(
'Real Estate & Property Services','Inspection',
'Home Inspection Assistant','Home inspection assistance',
500,'Skilled');


-- ============================================================
-- 25. CONSTRUCTION & SKILLED TRADES
-- ============================================================

select public.doorbly_add_service(
'Construction & Skilled Trades','Masonry',
'Mason','Masonry work',
400,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Tiles',
'Tile Worker','Tile installation and repair',
400,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Painting',
'Painter','Painting work',
400,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Plumbing',
'Plumber','Plumbing work',
400,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Electrical',
'Electrician','Electrical work',
400,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Carpentry',
'Carpenter','Carpentry work',
400,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Welding',
'Welder','Welding work',
500,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Fabrication',
'Fabricator','Metal fabrication',
500,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Aluminium',
'Aluminium Worker','Aluminium work',
450,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Glass',
'Glass Worker','Glass installation and repair',
450,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Interior',
'POP Worker','POP work',
450,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Interior',
'False Ceiling Worker','False ceiling work',
450,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Interior',
'Interior Worker','Interior work',
500,'Skilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Labour',
'Construction Helper','Construction assistance',
300,'Unskilled');

select public.doorbly_add_service(
'Construction & Skilled Trades','Supervision',
'Site Supervisor','Construction site supervision',
600,'Skilled');


-- ============================================================
-- 26. GOVERNMENT & DOCUMENTATION
-- ============================================================

select public.doorbly_add_service(
'Government & Documentation Assistance','Online Services',
'Online Form Assistance','Online form filling assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Government & Documentation Assistance','Typing',
'Document Typing','Document typing',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Government & Documentation Assistance','Online Services',
'Online Application Assistance','Online application assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Government & Documentation Assistance','Printing',
'Printing Assistance','Printing assistance',
250,'Unskilled');

select public.doorbly_add_service(
'Government & Documentation Assistance','Scanning',
'Scanning Assistance','Scanning assistance',
250,'Unskilled');

select public.doorbly_add_service(
'Government & Documentation Assistance','Digital',
'Digital Service Assistance','Digital service assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Government & Documentation Assistance','Documents',
'Document Organization','Document organization',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Government & Documentation Assistance','Documents',
'File Management','File management',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Government & Documentation Assistance','Appointments',
'Online Appointment Assistance','Online appointment assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Government & Documentation Assistance','Documentation',
'Documentation Executive','Documentation assistance',
350,'Skilled');


-- ============================================================
-- 27. OTHER FREELANCE SERVICES
-- ============================================================

select public.doorbly_add_service(
'Other Freelance Services','Administration',
'Personal Assistant','Personal assistance',
400,'Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Virtual',
'Virtual Assistant','Virtual assistance',
400,'Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Research',
'Research Assistant','Research assistance',
500,'Professional');

select public.doorbly_add_service(
'Other Freelance Services','Events',
'Event Assistant','Event assistance',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Office',
'Office Assistant','Office assistance',
300,'Semi-Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Field',
'Field Survey Worker','Field survey work',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Survey',
'Survey Enumerator','Survey data collection',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Marketing',
'Mystery Shopper','Mystery shopping assignments',
400,'Semi-Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Promotion',
'Product Promoter','Product promotion',
350,'Semi-Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Promotion',
'Brand Promoter','Brand promotion',
400,'Semi-Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Sales',
'Sales Promoter','Sales promotion',
400,'Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Research',
'Market Survey Executive','Market survey work',
400,'Skilled');

select public.doorbly_add_service(
'Other Freelance Services','Recruitment',
'Freelance Recruiter','Freelance recruitment',
500,'Professional');

select public.doorbly_add_service(
'Other Freelance Services','Training',
'Freelance Trainer','Freelance training',
600,'Professional');

select public.doorbly_add_service(
'Other Freelance Services','Consulting',
'Freelance Consultant','Freelance consulting',
800,'Professional');

select public.doorbly_add_service(
'Other Freelance Services','Business',
'Local Business Advisor','Local business assistance',
700,'Professional');


-- ============================================================
-- 28. INDEXES
-- ============================================================

create index if not exists idx_doorbly_services_category
on public.doorbly_services(category_id);

create index if not exists idx_doorbly_services_active
on public.doorbly_services(active);

create index if not exists idx_doorbly_services_subcategory
on public.doorbly_services(subcategory);

create index if not exists idx_doorbly_services_name
on public.doorbly_services(service_name);


-- ============================================================
-- 29. AUTOMATIC updated_at
-- ============================================================

create or replace function public.doorbly_update_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_doorbly_services_updated_at
on public.doorbly_services;

create trigger trg_doorbly_services_updated_at
before update on public.doorbly_services
for each row
execute function public.doorbly_update_updated_at();


-- ============================================================
-- 30. RLS POLICIES (Read access for all clients)
-- ============================================================

alter table public.doorbly_service_categories enable row level security;
alter table public.doorbly_services enable row level security;

drop policy if exists "Allow public read access to doorbly_service_categories" on public.doorbly_service_categories;
create policy "Allow public read access to doorbly_service_categories"
on public.doorbly_service_categories for select using (true);

drop policy if exists "Allow public read access to doorbly_services" on public.doorbly_services;
create policy "Allow public read access to doorbly_services"
on public.doorbly_services for select using (true);


-- ============================================================
-- 31. VIEW FOR CUSTOMER APP
-- ============================================================

create or replace view public.doorbly_customer_services as
select
    s.id,
    c.category_name,
    s.subcategory,
    s.service_name,
    s.description,
    s.customer_hourly_price,
    s.customer_hourly_price as price,
    s.unit,
    s.unit as pricing_unit,
    s.skill_level
from public.doorbly_services s
join public.doorbly_service_categories c
    on c.id = s.category_id
where s.active = true
and c.active = true;


-- ============================================================
-- 32. VIEW FOR PARTNER APP
-- ============================================================

create or replace view public.doorbly_partner_services as
select
    s.id,
    c.category_name,
    s.subcategory,
    s.service_name,
    s.description,
    s.provider_hourly_rate,
    s.unit,
    s.skill_level
from public.doorbly_services s
join public.doorbly_service_categories c
    on c.id = s.category_id
where s.active = true
and c.active = true;


-- ============================================================
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
    'data:image/png;base64,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waMmuhM+aXNpZ25hdHVyZXgZc2VsZiNqdW1iZj1jMnBhLnNpZ25hdHVyZWNhbGdmc2hhMjU2AAACUWp1bWIAAAApanVtZGMyYXMAEQAQgAAAqgA4m3EDYzJwYS5hc3NlcnRpb25zAAAAAJxqdW1iAAAAKGp1bWRjYm9yABEAEIAAAKoAOJtxA2MycGEuaGFzaC5kYXRhAAAAAGxjYm9ypGpleGNsdXNpb25zgaJlc3RhcnQUZmxlbmd0aBkXi2NhbGdmc2hhMjU2ZGhhc2hYIG3/IFp5Gp3pg60uU5CR3BGZU2mcykxfJ0McIIoBnAt8Y3BhZE4AAAAAAAAAAAAAAAAAAAAAAYRqdW1iAAAAKWp1bWRjYm9yABEAEIAAAKoAOJtxA2MycGEuYWN0aW9ucy52MgAAAAFTY2JvcqFnYWN0aW9uc4KjZmFjdGlvbmxjMnBhLmNyZWF0ZWRrZGVzY3JpcHRpb254IENyZWF0ZWQgYnkgR29vZ2xlIEdlbmVyYXRpdmUgQUkucWRpZ2l0YWxTb3VyY2VUeXBleEZodHRwOi8vY3YuaXB0Yy5vcmcvbmV3c2NvZGVzL2RpZ2l0YWxzb3VyY2V0eXBlL3RyYWluZWRBbGdvcml0aG1pY01lZGlho2ZhY3Rpb25rYzJwYS5lZGl0ZWRrZGVzY3JpcHRpb254KEFwcGxpZWQgaW1wZXJjZXB0aWJsZSBTeW50aElEIHdhdGVybWFyay5xZGlnaXRhbFNvdXJjZVR5cGV4Rmh0dHA6Ly9jdi5pcHRjLm9yZy9uZXdzY29kZXMvZGlnaXRhbHNvdXJjZXR5cGUvdHJhaW5lZEFsZ29yaXRobWljTWVkaWH/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAMABWADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+/OIYUDphVGPoAvck/wAPT6nnNSEA/ljoP6//AKqRc8cEfKM5IOCO3H8xx7U6jfcLt6vfr1Exj8sdBx+n/wBb2owP0wOBx9OP/re1LRRb+vx/r/ggIBj8sdv8P/re1GO/fGM8fn0/+t7UtFAABj/I/pSY/l6D8+nX9PalooAKTHOfbHQfnn/IpaKAEAx/kf09e9GOc+3oPzzj6/nS0UAFJjnPfGO3+H/1valooAKTHOfbHQfz/p0paKACkxzn2x0H55/yKWigApMc574x2/w/+t7UtFABSY5z7Y6D88/5FLRQAUmOc+2Og/PP+RS0UAGP5Y7f5/pSY5z3xjt/h/8AW9qWigApMc574x2/w/8Are1LRQAUmOc+2Og/PP8AkUtFABSY5z7Y6D88/wCRS0UAFJjnPfGO3+H/ANb2paKACkxzn2x2/wAP/re1LRQAUmOc+2Og/PP+RS0UAFJjnPtjoPzz/kUtFABSY5z7Y6D88/5FLRQAUmOc+2Og/n/TpS0UAFJjnPtjoP5/06UtFABSY5z3xjt/h/8AW9qWigApMc59sdB+ef8AIpaKACkxzn2x0H55/wAilooAKTHOfbHQfz/p0paKACkxzn2x0H55/wAilooAKTHOfbHQfnn/ACKWigApMc59sdB+ef8AIpaKACkxzn2x0H55/wAilooAKTHOe+Mdv8P/AK3tS0UAFJjnPtjoPzz/AJFLRQAUmOc98Y7f4f8A1valooAMfyx2/wA/0pMc59sdB/P+nSlooAKTHOe+Mdv8P/re1LRQAUmOc+2Ogz9c4+vt7UtFABj+WO3+H/1vakxzn2x2/wAP/re1LRQAUmOc+2Og/PP+RS0UAFJjnPfGO3+H/wBb2paKACkxzn2x0H55/wAilooAMfyx2/z/AEpMc59sdB+ef8ilooAKTHOfbHQfnn/IpaKACkxzn2x0H55/yKWigApMc59sdB+ef8ilooAKTHOfbHQfnn/IpaKACkxzn2x0GfrnH19valooAKTHOfbHQfnn/IpaKACkxznvjHb/AA/+t7UtFABSY5z3xjt/h/8AW9qWigApMc59sdB+ef8AIpaKACkxzn2x0H55/wAilooAKTHOfbHQfnn/ACKWigApMc59sdB/P+nSlooAKTHOfbHQZ+ucfX29qWigApMc59sdB+ef8ilooAMfyx2/z/Skxzn2x0H55/yKWigApMc59sdB+ef8ilooAKTHOfbHQfnn/IpaKACkxznvjHb/AA/+t7UtFABSY5z3xjt/h/8AW9qWigApMc59sdB+ef8AIpaKACkxzn2x0H55/wAilooAKTHOfbHQfnn/ACKWigApMc59sdB+ef8AIpaKACkxzn2x0H55/wAilooAKTHOe+Mdv8P/AK3tS0UAFJjnPfGO3+H/ANb2paKADH8sdv8AP9KTHOfbHQfnn/IpaKACkxznvjHb/D/63tS0UAFJjnPfGO3+H/1valooAKTHOe+Mdv8AD/63tS0UAFJjnPtjoPzz/kUtFABSY5z7Y6D+f9OlLRQAUmOc98Y7f4f/AFvalooAKTHOfbHQfnn/ACKWigApMc574x2/w/8Are1LRQAUmOc98Y7f4f8A1valooAKTHOfbHb/AA/+t7UtFABSY5z7Y7f4f/W9qWigApMc59sdv8P/AK3tS0UAFJjnPtjt/h/9b2paKADH6cUmOc98Y7f4f/W9qWigAx/LHb/P9KTHOfbHb/D/AOt7UtFACAAf5/wpcD09vw9KKKADA9KQgHtyMkcdD60tFADAckcAfKOMjHfgY689/QdB3f8Ah/n0pgzkYGPlHG7PboMZ79+nXHXl2B6evPcd+uc9fTPNL+u+z+dn2WnyF6/8Hp6/PX59looopjCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKD0P/6qKKAGA5I4AyBxkds4GB3B744wQPUuA9u3XPIzyRnr19O/pTRk4OB0HGemO2PUHr6dB05dj27evIzyQT169xml/X4/PXttfsukrZfLXq9t/Xrrt+C0UUUygooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBgJ4yOw4JHb29Qep7YwB6ux7c4Pfp3xnr19M0gzxwOg78DHbHqD1PYDA5HK49u3XPrzjPXr3pf1+K9dun9Wnovlqt3t+fXV6L7loooplBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFADBnjgYx0zxkdseo6njgDA5HKj2HUdc+vOM5z17ikGeDjsO/Ax2x2IOCfToOerse3brn15xnr170v6/FeW66f1aVstO23y/Dvq9F9y0Uf59aKa2X9f5fkigooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBgycHHbkdhjt16g9eOMYGSOXDoMDqPX1569evcZ9aaCTg46j14/L2JGT26DPd2Pbt1z684z1696H/X3/mun9MlbLTott+n4d/JfctFH+fWihbL+v8vyRQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQBGpPH0HBP8ALnGQRyR0wccjlw9h1HXPrkkZ69e4z1poPI4HQdT+QH49cdMYHPV2Pbt1z65JGevXuM0v6+579deqX9KVsvlr1e2/r112/B1FFFNbL/higooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigCJT0+g6n6cD8RzjPTA6DMg6DA6j19eevXr3GfWmKeRwPujqf5fQjnHTBxyOX49ucHv074z16+maO39dd3vZ9lp+pK6fLXdvbfTrs/T7looooKCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAIxnjgdB1Ppjpz1BGTx245GS/Htzg9+nfGevX0zTATx9BwT3Hp2yOpIzjtz1fj25we/TvjPXr6Zpdvn+e73s10WnoukrZPvbXd623/X0v6LRRRTKCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAI1J4+g4J9u30IyTzjkDpy/Htzg9+nfGevX0zTFzxxxgdTxn25xkYyfTHHqX49u3XPrzjPXr3pf19z+eq6L+lK6fLXdvbfTrs/T7loooplBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAEYJ447DqfT05xkHr6dvUvx7c4Pfp3xnr19M0xSeOOw6njj07ZHBJGcdOvV+PbnB79O+M9evpml2/rru99V02vvbtK2T8lr1e2+j3669N+y0UUUygooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigCNSePoOCf5c4yCOSOmDjkcuHsOo659ecZznr3FNGeOOoHU+nQDtkdTjOO3PV+Pbt1z684z1696O39dd3vZ9lp+ou2nb16b6ff6fctFH+fWigYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQBGpPHHYdT6Dt2yO5HTtz1eOgwOo9fXnr169xn1pgJ4+g4J7j07ZHUkZx256vHQYHUevrz169e4z60Pp/XXd72a6LT9SVsvlr16b6devkvuX/AD60Uf59aKF/X/B2sUFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUARgnj3A6nv2xzjIOM4zjoOerh7DqOufXnr169xmmqSccdh1PcenbIPUjp29S4ew6jrn1569evcZofT+uu73s10Wn6i7advXpvp9/p9zv8+tFH+fWikv6/qyGFFFFMAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAI1OcfQcE9/Yeo6kgfT1Lh7DqOufXJIz169xnrTFPI47Acnv7c9QepAPPTJ5Lx7DqOufXJIz169xnrS+X/B1672t0V16Lcnto+nr03/XyX3O/wA+tFH+fX9e9FC/r7uui/r7igooopgFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFNLqDgnkdQATjp1wDjqOuP50AOor5G+Kn7dP7LPwgvbnR/Ffxb0K68QWjPHc+HvCMd74z1q2mjO17e+tvDVrqcOl3CtlWh1W4sZFYHK9cfN97/wVx/Zdti4t9O+K15FGCz3I8KaTZQKq4Jdm1HxHayRqACSZI0Cj72MYr2cPw9nuLhGph8ozGrTnZwqRwlZQmnazhKUFGd7q3K3foaxoVpK8aU2ns+VpP0btf5H6k0V+KHib/gvF+xZ4Zke3+xfFbXL2Ph7TQ9A8NXxR1wCj3A8VLZxnOQd9wDkdDwTxNl/wcBfswXs2E+DX7RZtT0ubfw54Nuvl4+byovGXoGOBITjp1GPrcL4Q+J2MorEYfgjiCVCSvGpPBSoRkrXvBV5UpTTWzgpX6HTHLMfNXjha1vOPL/6U0z95aK/LT4Sf8Fiv2F/ipqFto998S9V+E2t3csUFvpvxl8Nah4FtZZ5GCLGPErjUPB0ZZzhTdeIrbcBlQcgV+nWm6xpWsWFnquk6jY6npmowRXWn6hp91BeWN/azqHgurG7t3kt7u2mQh4p7eSWKRTuR2HNfKZ5w1xDw1XjhuIckzTJa07unDM8DiMH7ZK15UJVqcIVoK6vKlKcfM562Hr4eXLXo1KUnspwlG/+FtWl6ps0aKQMGzg5wSD9R1pa8QxCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAIlPI47Dqf0GT2I5wCB26ZLx7DqOufXJIz169xnrTV6jjtjk+npk9j1xnHYdy4ew6jrn1ySM9evcZ60vl/wdeu9rdFdei3J+/p69N9P/AtdkO/z6/r3oo/z6/r3ooW39dvRfl/kUFFFFMAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiimu21WOQMDgnnntwOTz2HJ7AmgDzb4vfF/4efAn4e+JPij8UfEll4W8GeFrT7VqepXbFpJZXdYrPS9Ns4w9zqesapdPFY6XpVlHLe397PDbW8TSOMfye/td/8FVPit+0jqmqeG/Cd5qvwr+DBkmtbHwfpGoGy8TeKLAkqt58Qte02ZZJjdp87+E9Juo/D9lG622oS+IriAaiPFv+Cxn7ft5+0F+0ZrPwh8G63JL8F/2fNf1TwtpkFpMPsHjD4q6a02meOfGd0Y2MN9b+Hb4X3gnwmzNNDaR2fiLVrJv+KhHl/kGPG+z53m6gghmOAeeTtG0DHzcg4HUnGB/WPhx4R0cDlmCz3PMIsRnGOo0sXhcLXgpU8rw9aKqYdypSTTxtSnKNSpOa5sM5xowUKkKk5+5hcFGnCFSouarNKSi1pTTtZ2195q2ttL2Wtz7Q1X4w6J4S0a41PUplt7C1QBLe2EP2i5nk3GGysoQf3tzOxwgygVQZJGSKN3X418ZfGXxt8U79rKS5m0nw+XP2bQrGZ47VIMgRyarNGFfULoD5pPM2wqxxBDCCSPF/EniXUfFUkeuztIvh+C4n0/wxbuZDHf3ETeXfasgwFlRpEMUci5KwLEgG6WXK2iTPAbNWkitjzqNxGxSe7kIDGwhkXbJDAoP+lyoyyOGEELKpmcf11wjwVlmQ4aGa4uhRxOcVXek6sFVhl9kny04P3Xio3Sqz+KFR+wg4ctSUvew1CnRSqzip1JfDG2kNFbT+Zt2drPor319s8L/Erw54Fdjo/hmDxp4gt2Ecl3OkT6Xp8qFSyiWZ4NPWVGIYk3M1yOS9rtVYz6NF+138crcg6bZ+DtOgBBW0a+uF2KP+WYNhowjULgqBvmUdcuuc/MyRpFGkMSJFDCoWKGJRHFGi8BUjXCqoz0A575q2p24A+6eeP55HJ/PkcdBXv4nK8Jj6kq2Nw1PGVZf8vMW512lde7BTkqNOK6QpUoJW3b1fROMZtSqPmk/RpLR2WtkuyS+b6/Ymlftqa3cL/Z/xc+EWheMdBlAjvLjR4rDxDNHE2RI32Gaz0zUxtXLD7Lb3ciKGIDOwNfoj+yH+1X4z+FcLeNv2GviTFrXhaC7N34w/ZW8f6td6j8PNcfd5mpWfhmK6X+2Phd4wlAdbfUNLhskluVX+1bDWLeN7V/wvDDJIAyCBnPTPQg8e+MZ5p+mah4i8JeJbTx98PtSbQPHelGN4LqKaS30/xHBCwc6J4nhhAS9guFXybXUXU3ulymOWOSS1WS2k+azrgbJ82y/FZesNh6dDEJyqZfi4SxmR4udmorGYCtOf1ebekMxy+ph8XgpP2uH99JxxqYeM4OCSlCVr05K8JbWvF/C20mppprdKyuf6On7IH7X/AMMf2xfhZD8Q/AbXmg61pN/J4b+Ivw28RmGDxl8NPG1pEr3/AIY8S2kWI2zuFzomsWwGneINLaO+sdjrdWlr9Z1/Dv8Asmftrn4U+OvAv7a/hOG60/RZL3Svh1+2T8PbYF/7R8FG9isJfGU2mxMFbxf8M9RuBrNpeqpmvNM+0Wwk+yaleCT+3TRdX07X9J0rXtGvbfUtI1vTrLVdL1G0lWe01DTtQtY7yxvrSdMxz2t1azRzW80ZKSwyJIhKsDX+dvip4fT4Fzmn9Wp1oZNmcsT9ShXl7Wtl+MwkqccwyevWslXlgnWoVsLikv8Aa8uxWDrytWlXp0/k8wwawlSLhf2VS/Kn8UJRspU5PZ8r1i18UX1szUooor8sPPCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAiU8jjsOp/IDPuOcZx0HTl49h1HXPrkkZ69e4z1pinkcdgOT/LPoeuM47e7x7DqOufXJIz169xnrS+X/AAbPd72t0Wnp1JXTfp69N9Pv8kO/z6/r3oo/z6/r3ooW39dvRfl/kUFFFFMAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACvjv8A4KA/Hy5/Zh/Yw/aT+OWmTLD4g8AfCjxLe+FHY42+NdXt18O+CMjIDBvFmr6RlDncoK4ORX2JX4g/8HDOqXOm/wDBMD4wRW7Og1jx78B9HuSrbQ1pP8YPCd3NG3HKObFA68hgORxX03BeW0c44w4WyrExU8NmHEOT4TEQe08PXzDD068H5TpSnF+pth4qdejB6qVWCa7pyV103Wh/CSNXvEij+13Mt5dmMG8vJ3Ms93eSEy3l3PI+Hknubh5J55XzJLLIzsSzNmhPcahrs+neHdKaRdS8TarpPhnTplJLJd+IdQt9LjuFVSv/AB7i5ac7eQsZKjiuOF9KfmzuJ4J+8OT7n0z6ewr0H4LyxzfG34QR3JzEnj3TLp1wSM2dreXUZ28rhJoo3HBwVB4bFf6heyhR9riuSMpYajiMWotJxk8NSnXjBxtblnKCTSVrKyPqJt2lJNcy0S3tta/R3XX/AIc9U+MUOkWnxPbwF4ciSPw18LtF0/w3ZRptCSXdnaQPe3Eoxta4lupkjmfAMkkJZhls1zcRVEC4A74J/iOCSM8kMT6cj04rImvW1j4g/FLVpstLd+Jtam+8WG2XX2QEk8gFF8tevCFRwtbOP8f8/wCe+OlfXYShOhgcvw85OcqOBwvtZyfNKpXq0Y1sRUk7356tapOc31bbeqSPSS5YQhr7sUr9W3FNtvrdt3tp09JkbBI4yW79+nfA4PoOvcDmn5Pqf8OMcenFRJ1OfTj1HQY9/Tp7fWQnGPc4/wA/5FdNtV0WzVtH/X9bu+kZW3t+vRa91r8kmPVs5HU9Qffjgn3I68dMdakVySMcAMvJ/wCA8E+56N14CjkVWU5zz39enTAB7g/hjpjOTTgRjnIxwO3oB16j06HtTt0/r1069fUV9n5rRJdlf5uytba3Rntv7OnimLwt8VdU8LaliXwf8YfDF/pGvWEuTbPrOlwCN5vLbMRl1DRLmaNwInaV7GN3IK7h/a//AMEUvjHf/FL9hvwv4X1y/k1DxF8AfGfjH4Cajczu73E2leB7u3uPBcsxkd5Pk8Dax4cskdypk+xM23IJP8I2m3DWviXwVfRN5ctr4ntjG4JBC3Nhf20qA9fmSTBAODjac4Of67f+Dd/Vprzwj+2lpplZrW0+Ovg7VoYt3yRz658N9NW7cKMKGmOlwlyAdxTJJ4r+ZfpJ5JhsVwJmmZOCVbLcbkOPjO2qrPE1clmk1squFzGiqiuud4Sg5czhFrys5pKWFqTe8JUpr/E5qm3tu4yta/S/Y/o5ooor/Pk+RCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAiU9OOw6n+WT6jnGemB0yXj2HUdc+uSRnr17jPWmr247DqfTsPoeTjgdvUuHsOo659eevXr3GaXy/q/Xe1ui09OpKW2j6evTfT79dkO/z6/r3oo/z6/r3ooW39dvRfl/kUFFFFMAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACvwr/4OKzj/AIJkfETnbn4q/APJGckf8LQ0X8O2Mc57+lfupX4U/wDBxedv/BMb4iEg/wDJVvgFj0yfiloo/rk4z2/H7nwy/wCTicEf9lTkn/qwoHRhXbE0H2rU3/5Mj+BNfuj8e3+Hf14/nx3vwhcr8Z/hUR8uPFsJDY54sLtc5JyQc/MRzj61wQOAucdvy/8ArcZ/L0rvPhD83xn+FeBuP/CVpgZyMixuSPXk84IHXryMV/pzXt9Ux1ldfUMevLXC1U/JdbfhofQ82jVmtX6br79tH6mvoLsfEvxEBOWGs3pJPPXxBJjnA5JVjyOTk9evX1xmhlm8S/EJ8H5tcuicHkZ1+4zzjOCBk9O3qa69WPfsAB9e3/18DsK+znHWkujoYbTZJfVqN7fiezL4nta6S6WSjHdL18ySgf5/yc0zoTyeuOeQOAfbH8h+tOye4xzjr9f06AdDz0FJximrt9PNO2/TqT166+tvv2Q9WxjOT245OSQByT07cHtyKeCSckY7Y/XJ/HOCOO3bJipynkc9eOcnH09Ogp8qttrZJ20vt5ad3pf8Rp9On+duvTa/XbbcmjbGp+GeTx4l01gR2Hl3a9f69ccelf1qf8G4Ds2hftw7s/8AJXPhcQOSBu8AXqnGf90A+mOuBk/yTrn+0/DWRyfEul+uMlbkdu3UZ96/rX/4NwB/xIP23+p/4uz8LQeeePAF99Oef89K/A/pD2/4hbxZpuuH7fLiTK7+T1du9/Lfgzf/AHGvpt7BPXr7SGu3y+fW5/TLnnHsT+WP8aKP8/5/Kiv81j40KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigCNT047Y5Pf2yfUDOM47DuXD2HUdc+uSRnr17jPWmqScccYHU8ZHp2yMZJHpx6lw9h1HXPrkkZ69e4z1pfL+r9d7W6LT06kr57L16b6bvrrpZDv8+v696KP8+v696KF/X3ddF/X3FBRRRTAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAr8JP+DjTP/DsX4h4OMfFb4Bc89P8AhaWi+nT/AOv+X7t1+EX/AAccHb/wTA+Izdh8V/2fuef+ir6CMcf7w9+tfceGbS8Q+CW72XFGSN23/wCRhQ28zown+84fb+LDfb4kfwMAHYDjrzjBPXHrjkc9PX8a9C+DRz8a/hMMfL/wl8QyF5ybG5z0OCMZJ7YHGSDXm0cwIHPOACevTjPckdPp09a9J+C7D/hd3wkIIwfGMHBHGPsN2Cc469cDA5OO5z/pnWl/sGYNNq2XY99/hwlXV9n3Vk72+f0124y+F7u6t5aXt06WXqW/Dxx4i8fgdf7XuenbOvz8nt1zwRnIxmuu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lrftfd3t33X/AAz2Mzxb4jttJtZ0M6RMkLy3kxfC28CLukGQSS20EADrxgE9f7e/+DfP/gmzffsy/By9/ay+NXh19O/aC/aH0KyXw3oeq2zxat8KfgfLJbatoHh2e3nXzNO8UeO547Lxb4xgYLPZW0PhfQLhYLvRdQSX8W/+CDn/AASqvP2vfiPpf7Y37QfhyWT9mT4YeJVvfhj4c1q2lFr8evih4fvgV1ae2uN0epfC34fapbb7p5Fax8XeMLaLSFF1pWia7Bcf3tKiooVAFUcADoK/hj6TPi5Sxsqnhxw5ivaYXD1oy4oxtCfuYjE0ZRnSyenOLtKlhqsVWx1tHXjSw+9GvGXzGcY/2j+q05XSd6sk9G1blgtdo/a7uy6DqKKK/jI8AKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigCNSeOOw6n+XPUHr6dB0GXjoMDqPX1569evcZ9aYuTjjjA6n0x0Gex6nH09S8dBgdR6+vPXr17jPrS+7/hn13s10Wnp1JXo+mr1fTf8n6X8xf8+v696KP8+v696KF/X3ddF/X3FBRRRTAKKKKACiiigAooooAKKKKACiiigAooooAjkQSIU9c89MEg/NwRnGeRznPfof4jv+C4X/BCzVfAmqeNP20f2IfBVzqngfU59R8WfHz9nfwjprT6h4Rvrh5LzXPit8GvD2nxmS78LXDm41Tx98N9Nha60Wd7nxP4OtJ9Nl1TRbH+3WmsisMMARz9ec9D1B5yCDkHkYNfRcMcT5nwrmUcwy6peMkqWMwlRy+rY7D3vKjXinuvipVY/vKNS04P4oy0p1HTldbdV0a0v87bPpp00P8AG2ilhuoIpoXgubW6iV4pY2SaC4hkwQ8TqxWRWUZBBGc5GOTXEajb3Og3Jv7IyNZsw3lQf9GJOdki4wYsZ2uc7RgAjo392n/BYP8A4N8bP4t3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w0oU3Ulb43eMW0l5X6623t8z+Qv9lf8AZC/bS/4KQeLT4c/Zi+Fup+KfDdpqC2HiD4q63JL4U+BfgZsoZhrnjy4tZdOvdStYmMp8K+DrTxR4yuI0Zl0low0sf9tf/BMv/g39/Zs/Ycu/D3xh+LtxZ/tM/tS6cYNQs/HnivRYrf4d/DHVPL3OPg98P7t76HTdQs5WMdv4+8UXGseM2aEXWky+FormbTF/dvwd4I8HfDvw3pPg7wD4W8PeCvCOgWcOn6F4W8J6Np3h7w5omn2+RBY6RoekW1npemWcQJEdtZWsEK5OEGa6iv468Q/HXjXj9VsFPE/2LkVS8XlWXVJw9vTf2cdik41MSmkuanFUqEnvRbSZ4eIx2IxP8Sdop3UI3Ufmru/5aXsMRFjGFULklmx1LHqSepJPUk0+iivxU4wooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAjBPy8cYHU9/z6g9cZx0HYlw9h1HXPrkkZ69e4z1pqknHHGB1PGR6dsjGSR6cepfj0HUHnPrz168nuKXy/wCDr13tborr0W5K9H01er6b/k/S/mL/AJ9f170Uf59f170ULb+u3ovy/wAigooopgFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUEA8GiigBrKrDDKrD0IB/n9axdf8MeHPFWl3GieKNA0bxJo12hjutI1/TLLWdKuY2BBS407UYbmznQg4KywspHGMAVuUUDu+7Pzj+KP/BIz/gm38X7q5v8Axd+x/wDB6z1K6LNNqfgTR774W6g8rElpnufhnqPhNpZi20l5vMLEEtmviHxp/wAG1/8AwTK8XXM0tr4Z+M3hOGUEix0H4t6hqdkgJ5iSPx3pXjOYIBgKDOcgHLcnH79UVrCvXptShWqwa2cak4222s/Imyvey+5H8x/iL/g1C/4Jpa4Wa28TftK6G2z5W0nx94EtnDA8HenwvU+hbOcnJXb28l1X/g0H/YMuCW0f9oj9sjRGxuAHjD4Samgxj5At98JC23hcZkJPJLEkkf1lUV6+E4n4kwKtg8/zjDLTSlmGJjHS1vdVTl0t2L5mttPRtduzX9fK38jQ/wCDQT9j1W/5O2/bAMaqPk874IhmIP3fM/4VaxC4GMFScE4PavQfC3/BpD/wT00mZJvE/wAZv2x/GpViWt7j4l/Dnw1ayp1Eb/8ACM/Cawu1G4DPlX0bbSQrKeR/VJRXbLjfjGceWXE+dtPf/hRxC7aXjNPp36sfPP8Aml/4FLXbTfy/rQ/Bn4c/8G1n/BIPwBNDdX37Net/Ey9gEbJcfFn4yfFvxjbyMmPmn0QeMNN8NzElVZoptGe2Y7lMRRio/Uv4K/sW/si/s428Fv8AAX9mb4FfCA26CNL34efCzwX4W1Z1Xo1zrWlaNb6xeScDM13fTSsQCzlhmvpuivFxWaZnjv8Afcxx2Mvv9Zxdeun8qlSS/Ah6u76bX1t99yPyowd23LZBySScjOMEkkYyenrUmBnPfGPwoorgAKKKKACiiigAooooAKKKKACjrRRQA1kRsFlViOASASOvQnkdTyDnk1wnjz4V/DL4p6S+g/E34eeB/iLobqVbRvHfhTQvF2lHduyf7P8AEFhqFpn5jz5WcYHYY72ijrfqtn1QH5XfEj/gif8A8EwPibcXN9qv7JPgLwxqNySzXnww1Hxd8KdsjZJdNP8Ah54i8OaOGJw3zaa6kj5lIJFfG3i//g2S/wCCZ3iyaSSKy+PHhyN+VtdM+Klnq9ugOB5anxr4Q8WXWwAAAtdM5xlnJJNf0NUVtDE4im+anXrQfeNSaa9LPT5BZb2T9Un+aP5gda/4NM/+CZ+qlntfGH7UmiSFPlbSfiP4EtsN67P+FVmMHoSNgBO7GK8t1X/g0E/YRuCW0f8AaR/bO0bjIVvF3we1RR/sAXfweRsdOshJwTnJr+tCivXwvFHEmCssJn2b4dKytSzDExWlvsqpbpbbuUpNbaf4brtpo1pp+LP5IYP+DQb9jKNlM37V/wC2RPGoBKJqPwPgZ8EfLvHwjl2jA9CeTj39U8Kf8Gl//BNvRZI5vEvxD/a+8eMjBpINX+L/AIS0C0nQceW6eDPhl4eu0BwufKv42ALbXGQR/UVRXXPjbjCouWfE2eNf9jHEp9Osaietulh88/5pf+BS8l38v60t+Jvwr/4N3v8AgkJ8LJ7e/t/2QfD3j7U7ZlK3nxj8bfEj4tRylAu1rjRPGvi7VfC8pLKGZG0IwkjiMKcV+q/wt+AXwO+B2kLoPwW+D3wv+EeiqixjSvhl4C8LeBNPZEG1VktfDGlaXDLgcEyKzNgFiSM163RXh4rMMfjpc2Nx2Mxkv5sVia2If31Zz7fIm7bv16d16N69O5GIo1LMEXc33jjJPfnNSAADA4HpRRXGIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAjXPHHGB1Pp6c9j19O3Ylw9h1HXPrkkZ69e4z1pqk8cdh1Pp6e4I5OOO3qzx0GB1Hr689evXuM+tL5L/ADs+u9mui09OolstLbevTfT7+1vuX/PrRR/n1/XvRQtv67ei/L/IYUUUUwCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAjGfl+g4J/zyDyeuBwOnLh7DqOufXJIz169xnrTQTx9BwT3Hp2yOpIzjtz1fj25we/TvjPXr6ZpP0W369d7NdNvTqSvR9NXq+m/5P0v5i/59aKP8+v696KFt/Xb0X5f5FBRRRTAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigCNSeOOw6n09PcEcnHHb1Zw9h1HXPrz169e4zTQTx9B1PfjGOcZB646dBz1eOgwOo9fXnr169xn1pfL/AINnu97W6LT06kr0fTV6vpv+T9L+Yv8An1/XvRR/n1/XvRQtv67ei/L/ACKCiiimAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAEak8ehA6njOO3PY9cZx0Hu4ew6jrn1569evcZpqknHHYdT6Y6fQjJI9OPUvHQYHUevrz169e4z60vl/wbPd72t0Wnp1Euny169N9OvX0+5f8APrRR/n1/XvRQtv67ei/L/IYUUUUwCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAjBPHpgdT39ueoPX06Dtlw9h1HXPrzjOc9e4pqk8cdh1PoO3bI7kdO3PV+PbnB79O+M9evpml8v+DZ7ve1ui09OpK9H01er6b/AJP0v5i/59aKP8+v696KFt/Xb0X5f5FBRRRTAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigCMZ49wOCfT07ZGMnGcduerh7DqOufXnr169xmkGeOOoHfuO2PXjJI6YOMnkux7c4Pfp3xnr19M0u39bPrvqui09Ool/lr16b6dba+l/RaKKKF/Xd+ui1GFFFFMAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAGAn5enIHU9/THrnGT2HA93Y9u3ryM8kE9evcZpozx3BA78ce3rxkntg4Gerse3OD36d8Z69fTNL5L/Oz672a6aq/ZCWy+Wu7e3rv116b9looooX9d366LUYUUUUwCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAYM/L0wR0J7j8eoPJPOBwOnLseg7Hvz68nOevpmmjJwcAjA78fl655Jxx0HI5dj0HY9+fXk5z19M0rf18+u+q6d9/SVsvRa7vp5der7L7looopr+v+DtYoKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAYCeOnQY59Pb1zgk9ug56ux6Dse/Pryc56+maaM8cZGB3449vXOCT26Dnq7GOg9ec/jyevJ9M0vu/4Z9d7NdNVfshf1da9vLZ9fv9Fooopr+v+DtYYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAwZ46YIHU9x0wPXPJ4+nPV2PQdj359eTnPX0zTRnjocgd/T0HrnBJ7duerse3OD36d8Z69fTNL+vufXfVdFp6Lov6v16evz1e2/ZaKKKa/r/AIO1hhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAEYJ46dB1P5YHrnqcdsDpy/HoOx78+vJznr6Zpgzx0OQO/p0x7g8njjtz1fj0HY9+fXk5z19M0vu6/hJ772a6K69ELz/ABXy8uvXyS+S0UUULb+u3ovy/wAhhRRRTAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigCNScjgcqOpHb0GeoPJOOOcZPV+Pbt1zz64J69fTPNMUnI4H3R1Pp0A5PII5447epeBjt+Pf15/H680v+D+Euu+q6LT0XRLZfLXq9vLr1/qy0UUU1/X/BGFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUARqTkcD7o6n06Ae4I5OOO3qXge3b8ffP/wCs5NMU5I4xlRwSDj0HU9COo/LuZPwxS7fP8+u9mui09F0Xyt+fT/hnr0XyKKKKYwooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBi9j/srkZ6cfTB9OPfin00FeMEYx1yM8DP6A59s9KXI9R+fr0/OgBaKTIPQg/j6dfypcj1oAKKTI9R+fp1/KlyPWgAooyPX/I60ZHrQAUUmQehB/H06/lRkeo/OgBaKTI9R+dGR6j86AFopMj1H50uR69elABRSZHqPzoyPUfnQAtFGR6iigAooyPUc9PeigAooyPX/ACOtFABRRkeooyPXr0oAKKTI9R+dLkeo56e9ABRSZHqPzpcj1FABRSZHqPzpaACikyPUfnS5HrQAUUZHqKKACikyPUfnS5HrQAUUZHqOenvRQAUUmR6j86WgAooyPUc9PejI9evSgAopMj1H50tABRRkeo56e9GR6/56/wAuaACikyPUfnS0AFFJkeo/OloAKKMj1FGR69elABRSZHqPzpaACikyPUfnS5HqOenvQAUUmR6j86XI9RQAUUZHqOenvRkevXpQAUUmR6j86XI9Rz096ACijI9RRkevXpQAUUZHqOenvRkeooAKKTI9R+dGR6j86AFopMj1H50uR6jnp70AFFJkeo/OloAKKMj1/wAjrRQAUUmR6j86WgAooyPX/I60UAFFJkeo/OloAKKTI9R+dLQAUUmR6j86WgAooyPX/I60UAFFGR6iigAooyPUc9PekyPUfnQAtFJkeo/OlyPXr0oAKKMj1HPT3oyPXr0oAKKTI9R+dLketABRRkeo56e9GR6j/P8A+sfnQAUUZHqOenvRQAUUmR6j86XI9f8APX+XNABRRkeo56e9GR60AFFGR6/5HWigAooyPUUZHr/nr/LmgAopMj1H50ZHqPzoAWikyPUfnS5HqOenvQAUUZHr/kdaKACijI9RRQAUUZHqOenvSZHqPzoAWikyPUfnS5HqOenvQAUUZHr/AJHWigAooyPUc9PejI9evSgAooyPUc9PeigAopMj1H50tABRRkeo56e9FABRSZHqPzpaACijI9RRkevXpQAUUmR6j86Mj1H50ALRSZHqPzpcj1FABRSZHqPzpcj169KACijI9Rz096Mj1HPT3oAKKMj1HPT3oyPXr0oAKKTI9R+dLkeooAKKTI9R+dLkevXp70AFFGR6jnp70UAFFGR6/wCR1ooAKKMj1/yOtFABRRkev+R1ooAKKMj1FFABRSZHqPzpcj1HPT3oAKKTI9R+dGR6j86AFopMj1H50tABRRkev+R1ooAKKMj1/wAjrRQAUUZHr/kdaKACijI9f8jrSMcKx9FJ/IUAf//Z',
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
