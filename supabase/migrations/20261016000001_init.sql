-- PhirSe initial schema.
-- Patient-facing routes never touch these tables directly: they go through server routes
-- using the service role after checking the patient's access token hash.
-- SLPs read and write through RLS-protected queries scoped to their own patients.

create extension if not exists "pgcrypto";

-- ---------- enums ----------

create type word_set as enum ('treated', 'untreated', 'warmup', 'reserve');
create type word_source as enum ('slp', 'llm_draft');
create type patient_status as enum ('active', 'paused', 'withdrawn');
create type cue_step as enum ('prompt', 'semantic', 'phonemic', 'model');
create type audio_kind as enum ('prompt', 'semantic', 'phonemic', 'model', 'praise', 'system', 'reference');
create type audio_source as enum ('tts', 'slp_recording', 'healthy_speaker');
create type session_kind as enum ('practice', 'probe', 'practice_probe', 'judge_demo');
create type session_end_reason as enum ('completed', 'time', 'patient_stop', 'declined', 'safety', 'shortened', 'abandoned');
create type attempt_phase as enum ('warmup', 'practice', 'probe');
create type live_score as enum ('correct', 'not_yet', 'uncertain');
create type verifier_status as enum ('pending', 'done', 'failed', 'skipped');
create type slp_label as enum ('correct', 'incorrect');
create type error_type as enum ('semantic', 'phonemic', 'no_response', 'unrelated', 'other');
create type alert_kind as enum ('befast', 'chest_pain', 'choking', 'distress', 'baseline_drop', 'help_button');

-- ---------- tables ----------

