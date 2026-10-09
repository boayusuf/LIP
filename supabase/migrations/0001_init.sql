-- LockInPhase initial schema.
--
-- Reconstructed from types/index.ts and the queries in lib/store.ts and
-- lib/groupStore.ts after the original Supabase project expired. The original
-- RLS policies and triggers were never version controlled and are gone, so the
-- policies below are a fresh deliberate pass, not a recovery. Review them.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type priority as enum ('urgent', 'important', 'low');
create type time_block as enum ('morning', 'afternoon', 'evening');
create type task_status as enum ('todo', 'doing', 'done');
create type subtask_status as enum ('todo', 'done');
create type repeat_cycle as enum ('daily', 'weekly', 'weekdays', 'biweekly', 'monthly', 'custom');
create type proposal_status as enum ('pending', 'approved', 'rejected');
create type feed_type as enum (
  'task_completed', 'photo_checkin', 'checkin_completed',
  'streak', 'joined', 'checkin_summary'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  email text not null default '',
  avatar_url text,
  total_xp integer not null default 0,
  push_token text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  title text not null,
  notes text,
  priority priority not null default 'low',
  time_block time_block not null default 'morning',
  estimated_duration_min integer not null default 30,
  status task_status not null default 'todo',
  xp_earned integer not null default 0,
  is_repeating boolean not null default false,
  repeat_cycle repeat_cycle,
  repeat_interval_days integer,
  next_reset_at timestamptz,
  timer_started_at timestamptz,
  timer_elapsed_sec integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks on delete cascade,
  title text not null,
  status subtask_status not null default 'todo',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- Lowercased by the client before lookup; see joinByInviteCode.
  invite_code text not null unique default lower(substr(md5(gen_random_uuid()::text), 1, 8)),
  is_dm boolean not null default false,
  min_members integer not null default 2,
  max_members integer not null default 20,
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table task_proposals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  proposed_by uuid not null references profiles on delete cascade,
  title text not null,
  notes text,
  priority priority not null default 'low',
  time_block time_block not null default 'morning',
  estimated_duration_min integer not null default 30,
  repeat_cycle repeat_cycle,
  repeat_interval_days integer,
  require_photo boolean not null default false,
  require_checkin boolean not null default false,
  checkin_time text,
  checkin_buffer_min integer,
  deadline timestamptz,
  status proposal_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table proposal_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references task_proposals on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  vote boolean not null,
  created_at timestamptz not null default now(),
  unique (proposal_id, user_id)
);

create table group_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  proposal_id uuid references task_proposals on delete set null,
  title text not null,
  notes text,
  priority priority not null default 'low',
  time_block time_block not null default 'morning',
  estimated_duration_min integer not null default 30,
  repeat_cycle repeat_cycle,
  repeat_interval_days integer,
  require_photo boolean not null default false,
  require_checkin boolean not null default false,
  checkin_time text,
  checkin_buffer_min integer,
  deadline timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table group_task_completions (
  id uuid primary key default gen_random_uuid(),
  group_task_id uuid not null references group_tasks on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  status task_status not null default 'todo',
  timer_started_at timestamptz,
  timer_elapsed_sec integer not null default 0,
  xp_earned integer not null default 0,
  photo_url text,
  checkin_note text,
  late_checkin boolean not null default false,
  completed_at timestamptz,
  unique (group_task_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  content text not null default '',
  reply_to_id uuid references messages on delete set null,
  image_url text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  read_at timestamptz not null default now(),
  -- markMessagesRead upserts with onConflict 'message_id,user_id'.
  unique (message_id, user_id)
);

create table feed_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  type feed_type not null,
  group_task_id uuid references group_tasks on delete set null,
  content text,
  photo_url text,
  checkin_note text,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create table feed_comments (
  id uuid primary key default gen_random_uuid(),
  feed_item_id uuid not null references feed_items on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table feed_reactions (
  id uuid primary key default gen_random_uuid(),
  feed_item_id uuid not null references feed_items on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (feed_item_id, user_id, emoji)
);

-- ---------------------------------------------------------------------------
-- Indexes on foreign keys and hot filters
-- ---------------------------------------------------------------------------

create index on tasks (user_id, status);
create index on tasks (user_id, completed_at desc);
create index on subtasks (task_id);
create index on group_members (user_id);
create index on group_members (group_id);
create index on task_proposals (group_id, status);
create index on proposal_votes (proposal_id);
create index on group_tasks (group_id, is_active);
create index on group_task_completions (group_task_id);
create index on group_task_completions (user_id);
create index on messages (group_id, created_at desc);
create index on message_reads (message_id);
create index on message_reads (user_id);
create index on feed_items (group_id, created_at desc);
create index on feed_comments (feed_item_id);
create index on feed_reactions (feed_item_id);

-- ---------------------------------------------------------------------------
-- New users get a profile row
--
-- signUp() only passes { name } through auth metadata and never inserts into
-- profiles, so this trigger is what actually creates the row.
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers
--
-- SECURITY DEFINER so that a policy on group_members can ask "is this user a
-- member?" without re-entering its own policy and recursing.
-- ---------------------------------------------------------------------------

create or replace function is_group_member(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function shares_group_with(uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from group_members mine
    join group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = uid
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table task_proposals enable row level security;
alter table proposal_votes enable row level security;
alter table group_tasks enable row level security;
alter table group_task_completions enable row level security;
alter table messages enable row level security;
alter table message_reads enable row level security;
alter table feed_items enable row level security;
alter table feed_comments enable row level security;
alter table feed_reactions enable row level security;

-- profiles: yourself, plus anyone you share a group with (the feed, chat and
-- member lists all read co-members' names and avatars).
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or shares_group_with(id));
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid());

-- tasks and subtasks are strictly private
create policy tasks_all on tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy subtasks_all on subtasks for all to authenticated
  using (exists (select 1 from tasks t where t.id = task_id and t.user_id = auth.uid()))
  with check (exists (select 1 from tasks t where t.id = task_id and t.user_id = auth.uid()));

-- groups
--
-- NOTE: select is open to any authenticated user because joinByInviteCode()
-- looks a group up by invite_code *before* the caller is a member, and a policy
-- cannot tell that they typed the right code. This leaks group names and invite
-- codes to any signed-in user. The correct fix is a SECURITY DEFINER
-- join_group(code) RPC, which would let this tighten to is_group_member(id).
create policy groups_select on groups for select to authenticated using (true);
create policy groups_insert on groups for insert to authenticated
  with check (created_by = auth.uid());
create policy groups_update on groups for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy groups_delete on groups for delete to authenticated
  using (created_by = auth.uid());

-- group_members
--
-- insert allows adding yourself, or adding someone else to a group you are
-- already in. createDM() relies on the second case: it inserts itself first,
-- then the other participant.
create policy group_members_select on group_members for select to authenticated
  using (user_id = auth.uid() or is_group_member(group_id));
create policy group_members_insert on group_members for insert to authenticated
  with check (user_id = auth.uid() or is_group_member(group_id));
create policy group_members_delete on group_members for delete to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from groups g where g.id = group_id and g.created_by = auth.uid()));

-- proposals and votes
create policy task_proposals_select on task_proposals for select to authenticated
  using (is_group_member(group_id));
create policy task_proposals_insert on task_proposals for insert to authenticated
  with check (proposed_by = auth.uid() and is_group_member(group_id));
create policy task_proposals_update on task_proposals for update to authenticated
  using (is_group_member(group_id)) with check (is_group_member(group_id));

create policy proposal_votes_select on proposal_votes for select to authenticated
  using (exists (select 1 from task_proposals p
                 where p.id = proposal_id and is_group_member(p.group_id)));
create policy proposal_votes_insert on proposal_votes for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from task_proposals p
                          where p.id = proposal_id and is_group_member(p.group_id)));

