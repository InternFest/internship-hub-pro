
-- Calendar table for batch-specific working calendars
CREATE TABLE public.calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Working Calendar',
  pdf_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and faculty can manage calendars" ON public.calendars
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'faculty'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'faculty'::app_role));

CREATE POLICY "Students can view calendars for their batch" ON public.calendars
FOR SELECT USING (
  has_role(auth.uid(), 'student'::app_role) AND
  batch_id IN (SELECT batch_id FROM student_profiles WHERE user_id = auth.uid())
);

CREATE TRIGGER update_calendars_updated_at
BEFORE UPDATE ON public.calendars
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for calendar files
INSERT INTO storage.buckets (id, name, public) VALUES ('calendar-files', 'calendar-files', false);

CREATE POLICY "Admin/Faculty can upload calendar files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'calendar-files' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'faculty'::app_role))
);

CREATE POLICY "Admin/Faculty can update calendar files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'calendar-files' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'faculty'::app_role))
);

CREATE POLICY "Admin/Faculty can delete calendar files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'calendar-files' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'faculty'::app_role))
);

CREATE POLICY "Authenticated users can view calendar files" ON storage.objects
FOR SELECT USING (bucket_id = 'calendar-files' AND auth.uid() IS NOT NULL);
