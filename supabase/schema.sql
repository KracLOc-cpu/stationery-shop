create table if not exists products (
  id text primary key,
  name_ru text not null,
  name_kk text not null,
  description_ru text not null default '',
  description_kk text not null default '',
  category text not null default 'Разное',
  price integer not null check (price >= 0),
  stock integer not null check (stock >= 0),
  image_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  customer jsonb not null,
  fulfillment jsonb not null,
  items jsonb not null,
  total integer not null check (total >= 0),
  status text not null check (status in ('new', 'confirmed', 'rejected', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_idx on products (active);
create index if not exists orders_status_created_idx on orders (status, created_at desc);
