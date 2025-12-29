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
import { Loader2, Plus, CalendarOff, Lock, Calendar, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface LeaveRequest {
  id: string;
  leave_date: string;
  leave_type: "sick" | "casual";
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function LeaveRequests() {
  const { user, studentStatus } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [leaveDate, setLeaveDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [leaveType, setLeaveType] = useState<"sick" | "casual">("casual");
  const [reason, setReason] = useState("");

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !reason) {
      toast({
        title: "Error",
        description: "Please provide a reason for your leave request.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        user_id: user.id,
        leave_date: leaveDate,
        leave_type: leaveType,
        reason,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave request submitted successfully.",
      });

      setDialogOpen(false);
      resetForm();
      fetchRequests();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast({
        title: "Error",
        description: "Failed to submit leave request.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setLeaveDate(format(new Date(), "yyyy-MM-dd"));
    setLeaveType("casual");
    setReason("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-warning" />;
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

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  if (studentStatus !== "approved") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Leave Requests</h1>
            <p className="text-muted-foreground">Submit and track your leave requests.</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Leave Request</DialogTitle>
                <DialogDescription>
                  Submit a new leave request for approval.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveDate">Date</Label>
                  <Input
                    id="leaveDate"
                    type="date"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <Select value={leaveType} onValueChange={(v) => setLeaveType(v as "sick" | "casual")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Please provide a reason for your leave..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                  />
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
                      "Submit Request"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarOff className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No leave requests</h3>
              <p className="mb-4 text-muted-foreground">
                You haven't submitted any leave requests yet.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="transition-colors hover:bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        {getStatusIcon(request.status)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(parseISO(request.leave_date), "EEEE, MMM d, yyyy")}
                          </span>
                          <Badge variant="outline" className="capitalize">
                            {request.leave_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {format(parseISO(request.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
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
