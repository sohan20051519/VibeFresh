-- Add is_starred column to projects table if it doesn't exist
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'is_starred') then
    alter table projects add column is_starred boolean default false;
  end if;
end $$;

-- Ensure RLS allows updating this column (usually covered by general update policy, but good to check)
-- No specific action needed if "Users can update own project" policy exists.
