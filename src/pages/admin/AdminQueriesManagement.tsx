import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Shield, MessageSquare, Check, X, Loader2, Eye, Filter } from "lucide-react";
import { format, parseISO, isToday } from "date-fns";

type QueryCategory = "course" | "faculty" | "schedule" | "work" | "other";

interface Batch {
  id: string;
  name: string;
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
  const { role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [queries, setQueries] = useState<AdminQuery[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<AdminQuery[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<AdminQuery | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");

  const fetchBatches = async () => {
    const { data } = await supabase.from("batches").select("id, name");
    setBatches(data || []);
  };

  const fetchQueries = async () => {
    try {
      // Fetch queries
      const { data: queriesData, error } = await supabase
        .from("admin_queries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles and student profiles
      const userIds = queriesData?.map(q => q.user_id) || [];
      const [profilesRes, studentProfilesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone").in("id", userIds),
        supabase.from("student_profiles").select("user_id, batch_id, student_id, internship_role").in("user_id", userIds),
      ]);

      // Merge data
      const queriesWithProfiles = (queriesData || []).map(query => ({
        ...query,
        profile: profilesRes.data?.find(p => p.id === query.user_id) || null,
        student_profile: studentProfilesRes.data?.find(sp => sp.user_id === query.user_id) || null,
      }));

      setQueries(queriesWithProfiles as unknown as AdminQuery[]);
      setFilteredQueries(queriesWithProfiles as unknown as AdminQuery[]);
    } catch (error) {
      console.error("Error fetching queries:", error);
    } finally {
      setLoading(false);
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

    // Date filter
    if (dateFilter === "today") {
      result = result.filter((q) => isToday(parseISO(q.created_at)));
    } else if (dateFilter === "custom" && customDate) {
      result = result.filter((q) => q.created_at.startsWith(customDate));
    }

    // Batch filter
    if (batchFilter !== "all") {
      result = result.filter((q) => q.student_profile?.batch_id === batchFilter);
    }

    // Course filter
    if (courseFilter !== "all") {
      result = result.filter((q) => q.student_profile?.internship_role === courseFilter);
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
  };

  if (role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">
            Only administrators can access this page.
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

  const pendingQueries = queries.filter((q) => !q.is_resolved);
  const resolvedQueries = queries.filter((q) => q.is_resolved);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Student Queries</h1>
          <p className="text-muted-foreground">Manage all student queries and concerns.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
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

          <Card>
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
        <Card>
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

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              All Queries
            </CardTitle>
            <CardDescription>{filteredQueries.length} queries found</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredQueries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No queries yet</h3>
                <p className="text-muted-foreground">
                  No student queries match your filters.
                </p>
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
                          <p className="max-w-[150px] truncate font-medium">
                            {query.title}
                          </p>
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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Query Details</DialogTitle>
            <DialogDescription>
              Submitted {selectedQuery && format(parseISO(selectedQuery.created_at), "PPpp")}
            </DialogDescription>
          </DialogHeader>
          {selectedQuery && (
            <div className="space-y-4">
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

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
                {!selectedQuery.is_resolved && (
                  <Button onClick={() => {
                    handleResolve(selectedQuery.id, true);
                    setViewDialogOpen(false);
                  }}>
                    <Check className="mr-1 h-4 w-4" />
                    Mark Resolved
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
