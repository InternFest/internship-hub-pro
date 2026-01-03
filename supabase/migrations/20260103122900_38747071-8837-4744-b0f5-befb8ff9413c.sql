-- Create resource_type enum
CREATE TYPE public.resource_type AS ENUM ('video', 'text', 'notes');

-- Create resources table
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  resource_type public.resource_type NOT NULL DEFAULT 'video',
  content_url TEXT, -- For video URLs
  content_text TEXT, -- For text content
  pdf_url TEXT, -- For PDF files
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Create policies for resources

-- Admins can do everything
CREATE POLICY "Admins can manage all resources"
ON public.resources
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Faculty can manage resources
CREATE POLICY "Faculty can manage resources"
ON public.resources
FOR ALL
USING (has_role(auth.uid(), 'faculty'))
WITH CHECK (has_role(auth.uid(), 'faculty'));

-- Approved students can view resources of their batch
CREATE POLICY "Approved students can view batch resources"
ON public.resources
FOR SELECT
USING (
  has_role(auth.uid(), 'student') AND
  EXISTS (
    SELECT 1 FROM public.student_profiles
    WHERE student_profiles.user_id = auth.uid()
    AND student_profiles.status = 'approved'
    AND student_profiles.batch_id = resources.batch_id
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_resources_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for resource PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-files', 'resource-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for resource files
CREATE POLICY "Admins can manage resource files"
ON storage.objects
FOR ALL
USING (bucket_id = 'resource-files' AND has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'resource-files' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Faculty can manage resource files"
ON storage.objects
FOR ALL
USING (bucket_id = 'resource-files' AND has_role(auth.uid(), 'faculty'))
WITH CHECK (bucket_id = 'resource-files' AND has_role(auth.uid(), 'faculty'));

CREATE POLICY "Students can view resource files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'resource-files' AND
  has_role(auth.uid(), 'student') AND
  EXISTS (
    SELECT 1 FROM public.student_profiles
    WHERE student_profiles.user_id = auth.uid()
    AND student_profiles.status = 'approved'
  )
);