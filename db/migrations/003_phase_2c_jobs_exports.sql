alter table hdr_jobs
add column if not exists engine_mode text not null default 'fake';

create index if not exists hdr_jobs_bracket_group_id_idx on hdr_jobs (bracket_group_id);
create index if not exists exports_shoot_id_idx on exports (shoot_id);
