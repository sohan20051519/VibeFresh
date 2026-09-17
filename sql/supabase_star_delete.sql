-- Add is_starred column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- Ensure RLS allows updates to this column (usually covered by existing update policy)
-- But just in case, no specific policy needed for column if table policy exists.

-- Update get_project functions or similar if they return specific columns? 
-- The existing queries use `select('*')` so it should pick up the new column automatically.
