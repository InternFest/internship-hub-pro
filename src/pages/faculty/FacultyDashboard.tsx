import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SkeletonTable } from "@/components/SkeletonCard";
import { Shield, Users, BookOpen, FolderKanban, CalendarOff, Eye, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Student {
  id: string;
  user_id: string;
  student_id: string | null;
  usn: string | null;
  internship_role: string | null;
  status: string | null;
  batch_id: string | null;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  batch: {
    name: string;
  } | null;
}

interface DiaryEntry {
  id: string;
  week_number: number;
  entry_date: string;
  work_description: string;
  hours_worked: number;
  learning_outcome: string | null;
  title: string | null;
  user_id: string;
  profile: {
    full_name: string;
  } | null;
  student_profile: {
    student_id: string | null;
  } | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  lead_id: string;
  created_at: string;
  lead_profile: {
    full_name: string;
  } | null;
  members: {
    id: string;
    user_id: string;
    profile: {
      full_name: string;
      email: string;
      phone: string | null;
    } | null;
  }[];
}

interface LeaveRequest {
  id: string;
  leave_date: string;
  leave_type: "sick" | "casual";
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

export default function FacultyDashboard() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);
  const [diaryDialogOpen, setDiaryDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, diariesRes, projectsRes, leavesRes] = await Promise.all([
          supabase
            .from("student_profiles")
            .select(`
              *,
              profile:profiles!student_profiles_user_id_fkey (full_name, email, phone, avatar_url),
              batch:batches!fk_student_batch (name)
            `)
            .eq("status", "approved")
            .order("created_at", { ascending: false }),
          supabase
            .from("internship_diary")
            .select(`
              *,
              profile:profiles!internship_diary_user_id_fkey (full_name),
              student_profile:student_profiles!internship_diary_user_id_fkey (student_id)
            `)
            .order("entry_date", { ascending: false })
            .limit(100),
          supabase
            .from("projects")
            .select(`
              *,
              lead_profile:profiles!projects_lead_id_fkey (full_name),
              members:project_members (
                id,
                user_id,
                profile:profiles!project_members_user_id_fkey (full_name, email, phone)
              )
            `)
            .order("created_at", { ascending: false }),
          supabase
            .from("leave_requests")
            .select(`
              *,
              profile:profiles!leave_requests_user_id_fkey (full_name, email)
            `)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        if (studentsRes.error) throw studentsRes.error;
        if (diariesRes.error) throw diariesRes.error;
        if (projectsRes.error) throw projectsRes.error;
        if (leavesRes.error) throw leavesRes.error;

        setStudents((studentsRes.data as unknown as Student[]) || []);
        setDiaryEntries((diariesRes.data as unknown as DiaryEntry[]) || []);
        setProjects((projectsRes.data as unknown as Project[]) || []);
        setLeaveRequests((leavesRes.data as unknown as LeaveRequest[]) || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (role === "faculty") {
      fetchData();
    }
  }, [role]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "ai-ml":
        return "bg-purple-100 text-purple-700";
      case "java":
        return "bg-orange-100 text-orange-700";
      case "vlsi":
        return "bg-blue-100 text-blue-700";
      case "mern":
        return "bg-green-100 text-green-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (role !== "faculty") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">
            Only faculty members can access this page.
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
          <h1 className="text-2xl font-bold md:text-3xl">Faculty Dashboard</h1>
          <p className="text-muted-foreground">View student progress and activities (read-only).</p>
        </div>

        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="students">
              <Users className="mr-2 h-4 w-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="diaries">
              <BookOpen className="mr-2 h-4 w-4" />
              Diaries
            </TabsTrigger>
            <TabsTrigger value="projects">
              <FolderKanban className="mr-2 h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="leaves">
              <CalendarOff className="mr-2 h-4 w-4" />
              Leaves
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Students List
                </CardTitle>
                <CardDescription>{students.length} approved students</CardDescription>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No students</h3>
                    <p className="text-muted-foreground">No approved students yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>USN</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
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
                                  <p className="font-medium">{student.profile?.full_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {student.profile?.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {student.usn || student.student_id || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(student.internship_role)}>
                                {student.internship_role?.toUpperCase() || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>{student.batch?.name || "-"}</TableCell>
                            <TableCell>{getStatusBadge(student.status || "pending")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diaries Tab */}
          <TabsContent value="diaries">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Internship Diaries
                </CardTitle>
                <CardDescription>Recent diary entries from students</CardDescription>
              </CardHeader>
              <CardContent>
                {diaryEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No entries</h3>
                    <p className="text-muted-foreground">No diary entries yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Title/Date</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead className="text-right">View</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diaryEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">
                              {entry.profile?.full_name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {entry.student_profile?.student_id || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                {entry.title && <p className="font-medium">{entry.title}</p>}
                                <p className="text-sm text-muted-foreground">
                                  {format(parseISO(entry.entry_date), "MMM d, yyyy")}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">Week {entry.week_number}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDiary(entry);
                                  setDiaryDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
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

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  Project Teams & Diaries
                </CardTitle>
                <CardDescription>{projects.length} projects created</CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No projects</h3>
                    <p className="text-muted-foreground">No projects created yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project Title</TableHead>
                          <TableHead>Project Lead</TableHead>
                          <TableHead>Team Size</TableHead>
                          <TableHead className="text-right">View</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.map((project) => (
                          <TableRow key={project.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{project.name}</p>
                                {project.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {project.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{project.lead_profile?.full_name || "Unknown"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{project.members.length} members</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedProject(project);
                                  setProjectDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
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

          {/* Leaves Tab */}
          <TabsContent value="leaves">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarOff className="h-5 w-5" />
                  Leave Requests
                </CardTitle>
                <CardDescription>Recent leave requests from students</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CalendarOff className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No requests</h3>
                    <p className="text-muted-foreground">No leave requests yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Leave Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaveRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {request.profile?.full_name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {format(parseISO(request.leave_date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {request.leave_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(request.status)}</TableCell>
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

      {/* Diary View Dialog */}
      <Dialog open={diaryDialogOpen} onOpenChange={setDiaryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Diary Entry Details</DialogTitle>
            <DialogDescription>
              {selectedDiary && format(parseISO(selectedDiary.entry_date), "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          {selectedDiary && (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student</span>
                  <span className="font-medium">{selectedDiary.profile?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Week</span>
                  <Badge variant="secondary">Week {selectedDiary.week_number}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Hours Worked</span>
                  <span>{selectedDiary.hours_worked}h</span>
                </div>
              </div>

              {selectedDiary.title && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Title</h4>
                  <p className="font-medium">{selectedDiary.title}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Work Description</h4>
                <p className="text-sm">{selectedDiary.work_description}</p>
              </div>

              {selectedDiary.learning_outcome && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Learning Outcome</h4>
                  <p className="text-sm">{selectedDiary.learning_outcome}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDiaryDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Project View Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name}</DialogTitle>
            <DialogDescription>
              {selectedProject?.description || "No description provided"}
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                  Team Members ({selectedProject.members.length})
                </h4>
                <div className="space-y-2">
                  {selectedProject.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{member.profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {member.profile?.phone || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
