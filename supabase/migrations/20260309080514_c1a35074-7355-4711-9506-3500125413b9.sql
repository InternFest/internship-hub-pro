
-- Create team_profiles table for internal team (faculty/bde) approval
CREATE TABLE public.team_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('faculty', 'bde')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all team profiles" ON public.team_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own team profile" ON public.team_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  college_name TEXT,
  branch TEXT,
  year TEXT,
  semester TEXT,
  phone TEXT,
  email TEXT,
  course_interested TEXT,
  lead_type TEXT NOT NULL DEFAULT 'internship' CHECK (lead_type IN ('aicte', 'internship')),
  status TEXT NOT NULL DEFAULT 'initial_contact' CHECK (status IN ('initial_contact', 'whatsapp_group_created', 're_initiate_call', 'converted', 'paid', 'not_interested')),
  assigned_bde_id UUID,
  created_by UUID NOT NULL,
  reminder_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "BDEs can view assigned leads" ON public.leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'bde'::app_role) AND assigned_bde_id = auth.uid());

CREATE POLICY "BDEs can insert leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'bde'::app_role) AND created_by = auth.uid());

CREATE POLICY "BDEs can update assigned leads" ON public.leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'bde'::app_role) AND (assigned_bde_id = auth.uid() OR created_by = auth.uid()));

-- Triggers
CREATE TRIGGER update_team_profiles_updated_at BEFORE UPDATE ON public.team_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