-- group tasks and completions
create policy group_tasks_select on group_tasks for select to authenticated
  using (is_group_member(group_id));
create policy group_tasks_insert on group_tasks for insert to authenticated
  with check (is_group_member(group_id));
create policy group_tasks_update on group_tasks for update to authenticated
  using (is_group_member(group_id)) with check (is_group_member(group_id));

create policy gtc_select on group_task_completions for select to authenticated
  using (exists (select 1 from group_tasks t
                 where t.id = group_task_id and is_group_member(t.group_id)));
create policy gtc_insert on group_task_completions for insert to authenticated
  with check (exists (select 1 from group_tasks t
                      where t.id = group_task_id and is_group_member(t.group_id)));
-- only your own row is writable, so one member cannot check in for another
create policy gtc_update on group_task_completions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- chat
create policy messages_select on messages for select to authenticated
  using (is_group_member(group_id));
create policy messages_insert on messages for insert to authenticated
  with check (user_id = auth.uid() and is_group_member(group_id));

create policy message_reads_select on message_reads for select to authenticated
  using (exists (select 1 from messages m
                 where m.id = message_id and is_group_member(m.group_id)));
create policy message_reads_insert on message_reads for insert to authenticated
  with check (user_id = auth.uid());

-- feed
create policy feed_items_select on feed_items for select to authenticated
  using (is_group_member(group_id));
create policy feed_items_insert on feed_items for insert to authenticated
  with check (user_id = auth.uid() and is_group_member(group_id));

create policy feed_comments_select on feed_comments for select to authenticated
  using (exists (select 1 from feed_items f
                 where f.id = feed_item_id and is_group_member(f.group_id)));
create policy feed_comments_insert on feed_comments for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from feed_items f
                          where f.id = feed_item_id and is_group_member(f.group_id)));

create policy feed_reactions_select on feed_reactions for select to authenticated
  using (exists (select 1 from feed_items f
                 where f.id = feed_item_id and is_group_member(f.group_id)));
create policy feed_reactions_insert on feed_reactions for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from feed_items f
                          where f.id = feed_item_id and is_group_member(f.group_id)));
create policy feed_reactions_delete on feed_reactions for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('photos', 'photos', false)
on conflict (id) do nothing;

create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');
create policy avatars_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and owner = auth.uid());
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy photos_read on storage.objects for select to authenticated
  using (bucket_id = 'photos');
create policy photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime
--
-- subscribeForNotifications() and subscribeToFeed() listen on these.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table feed_items;
alter publication supabase_realtime add table feed_comments;
alter publication supabase_realtime add table feed_reactions;
alter publication supabase_realtime add table group_task_completions;
alter publication supabase_realtime add table task_proposals;
