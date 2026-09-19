-- SkyCodes schema. Column names match assets/js/data.js exactly, so the seed
-- JSON exported from the admin panel imports without remapping.

create extension if not exists "pgcrypto";

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  blurb text,
  image text,
  sort_order int default 0,
  is_featured boolean default true
);

create type fulfillment as enum ('digital_download','physical','service_quote');

create table products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category_id uuid references categories(id) on delete restrict,
  price_inr int not null check (price_inr >= 0),
  discount_price_inr int check (discount_price_inr < price_inr),
  short_description text,
  description text,
  specs text[] default '{}',
  images text[] default '{}',
  file_path text,                       -- private storage key, never public
  fulfillment_type fulfillment default 'digital_download',
  stock_qty int,                        -- physical only
  is_bestseller boolean default false,
  is_active boolean default true,
  is_bundle boolean default false,
  bundle_includes uuid[],
  sales_count int default 0,
  created_at timestamptz default now()
);
create index on products (category_id);
create index on products (is_active, created_at desc);

create table services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  is_active boolean default true
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  type text check (type in ('free','paid')) not null,
  price_inr int,
  description text,
  thumbnail text,
  external_url text,                    -- free, YouTube-hosted
  level text,
  hours numeric,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  title text not null,
  video_url text,                       -- private storage key
  duration text,
  order_index int default 0
);
create index on lessons (course_id, order_index);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  progress_pct int default 0,
  completed_lessons uuid[] default '{}',
  certificate_issued boolean default false,
  enrolled_at timestamptz default now(),
  unique (user_id, course_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  items jsonb not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  status text default 'created' check (status in ('created','paid','failed','refunded')),
  total_inr int not null,
  shipping_address jsonb,
  created_at timestamptz default now()
);
create index on orders (user_id, created_at desc);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  user_name text not null,
  rating int check (rating between 1 and 5),
  comment text,
  is_approved boolean default false,
  created_at timestamptz default now()
);

create table service_enquiries (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete set null,
  name text, email text, project_description text, budget_range text,
  status text default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz default now()
);

create table subscribers (
  email text primary key,
  created_at timestamptz default now()
);

-- Row level security: the catalogue is public to read, everything personal is not.
alter table products enable row level security;
alter table categories enable row level security;
alter table courses enable row level security;
alter table services enable row level security;
alter table reviews enable row level security;
alter table orders enable row level security;
alter table enrollments enable row level security;

create policy "catalogue is readable" on products for select using (is_active);
create policy "categories are readable" on categories for select using (true);
create policy "courses are readable" on courses for select using (is_active);
create policy "services are readable" on services for select using (is_active);
create policy "approved reviews are readable" on reviews for select using (is_approved);

create policy "own orders" on orders for select using (auth.uid() = user_id);
create policy "own enrollments" on enrollments for select using (auth.uid() = user_id);

-- Writes to products/courses/orders happen only from the server with the service
-- role key (admin panel + Razorpay webhook). No client-side insert policies on purpose.
