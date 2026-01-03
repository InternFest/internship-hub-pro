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
import { z } from "zod";
import { leaveRequestSchema } from "@/lib/validations";

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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!user) return;

    setErrors({});

    // Validate form
    try {
      leaveRequestSchema.parse({
        leaveDate,
        leaveType,
        reason,
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
    setErrors({});
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
            <h1 className="text-2xl font-bold md:text-3xl">Leave Requests</h1>
            <p className="text-muted-foreground">Submit and track your leave requests.</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="transition-smooth hover:scale-105 active-press">
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="scale-in">
              <DialogHeader>
                <DialogTitle>New Leave Request</DialogTitle>
                <DialogDescription>
                  Submit a new leave request for approval.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveDate">Date *</Label>
                  <Input
                    id="leaveDate"
                    type="date"
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className={errors.leaveDate ? "border-destructive" : ""}
                  />
                  {errors.leaveDate && (
                    <p className="text-xs text-destructive">{errors.leaveDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type *</Label>
                  <Select value={leaveType} onValueChange={(v) => setLeaveType(v as "sick" | "casual")}>
                    <SelectTrigger className={errors.leaveType ? "border-destructive" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.leaveType && (
                    <p className="text-xs text-destructive">{errors.leaveType}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason * (min 10 characters)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Please provide a detailed reason for your leave..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className={errors.reason ? "border-destructive" : ""}
                  />
                  {errors.reason && (
                    <p className="text-xs text-destructive">{errors.reason}</p>
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
          <Card className="card-hover slide-up stagger-1">
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

          <Card className="card-hover slide-up stagger-2">
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

          <Card className="card-hover slide-up stagger-3">
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
          <Card className="fade-in">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarOff className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
              <h3 className="text-lg font-semibold">No leave requests</h3>
              <p className="mb-4 text-muted-foreground">
                You haven't submitted any leave requests yet.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="transition-smooth hover:scale-105">
                <Plus className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((request, index) => (
              <Card key={request.id} className="card-hover slide-up transition-smooth" style={{ animationDelay: `${index * 0.05}s` }}>
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
