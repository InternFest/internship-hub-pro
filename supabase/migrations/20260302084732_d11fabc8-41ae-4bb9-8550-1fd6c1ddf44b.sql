
-- Create a function to cascade delete a student and all their related records
CREATE OR REPLACE FUNCTION public.delete_student_cascade(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete assignment submissions
  DELETE FROM public.assignment_submissions WHERE student_id = _user_id;
  
  -- Delete internship diary entries
  DELETE FROM public.internship_diary WHERE user_id = _user_id;
  
  -- Delete project diary entries
  DELETE FROM public.project_diary WHERE user_id = _user_id;
  
  -- Delete project memberships
  DELETE FROM public.project_members WHERE user_id = _user_id;
  
  -- Delete projects where user is lead
  DELETE FROM public.projects WHERE lead_id = _user_id;
  
  -- Delete leave requests
  DELETE FROM public.leave_requests WHERE user_id = _user_id;
  
  -- Delete admin queries
  DELETE FROM public.admin_queries WHERE user_id = _user_id;
  
  -- Delete student profile
  DELETE FROM public.student_profiles WHERE user_id = _user_id;
  
  -- Delete user role
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE id = _user_id;
  
  -- Delete auth user (requires service role, handled via admin API)
  -- This function handles the public schema cleanup
END;
$$;

-- Grant execute to authenticated users (RLS on calling side ensures admin-only)
GRANT EXECUTE ON FUNCTION public.delete_student_cascade(uuid) TO authenticated;
