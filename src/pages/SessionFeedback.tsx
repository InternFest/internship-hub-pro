import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Lock, Star, Send, CheckCircle, Loader2 } from "lucide-react";

interface Feedback {
  id: string;
  week_number: number;
  topics_covered: string;
  session_rating: number;
  content_explanation_rating: number;
  content_coverage_rating: number;
  improvements: string | null;
  comments: string | null;
  issues: string | null;
  created_at: string;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => onChange(star)} className="focus:outline-none">
            <Star className={`h-6 w-6 transition-colors ${star <= value ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SessionFeedback() {
  const { user, studentStatus } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [topicsCovered, setTopicsCovered] = useState("");
  const [sessionRating, setSessionRating] = useState(0);
  const [contentExplanation, setContentExplanation] = useState(0);
  const [contentCoverage, setContentCoverage] = useState(0);
  const [improvements, setImprovements] = useState("");
  const [comments, setComments] = useState("");
  const [issues, setIssues] = useState("");

  const getCurrentWeekNumber = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  };

  const currentWeek = getCurrentWeekNumber();

  useEffect(() => {
    const fetchFeedbacks = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("session_feedbacks")
          .select("*")
          .eq("user_id", user.id)
          .order("week_number", { ascending: false });
        if (error) throw error;
        setFeedbacks((data || []) as Feedback[]);
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, [user]);

  const hasSubmittedThisWeek = feedbacks.some((f) => f.week_number === currentWeek);

  const handleSubmit = async () => {
    if (!user) return;
    if (!topicsCovered.trim()) {
      toast({ title: "Error", description: "Topics covered is required.", variant: "destructive" });
      return;
    }
    if (sessionRating === 0 || contentExplanation === 0 || contentCoverage === 0) {
      toast({ title: "Error", description: "Please provide all ratings.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Get student's batch
      const { data: sp } = await supabase.from("student_profiles").select("batch_id").eq("user_id", user.id).maybeSingle();

      const { error } = await supabase.from("session_feedbacks").insert({
        user_id: user.id,
        batch_id: sp?.batch_id || null,
        week_number: currentWeek,
        topics_covered: topicsCovered,
        session_rating: sessionRating,
        content_explanation_rating: contentExplanation,
        content_coverage_rating: contentCoverage,
        improvements: improvements || null,
        comments: comments || null,
        issues: issues || null,
      });
      if (error) throw error;

      toast({ title: "Success", description: "Feedback submitted successfully!" });
      setShowForm(false);
      setTopicsCovered(""); setSessionRating(0); setContentExplanation(0); setContentCoverage(0);
      setImprovements(""); setComments(""); setIssues("");

      // Refresh
      const { data } = await supabase.from("session_feedbacks").select("*").eq("user_id", user.id).order("week_number", { ascending: false });
      setFeedbacks((data || []) as Feedback[]);
    } catch (error: any) {
      console.error("Error:", error);
      toast({ title: "Error", description: error.message || "Failed to submit feedback.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (studentStatus !== "approved") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Available after your profile is approved.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Weekly Session Feedback</h1>
          <p className="text-muted-foreground">Submit your weekly session feedback.</p>
        </div>

        {/* Reminder banner */}
        {!hasSubmittedThisWeek && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="flex items-center gap-4 p-5">
              <Star className="h-8 w-8 text-warning flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-warning">Feedback Pending for Week {currentWeek}</p>
                <p className="text-sm text-muted-foreground">Please submit your weekly session feedback. This is mandatory.</p>
              </div>
              <Button onClick={() => setShowForm(true)}>Submit Now</Button>
            </CardContent>
          </Card>
        )}

        {hasSubmittedThisWeek && !showForm && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-center gap-3 p-5">
              <CheckCircle className="h-6 w-6 text-success" />
              <p className="font-medium text-success">Week {currentWeek} feedback submitted!</p>
            </CardContent>
          </Card>
        )}

        {/* Feedback Form */}
        {showForm && (
          <Card className="slide-up">
            <CardHeader>
              <CardTitle>Session Feedback - Week {currentWeek}</CardTitle>
              <CardDescription>Share your feedback about this week's session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Topics Covered *</Label>
                <Textarea value={topicsCovered} onChange={(e) => setTopicsCovered(e.target.value)} placeholder="List the topics covered in this week's session..." rows={3} />
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <StarRating label="How was the session? *" value={sessionRating} onChange={setSessionRating} />
                <StarRating label="Content Explanation *" value={contentExplanation} onChange={setContentExplanation} />
                <StarRating label="Content Coverage *" value={contentCoverage} onChange={setContentCoverage} />
              </div>

              <div className="space-y-2">
                <Label>Any Improvements</Label>
                <Textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder="Suggest any improvements..." rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Any Comments</Label>
                <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Additional comments..." rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Any Issues</Label>
                <Textarea value={issues} onChange={(e) => setIssues(e.target.value)} placeholder="Report any issues faced..." rows={2} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : <><Send className="mr-2 h-4 w-4" /> Submit Feedback</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past Feedbacks */}
        {feedbacks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Past Feedbacks</h2>
            {feedbacks.map((fb) => (
              <Card key={fb.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">Week {fb.week_number}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(fb.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm mb-2"><strong>Topics:</strong> {fb.topics_covered}</p>
                  <div className="flex gap-4 text-sm">
                    <span>Session: {"⭐".repeat(fb.session_rating)}</span>
                    <span>Explanation: {"⭐".repeat(fb.content_explanation_rating)}</span>
                    <span>Coverage: {"⭐".repeat(fb.content_coverage_rating)}</span>
                  </div>
                  {fb.improvements && <p className="text-sm mt-1 text-muted-foreground">Improvements: {fb.improvements}</p>}
                  {fb.comments && <p className="text-sm text-muted-foreground">Comments: {fb.comments}</p>}
                  {fb.issues && <p className="text-sm text-muted-foreground">Issues: {fb.issues}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
