alter table assets
  add column if not exists thumbnail_storage_key text null;