create table slp (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  rci_crr_number text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table patient (
  id uuid primary key default gen_random_uuid(),
  slp_id uuid not null references slp (id) on delete cascade,
  display_name text not null,
  honorific text not null default 'जी',
  language text not null default 'hi',
  is_demo boolean not null default false,
  access_token_hash text not null unique,
  token_revoked_at timestamptz,
  settings jsonb not null default jsonb_build_object(
    'patience_ms', 8000,
    'end_of_speech_ms', 1500,
    'max_attempt_ms', 10000,
    'tts_pace', 0.8,
    'tts_speaker', null,
    'cue_mode', 'increasing',
    'session_minutes', 12,
    'max_items', 12,
    'picture_mode', false,
    'probe_days', jsonb_build_array(1, 3, 5),
    'graduation_rule', jsonb_build_object('consecutive_sessions', 3)
  ),
  family_name text,
  family_phone text,
  family_email text,
  status patient_status not null default 'active',
  created_at timestamptz not null default now()
);
create index patient_slp_idx on patient (slp_id);

create table consent (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patient (id) on delete cascade,
  sessions boolean not null default false,
  recording boolean not null default false,
  slp_access boolean not null default false,
  anonymised_metrics boolean not null default false,
  demo_use boolean not null default false,
  family_clip_share boolean not null default false,
  signed_at timestamptz,
  witness_slp_id uuid references slp (id),
  document_path text,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);
create index consent_patient_idx on consent (patient_id);

create table word_item (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patient (id) on delete cascade,
  target_deva text not null,
  set word_set not null,
  accepted_forms text[] not null default '{}',
  prompt_text text,
  frame_text text,
  semantic_cue_text text,
  phonemic_cue_text text,
  model_text text,
  image_path text,
  difficulty smallint not null default 1,
  leitner_box smallint not null default 1 check (leitner_box between 1 and 4),
  independent_streak smallint not null default 0,
  graduated_at timestamptz,
  source word_source not null default 'slp',
  approved_at timestamptz,
  approved_by uuid references slp (id),
  created_at timestamptz not null default now()
);
create index word_item_patient_idx on word_item (patient_id, set);

create table audio_asset (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patient (id) on delete cascade, -- null = shared system clip
  word_item_id uuid references word_item (id) on delete cascade,
  kind audio_kind not null,
  system_key text,            -- e.g. 'greeting', 'praise'
  variant smallint not null default 0,
  text text not null,
  speaker text,
  pace real,
  storage_path text not null,
  source audio_source not null default 'tts',
  created_at timestamptz not null default now()
);
create index audio_asset_item_idx on audio_asset (word_item_id, kind);
create index audio_asset_system_idx on audio_asset (patient_id, system_key, variant);

create table session (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patient (id) on delete cascade,
  kind session_kind not null default 'practice',
  plan jsonb not null,
  state jsonb not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason session_end_reason,
  minutes_active real
);
create index session_patient_idx on session (patient_id, started_at desc);

create table attempt (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references session (id) on delete cascade,
  word_item_id uuid references word_item (id) on delete set null,
  phase attempt_phase not null,
  cue_level cue_step,
  audio_path text,
  duration_ms integer,
  latency_ms integer,
  transcript_a text,
  transcript_b text,
  live_score live_score not null,
  reason_code text not null,
  self_corrected boolean not null default false,
  stt_ms_a integer,
  stt_ms_b integer,
  verifier_status verifier_status not null default 'pending',
  verifier_score real,
  verifier_target_ll real,
  verifier_dtw real,
  verifier_transcript text,
  verifier_attempts smallint not null default 0,
  verified_at timestamptz,
  slp_label slp_label,
  slp_error_type error_type,
  llm_error_type error_type,
  labelled_at timestamptz,
  created_at timestamptz not null default now()
);
create index attempt_session_idx on attempt (session_id, created_at);
create index attempt_verifier_idx on attempt (verifier_status, created_at) where verifier_status = 'pending';

create table event (
  id bigint generated always as identity primary key,
  session_id uuid not null references session (id) on delete cascade,
  ts timestamptz not null default now(),
  type text not null,
  payload jsonb not null default '{}'
);
create index event_session_idx on event (session_id, ts);

create table alert (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patient (id) on delete cascade,
  session_id uuid references session (id) on delete set null,
  kind alert_kind not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  acknowledged_by uuid references slp (id),
  acknowledged_at timestamptz
);
create index alert_open_idx on alert (patient_id) where acknowledged_at is null;

-- ---------- row-level security ----------

alter table slp enable row level security;
alter table patient enable row level security;
alter table consent enable row level security;
alter table word_item enable row level security;
alter table audio_asset enable row level security;
alter table session enable row level security;
alter table attempt enable row level security;
alter table event enable row level security;
alter table alert enable row level security;

-- Current SLP id for the logged-in user.
create or replace function current_slp_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from slp where auth_user_id = auth.uid()
$$;

create or replace function owns_patient(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from patient where id = p and slp_id = current_slp_id())
$$;

create policy slp_self on slp
  for all using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

create policy patient_owner on patient
  for all using (slp_id = current_slp_id()) with check (slp_id = current_slp_id());

create policy consent_owner on consent
  for all using (owns_patient(patient_id)) with check (owns_patient(patient_id));

create policy word_item_owner on word_item
  for all using (owns_patient(patient_id)) with check (owns_patient(patient_id));

create policy audio_asset_owner on audio_asset
  for all using (patient_id is null or owns_patient(patient_id))
  with check (patient_id is not null and owns_patient(patient_id));

create policy session_owner on session
  for select using (owns_patient(patient_id));

create policy attempt_owner_read on attempt
  for select using (exists (select 1 from session s where s.id = session_id and owns_patient(s.patient_id)));

-- SLPs may only change labels on attempts; enforced in the server route, RLS limits rows.
create policy attempt_owner_label on attempt
  for update using (exists (select 1 from session s where s.id = session_id and owns_patient(s.patient_id)));

create policy event_owner_read on event
  for select using (exists (select 1 from session s where s.id = session_id and owns_patient(s.patient_id)));

create policy alert_owner on alert
  for select using (owns_patient(patient_id));

create policy alert_owner_ack on alert
  for update using (owns_patient(patient_id));

-- ---------- storage ----------

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false), ('images', 'images', false), ('consent', 'consent', false)
on conflict (id) do nothing;

-- Helper functions are for RLS only; do not expose them as API endpoints.
revoke execute on function current_slp_id() from public, anon;
revoke execute on function owns_patient(uuid) from public, anon;
grant execute on function current_slp_id() to authenticated;
grant execute on function owns_patient(uuid) to authenticated;
