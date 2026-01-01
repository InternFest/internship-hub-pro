import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Loader2, Check, X, Shield, Users, Filter, Eye, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Batch {
  id: string;
  name: string;
}

interface PendingStudent {
  id: string;
  user_id: string;
  student_id: string | null;
  internship_role: string | null;
  skill_level: string | null;
  college_name: string | null;
  branch: string | null;
  usn: string | null;
  batch_id: string | null;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    date_of_birth: string | null;
    bio: string | null;
    linkedin_url: string | null;
    resume_url: string | null;
  } | null;
}

export default function Approvals() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<PendingStudent[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchFilter, setBatchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchPendingStudents = async () => {
    try {
      // Fetch pending student profiles
      const { data: studentData, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for all students
      const userIds = studentData?.map(s => s.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, date_of_birth, bio, linkedin_url, resume_url")
        .in("id", userIds);

      // Fetch batches
      const { data: batchesData } = await supabase
        .from("batches")
        .select("id, name")
        .order("name");

      setBatches(batchesData || []);

      // Merge data
      const studentsWithProfiles = (studentData || []).map(student => ({
        ...student,
        profile: profilesData?.find(p => p.id === student.user_id) || null,
      }));

      setPendingStudents(studentsWithProfiles as unknown as PendingStudent[]);
      setFilteredStudents(studentsWithProfiles as unknown as PendingStudent[]);
    } catch (error) {
      console.error("Error fetching pending students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = pendingStudents;
    
    // Filter by batch (internship_role stores batch name)
    if (batchFilter !== "all") {
      result = result.filter((s) => s.internship_role === batchFilter);
    }

    // Filter by date
    if (dateFilter) {
      result = result.filter((s) => {
        const studentDate = s.created_at.split('T')[0];
        return studentDate === dateFilter;
      });
    }

    setFilteredStudents(result);
  }, [batchFilter, dateFilter, pendingStudents]);

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

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Batch (Internship Role)</Label>
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
              <div className="space-y-2">
                <Label>Registration Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>
              {filteredStudents.length} student(s) waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
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
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profile?.avatar_url || ""} />
                              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                                {getInitials(student.profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {student.profile?.full_name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{student.profile?.email || "-"}</TableCell>
                        <TableCell>{student.profile?.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {student.internship_role || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(student.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedStudent(student);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>Complete student profile information</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedStudent.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                    {getInitials(selectedStudent.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedStudent.profile?.full_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.profile?.email}
                  </p>
                  <Badge className="mt-1 bg-warning/10 text-warning">Pending</Badge>
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student ID</span>
                  <span className="font-mono font-medium">
                    {selectedStudent.student_id || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">USN</span>
                  <span className="font-mono">{selectedStudent.usn || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span>{selectedStudent.profile?.phone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date of Birth</span>
                  <span>
                    {selectedStudent.profile?.date_of_birth
                      ? format(parseISO(selectedStudent.profile.date_of_birth), "MMM d, yyyy")
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Batch (Internship Role)</span>
                  <Badge variant="outline">
                    {selectedStudent.internship_role || "N/A"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Skill Level</span>
                  <span className="capitalize">{selectedStudent.skill_level || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">College</span>
                  <span>{selectedStudent.college_name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Branch</span>
                  <span>{selectedStudent.branch || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Registered</span>
                  <span>
                    {format(parseISO(selectedStudent.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              {selectedStudent.profile?.bio && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Bio</h4>
                  <p className="mt-1 text-sm">{selectedStudent.profile.bio}</p>
                </div>
              )}

              {selectedStudent.profile?.linkedin_url && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">LinkedIn</h4>
                  <a
                    href={selectedStudent.profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-primary hover:underline"
                  >
                    {selectedStudent.profile.linkedin_url}
                  </a>
                </div>
              )}

              {selectedStudent.profile?.resume_url && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Resume</h4>
                  <a
                    href={selectedStudent.profile.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Resume
                  </a>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleApproval(selectedStudent.id, false);
                    setViewDialogOpen(false);
                  }}
                  disabled={processingId === selectedStudent.id}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    handleApproval(selectedStudent.id, true);
                    setViewDialogOpen(false);
                  }}
                  disabled={processingId === selectedStudent.id}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
