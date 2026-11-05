-- ============ ENUMS ============
create type public.app_role as enum ('student','staff','management','admin');
create type public.report_status as enum ('Submitted','Acknowledged','Assigned','In Progress','Completed','Closed');
create type public.report_priority as enum ('Low','Medium','High','Urgent');
create type public.problem_category as enum ('Toilet','Shower','Sink/Basin','Tap','Door','Window','Electricity','Lighting','Plumbing','Furniture','Other','Electrical','Broken/Damaged','Cleaning','Safety/Security');

COMMENT ON TYPE public.problem_category IS
  'Active values: Electrical, Plumbing, Broken/Damaged, Cleaning, Safety/Security, Other. Old values (Toilet, Shower, Sink/Basin, Tap, Door, Window, Electricity, Lighting, Furniture) are DEPRECATED.';

-- ============ RESIDENCE STRUCTURE ============
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  block_name text not null unique,
  gender_group text not null check (gender_group in ('Girls','Boys')),
  created_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  unit_number text not null,
  created_at timestamptz not null default now(),
  unique (block_id, unit_number)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  room_name text not null,
  created_at timestamptz not null default now(),
  unique (unit_id, room_name)
);

-- ============ DIRECTORIES ============
create table public.students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  full_name text not null,
  email text not null unique,
  residence text not null default 'Corridor Hill',
  room_id uuid references public.rooms(id) on delete set null,
  active boolean not null default true,
  is_demo boolean not null default false,
  user_id uuid unique,
  created_at timestamptz not null default now()
);

create table public.staff_accounts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  role public.app_role not null check (role in ('staff','management','admin')),
  phone text,
  active boolean not null default true,
  is_demo boolean not null default false,
  user_id uuid unique,
  skill_category public.problem_category,
  created_at timestamptz not null default now()
);

COMMENT ON COLUMN public.staff_accounts.skill_category IS
  'Maintenance workers only receive jobs matching this category. NULL = can take any category.';

create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text not null,
  role public.app_role not null,
  student_id uuid references public.students(id) on delete set null,
  staff_id uuid references public.staff_accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- ============ REPORTS ============
create sequence public.report_ref_seq;

create table public.maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  report_reference text not null unique,
  student_id uuid not null references public.students(id) on delete cascade,
  student_number text not null,
  student_name text not null,
  category public.problem_category not null,
  description text not null,
  photo_path text,
  residence text not null,
  block_name text not null,
  unit_number text not null,
  room_name text not null,
  priority public.report_priority not null default 'Medium',
  status public.report_status not null default 'Submitted',
  assigned_staff_id uuid references public.staff_accounts(id) on delete set null,
  assigned_at timestamptz,
  staff_notes text,
  completion_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index maintenance_reports_student_idx on public.maintenance_reports(student_id);
create index maintenance_reports_staff_idx on public.maintenance_reports(assigned_staff_id);
create index maintenance_reports_status_idx on public.maintenance_reports(status);

create table public.report_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.maintenance_reports(id) on delete cascade,
  user_id uuid,
  actor_name text,
  action text not null,
  previous_status public.report_status,
  new_status public.report_status,
  note text,
  created_at timestamptz not null default now()
);
create index report_history_report_idx on public.report_history(report_id);

create table public.residence_students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  full_name text not null,
  room_number text,
  block text,
  user_id uuid,
  created_at timestamptz not null default now()
);

create table public.student_otp_requests (
  id uuid primary key default gen_random_uuid(),
  student_number text not null,
  created_at timestamptz not null default now()
);
create index student_otp_requests_number_created_idx
  on public.student_otp_requests (student_number, created_at);

-- ============ SECURITY HELPERS ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_office(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('management','admin'))
$$;

create or replace function public.current_student_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.students where user_id = auth.uid()
$$;

create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.staff_accounts where user_id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s public.students;
  st public.staff_accounts;
begin
  select * into s from public.students where lower(email) = lower(new.email) and active limit 1;
  if s.id is not null then
    update public.students set user_id = new.id where id = s.id;
    insert into public.profiles (id, email, full_name, role, student_id)
      values (new.id, new.email, s.full_name, 'student', s.id)
      on conflict (id) do update set student_id = s.id, role = 'student';
    insert into public.user_roles (user_id, role) values (new.id, 'student')
      on conflict do nothing;
    return new;
  end if;

  select * into st from public.staff_accounts where lower(email) = lower(new.email) and active limit 1;
  if st.id is not null then
    update public.staff_accounts set user_id = new.id where id = st.id;
    insert into public.profiles (id, email, full_name, role, staff_id)
      values (new.id, new.email, st.full_name, st.role, st.id)
      on conflict (id) do update set staff_id = st.id, role = st.role;
    insert into public.user_roles (user_id, role) values (new.id, st.role)
      on conflict do nothing;
    return new;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_report_reference()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.report_reference is null or new.report_reference = '' then
    new.report_reference := 'CH-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.report_ref_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger maintenance_reports_reference
  before insert on public.maintenance_reports
  for each row execute function public.set_report_reference();

