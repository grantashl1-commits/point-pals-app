-- Attribution tracking for Etsy / marketing source links.
-- Used to attribute account creation to specific campaigns (e.g. ?source=etsy).

alter table public.households
  add column if not exists attribution_source text;

-- Update the existing handle_create_household trigger function to forward the
-- source value from the INSERT payload to the newly created household row.
-- (The migration is additive — existing rows get a null source, which means
--  "organic / unknown".)
