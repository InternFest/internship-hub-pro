
-- Templates table
CREATE TABLE public.review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_type TEXT NOT NULL CHECK (review_type IN ('review-1','review-2')),
  version INTEGER NOT NULL DEFAULT 1,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and faculty manage templates" ON public.review_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'faculty'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'faculty'::app_role));

CREATE POLICY "Authenticated can view templates" ON public.review_templates
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_review_templates_updated_at
  BEFORE UPDATE ON public.review_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generated reviews table
CREATE TABLE public.generated_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('review-1','review-2')),
  full_name TEXT NOT NULL,
  usn TEXT NOT NULL,
  template_id UUID,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own generated reviews" ON public.generated_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students view own generated reviews" ON public.generated_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admin and faculty view all generated reviews" ON public.generated_reviews
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'faculty'::app_role));

CREATE POLICY "Admin manage all generated reviews" ON public.generated_reviews
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('review-templates','review-templates', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-reviews','generated-reviews', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: review-templates
CREATE POLICY "Admin/faculty manage review templates storage" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'review-templates' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'faculty'::app_role)))
  WITH CHECK (bucket_id = 'review-templates' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'faculty'::app_role)));

CREATE POLICY "Authenticated read review templates storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'review-templates');

-- Storage policies: generated-reviews
CREATE POLICY "Users upload own generated reviews" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'generated-reviews' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own generated reviews" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'generated-reviews' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admin/faculty read all generated reviews" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'generated-reviews' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'faculty'::app_role)));

CREATE POLICY "Admin manage all generated reviews storage" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'generated-reviews' AND has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'generated-reviews' AND has_role(auth.uid(),'admin'::app_role));
