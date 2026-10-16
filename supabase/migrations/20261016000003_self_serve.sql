-- Self-serve practice: a profile no longer needs a therapist.
-- Families create a practice profile themselves; a therapist can be added later as an optional extra.
-- All profile data is read and written by server routes after checking the profile's private link token.

alter table patient alter column slp_id drop not null;

-- Who set up the profile, for the dashboard header (e.g. "बेटी", "Self").
alter table patient add column if not exists created_by_relation text;

-- Words added by the family are live immediately; approval is no longer a gate.
alter table word_item alter column approved_at set default now();
alter type word_source add value if not exists 'starter';
alter type word_source add value if not exists 'family';

-- The clip cache is content-addressed: one row per audio file, shared by every profile.
create unique index if not exists audio_asset_storage_path_key on audio_asset (storage_path);
