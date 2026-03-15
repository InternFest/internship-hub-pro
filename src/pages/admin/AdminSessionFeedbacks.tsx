import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonTable } from "@/components/SkeletonCard";
import { Lock, Star, Users } from "lucide-react";

interface Feedback {
  id: string;
  user_id: string;
  batch_id: string | null;
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

interface Batch {
  id: string;
  name: string;
}

export default function AdminSessionFeedbacks() {
  const { role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [selectedBatch, setSelectedBatch] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: batchesData }, { data: feedbacksData }] = await Promise.all([
          supabase.from("batches").select("id, name").order("name"),
          supabase.from("session_feedbacks").select("*").order("week_number", { ascending: false }),
        ]);
        setBatches(batchesData || []);
        setFeedbacks((feedbacksData || []) as Feedback[]);

        // Get unique user IDs and fetch profiles
        const userIds = [...new Set((feedbacksData || []).map((f: any) => f.user_id))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
          const map: Record<string, string> = {};
          (profilesData || []).forEach((p) => { map[p.id] = p.full_name; });
          setProfiles(map);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) fetchData();
  }, [authLoading]);

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

  const filtered = selectedBatch === "all" ? feedbacks : feedbacks.filter((f) => f.batch_id === selectedBatch);

  // Calculate overall mentor rating
  const avgSession = filtered.length > 0 ? (filtered.reduce((a, f) => a + f.session_rating, 0) / filtered.length).toFixed(1) : "N/A";
  const avgExplanation = filtered.length > 0 ? (filtered.reduce((a, f) => a + f.content_explanation_rating, 0) / filtered.length).toFixed(1) : "N/A";
  const avgCoverage = filtered.length > 0 ? (filtered.reduce((a, f) => a + f.content_coverage_rating, 0) / filtered.length).toFixed(1) : "N/A";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Session Feedbacks</h1>
          <p className="text-muted-foreground">View weekly session feedback from students.</p>
        </div>

        <div className="flex items-center gap-4">
          <Label>Filter by Batch:</Label>
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Overall ratings */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <Star className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">{avgSession}</p>
                <p className="text-sm text-muted-foreground">Avg Session Rating</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <Star className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{avgExplanation}</p>
                <p className="text-sm text-muted-foreground">Avg Explanation Rating</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <Star className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{avgCoverage}</p>
                <p className="text-sm text-muted-foreground">Avg Coverage Rating</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} feedback(s) found</p>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No feedbacks yet</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((fb) => (
              <Card key={fb.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{profiles[fb.user_id] || "Unknown"}</span>
                      <Badge variant="outline">Week {fb.week_number}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(fb.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm mb-2"><strong>Topics:</strong> {fb.topics_covered}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>Session: {"⭐".repeat(fb.session_rating)} ({fb.session_rating}/5)</span>
                    <span>Explanation: {"⭐".repeat(fb.content_explanation_rating)} ({fb.content_explanation_rating}/5)</span>
                    <span>Coverage: {"⭐".repeat(fb.content_coverage_rating)} ({fb.content_coverage_rating}/5)</span>
                  </div>
                  {fb.improvements && <p className="text-sm mt-1 text-muted-foreground"><strong>Improvements:</strong> {fb.improvements}</p>}
                  {fb.comments && <p className="text-sm text-muted-foreground"><strong>Comments:</strong> {fb.comments}</p>}
                  {fb.issues && <p className="text-sm text-muted-foreground"><strong>Issues:</strong> {fb.issues}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
