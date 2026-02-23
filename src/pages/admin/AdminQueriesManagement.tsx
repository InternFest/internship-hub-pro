import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Shield, MessageSquare, Check, X, Loader2, Eye, Filter, Send, MessageCircle, Clock } from "lucide-react";
import { format, parseISO, isToday } from "date-fns";

type QueryCategory = "course" | "faculty" | "schedule" | "work" | "other";

interface Batch {
  id: string;
  name: string;
}

interface QueryComment {
  id: string;
  query_id: string;
  admin_id: string;
  comment: string;
  created_at: string;
  admin_name?: string; // joined from profiles
}

interface AdminQuery {
  id: string;
  title: string;
  category: QueryCategory;
  description: string;
  is_resolved: boolean;
  created_at: string;
  user_id: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  student_profile: {
    batch_id: string | null;
    student_id: string | null;
    internship_role: string | null;
  } | null;
}

const categoryLabels: Record<QueryCategory, string> = {
  course: "Course",
  faculty: "Faculty",
  schedule: "Schedule",
  work: "Work",
  other: "Other",
};

export default function AdminQueriesManagement() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [queries, setQueries] = useState<AdminQuery[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<AdminQuery[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<AdminQuery | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Comment state
  const [comments, setComments] = useState<QueryComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");

  const fetchBatches = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("batches")
      .select("id, name, end_date")
      .gt("end_date", today)
      .order("name");
    setBatches(data || []);
  };

  const fetchQueries = async () => {
    try {
      const { data: queriesData, error } = await supabase
        .from("admin_queries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = queriesData?.map((q) => q.user_id) || [];
      const [profilesRes, studentProfilesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone").in("id", userIds),
        supabase
          .from("student_profiles")
          .select("user_id, batch_id, student_id, internship_role")
          .in("user_id", userIds),
      ]);

      const queriesWithProfiles = (queriesData || []).map((query) => ({
        ...query,
        profile: profilesRes.data?.find((p) => p.id === query.user_id) || null,
        student_profile:
          studentProfilesRes.data?.find((sp) => sp.user_id === query.user_id) || null,
      }));

      setQueries(queriesWithProfiles as unknown as AdminQuery[]);
      setFilteredQueries(queriesWithProfiles as unknown as AdminQuery[]);
    } catch (error) {
      console.error("Error fetching queries:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch comments for a specific query.
   * Expects a `query_comments` table with columns:
   *   id, query_id, admin_id, comment, created_at
   * and joins admin name via profiles.
   */
  const fetchComments = async (queryId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("query_comments")
        .select("id, query_id, admin_id, comment, created_at")
        .eq("query_id", queryId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch admin names
      const adminIds = [...new Set((data || []).map((c) => c.admin_id))];
      let adminNames: Record<string, string> = {};
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", adminIds);
        (profiles || []).forEach((p) => {
          adminNames[p.id] = p.full_name;
        });
      }

      const enrichedComments = (data || []).map((c) => ({
        ...c,
        admin_name: adminNames[c.admin_id] || "Admin",
      }));

      setComments(enrichedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      // If table doesn't exist yet, just set empty
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedQuery || !user) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase.from("query_comments").insert({
        query_id: selectedQuery.id,
        admin_id: user.id,
        comment: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      await fetchComments(selectedQuery.id);

      toast({
        title: "Comment added",
        description: "Your note has been saved successfully.",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  useEffect(() => {
    if (role === "admin") {
      fetchQueries();
      fetchBatches();
    }
  }, [role]);

  useEffect(() => {
    let result = queries;

    if (dateFilter === "today") {
      result = result.filter((q) => isToday(parseISO(q.created_at)));
    } else if (dateFilter === "custom" && customDate) {
      result = result.filter((q) => q.created_at.startsWith(customDate));
    }

    if (batchFilter !== "all") {
      result = result.filter((q) => q.student_profile?.batch_id === batchFilter);
    }

    setFilteredQueries(result);
  }, [dateFilter, customDate, batchFilter, courseFilter, queries]);

  const handleResolve = async (queryId: string, resolved: boolean) => {
    setProcessingId(queryId);
    try {
      const { error } = await supabase
        .from("admin_queries")
        .update({
          is_resolved: resolved,
          resolved_at: resolved ? new Date().toISOString() : null,
        })
        .eq("id", queryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Query ${resolved ? "resolved" : "reopened"} successfully.`,
      });

      // Update selectedQuery state if dialog is open
      if (selectedQuery?.id === queryId) {
        setSelectedQuery((prev) => prev ? { ...prev, is_resolved: resolved } : prev);
      }

      fetchQueries();
    } catch (error) {
      console.error("Error updating query:", error);
      toast({
        title: "Error",
        description: "Failed to update query.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openViewDialog = (query: AdminQuery) => {
    setSelectedQuery(query);
    setViewDialogOpen(true);
    setNewComment("");
    fetchComments(query.id);
  };

  if (role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">Only administrators can access this page.</p>
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

  const pendingQueries = queries.filter((q) => !q.is_resolved);
  const resolvedQueries = queries.filter((q) => q.is_resolved);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Student Queries</h1>
          <p className="text-muted-foreground">Manage all student queries and concerns.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 slide-up">
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <MessageSquare className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingQueries.length}</p>
                <p className="text-sm text-muted-foreground">Open Queries</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Check className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedQueries.length}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilter === "custom" && (
                <div className="space-y-2">
                  <Label>Select Date</Label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Batch</Label>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    <SelectItem value="vlsi">VLSI</SelectItem>
                    <SelectItem value="ai_ml">AI/ML</SelectItem>
                    <SelectItem value="mern">MERN</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              All Queries
            </CardTitle>
            <CardDescription>{filteredQueries.length} queries found</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredQueries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 fade-in">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
                <h3 className="text-lg font-semibold">No queries yet</h3>
                <p className="text-muted-foreground">No student queries match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQueries.map((query) => (
                      <TableRow key={query.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{query.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {query.student_profile?.student_id || "N/A"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{query.profile?.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {query.profile?.phone || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[150px] truncate font-medium">{query.title}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{categoryLabels[query.category]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              query.is_resolved
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            }
                          >
                            {query.is_resolved ? "Resolved" : "Open"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openViewDialog(query)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!query.is_resolved ? (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleResolve(query.id, true)}
                                disabled={processingId === query.id}
                              >
                                {processingId === query.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="mr-1 h-4 w-4" />
                                    Resolve
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolve(query.id, false)}
                                disabled={processingId === query.id}
                              >
                                {processingId === query.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="mr-1 h-4 w-4" />
                                    Reopen
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Dialog — now wider to accommodate comment section */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl scale-in">
          <DialogHeader>
            <DialogTitle>Query Details</DialogTitle>
            <DialogDescription>
              Submitted{" "}
              {selectedQuery && format(parseISO(selectedQuery.created_at), "PPpp")}
            </DialogDescription>
          </DialogHeader>

          {selectedQuery && (
            <div className="space-y-5">
              {/* Student Info */}
              <div className="grid gap-2 rounded-lg border p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student</span>
                  <span className="font-medium">{selectedQuery.profile?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span>{selectedQuery.profile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span>{selectedQuery.profile?.phone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student ID</span>
                  <span className="font-mono">
                    {selectedQuery.student_profile?.student_id || "N/A"}
                  </span>
                </div>
              </div>

              {/* Query Content */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{categoryLabels[selectedQuery.category]}</Badge>
                  <Badge
                    className={
                      selectedQuery.is_resolved
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }
                  >
                    {selectedQuery.is_resolved ? "Resolved" : "Open"}
                  </Badge>
                </div>
                <h4 className="font-semibold">{selectedQuery.title}</h4>
                <p className="text-sm text-muted-foreground">{selectedQuery.description}</p>
              </div>

              <Separator />

              {/* ── COMMENT SECTION ── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm">Admin Notes & Comments</h4>
                  {comments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {comments.length}
                    </Badge>
                  )}
                </div>

                {/* Comment List */}
                {loadingComments ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center">
                    <MessageCircle className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                    <p className="text-xs text-muted-foreground">
                      Add a note below to document how this query is being handled.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-52 rounded-lg border p-3">
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {comment.admin_name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(comment.created_at), "MMM d, yyyy · h:mm a")}
                            </span>
                          </div>
                          <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                            {comment.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a note on how this issue is being addressed or was resolved…"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="resize-none"
                    onKeyDown={(e) => {
                      // Ctrl/Cmd + Enter to submit
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        handleSubmitComment();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Press <kbd className="rounded border px-1 py-0.5 font-mono text-xs">Ctrl+Enter</kbd> to submit
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 pt-1">
                <div className="flex gap-2">
                  {!selectedQuery.is_resolved ? (
                    <Button
                      onClick={() => handleResolve(selectedQuery.id, true)}
                      disabled={processingId === selectedQuery.id}
                    >
                      {processingId === selectedQuery.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-4 w-4" />
                      )}
                      Mark Resolved
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleResolve(selectedQuery.id, false)}
                      disabled={processingId === selectedQuery.id}
                    >
                      {processingId === selectedQuery.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <X className="mr-1 h-4 w-4" />
                      )}
                      Reopen Query
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submittingComment}
                  >
                    {submittingComment ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}