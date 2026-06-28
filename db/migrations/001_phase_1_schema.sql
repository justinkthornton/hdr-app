create table shoots (
  id uuid primary key,
  name text not null,
  client_name text null,
  property_address text null,
  notes text null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table upload_batches (
  id uuid primary key,
  shoot_id uuid not null references shoots(id),
  status text not null,
  original_file_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table assets (
  id uuid primary key,
  shoot_id uuid not null references shoots(id),
  upload_batch_id uuid null references upload_batches(id),
  original_filename text not null,
  storage_key text not null,
  thumbnail_storage_key text null,
  mime_type text not null,
  file_ext text not null,
  file_size_bytes bigint not null,
  width integer null,
  height integer null,
  camera_model text null,
  lens_model text null,
  captured_at timestamptz null,
  exposure_time text null,
  aperture text null,
  iso integer null,
  exposure_bias text null,
  raw_metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table bracket_groups (
  id uuid primary key,
  shoot_id uuid not null references shoots(id),
  upload_batch_id uuid not null references upload_batches(id),
  status text not null,
  group_index integer not null,
  expected_count integer not null,
  detected_count integer not null,
  confidence numeric not null default 0,
  grouping_reason text null,
  reviewed_at timestamptz null,
  approved_at timestamptz null,
  created_at timestamptz not null default now()
);

create table bracket_group_assets (
  bracket_group_id uuid not null references bracket_groups(id),
  asset_id uuid not null references assets(id),
  sort_order integer not null,
  primary key (bracket_group_id, asset_id)
);

create table hdr_jobs (
  id uuid primary key,
  shoot_id uuid not null references shoots(id),
  bracket_group_id uuid not null references bracket_groups(id),
  status text not null,
  preset text not null,
  output_mls_jpeg boolean not null default true,
  output_full_jpeg boolean not null default true,
  output_tiff boolean not null default false,
  started_at timestamptz null,
  finished_at timestamptz null,
  error_message text null,
  command_redacted text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table exports (
  id uuid primary key,
  shoot_id uuid not null references shoots(id),
  hdr_job_id uuid not null references hdr_jobs(id),
  kind text not null,
  storage_key text not null,
  mime_type text not null,
  width integer null,
  height integer null,
  file_size_bytes bigint null,
  created_at timestamptz not null default now()
);

create table job_events (
  id uuid primary key,
  hdr_job_id uuid not null references hdr_jobs(id),
  level text not null,
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table api_keys (
  id uuid primary key,
  name text not null,
  key_hash text not null,
  last_used_at timestamptz null,
  created_at timestamptz not null default now()
);

create index shoots_created_at_idx on shoots (created_at);
create index assets_shoot_id_idx on assets (shoot_id);
create index bracket_groups_shoot_id_idx on bracket_groups (shoot_id);
create index hdr_jobs_shoot_id_idx on hdr_jobs (shoot_id);
create index hdr_jobs_status_idx on hdr_jobs (status);
create index exports_hdr_job_id_idx on exports (hdr_job_id);
create index job_events_hdr_job_id_idx on job_events (hdr_job_id);
