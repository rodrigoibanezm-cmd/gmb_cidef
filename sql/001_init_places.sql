create table if not exists places (
  place_id text primary key,
  name text,
  brand text,
  normalized_location text,
  operator text,
  ownership_group text,
  store_role text,
  status text,
  address text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_places_brand
  on places (brand);

create index if not exists idx_places_location
  on places (normalized_location);

create index if not exists idx_places_status
  on places (status);
