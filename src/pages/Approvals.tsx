import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Loader2, Check, X, Shield, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PendingStudent {
  id: string;
  user_id: string;
  student_id: string | null;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export default function Approvals() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("student_profiles")
        .select(`
          id,
          user_id,
          student_id,
          created_at,
          profile:profiles!student_profiles_user_id_fkey (
            full_name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPendingStudents((data as unknown as PendingStudent[]) || []);
    } catch (error) {
      console.error("Error fetching pending students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") {
      fetchPendingStudents();
    }
  }, [role]);

  const handleApproval = async (studentProfileId: string, approved: boolean) => {
    setProcessingId(studentProfileId);
    try {
      const { error } = await supabase
        .from("student_profiles")
        .update({ status: approved ? "approved" : "rejected" })
        .eq("id", studentProfileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Student ${approved ? "approved" : "rejected"} successfully.`,
      });

      fetchPendingStudents();
    } catch (error) {
      console.error("Error updating student status:", error);
      toast({
        title: "Error",
        description: "Failed to update student status.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
          <h1 className="text-2xl font-bold md:text-3xl">Student Approvals</h1>
          <p className="text-muted-foreground">Review and approve pending student registrations.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              {pendingStudents.length} student(s) waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Shield className="mb-4 h-12 w-12 text-success" />
                <h3 className="text-lg font-semibold">All caught up!</h3>
                <p className="text-muted-foreground">
                  No pending approvals at the moment.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profile?.avatar_url || ""} />
                              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                                {getInitials(student.profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.profile?.full_name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.profile?.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {student.student_id || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>{student.profile?.phone || "-"}</TableCell>
                        <TableCell>
                          {format(parseISO(student.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleApproval(student.id, false)}
                              disabled={processingId === student.id}
                            >
                              {processingId === student.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproval(student.id, true)}
                              disabled={processingId === student.id}
                            >
                              {processingId === student.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="mr-1 h-4 w-4" />
                                  Approve
                                </>
                              )}
                            </Button>
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
    </DashboardLayout>
  );
}
