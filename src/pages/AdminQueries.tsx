import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, MessageSquare, Lock, CheckCircle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { adminQuerySchema } from "@/lib/validations";

type QueryCategory = "course" | "faculty" | "schedule" | "work" | "other";

interface AdminQuery {
  id: string;
  title: string;
  category: QueryCategory;
  description: string;
  is_resolved: boolean;
  created_at: string;
}

const categoryLabels: Record<QueryCategory, string> = {
  course: "Course",
  faculty: "Faculty",
  schedule: "Schedule",
  work: "Work",
  other: "Other",
};

export default function AdminQueries() {
  const { user, studentStatus } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queries, setQueries] = useState<AdminQuery[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<QueryCategory>("other");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchQueries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("admin_queries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQueries(data || []);
    } catch (error) {
      console.error("Error fetching queries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;

    setErrors({});

    // Validate form
    try {
      adminQuerySchema.parse({
        title,
        category,
        description,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("admin_queries").insert({
        user_id: user.id,
        title,
        category,
        description,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Query submitted successfully.",
      });

      setDialogOpen(false);
      resetForm();
      fetchQueries();
    } catch (error) {
      console.error("Error submitting query:", error);
      toast({
        title: "Error",
        description: "Failed to submit query.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setCategory("other");
    setDescription("");
    setErrors({});
  };

  const openCount = queries.filter((q) => !q.is_resolved).length;
  const resolvedCount = queries.filter((q) => q.is_resolved).length;

  if (studentStatus !== "approved") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">
            This feature is available after your profile is approved.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <SkeletonTable />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between fade-in">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Write to Admin</h1>
            <p className="text-muted-foreground">Submit queries or concerns to administrators.</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="transition-smooth hover:scale-105">
                <Plus className="mr-2 h-4 w-4" />
                New Query
              </Button>
            </DialogTrigger>
            <DialogContent className="scale-in">
              <DialogHeader>
                <DialogTitle>Submit a Query</DialogTitle>
                <DialogDescription>
                  Send a message to the administrators.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title * (min 3 characters)</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of your query..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && (
                    <p className="text-xs text-destructive">{errors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as QueryCategory)}>
                    <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="schedule">Schedule</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-xs text-destructive">{errors.category}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description * (min 20 characters)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your query in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className={errors.description ? "border-destructive" : ""}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description}</p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Query"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 slide-up">
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openCount}</p>
                <p className="text-sm text-muted-foreground">Open Queries</p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedCount}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queries List */}
        {queries.length === 0 ? (
          <Card className="slide-up card-hover">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
              <h3 className="text-lg font-semibold">No queries yet</h3>
              <p className="mb-4 text-muted-foreground">
                You haven't submitted any queries yet.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="transition-smooth hover:scale-105">
                <Plus className="mr-2 h-4 w-4" />
                Submit Query
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {queries.map((query, index) => (
              <Card key={query.id} className="transition-smooth hover:bg-muted/30 card-hover slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{query.title}</h3>
                        <Badge variant="outline">{categoryLabels[query.category]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{query.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {format(parseISO(query.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Badge className={query.is_resolved ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                      {query.is_resolved ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Resolved
                        </>
                      ) : (
                        <>
                          <Clock className="mr-1 h-3 w-3" />
                          Open
                        </>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
