-- VibeFresh Credits System - Fresh Start & Fix
-- Purpose: Ensure every user has 100 credits and future users get 100

-- Step 1: Ensure the column exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100;

-- Step 2: FORCE the default to be 100 (in case it was set to 10 previously)
ALTER TABLE profiles 
ALTER COLUMN credits SET DEFAULT 100;

-- Step 3: Reset ALL existing users to 100 credits
-- This fixes the issue where you/others are seeing 10 credits
UPDATE profiles 
SET credits = 100;

-- Verification
-- SELECT id, email, credits FROM profiles;
