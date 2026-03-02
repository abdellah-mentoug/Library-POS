-- Migration 016: RLS helper function
-- get_my_role() returns the current authenticated user's role from the profiles table
-- Used by RLS policies to enforce role-based access control
-- SECURITY DEFINER: runs with the function owner's privileges (bypasses RLS on profiles)
-- STABLE: tells the planner the function returns the same result within a single statement

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