create or replace function public.log_report_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor text;
begin
  select full_name into actor from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    insert into public.report_history (report_id, user_id, actor_name, action, new_status, note)
      values (new.id, auth.uid(), coalesce(actor, new.student_name), 'Report created', new.status, null);
    return new;
  end if;

  new.updated_at := now();

  if new.assigned_staff_id is distinct from old.assigned_staff_id and new.assigned_staff_id is not null then
    new.assigned_at := now();
    if new.status in ('Submitted','Acknowledged') then
      new.status := 'Assigned';
    end if;
    insert into public.report_history (report_id, user_id, actor_name, action, previous_status, new_status)
      values (new.id, auth.uid(), actor, 'Report assigned', old.status, new.status);
  end if;

  if new.status = 'Completed' and old.status <> 'Completed' then
    new.completed_at := now();
  end if;

  if new.status is distinct from old.status then
    insert into public.report_history (report_id, user_id, actor_name, action, previous_status, new_status, note)
      values (new.id, auth.uid(), actor, 'Status changed', old.status, new.status, new.staff_notes);
  end if;

  if new.priority is distinct from old.priority then
    insert into public.report_history (report_id, user_id, actor_name, action, note)
      values (new.id, auth.uid(), actor, 'Priority changed', old.priority::text || ' to ' || new.priority::text);
  end if;

  return new;
end;
$$;

create trigger maintenance_reports_history_insert
  after insert on public.maintenance_reports
  for each row execute function public.log_report_changes();

create trigger maintenance_reports_history_update
  before update on public.maintenance_reports
  for each row execute function public.log_report_changes();

-- ============ GRANTS ============
grant select, insert, update, delete on public.blocks, public.units, public.rooms to authenticated;
grant all on public.blocks, public.units, public.rooms to service_role;
grant select, insert, update, delete on public.students, public.staff_accounts to authenticated;
grant all on public.students, public.staff_accounts to service_role;
grant select on public.profiles, public.user_roles to authenticated;
grant all on public.profiles, public.user_roles to service_role;
grant select, insert, update on public.maintenance_reports to authenticated;
grant all on public.maintenance_reports to service_role;
grant select, insert on public.report_history to authenticated;
grant all on public.report_history to service_role;
grant select on public.residence_students to authenticated;
grant all on public.residence_students to service_role;
grant all on public.student_otp_requests to service_role;
grant usage on sequence public.report_ref_seq to authenticated, service_role;

-- ============ RLS ============
alter table public.blocks enable row level security;
alter table public.units enable row level security;
alter table public.rooms enable row level security;
alter table public.students enable row level security;
alter table public.staff_accounts enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.maintenance_reports enable row level security;
alter table public.report_history enable row level security;
alter table public.residence_students enable row level security;
alter table public.student_otp_requests enable row level security;

create policy "blocks readable" on public.blocks for select to authenticated using (true);
create policy "blocks admin write" on public.blocks for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "units readable" on public.units for select to authenticated using (true);
create policy "units admin write" on public.units for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "rooms readable" on public.rooms for select to authenticated using (true);
create policy "rooms admin write" on public.rooms for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "students read own" on public.students for select to authenticated
  using (user_id = auth.uid() or public.is_office(auth.uid()) or public.has_role(auth.uid(),'staff'));
create policy "students admin write" on public.students for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "staff read" on public.staff_accounts for select to authenticated
  using (user_id = auth.uid() or public.is_office(auth.uid()));
create policy "staff admin write" on public.staff_accounts for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "profiles read own" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_office(auth.uid()));
create policy "roles read own" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_office(auth.uid()));

create policy "reports student read own" on public.maintenance_reports for select to authenticated
  using (student_id = public.current_student_id());
create policy "reports staff read assigned" on public.maintenance_reports for select to authenticated
  using (assigned_staff_id = public.current_staff_id());
create policy "reports office read all" on public.maintenance_reports for select to authenticated
  using (public.is_office(auth.uid()));
create policy "reports student insert own" on public.maintenance_reports for insert to authenticated
  with check (student_id = public.current_student_id());
create policy "reports staff update assigned" on public.maintenance_reports for update to authenticated
  using (assigned_staff_id = public.current_staff_id())
  with check (assigned_staff_id = public.current_staff_id());
create policy "reports office update all" on public.maintenance_reports for update to authenticated
  using (public.is_office(auth.uid())) with check (public.is_office(auth.uid()));

create policy "history readable" on public.report_history for select to authenticated
  using (
    public.is_office(auth.uid())
    or exists (select 1 from public.maintenance_reports r where r.id = report_id
      and (r.student_id = public.current_student_id() or r.assigned_staff_id = public.current_staff_id()))
  );
create policy "history insert" on public.report_history for insert to authenticated
  with check (user_id = auth.uid());

create policy "Office roles view residence students" on public.residence_students for select to authenticated
  using (public.is_office(auth.uid()));

-- ============ SEED: RESIDENCE STRUCTURE ============
insert into public.blocks (block_name, gender_group) values
  ('A','Girls'),('B','Girls'),('C','Girls'),('D','Girls'),('E','Boys'),('F','Boys');

insert into public.units (block_id, unit_number)
select b.id, n::text
from public.blocks b
cross join generate_series(101, 109) n
where b.block_name in ('A','B','C');

insert into public.units (block_id, unit_number)
select b.id, n::text
from public.blocks b
cross join generate_series(101, 114) n
where b.block_name in ('D','E','F');

insert into public.rooms (unit_id, room_name)
select u.id, r
from public.units u
cross join (values ('A'),('B'),('C')) as v(r);

insert into public.residence_students (student_number, full_name, room_number, block)
values ('240371952', 'Student 240371952', 'A101A', 'A');

-- ============ REPORT PHOTOS STORAGE POLICIES ============
create policy "Owners and team read report photos" on storage.objects for select to authenticated
using (bucket_id = 'report-photos' and (owner_id = (select auth.uid()::text)
  or public.has_role((select auth.uid()), 'staff') or public.has_role((select auth.uid()), 'management') or public.has_role((select auth.uid()), 'admin')));
create policy "Students upload own report photos" on storage.objects for insert to authenticated
with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Students update own report photos" on storage.objects for update to authenticated
using (bucket_id = 'report-photos' and owner_id = (select auth.uid()::text));