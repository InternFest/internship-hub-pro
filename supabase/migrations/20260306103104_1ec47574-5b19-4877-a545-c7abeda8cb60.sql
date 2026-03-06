-- Remove the 7-day restriction on diary editing so students can edit anytime (if not locked)
DROP POLICY IF EXISTS "Students can update their own recent diary" ON public.internship_diary;

CREATE POLICY "Students can update their own diary"
ON public.internship_diary
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND (is_locked IS NULL OR is_locked = false))
WITH CHECK (auth.uid() = user_id AND (is_locked IS NULL OR is_locked = false));