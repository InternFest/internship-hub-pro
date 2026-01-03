-- Drop existing problematic policies on projects
DROP POLICY IF EXISTS "Members can view their projects" ON public.projects;

-- Create security definer function to check if user can access a project
CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = _project_id AND lead_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_members WHERE project_id = _project_id AND user_id = _user_id
  )
$$;

-- Create a simpler policy for viewing projects that doesn't cause recursion
CREATE POLICY "Users can view their own projects"
ON public.projects
FOR SELECT
USING (
  lead_id = auth.uid() OR public.is_project_member(auth.uid(), id)
);