
-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  assignment_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  pdf_url TEXT,
  links TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Assignments policies
CREATE POLICY "Admin and faculty can view all assignments"
ON public.assignments FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faculty')
);

CREATE POLICY "Students can view assignments for their batch"
ON public.assignments FOR SELECT
USING (
  public.has_role(auth.uid(), 'student') AND
  batch_id IN (SELECT batch_id FROM public.student_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admin and faculty can create assignments"
ON public.assignments FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faculty')
);

CREATE POLICY "Admin and faculty can update assignments"
ON public.assignments FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faculty')
);

CREATE POLICY "Admin and faculty can delete assignments"
ON public.assignments FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'faculty')
);

-- Submission policies
CREATE POLICY "Students can submit their own assignments"
ON public.assignment_submissions FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own submissions"
ON public.assignment_submissions FOR SELECT
USING (
  auth.uid() = student_id OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'faculty')
);

-- Create storage bucket for assignment files
INSERT INTO storage.buckets (id, name, public) VALUES ('assignment-files', 'assignment-files', false);

-- Storage policies for assignment files
CREATE POLICY "Students can upload assignment files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assignment-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can view assignment files"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignment-files' AND auth.role() = 'authenticated');

-- Triggers for updated_at
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
