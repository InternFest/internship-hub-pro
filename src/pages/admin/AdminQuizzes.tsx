import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Plus, Lock, FileQuestion, Loader2, Trash2, Eye, Users, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Quiz {
  id: string;
  batch_id: string;
  title: string;
  description: string | null;
  deadline: string;
  deadline_time: string | null;
  created_at: string;
  batches?: { name: string };
}

interface QuestionDraft {
  question_text: string;
  question_type: "mcq" | "text";
  options: string[];
  correct_answer: string;
  points: number;
}

interface Batch {
  id: string;
  name: string;
  assigned_faculty_id?: string | null;
}

export default function AdminQuizzes() {
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingQuiz, setDeletingQuiz] = useState<Quiz | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [trackingQuiz, setTrackingQuiz] = useState<Quiz | null>(null);
  const [trackingSubs, setTrackingSubs] = useState<any[]>([]);
  const [trackingStudents, setTrackingStudents] = useState<any[]>([]);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("all");

  // Form state
  const [batchId, setBatchId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("23:59");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { question_text: "", question_type: "mcq", options: ["", "", "", ""], correct_answer: "", points: 1 },
  ]);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [{ data: batchesData }, { data: quizzesData }] = await Promise.all([
        supabase.from("batches").select("id, name, end_date, assigned_faculty_id").gt("end_date", today).order("name"),
        supabase.from("quizzes").select("*, batches(name)").order("created_at", { ascending: false }),
      ]);

      let availableBatches = batchesData || [];
      if (role === "faculty" && user) {
        availableBatches = availableBatches.filter((b) => b.assigned_faculty_id === user.id);
      }
      setBatches(availableBatches);
      setQuizzes((quizzesData || []) as Quiz[]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const resetForm = () => {
    setBatchId(""); setTitle(""); setDescription(""); setDeadline(""); setDeadlineTime("23:59");
    setQuestions([{ question_text: "", question_type: "mcq", options: ["", "", "", ""], correct_answer: "", points: 1 }]);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question_text: "", question_type: "mcq", options: ["", "", "", ""], correct_answer: "", points: 1 }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[idx] as any)[field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = value;
    setQuestions(updated);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user || !batchId || !title || !deadline) {
      toast({ title: "Error", description: "Fill all required fields.", variant: "destructive" }); return;
    }
    for (const q of questions) {
      if (!q.question_text.trim()) {
        toast({ title: "Error", description: "All questions must have text.", variant: "destructive" }); return;
      }
      if (q.question_type === "mcq" && (!q.correct_answer || q.options.filter((o) => o.trim()).length < 2)) {
        toast({ title: "Error", description: "MCQ questions need at least 2 options and a correct answer.", variant: "destructive" }); return;
      }
    }

    setSaving(true);
    try {
      const { data: quiz, error } = await supabase.from("quizzes").insert({
        batch_id: batchId, title, description: description || null,
        deadline, deadline_time: deadlineTime || "23:59", created_by: user.id,
      }).select().single();
      if (error) throw error;

      const questionPayloads = questions.map((q, i) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === "mcq" ? q.options.filter((o) => o.trim()) : null,
        correct_answer: q.question_type === "mcq" ? q.correct_answer : null,
        points: q.points,
        order_number: i + 1,
      }));

      const { error: qError } = await supabase.from("quiz_questions").insert(questionPayloads);
      if (qError) throw qError;

      toast({ title: "Success", description: "Quiz created!" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingQuiz) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", deletingQuiz.id);
      if (error) throw error;
      toast({ title: "Deleted" });
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleTrack = async (quiz: Quiz) => {
    setTrackingQuiz(quiz);
    setTrackDialogOpen(true);
    try {
      const { data: subs } = await supabase.from("quiz_submissions").select("*").eq("quiz_id", quiz.id);
      setTrackingSubs(subs || []);

      const { data: students } = await supabase
        .from("student_profiles").select("user_id, student_id").eq("batch_id", quiz.batch_id).eq("status", "approved");
      if (students && students.length > 0) {
        const userIds = students.map((s) => s.user_id);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
        setTrackingStudents(students.map((s) => ({
          ...s,
          profile: profiles?.find((p) => p.id === s.user_id),
        })));
      } else {
        setTrackingStudents([]);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const filteredQuizzes = selectedBatchFilter === "all" ? quizzes : quizzes.filter((q) => q.batch_id === selectedBatchFilter);

  if (authLoading || loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  if (role !== "admin" && role !== "faculty") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
        </div>
      </DashboardLayout>
    );
  }

  const submittedIds = new Set(trackingSubs.map((s) => s.student_id));
  const submittedStudents = trackingStudents.filter((s) => submittedIds.has(s.user_id));
  const notSubmittedStudents = trackingStudents.filter((s) => !submittedIds.has(s.user_id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between fade-in">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Quizzes</h1>
            <p className="text-muted-foreground">Create quizzes and track student submissions.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Create Quiz</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Quiz</DialogTitle>
                <DialogDescription>Create a new quiz with MCQ and/or text questions.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Batch *</Label>
                    <Select value={batchId} onValueChange={setBatchId}>
                      <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                      <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Quiz description..." />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Deadline *</Label>
                    <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Deadline Time</Label>
                    <Input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} />
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Questions</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                      <Plus className="mr-1 h-3 w-3" /> Add Question
                    </Button>
                  </div>
                  {questions.map((q, idx) => (
                    <Card key={idx} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Q{idx + 1}</Badge>
                        <div className="flex items-center gap-2">
                          <Select value={q.question_type} onValueChange={(v) => updateQuestion(idx, "question_type", v)}>
                            <SelectTrigger className="w-[100px] h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mcq">MCQ</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input type="number" min="1" max="100" value={q.points} onChange={(e) => updateQuestion(idx, "points", parseInt(e.target.value) || 1)} className="w-16 h-8" placeholder="Pts" />
                          {questions.length > 1 && (
                            <Button variant="ghost" size="sm" className="text-destructive h-8" onClick={() => removeQuestion(idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <Input value={q.question_text} onChange={(e) => updateQuestion(idx, "question_text", e.target.value)} placeholder="Enter question..." />
                      {q.question_type === "mcq" && (
                        <div className="space-y-2 pl-4">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4">{String.fromCharCode(65 + oi)}.</span>
                              <Input value={opt} onChange={(e) => updateOption(idx, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="h-8" />
                            </div>
                          ))}
                          <div className="space-y-1">
                            <Label className="text-xs">Correct Answer *</Label>
                            <Select value={q.correct_answer} onValueChange={(v) => updateQuestion(idx, "correct_answer", v)}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                              <SelectContent>
                                {q.options.filter((o) => o.trim()).map((opt, oi) => (
                                  <SelectItem key={oi} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : <><Plus className="mr-2 h-4 w-4" /> Create Quiz</>}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <Label>Filter by Batch:</Label>
          <Select value={selectedBatchFilter} onValueChange={setSelectedBatchFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filteredQuizzes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No quizzes yet</h3>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Quiz</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredQuizzes.map((quiz) => (
              <Card key={quiz.id} className="transition-all hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileQuestion className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{quiz.title}</h4>
                        <Badge variant="outline">{quiz.batches?.name}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Deadline: {format(new Date(quiz.deadline), "MMM dd, yyyy")}{quiz.deadline_time ? ` at ${quiz.deadline_time}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleTrack(quiz)}>
                      <Users className="mr-2 h-4 w-4" /> Track
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setDeletingQuiz(quiz); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tracking Dialog */}
      <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {trackingQuiz && (
            <>
              <DialogHeader>
                <DialogTitle>{trackingQuiz.title}</DialogTitle>
                <DialogDescription>{trackingQuiz.batches?.name}</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="submitted">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="submitted">Submitted ({submittedStudents.length})</TabsTrigger>
                  <TabsTrigger value="not-submitted">Not Submitted ({notSubmittedStudents.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="submitted" className="space-y-2 mt-4">
                  {submittedStudents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No submissions yet.</p>
                  ) : submittedStudents.map((s) => {
                    const sub = trackingSubs.find((sub) => sub.student_id === s.user_id);
                    return (
                      <div key={s.user_id} className="rounded-lg border p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <div>
                            <p className="font-medium text-sm">{s.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.student_id}</p>
                          </div>
                        </div>
                        {sub && <Badge variant="outline">{sub.score}/{sub.total_points}</Badge>}
                      </div>
                    );
                  })}
                </TabsContent>
                <TabsContent value="not-submitted" className="space-y-2 mt-4">
                  {notSubmittedStudents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">All students submitted!</p>
                  ) : notSubmittedStudents.map((s) => (
                    <div key={s.user_id} className="flex items-center gap-2 rounded-lg border p-3">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <div>
                        <p className="font-medium text-sm">{s.profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{s.student_id}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
            <AlertDialogDescription>This will delete all questions and student submissions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
