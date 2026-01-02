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
import { Shield, CalendarOff, Filter, Check, X, Loader2, Users, GraduationCap } from "lucide-react";
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
  user_role: "student" | "faculty";
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
  const [userTypeFilter, setUserTypeFilter] = useState("all");

  const fetchBatches = async () => {
    const { data } = await supabase.from("batches").select("id, name");
    setBatches(data || []);
  };

  const fetchRequests = async () => {
    try {
      // Fetch leave requests
      const { data: requestsData, error } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles and student profiles
      const userIds = requestsData?.map(r => r.user_id) || [];
      const [profilesRes, studentProfilesRes, userRolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone").in("id", userIds),
        supabase.from("student_profiles").select("user_id, batch_id, internship_role").in("user_id", userIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      ]);

      // Merge data
      const requestsWithProfiles = (requestsData || []).map(request => {
        const userRole = userRolesRes.data?.find(r => r.user_id === request.user_id);
        return {
          ...request,
          profile: profilesRes.data?.find(p => p.id === request.user_id) || null,
          student_profile: studentProfilesRes.data?.find(sp => sp.user_id === request.user_id) || null,
          user_role: userRole?.role || "student",
        };
      });

      setRequests(requestsWithProfiles as unknown as LeaveRequest[]);
      setFilteredRequests(requestsWithProfiles as unknown as LeaveRequest[]);
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

    // User type filter
    if (userTypeFilter !== "all") {
      result = result.filter((r) => r.user_role === userTypeFilter);
    }

    // Date filter
    if (dateFilter === "today") {
      result = result.filter((r) => isToday(parseISO(r.leave_date)));
    } else if (dateFilter === "custom" && customDate) {
      result = result.filter((r) => r.leave_date === customDate);
    }

    // Batch filter (only for students)
    if (batchFilter !== "all") {
      result = result.filter((r) => r.student_profile?.internship_role === batchFilter);
    }

    setFilteredRequests(result);
  }, [dateFilter, customDate, batchFilter, userTypeFilter, requests]);

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

  const getUserTypeBadge = (userRole: string) => {
    if (userRole === "faculty") {
      return (
        <Badge className="bg-accent/10 text-accent">
          <Users className="mr-1 h-3 w-3" />
          Faculty
        </Badge>
      );
    }
    return (
      <Badge className="bg-primary/10 text-primary">
        <GraduationCap className="mr-1 h-3 w-3" />
        Student
      </Badge>
    );
  };

  // Stats
  const studentRequests = requests.filter(r => r.user_role === "student");
  const facultyRequests = requests.filter(r => r.user_role === "faculty");
  const pendingRequests = requests.filter(r => r.status === "pending");

  if (role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
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
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Leave Requests</h1>
          <p className="text-muted-foreground">Manage all leave requests from students and faculty.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 fade-in">
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <CalendarOff className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{requests.length}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <CalendarOff className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{studentRequests.length}</p>
                <p className="text-sm text-muted-foreground">Student Requests</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{facultyRequests.length}</p>
                <p className="text-sm text-muted-foreground">Faculty Requests</p>
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
                <Label>User Type</Label>
                <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="student">Students Only</SelectItem>
                    <SelectItem value="faculty">Faculty Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <Label>Batch (Students)</Label>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.name}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="slide-up">
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
              <div className="flex flex-col items-center justify-center py-12 fade-in">
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
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Leave Date</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request, index) => (
                      <TableRow key={request.id} className="slide-up" style={{ animationDelay: `${index * 0.03}s` }}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.profile?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getUserTypeBadge(request.user_role)}</TableCell>
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
                                className="text-destructive hover:bg-destructive/10 transition-smooth"
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
                                className="transition-smooth"
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
