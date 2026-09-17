
-- V11: FIX PROFILES SCHEMA & BACKFILL
-- 1. Force add the missing column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
-- Add other useful columns while we are at it
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 10;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Update the Trigger Function (ensure it uses existing columns)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username;
  RETURN new;
END;
$$;

-- 3. Re-Create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Safe Backfill (Specifying columns explicitly)
INSERT INTO public.profiles (id, username, full_name)
SELECT 
  id, 
  email::text, -- Cast to ensure type match
  COALESCE(raw_user_meta_data->>'full_name', email::text)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username;
