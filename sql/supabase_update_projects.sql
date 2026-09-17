
-- Run this to update the projects table if you haven't already
-- Or, if you just created it, you can drop and recreate or run this alter

-- Option 1: Alter existing table (Safest if you have data)
alter table projects add column if not exists messages jsonb;

-- Option 2: RLS remains the same
