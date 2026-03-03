
-- Add resolution_comment to admin_queries for admin comments when resolving
ALTER TABLE public.admin_queries ADD COLUMN IF NOT EXISTS resolution_comment text;

-- Add text_content column to assignment_submissions for text-based submissions
ALTER TABLE public.assignment_submissions 
  ADD COLUMN IF NOT EXISTS text_content text,
  ADD COLUMN IF NOT EXISTS submission_type text DEFAULT 'file';

-- Allow multiple submissions per assignment (remove unique constraint if exists)
-- The current schema already allows multiple submissions since there's no unique constraint on (assignment_id, student_id)

-- Allow students to update their own submissions
CREATE POLICY "Students can update their own submissions"
ON public.assignment_submissions
FOR UPDATE
USING (auth.uid() = student_id);

-- Allow students to delete their own submissions  
CREATE POLICY "Students can delete their own submissions"
ON public.assignment_submissions
FOR DELETE
USING (auth.uid() = student_id);
