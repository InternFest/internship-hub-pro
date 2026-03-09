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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Shield, Users, Filter, Eye, FileText, Briefcase } from "lucide-react";
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

interface PendingTeamMember {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
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
  const [filteredStudents, setFilteredStudents] = useState<PendingStudent[]>([]);
  const [pendingTeam, setPendingTeam] = useState<PendingTeamMember[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchFilter, setBatchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("students");

  const fetchPendingStudents = async () => {
    try {
      const { data: studentData, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = studentData?.map(s => s.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, date_of_birth, bio, linkedin_url, resume_url")
        .in("id", userIds);

      const today = new Date().toISOString().split('T')[0];
      const { data: batchesData } = await supabase
        .from("batches")
        .select("id, name, end_date")
        .gt("end_date", today)
        .order("name");
      setBatches(batchesData || []);

      const studentsWithProfiles = (studentData || []).map(student => ({
        ...student,
        profile: profilesData?.find(p => p.id === student.user_id) || null,
      }));

      setPendingStudents(studentsWithProfiles as unknown as PendingStudent[]);
      setFilteredStudents(studentsWithProfiles as unknown as PendingStudent[]);
    } catch (error) {
      console.error("Error fetching pending students:", error);
    }
  };

  const fetchPendingTeam = async () => {
    try {
      const { data: teamData, error } = await supabase
        .from("team_profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = (teamData || []).map((t: any) => t.user_id);
      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url")
          .in("id", userIds);
        profilesData = data || [];
      }

      const teamWithProfiles = (teamData || []).map((t: any) => ({
        ...t,
        profile: profilesData.find(p => p.id === t.user_id) || null,
      }));

      setPendingTeam(teamWithProfiles);
    } catch (error) {
      console.error("Error fetching pending team:", error);
    }
  };

  useEffect(() => {
    let result = pendingStudents;
    if (batchFilter !== "all") result = result.filter((s) => s.batch_id === batchFilter);
    if (dateFilter) result = result.filter((s) => s.created_at.split('T')[0] === dateFilter);
    setFilteredStudents(result);
  }, [batchFilter, dateFilter, pendingStudents]);

  useEffect(() => {
    if (role === "admin") {
      Promise.all([fetchPendingStudents(), fetchPendingTeam()]).then(() => setLoading(false));
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
      toast({ title: "Success", description: `Student ${approved ? "approved" : "rejected"} successfully.` });
      fetchPendingStudents();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update student status.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleTeamApproval = async (teamProfileId: string, userId: string, requestedRole: string, approved: boolean) => {
    setProcessingId(teamProfileId);
    try {
      // Update team_profiles status
      const { error: updateError } = await supabase
        .from("team_profiles")
        .update({ status: approved ? "approved" : "rejected" })
        .eq("id", teamProfileId);
      if (updateError) throw updateError;

      if (approved) {
        // Update user_roles from 'student' to the requested role
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: requestedRole as any })
          .eq("user_id", userId);
        if (roleError) throw roleError;

        // Delete the auto-created student_profile
        await supabase.from("student_profiles").delete().eq("user_id", userId);
      }

      toast({ title: "Success", description: `Team member ${approved ? "approved" : "rejected"} successfully.` });
      fetchPendingTeam();
    } catch (error: any) {
      console.error("Team approval error:", error);
      toast({ title: "Error", description: error.message || "Failed to update.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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

  if (loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Approvals</h1>
          <p className="text-muted-foreground">Review and approve pending registrations.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Students
              {pendingStudents.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">{pendingStudents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Team
              {pendingTeam.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">{pendingTeam.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-6">
            {/* Filters */}
            <Card className="slide-up">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" /> Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <Select value={batchFilter} onValueChange={setBatchFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        {batches.map((batch) => <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Date</Label>
                    <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Pending Student Approvals</CardTitle>
                <CardDescription>{filteredStudents.length} student(s) waiting</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 fade-in">
                    <Shield className="mb-4 h-12 w-12 text-success bounce-in" />
                    <h3 className="text-lg font-semibold">All caught up!</h3>
                    <p className="text-muted-foreground">No pending student approvals.</p>
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
                        {filteredStudents.map((student, index) => (
                          <TableRow key={student.id} className="slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={student.profile?.avatar_url || ""} />
                                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">{getInitials(student.profile?.full_name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{student.profile?.full_name || "Unknown"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{student.profile?.email || "-"}</TableCell>
                            <TableCell>{student.profile?.phone || "-"}</TableCell>
                            <TableCell><Badge variant="outline">{batches.find(b => b.id === student.batch_id)?.name || "N/A"}</Badge></TableCell>
                            <TableCell>{format(parseISO(student.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => { setSelectedStudent(student); setViewDialogOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleApproval(student.id, false)} disabled={processingId === student.id}>
                                  {processingId === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                </Button>
                                <Button size="sm" onClick={() => handleApproval(student.id, true)} disabled={processingId === student.id}>
                                  {processingId === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" /> Approve</>}
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
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card className="slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Pending Team Approvals</CardTitle>
                <CardDescription>{pendingTeam.length} team member(s) waiting for approval</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingTeam.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 fade-in">
                    <Shield className="mb-4 h-12 w-12 text-success bounce-in" />
                    <h3 className="text-lg font-semibold">All caught up!</h3>
                    <p className="text-muted-foreground">No pending team approvals.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Requested Role</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingTeam.map((member, index) => (
                          <TableRow key={member.id} className="slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.profile?.avatar_url || ""} />
                                  <AvatarFallback className="bg-accent text-xs text-accent-foreground">{getInitials(member.profile?.full_name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{member.profile?.full_name || "Unknown"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{member.profile?.email || "-"}</TableCell>
                            <TableCell>{member.profile?.phone || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {member.requested_role === "bde" ? "Business Development Executive" : "Faculty"}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(parseISO(member.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleTeamApproval(member.id, member.user_id, member.requested_role, false)} disabled={processingId === member.id}>
                                  {processingId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                </Button>
                                <Button size="sm" onClick={() => handleTeamApproval(member.id, member.user_id, member.requested_role, true)} disabled={processingId === member.id}>
                                  {processingId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" /> Approve</>}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scale-in">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>Complete student profile information</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedStudent.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-xl text-primary-foreground">{getInitials(selectedStudent.profile?.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedStudent.profile?.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStudent.profile?.email}</p>
                  <Badge className="mt-1 bg-warning/10 text-warning">Pending</Badge>
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border p-4">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Student ID</span><span className="font-mono font-medium">{selectedStudent.student_id || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">USN</span><span className="font-mono">{selectedStudent.usn || "-"}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Phone</span><span>{selectedStudent.profile?.phone || "-"}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date of Birth</span><span>{selectedStudent.profile?.date_of_birth ? format(parseISO(selectedStudent.profile.date_of_birth), "MMM d, yyyy") : "-"}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Batch</span><Badge variant="outline">{batches.find(b => b.id === selectedStudent.batch_id)?.name || "N/A"}</Badge></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Skill Level</span><span className="capitalize">{selectedStudent.skill_level || "-"}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">College</span><span>{selectedStudent.college_name || "-"}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Branch</span><span>{selectedStudent.branch || "-"}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Registered</span><span>{format(parseISO(selectedStudent.created_at), "MMM d, yyyy")}</span></div>
              </div>

              {selectedStudent.profile?.bio && (
                <div><h4 className="text-sm font-medium text-muted-foreground">Bio</h4><p className="mt-1 text-sm">{selectedStudent.profile.bio}</p></div>
              )}

              {selectedStudent.profile?.linkedin_url && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">LinkedIn</h4>
                  <a href={selectedStudent.profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-primary hover:underline">{selectedStudent.profile.linkedin_url}</a>
                </div>
              )}

              {selectedStudent.profile?.resume_url && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Resume</h4>
                  <a href={selectedStudent.profile.resume_url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-2 text-sm text-primary hover:underline"><FileText className="h-4 w-4" /> View Resume</a>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
                <Button variant="destructive" onClick={() => { handleApproval(selectedStudent.id, false); setViewDialogOpen(false); }} disabled={processingId === selectedStudent.id}><X className="mr-1 h-4 w-4" /> Reject</Button>
                <Button onClick={() => { handleApproval(selectedStudent.id, true); setViewDialogOpen(false); }} disabled={processingId === selectedStudent.id}><Check className="mr-1 h-4 w-4" /> Approve</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
