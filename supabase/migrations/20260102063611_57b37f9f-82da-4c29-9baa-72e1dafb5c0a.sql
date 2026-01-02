-- Fix RLS policies for projects to avoid infinite recursion
-- Drop existing policies that cause issues
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;

-- Create security definer function to check if user is lead of a project
CREATE OR REPLACE FUNCTION public.is_project_lead(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND lead_id = _user_id
  )
$$;

-- Create security definer function to check if user is member of a project
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = _project_id AND user_id = _user_id
  )
$$;

-- Recreate the policy using security definer functions
CREATE POLICY "Members can view project members"
ON public.project_members
FOR SELECT
USING (
  public.is_project_lead(auth.uid(), project_id) 
  OR user_id = auth.uid()
  OR public.is_project_member(auth.uid(), project_id)
);

-- Allow all approved students to view all projects for joining
CREATE POLICY "Approved students can view all projects"
ON public.projects
FOR SELECT
USING (
  has_role(auth.uid(), 'student') AND EXISTS (
    SELECT 1 FROM student_profiles
    WHERE user_id = auth.uid() AND status = 'approved'
  )
);

-- Allow approved students to view all project members
CREATE POLICY "Approved students can view all project members"
ON public.project_members
FOR SELECT
USING (
  has_role(auth.uid(), 'student') AND EXISTS (
    SELECT 1 FROM student_profiles
    WHERE user_id = auth.uid() AND status = 'approved'
  )
);

-- Allow approved students to join projects (insert themselves as members)
CREATE POLICY "Approved students can join projects"
ON public.project_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  has_role(auth.uid(), 'student') AND 
  EXISTS (
    SELECT 1 FROM student_profiles
    WHERE user_id = auth.uid() AND status = 'approved'
  )
);