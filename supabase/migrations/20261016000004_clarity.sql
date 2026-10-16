-- Background clarity scoring (IndicConformer verifier).
-- Live scoring stays as it is; these columns are filled afterwards by the verifier worker.

alter table attempt add column if not exists clarity jsonb;
alter table attempt add column if not exists verifier_verdict text;
-- Optional speaker check: cosine similarity to the profile's voice, null when not checked.
alter table attempt add column if not exists speaker_similarity real;

-- One running voice print per profile for the optional speaker check.
create table if not exists speaker_profile (
  patient_id uuid primary key references patient (id) on delete cascade,
  embedding real[] not null,
  samples int not null default 0,
  updated_at timestamptz not null default now()
);
alter table speaker_profile enable row level security;
-- No policies: only the service role (server and worker) reads or writes voice prints.
