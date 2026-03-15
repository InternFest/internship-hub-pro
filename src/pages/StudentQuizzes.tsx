import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Lock, FileQuestion, CheckCircle, Clock, Loader2, Award } from "lucide-react";
import { format } from "date-fns";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  deadline_time: string | null;
  created_at: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  points: number;
  order_number: number;
}

interface QuizSubmission {
  id: string;
  quiz_id: string;
  score: number | null;
  total_points: number | null;
  is_graded: boolean;
  submitted_at: string;
}

export default function StudentQuizzes() {
  const { user, studentStatus } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [{ data: quizzesData }, { data: subsData }] = await Promise.all([
          supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
          supabase.from("quiz_submissions").select("*").eq("student_id", user.id),
        ]);
        setQuizzes((quizzesData || []) as Quiz[]);
        setSubmissions((subsData || []) as QuizSubmission[]);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const isDeadlinePassed = (deadline: string, deadlineTime?: string | null) => {
    const dl = new Date(deadline);
    if (deadlineTime) {
      const [h, m] = deadlineTime.split(":").map(Number);
      dl.setHours(h, m, 59, 999);
    } else {
      dl.setHours(23, 59, 59, 999);
    }
    return dl < new Date();
  };

  const handleOpenQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setAnswers({});
    try {
      const { data } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("order_number");
      setQuestions((data || []) as Question[]);
      setDialogOpen(true);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!user || !selectedQuiz) return;

    // Validate all questions answered
    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      toast({ title: "Error", description: `Please answer all questions. ${unanswered.length} remaining.`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Calculate score for MCQ questions
      let totalScore = 0;
      let totalPoints = 0;
      const answerRecords: { question_id: string; answer_text: string; is_correct: boolean | null; points_awarded: number }[] = [];

      for (const question of questions) {
        totalPoints += question.points;
        const studentAnswer = answers[question.id];
        if (question.question_type === "mcq") {
          // Fetch correct answer for auto-grading
          const { data: qData } = await supabase
            .from("quiz_questions")
            .select("correct_answer")
            .eq("id", question.id)
            .single();
          const isCorrect = qData?.correct_answer?.toLowerCase().trim() === studentAnswer?.toLowerCase().trim();
          const pointsAwarded = isCorrect ? question.points : 0;
          totalScore += pointsAwarded;
          answerRecords.push({ question_id: question.id, answer_text: studentAnswer, is_correct: isCorrect, points_awarded: pointsAwarded });
        } else {
          // Text questions - not auto-graded
          answerRecords.push({ question_id: question.id, answer_text: studentAnswer, is_correct: null, points_awarded: 0 });
        }
      }

      const hasTextQuestions = questions.some((q) => q.question_type === "text");
      const isFullyGraded = !hasTextQuestions;

      // Insert submission
      const { data: submission, error: subError } = await supabase
        .from("quiz_submissions")
        .insert({
          quiz_id: selectedQuiz.id,
          student_id: user.id,
          score: totalScore,
          total_points: totalPoints,
          is_graded: isFullyGraded,
        })
        .select()
        .single();
      if (subError) throw subError;

      // Insert answers
      const { error: ansError } = await supabase
        .from("quiz_answers")
        .insert(answerRecords.map((a) => ({ ...a, submission_id: submission.id })));
      if (ansError) throw ansError;

      toast({ title: "Quiz Submitted!", description: `You scored ${totalScore}/${totalPoints} on auto-graded questions.` });
      setDialogOpen(false);

      // Refresh submissions
      const { data: subsData } = await supabase.from("quiz_submissions").select("*").eq("student_id", user.id);
      setSubmissions((subsData || []) as QuizSubmission[]);
    } catch (error: any) {
      console.error("Error:", error);
      toast({ title: "Error", description: error.message || "Failed to submit quiz.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (studentStatus !== "approved") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Available after approval.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Quizzes</h1>
          <p className="text-muted-foreground">Take quizzes and view your scores.</p>
        </div>

        {quizzes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No quizzes available</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => {
              const sub = submissions.find((s) => s.quiz_id === quiz.id);
              const deadlinePassed = isDeadlinePassed(quiz.deadline, quiz.deadline_time);
              return (
                <Card key={quiz.id} className="transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      {sub ? (
                        <Badge className="bg-success/10 text-success">
                          <CheckCircle className="mr-1 h-3 w-3" /> Completed
                        </Badge>
                      ) : deadlinePassed ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge className="bg-primary/10 text-primary"><Clock className="mr-1 h-3 w-3" /> Open</Badge>
                      )}
                    </div>
                    <CardTitle className="text-base mt-2">{quiz.title}</CardTitle>
                    {quiz.description && <CardDescription>{quiz.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Deadline: {format(new Date(quiz.deadline), "MMM dd, yyyy")}{quiz.deadline_time ? ` at ${quiz.deadline_time}` : ""}
                    </p>
                    {sub && (
                      <div className="rounded-lg bg-success/5 border border-success/20 p-2 flex items-center gap-2">
                        <Award className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Score: {sub.score}/{sub.total_points}</span>
                        {!sub.is_graded && <Badge variant="outline" className="text-xs">Partially graded</Badge>}
                      </div>
                    )}
                    {!sub && !deadlinePassed && (
                      <Button className="w-full" onClick={() => handleOpenQuiz(quiz)}>Take Quiz</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Quiz Taking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedQuiz && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedQuiz.title}</DialogTitle>
                {selectedQuiz.description && <DialogDescription>{selectedQuiz.description}</DialogDescription>}
              </DialogHeader>
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Q{idx + 1}. {q.question_text}</p>
                      <Badge variant="outline">{q.points} pt{q.points !== 1 ? "s" : ""}</Badge>
                    </div>
                    {q.question_type === "mcq" && q.options && (
                      <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
                        {(q.options as string[]).map((opt, oi) => (
                          <div key={oi} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt} id={`${q.id}-${oi}`} />
                            <Label htmlFor={`${q.id}-${oi}`} className="cursor-pointer">{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    {q.question_type === "text" && (
                      <Textarea
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        placeholder="Type your answer..."
                        rows={3}
                      />
                    )}
                  </div>
                ))}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmitQuiz} disabled={submitting}>
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Quiz"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
