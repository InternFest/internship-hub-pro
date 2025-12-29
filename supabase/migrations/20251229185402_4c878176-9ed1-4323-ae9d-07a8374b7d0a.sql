-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('student', 'faculty', 'admin');

-- Create student status enum
CREATE TYPE public.student_status AS ENUM ('pending', 'approved', 'rejected');

-- Create internship role enum
CREATE TYPE public.internship_role AS ENUM ('ai-ml', 'java', 'vlsi', 'mern');

-- Create skill level enum
CREATE TYPE public.skill_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create leave type enum
CREATE TYPE public.leave_type AS ENUM ('sick', 'casual');

-- Create leave status enum
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Create query category enum
CREATE TYPE public.query_category AS ENUM ('course', 'faculty', 'schedule', 'work', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE(user_id, role)
);

-- Create student_profiles table (student-specific data)
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  student_id TEXT UNIQUE,
  usn TEXT,
  college_name TEXT,
  branch TEXT,
  internship_role internship_role,
  skill_level skill_level DEFAULT 'beginner',
  status student_status DEFAULT 'pending',
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create batches table
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  course_code TEXT NOT NULL DEFAULT '01',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  assigned_faculty_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for batch_id after batches table is created
ALTER TABLE public.student_profiles ADD CONSTRAINT fk_student_batch FOREIGN KEY (batch_id) REFERENCES public.batches(id);

-- Create internship_diary table
CREATE TABLE public.internship_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL DEFAULT 1,
  entry_date DATE NOT NULL,
  work_description TEXT NOT NULL,
  hours_worked NUMERIC(4,2) NOT NULL,
  learning_outcome TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_members table
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create project_diary table
CREATE TABLE public.project_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  work_description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  leave_date DATE NOT NULL,
  leave_type leave_type NOT NULL,
  reason TEXT NOT NULL,
  status leave_status DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create admin_queries table
CREATE TABLE public.admin_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category query_category NOT NULL,
  description TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sequence for student ID generation
CREATE SEQUENCE public.student_id_seq START 1;

-- Function to generate student ID
CREATE OR REPLACE FUNCTION public.generate_student_id(course_code TEXT, batch_year TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_num INTEGER;
  student_id TEXT;
BEGIN
  seq_num := nextval('public.student_id_seq');
  student_id := 'FEST' || course_code || batch_year || LPAD(seq_num::TEXT, 3, '0');
  RETURN student_id;
END;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  new_student_id TEXT;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email, phone, date_of_birth)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'date_of_birth')::DATE
  );
  
  -- Insert default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  -- Generate student ID and create student profile
  current_year := EXTRACT(YEAR FROM now())::TEXT;
  current_year := SUBSTRING(current_year FROM 3 FOR 2);
  new_student_id := public.generate_student_id('01', current_year);
  
  INSERT INTO public.student_profiles (user_id, student_id, status)
  VALUES (NEW.id, new_student_id, 'pending');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_internship_diary_updated_at BEFORE UPDATE ON public.internship_diary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_diary_updated_at BEFORE UPDATE ON public.project_diary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_queries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'faculty'));

-- User roles policies
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Student profiles policies
CREATE POLICY "Students can view their own student profile" ON public.student_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can update their own student profile" ON public.student_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all student profiles" ON public.student_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view all student profiles" ON public.student_profiles FOR SELECT USING (public.has_role(auth.uid(), 'faculty'));

-- Batches policies
CREATE POLICY "Authenticated users can view batches" ON public.batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage batches" ON public.batches FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Internship diary policies
CREATE POLICY "Students can view their own diary" ON public.internship_diary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can insert their own diary" ON public.internship_diary FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can update their own recent diary" ON public.internship_diary FOR UPDATE USING (auth.uid() = user_id AND created_at > now() - interval '7 days');
CREATE POLICY "Admins can view all diaries" ON public.internship_diary FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view all diaries" ON public.internship_diary FOR SELECT USING (public.has_role(auth.uid(), 'faculty'));

-- Projects policies
CREATE POLICY "Members can view their projects" ON public.projects FOR SELECT USING (
  lead_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = id AND user_id = auth.uid())
);
CREATE POLICY "Lead can create projects" ON public.projects FOR INSERT WITH CHECK (lead_id = auth.uid());
CREATE POLICY "Lead can update projects" ON public.projects FOR UPDATE USING (lead_id = auth.uid());
CREATE POLICY "Admins can view all projects" ON public.projects FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view all projects" ON public.projects FOR SELECT USING (public.has_role(auth.uid(), 'faculty'));

-- Project members policies
CREATE POLICY "Members can view project members" ON public.project_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND lead_id = auth.uid()) OR
  user_id = auth.uid()
);
CREATE POLICY "Lead can manage project members" ON public.project_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND lead_id = auth.uid())
);
CREATE POLICY "Admins can view all project members" ON public.project_members FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view all project members" ON public.project_members FOR SELECT USING (public.has_role(auth.uid(), 'faculty'));

-- Project diary policies
CREATE POLICY "Members can view project diary" ON public.project_diary FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_diary.project_id AND user_id = auth.uid())
);
CREATE POLICY "Members can insert project diary" ON public.project_diary FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = project_diary.project_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all project diaries" ON public.project_diary FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view all project diaries" ON public.project_diary FOR SELECT USING (public.has_role(auth.uid(), 'faculty'));

-- Leave requests policies
CREATE POLICY "Students can view their own leaves" ON public.leave_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can create leave requests" ON public.leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all leave requests" ON public.leave_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view all leave requests" ON public.leave_requests FOR SELECT USING (public.has_role(auth.uid(), 'faculty'));

-- Admin queries policies
CREATE POLICY "Students can view their own queries" ON public.admin_queries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can create queries" ON public.admin_queries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all queries" ON public.admin_queries FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for avatars and resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for resumes
CREATE POLICY "Users can view their own resume" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own resume" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own resume" ON storage.objects FOR UPDATE USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own resume" ON storage.objects FOR DELETE USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty can view all resumes" ON storage.objects FOR SELECT USING (bucket_id = 'resumes' AND public.has_role(auth.uid(), 'faculty'));