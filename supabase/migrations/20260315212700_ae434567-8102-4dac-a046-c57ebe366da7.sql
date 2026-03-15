
-- 1. Add 'external_link' to resource_type enum
ALTER TYPE public.resource_type ADD VALUE IF NOT EXISTS 'external_link';

-- 2. Assignment grades table
CREATE TABLE public.assignment_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  grade_attained numeric NOT NULL DEFAULT 0,
  total_grade numeric NOT NULL DEFAULT 100,
  comments text,
  graded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

ALTER TABLE public.assignment_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and faculty can manage grades" ON public.assignment_grades
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'));

CREATE POLICY "Students can view their own grades" ON public.assignment_grades
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- 3. Quizzes table
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deadline date NOT NULL,
  deadline_time text DEFAULT '23:59'
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and faculty can manage quizzes" ON public.quizzes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'));

CREATE POLICY "Students can view quizzes for their batch" ON public.quizzes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'student') AND batch_id IN (
    SELECT batch_id FROM student_profiles WHERE user_id = auth.uid()
  ));

-- 4. Quiz questions table
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'mcq',
  options jsonb,
  correct_answer text,
  points numeric NOT NULL DEFAULT 1,
  order_number integer NOT NULL DEFAULT 1
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and faculty can manage quiz questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'));

CREATE POLICY "Students can view quiz questions for their batch" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (quiz_id IN (
    SELECT id FROM quizzes WHERE batch_id IN (
      SELECT batch_id FROM student_profiles WHERE user_id = auth.uid()
    )
  ));

-- 5. Quiz submissions table
CREATE TABLE public.quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  score numeric,
  total_points numeric,
  is_graded boolean NOT NULL DEFAULT false,
  UNIQUE(quiz_id, student_id)
);

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and faculty can manage quiz submissions" ON public.quiz_submissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'));

CREATE POLICY "Students can insert their own quiz submissions" ON public.quiz_submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view their own quiz submissions" ON public.quiz_submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- 6. Quiz answers table
CREATE TABLE public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.quiz_submissions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer_text text,
  is_correct boolean,
  points_awarded numeric DEFAULT 0
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and faculty can manage quiz answers" ON public.quiz_answers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'faculty'));

CREATE POLICY "Students can insert their own quiz answers" ON public.quiz_answers
  FOR INSERT TO authenticated
  WITH CHECK (submission_id IN (
    SELECT id FROM quiz_submissions WHERE student_id = auth.uid()
  ));

CREATE POLICY "Students can view their own quiz answers" ON public.quiz_answers
  FOR SELECT TO authenticated
  USING (submission_id IN (
    SELECT id FROM quiz_submissions WHERE student_id = auth.uid()
  ));

-- 7. Session feedbacks table
CREATE TABLE public.session_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  topics_covered text NOT NULL,
  session_rating integer NOT NULL CHECK (session_rating >= 1 AND session_rating <= 5),
  content_explanation_rating integer NOT NULL CHECK (content_explanation_rating >= 1 AND content_explanation_rating <= 5),
  content_coverage_rating integer NOT NULL CHECK (content_coverage_rating >= 1 AND content_coverage_rating <= 5),
  improvements text,
  comments text,
  issues text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_number)
);

ALTER TABLE public.session_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert their own feedback" ON public.session_feedbacks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can view their own feedback" ON public.session_feedbacks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all feedback" ON public.session_feedbacks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Faculty can view all feedback" ON public.session_feedbacks
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'faculty'));

-- 8. BDE can view student profiles and profiles
CREATE POLICY "BDE can view all student profiles" ON public.student_profiles
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'bde'));

CREATE POLICY "BDE can view all profiles" ON public.profiles
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'bde'));

CREATE POLICY "BDE can view all roles" ON public.user_roles
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'bde'));
