-- jjdiary — cloud schema. One forest per user; trees of typed nodes.
-- Run in the Supabase SQL editor. Owner-only RLS (v1 is a private personal forest).

create extension if not exists pgcrypto;

create table if not exists trees (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug       text not null,
  title      text,
  seed_date  date,
  created_at timestamptz default now(),
  unique (owner, slug)
);

create table if not exists nodes (
  id         text primary key,                 -- client-generated id (matches seed-tree.json)
  tree_id    uuid references trees(id) on delete cascade,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type       text not null check (type in ('seed','root','branch','leaf','knot','flower','fruit')),
  parent     text,
  branch     text,
  date       date,
  data       jsonb not null default '{}',      -- the full node: title, body, refs, side, order, graduated, thread…
  link       text,                             -- a node can point to another tree (a branch that graduated)
  created_at timestamptz default now()
);
create index if not exists nodes_tree_idx  on nodes(tree_id);
create index if not exists nodes_owner_idx on nodes(owner);

alter table trees enable row level security;
alter table nodes enable row level security;

-- you can see and grow only your own forest
create policy trees_owner on trees for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy nodes_owner on nodes for all using (owner = auth.uid()) with check (owner = auth.uid());

-- Later (the forest of forests): add a `shares` table or a `public` flag on fruits/trees
-- to expose chosen nodes, and a `links` table for cross-tree branches.
