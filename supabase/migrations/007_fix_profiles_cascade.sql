-- Add ON DELETE CASCADE to profiles.id → auth.users(id)
-- Previously missing, causing 'Database error deleting user' on admin deleteUser calls.

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
