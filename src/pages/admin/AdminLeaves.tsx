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
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Shield, CalendarOff, Filter, Check, X, Loader2 } from "lucide-react";
import { format, parseISO, isToday } from "date-fns";

interface Batch {
  id: string;
  name: string;
}

interface LeaveRequest {
  id: string;
  leave_date: string;
  leave_type: "sick" | "casual";
  reason: string;
  title: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user_id: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  student_profile: {
    batch_id: string | null;
    internship_role: string | null;
  } | null;
}

export default function AdminLeaves() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
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

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          profile:profiles!leave_requests_user_id_fkey (full_name, email, phone),
          student_profile:student_profiles!leave_requests_user_id_fkey (batch_id, internship_role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data as unknown as LeaveRequest[]) || []);
      setFilteredRequests((data as unknown as LeaveRequest[]) || []);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") {
      fetchRequests();
      fetchBatches();
    }
  }, [role]);

  useEffect(() => {
    let result = requests;

    // Date filter
    if (dateFilter === "today") {
      result = result.filter((r) => isToday(parseISO(r.leave_date)));
    } else if (dateFilter === "custom" && customDate) {
      result = result.filter((r) => r.leave_date === customDate);
    }

    // Batch filter
    if (batchFilter !== "all") {
      result = result.filter((r) => r.student_profile?.batch_id === batchFilter);
    }

    // Course filter
    if (courseFilter !== "all") {
      result = result.filter((r) => r.student_profile?.internship_role === courseFilter);
    }

    setFilteredRequests(result);
  }, [dateFilter, customDate, batchFilter, courseFilter, requests]);

  const handleAction = async (requestId: string, approved: boolean) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: approved ? "approved" : "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Leave request ${approved ? "approved" : "rejected"} successfully.`,
      });

      fetchRequests();
    } catch (error) {
      console.error("Error updating leave request:", error);
      toast({
        title: "Error",
        description: "Failed to update leave request.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning">Pending</Badge>;
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Leave Requests</h1>
          <p className="text-muted-foreground">Manage all student leave requests.</p>
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
                <Label>Applied Date</Label>
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
              <CalendarOff className="h-5 w-5" />
              Leave Requests
            </CardTitle>
            <CardDescription>
              {filteredRequests.length} request(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CalendarOff className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No leave requests</h3>
                <p className="text-muted-foreground">
                  No leave requests match your current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Leave Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.profile?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{request.profile?.phone || "-"}</TableCell>
                        <TableCell>
                          {format(parseISO(request.leave_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {request.leave_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[200px] truncate">{request.reason}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          {request.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleAction(request.id, false)}
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleAction(request.id, true)}
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
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
    </DashboardLayout>
  );
}
