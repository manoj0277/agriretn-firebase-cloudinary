create table if not exists public.users (
  id integer primary key,
  name text not null,
  email text not null unique,
  password text,
  phone text,
  role text not null,
  profilePicture text,
  age integer,
  gender text,
  location text,
  status text not null,
  avgRating numeric,
  blockedDates text[],
  locationCoords jsonb,
  aadharImageUrl text,
  personalPhotoUrl text,
  seedOnly boolean default false
);

-- Ensure case-insensitive uniqueness for emails
create unique index if not exists users_email_lower_unique on public.users (lower(email));

create table if not exists public.items (
  id integer primary key,
  name text not null,
  category text not null,
  purposes jsonb not null,
  images jsonb,
  ownerId integer not null,
  location text,
  available boolean default true,
  status text,
  description text,
  currentLocation jsonb,
  locationCoords jsonb,
  operatorCharge numeric,
  avgRating numeric,
  quantityAvailable integer,
  seasonalPrices jsonb,
  model text,
  licensePlate text,
  year integer,
  horsepower integer,
  condition text,
  gender text
);

create table if not exists public.bookings (
  id text primary key,
  farmerId integer not null,
  supplierId integer,
  itemId integer,
  itemCategory text not null,
  date text not null,
  startTime text not null,
  estimatedDuration integer not null,
  location text,
  paymentId text,
  status text not null,
  additionalInstructions text,
  workPurpose text,
  preferredModel text,
  operatorRequired boolean,
  recurrenceId text,
  disputeResolved boolean,
  disputeRaised boolean,
  damageReported boolean,
  estimatedPrice numeric,
  advanceAmount numeric,
  finalPrice numeric,
  distanceCharge numeric,
  paymentMethod text,
  advancePaymentId text,
  finalPaymentId text,
  discountAmount numeric,
  quantity integer,
  allowMultipleSuppliers boolean,
  operatorId integer,
  isRebroadcast boolean,
  otpCode text,
  otpVerified boolean,
  workStartTime text,
  workEndTime text,
  farmerPaymentAmount numeric,
  supplierPaymentAmount numeric,
  adminCommission numeric,
  paymentDetails jsonb
);

create table if not exists public.reviews (
  id integer primary key,
  itemId integer,
  ratedUserId integer,
  bookingId text not null,
  reviewerId integer not null,
  rating integer not null,
  comment text
);

create table if not exists public.chatMessages (
  id integer primary key,
  chatId text not null,
  senderId integer not null,
  receiverId integer not null,
  text text not null,
  timestamp text not null,
  read boolean default false,
  isBotMessage boolean
);

create table if not exists public.forumPosts (
  id integer primary key,
  authorId integer not null,
  title text not null,
  content text not null,
  timestamp text not null,
  replies jsonb
);

create table if not exists public.damageReports (
  id integer primary key,
  bookingId text not null,
  itemId integer not null,
  reporterId integer not null,
  description text not null,
  status text not null,
  timestamp text not null
);

create table if not exists public.notifications (
  id integer primary key,
  userId integer not null,
  message text not null,
  type text not null,
  read boolean default false,
  timestamp text not null
);

create table if not exists public.supportTickets (
  id integer primary key,
  userId integer,
  name text not null,
  email text not null,
  message text not null,
  status text not null,
  timestamp text not null,
  replies jsonb
);

alter table public.users enable row level security;
alter table public.items enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.chatMessages enable row level security;
alter table public.forumPosts enable row level security;
alter table public.damageReports enable row level security;
alter table public.notifications enable row level security;
alter table public.supportTickets enable row level security;

create policy "auth_read_users" on public.users for select to authenticated using (true);
create policy "auth_insert_users" on public.users for insert to authenticated with check (true);
create policy "auth_update_users" on public.users for update to authenticated using (true) with check (true);
create policy "auth_delete_users" on public.users for delete to authenticated using (true);

create policy "auth_read_items" on public.items for select to authenticated using (true);
create policy "auth_insert_items" on public.items for insert to authenticated with check (true);
create policy "auth_update_items" on public.items for update to authenticated using (true) with check (true);
create policy "auth_delete_items" on public.items for delete to authenticated using (true);

create policy "auth_read_bookings" on public.bookings for select to authenticated using (true);
create policy "auth_insert_bookings" on public.bookings for insert to authenticated with check (true);
create policy "auth_update_bookings" on public.bookings for update to authenticated using (true) with check (true);
create policy "auth_delete_bookings" on public.bookings for delete to authenticated using (true);

create policy "auth_read_reviews" on public.reviews for select to authenticated using (true);
create policy "auth_insert_reviews" on public.reviews for insert to authenticated with check (true);
create policy "auth_update_reviews" on public.reviews for update to authenticated using (true) with check (true);
create policy "auth_delete_reviews" on public.reviews for delete to authenticated using (true);

create policy "auth_read_chatMessages" on public.chatMessages for select to authenticated using (true);
create policy "auth_insert_chatMessages" on public.chatMessages for insert to authenticated with check (true);
create policy "auth_update_chatMessages" on public.chatMessages for update to authenticated using (true) with check (true);
create policy "auth_delete_chatMessages" on public.chatMessages for delete to authenticated using (true);

create policy "auth_read_forumPosts" on public.forumPosts for select to authenticated using (true);
create policy "auth_insert_forumPosts" on public.forumPosts for insert to authenticated with check (true);
create policy "auth_update_forumPosts" on public.forumPosts for update to authenticated using (true) with check (true);
create policy "auth_delete_forumPosts" on public.forumPosts for delete to authenticated using (true);

create policy "auth_read_damageReports" on public.damageReports for select to authenticated using (true);
create policy "auth_insert_damageReports" on public.damageReports for insert to authenticated with check (true);
create policy "auth_update_damageReports" on public.damageReports for update to authenticated using (true) with check (true);
create policy "auth_delete_damageReports" on public.damageReports for delete to authenticated using (true);

create policy "auth_read_notifications" on public.notifications for select to authenticated using (true);
create policy "auth_insert_notifications" on public.notifications for insert to authenticated with check (true);
create policy "auth_update_notifications" on public.notifications for update to authenticated using (true) with check (true);
create policy "auth_delete_notifications" on public.notifications for delete to authenticated using (true);

create policy "auth_read_supportTickets" on public.supportTickets for select to authenticated using (true);
create policy "auth_insert_supportTickets" on public.supportTickets for insert to authenticated with check (true);
create policy "auth_update_supportTickets" on public.supportTickets for update to authenticated using (true) with check (true);
create policy "auth_delete_supportTickets" on public.supportTickets for delete to authenticated using (true);
