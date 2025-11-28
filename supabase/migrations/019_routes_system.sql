-- Routes System Migration
-- Complete routing system with photos, waypoints, comments, and reviews

-- Main routes table
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  county text,
  distance_km numeric,
  terrain_tags text[] default '{}',
  difficulty text check (difficulty in ('easy','medium','hard')),
  seasonal_notes text,
  surface text,
  geometry jsonb not null, -- GeoJSON LineString: {"type":"LineString","coordinates":[[lng,lat],...]}
  near_property_id uuid references properties(id) on delete set null,
  is_public boolean default true,
  featured boolean default false, -- Hosts can mark their routes as featured
  avg_rating numeric default 0,
  review_count int default 0,
  photos_count int default 0,
  comments_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Route photos
create table if not exists route_photos (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id) on delete cascade not null,
  url text not null,
  caption text,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  order_index int default 0,
  created_at timestamptz default now()
);

-- Route waypoints (points of interest along the route)
create table if not exists route_waypoints (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id) on delete cascade not null,
  lat numeric not null,
  lng numeric not null,
  name text not null,
  description text,
  icon_type text check (icon_type in ('viewpoint','water','hazard','parking','pub','gate','rest','historic','wildlife','other')),
  photo_url text,
  order_index int default 0,
  created_at timestamptz default now()
);

-- Route comments/discussions
create table if not exists route_comments (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  parent_comment_id uuid references route_comments(id) on delete cascade, -- For nested replies
  body text not null,
  flagged boolean default false,
  blocked boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Route comment flags (moderation)
create table if not exists route_comment_flags (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references route_comments(id) on delete cascade not null,
  flagged_by_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  severity text check (severity in ('low','medium','high','critical')),
  admin_reviewed boolean default false,
  created_at timestamptz default now()
);

-- Route reviews (star ratings + written reviews)
create table if not exists route_reviews (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  rating int check (rating between 1 and 5) not null,
  body text,
  created_at timestamptz default now(),
  
  -- User can only review a route once
  unique(route_id, user_id)
);

-- Indexes for performance
create index if not exists idx_routes_public on routes (is_public);
create index if not exists idx_routes_county on routes (county);
create index if not exists idx_routes_near_property on routes (near_property_id);
create index if not exists idx_routes_owner on routes (owner_user_id);
create index if not exists idx_routes_featured on routes (featured) where featured = true;
create index if not exists idx_routes_difficulty on routes (difficulty);

create index if not exists idx_route_photos_route on route_photos (route_id);
create index if not exists idx_route_waypoints_route on route_waypoints (route_id);
create index if not exists idx_route_comments_route on route_comments (route_id);
create index if not exists idx_route_comments_parent on route_comments (parent_comment_id);
create index if not exists idx_route_comment_flags_comment on route_comment_flags (comment_id);
create index if not exists idx_route_reviews_route on route_reviews (route_id);
create index if not exists idx_route_reviews_user on route_reviews (user_id);

-- Row Level Security (RLS)

-- Routes RLS
alter table routes enable row level security;

create policy "routes_public_select" on routes
  for select using (
    is_public = true 
    or auth.uid() = owner_user_id
  );

create policy "routes_owner_insert" on routes
  for insert with check (auth.uid() = owner_user_id);

create policy "routes_owner_update" on routes
  for update using (auth.uid() = owner_user_id);

create policy "routes_owner_delete" on routes
  for delete using (auth.uid() = owner_user_id);

-- Route photos RLS
alter table route_photos enable row level security;

create policy "route_photos_read" on route_photos
  for select using (
    exists (
      select 1 from routes 
      where routes.id = route_photos.route_id 
      and (routes.is_public = true or routes.owner_user_id = auth.uid())
    )
  );

create policy "route_photos_owner_write" on route_photos
  for insert with check (
    exists (
      select 1 from routes 
      where routes.id = route_photos.route_id 
      and routes.owner_user_id = auth.uid()
    )
  );

create policy "route_photos_owner_delete" on route_photos
  for delete using (
    exists (
      select 1 from routes 
      where routes.id = route_photos.route_id 
      and routes.owner_user_id = auth.uid()
    )
  );

-- Route waypoints RLS
alter table route_waypoints enable row level security;

create policy "route_waypoints_read" on route_waypoints
  for select using (
    exists (
      select 1 from routes 
      where routes.id = route_waypoints.route_id 
      and (routes.is_public = true or routes.owner_user_id = auth.uid())
    )
  );

create policy "route_waypoints_owner_write" on route_waypoints
  for all using (
    exists (
      select 1 from routes 
      where routes.id = route_waypoints.route_id 
      and routes.owner_user_id = auth.uid()
    )
  );

-- Route comments RLS
alter table route_comments enable row level security;

create policy "route_comments_read" on route_comments
  for select using (
    deleted_at is null
    and exists (
      select 1 from routes 
      where routes.id = route_comments.route_id 
      and (routes.is_public = true or routes.owner_user_id = auth.uid())
    )
  );

create policy "route_comments_auth_write" on route_comments
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from routes 
      where routes.id = route_comments.route_id 
      and routes.is_public = true
    )
  );

create policy "route_comments_owner_delete" on route_comments
  for update using (
    auth.uid() = user_id 
    or exists (
      select 1 from routes 
      where routes.id = route_comments.route_id 
      and routes.owner_user_id = auth.uid()
    )
  );

-- Route comment flags RLS
alter table route_comment_flags enable row level security;

create policy "route_comment_flags_read_admin" on route_comment_flags
  for select using (
    exists (
      select 1 from users 
      where users.id = auth.uid() 
      and users.role = 'admin'
    )
  );

-- Route reviews RLS
alter table route_reviews enable row level security;

create policy "route_reviews_read" on route_reviews
  for select using (true);

create policy "route_reviews_auth_write" on route_reviews
  for insert with check (auth.uid() = user_id);

-- Function to update route stats after review
create or replace function update_route_rating()
returns trigger as $$
begin
  update routes
  set 
    avg_rating = (
      select avg(rating)::numeric(3,2) 
      from route_reviews 
      where route_id = new.route_id
    ),
    review_count = (
      select count(*) 
      from route_reviews 
      where route_id = new.route_id
    )
  where id = new.route_id;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger update_route_rating_trigger
  after insert or update on route_reviews
  for each row
  execute function update_route_rating();

-- Function to update photo count
create or replace function update_route_photos_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update routes
    set photos_count = photos_count + 1
    where id = new.route_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update routes
    set photos_count = photos_count - 1
    where id = old.route_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger update_route_photos_count_trigger
  after insert or delete on route_photos
  for each row
  execute function update_route_photos_count();

-- Function to update comment count
create or replace function update_route_comments_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update routes
    set comments_count = comments_count + 1
    where id = new.route_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update routes
    set comments_count = comments_count - 1
    where id = old.route_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger update_route_comments_count_trigger
  after insert or delete on route_comments
  for each row
  execute function update_route_comments_count();

-- Function to update updated_at timestamp
create or replace function update_routes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_routes_updated_at_trigger
  before update on routes
  for each row
  execute function update_routes_updated_at();



