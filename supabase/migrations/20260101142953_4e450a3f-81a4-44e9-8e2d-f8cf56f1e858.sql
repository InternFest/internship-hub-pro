-- Drop existing restrictive policies and recreate as permissive policies

-- BATCHES
DROP POLICY IF EXISTS "Admins can manage batches" ON public.batches;
DROP POLICY IF EXISTS "Authenticated users can view batches" ON public.batches;

CREATE POLICY "Admins can manage batches" ON public.batches
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view batches" ON public.batches
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- STUDENT_PROFILES - Add policy for admins to see all
DROP POLICY IF EXISTS "Admins can manage all student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Faculty can view all student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can update their own student profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Students can view their own student profile" ON public.student_profiles;

CREATE POLICY "Admins can manage all student profiles" ON public.student_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Faculty can view all student profiles" ON public.student_profiles
  FOR SELECT USING (has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Students can view their own student profile" ON public.student_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can update their own student profile" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- PROFILES - Add policy for students to see other profiles (for project member search)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Faculty can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Faculty can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow approved students to search other profiles by phone (for adding project members)
CREATE POLICY "Approved students can search profiles" ON public.profiles
  FOR SELECT USING (
    has_role(auth.uid(), 'student'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.student_profiles 
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

-- LEAVE_REQUESTS - Fix for admins to manage
DROP POLICY IF EXISTS "Admins can manage all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Faculty can view all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Students can create leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Students can view their own leaves" ON public.leave_requests;

CREATE POLICY "Admins can manage all leave requests" ON public.leave_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Faculty can view all leave requests" ON public.leave_requests
  FOR SELECT USING (has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Students can create leave requests" ON public.leave_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view their own leaves" ON public.leave_requests
  FOR SELECT USING (auth.uid() = user_id);

-- ADMIN_QUERIES
DROP POLICY IF EXISTS "Admins can manage all queries" ON public.admin_queries;
DROP POLICY IF EXISTS "Students can create queries" ON public.admin_queries;
DROP POLICY IF EXISTS "Students can view their own queries" ON public.admin_queries;

CREATE POLICY "Admins can manage all queries" ON public.admin_queries
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Faculty can view all queries" ON public.admin_queries
  FOR SELECT USING (has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Students can create queries" ON public.admin_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view their own queries" ON public.admin_queries
  FOR SELECT USING (auth.uid() = user_id);

-- USER_ROLES - Allow admins and faculty to see all roles  
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Faculty can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- INTERNSHIP_DIARY
DROP POLICY IF EXISTS "Admins can view all diaries" ON public.internship_diary;
DROP POLICY IF EXISTS "Faculty can view all diaries" ON public.internship_diary;
DROP POLICY IF EXISTS "Students can insert their own diary" ON public.internship_diary;
DROP POLICY IF EXISTS "Students can update their own recent diary" ON public.internship_diary;
DROP POLICY IF EXISTS "Students can view their own diary" ON public.internship_diary;

CREATE POLICY "Admins can view all diaries" ON public.internship_diary
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Faculty can view all diaries" ON public.internship_diary
  FOR SELECT USING (has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Students can insert their own diary" ON public.internship_diary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own recent diary" ON public.internship_diary
  FOR UPDATE USING (auth.uid() = user_id AND created_at > (now() - interval '7 days'));

CREATE POLICY "Students can view their own diary" ON public.internship_diary
  FOR SELECT USING (auth.uid() = user_id);

-- PROJECTS
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Faculty can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Lead can create projects" ON public.projects;
DROP POLICY IF EXISTS "Lead can update projects" ON public.projects;
DROP POLICY IF EXISTS "Members can view their projects" ON public.projects;

CREATE POLICY "Admins can view all projects" ON public.projects
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Faculty can view all projects" ON public.projects
  FOR SELECT USING (has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Lead can create projects" ON public.projects
  FOR INSERT WITH CHECK (lead_id = auth.uid());

CREATE POLICY "Lead can update projects" ON public.projects
  FOR UPDATE USING (lead_id = auth.uid());

CREATE POLICY "Members can view their projects" ON public.projects
  FOR SELECT USING (
    lead_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid())
  );

-- PROJECT_MEMBERS
DROP POLICY IF EXISTS "Admins can view all project members" ON public.project_members;
DROP POLICY IF EXISTS "Faculty can view all project members" ON public.project_members;
DROP POLICY IF EXISTS "Lead can manage project members" ON public.project_members;
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;

CREATE POLICY "Admins can view all project members" ON public.project_members
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Faculty can view all project members" ON public.project_members
  FOR SELECT USING (has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Lead can manage project members" ON public.project_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_members.project_id AND lead_id = auth.uid())
  );

CREATE POLICY "Members can view project members" ON public.project_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_members.project_id AND lead_id = auth.uid()) OR
    user_id = auth.uid()
  );