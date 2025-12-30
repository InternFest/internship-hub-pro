import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonDashboard } from "@/components/SkeletonCard";
import {
  BookOpen,
  FolderKanban,
  CalendarOff,
  Clock,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  Users,
  Shield,
  MessageSquare,
} from "lucide-react";

interface StudentStats {
  diaryEntries: number;
  projects: number;
  leaves: number;
  studentId: string | null;
  batchName: string | null;
}

interface AdminStats {
  pendingApprovals: number;
  totalStudents: number;
  totalFaculty: number;
  pendingLeaves: number;
  pendingQueries: number;
}

interface BatchStats {
  vlsi: number;
  aiMl: number;
  mern: number;
  java: number;
}

export default function Dashboard() {
  const { user, role, studentStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentStats, setStudentStats] = useState<StudentStats>({
    diaryEntries: 0,
    projects: 0,
    leaves: 0,
    studentId: null,
    batchName: null,
  });
  const [adminStats, setAdminStats] = useState<AdminStats>({
    pendingApprovals: 0,
    totalStudents: 0,
    totalFaculty: 0,
    pendingLeaves: 0,
    pendingQueries: 0,
  });
  const [batchStats, setBatchStats] = useState<BatchStats>({
    vlsi: 0,
    aiMl: 0,
    mern: 0,
    java: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        if (role === "student") {
          // Fetch student profile
          const { data: profile } = await supabase
            .from("student_profiles")
            .select("student_id, batch_id")
            .eq("user_id", user.id)
            .maybeSingle();

          // Fetch batch info if assigned
          let batchName = null;
          if (profile?.batch_id) {
            const { data: batch } = await supabase
              .from("batches")
              .select("name")
              .eq("id", profile.batch_id)
              .maybeSingle();
            batchName = batch?.name || null;
          }

          if (studentStatus === "approved") {
            // Fetch diary entries count
            const { count: diaryCount } = await supabase
              .from("internship_diary")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id);

            // Fetch projects count
            const { count: projectCount } = await supabase
              .from("project_members")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id);

            // Fetch leaves count
            const { count: leavesCount } = await supabase
              .from("leave_requests")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id);

            setStudentStats({
              diaryEntries: diaryCount || 0,
              projects: projectCount || 0,
              leaves: leavesCount || 0,
              studentId: profile?.student_id || null,
              batchName,
            });
          } else {
            setStudentStats((prev) => ({
              ...prev,
              studentId: profile?.student_id || null,
              batchName,
            }));
          }
        } else if (role === "admin") {
          // Fetch admin stats
          const [
            { count: pendingCount },
            { count: studentsCount },
            { count: facultyCount },
            { count: leavesCount },
            { count: queriesCount },
            { data: roleData },
          ] = await Promise.all([
            supabase
              .from("student_profiles")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending"),
            supabase
              .from("user_roles")
              .select("*", { count: "exact", head: true })
              .eq("role", "student"),
            supabase
              .from("user_roles")
              .select("*", { count: "exact", head: true })
              .eq("role", "faculty"),
            supabase
              .from("leave_requests")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending"),
            supabase
              .from("admin_queries")
              .select("*", { count: "exact", head: true })
              .eq("is_resolved", false),
            supabase
              .from("student_profiles")
              .select("internship_role")
              .eq("status", "approved"),
          ]);

          // Calculate batch-wise stats
          const roles = roleData || [];
          setBatchStats({
            vlsi: roles.filter((r) => r.internship_role === "vlsi").length,
            aiMl: roles.filter((r) => r.internship_role === "ai-ml").length,
            mern: roles.filter((r) => r.internship_role === "mern").length,
            java: roles.filter((r) => r.internship_role === "java").length,
          });

          setAdminStats({
            pendingApprovals: pendingCount || 0,
            totalStudents: studentsCount || 0,
            totalFaculty: facultyCount || 0,
            pendingLeaves: leavesCount || 0,
            pendingQueries: queriesCount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, role, studentStatus]);

  if (loading) {
    return (
      <DashboardLayout>
        <SkeletonDashboard />
      </DashboardLayout>
    );
  }

  // Student Pending Dashboard
  if (role === "student" && studentStatus !== "approved") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative mb-8">
            <div className="absolute inset-0 animate-ping rounded-full bg-warning/20" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-warning to-warning/80 shadow-lg">
              <Clock className="h-12 w-12 text-warning-foreground" />
            </div>
          </div>

          <div className="max-w-xl text-center">
            <h1 className="mb-4 text-3xl font-bold">Welcome to FEST Interns!</h1>
            <p className="mb-6 text-lg text-muted-foreground">
              Your profile is currently under review. Once approved by an administrator, 
              you'll have full access to all features including your internship diary, 
              project management, and more.
            </p>

            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="flex items-center gap-4 p-6">
                <AlertCircle className="h-10 w-10 flex-shrink-0 text-warning" />
                <div className="text-left">
                  <p className="font-semibold">Profile Status: Pending Approval</p>
                  <p className="text-sm text-muted-foreground">
                    You can update your profile while waiting for approval. 
                    Sidebar features will be enabled after your account is approved.
                  </p>
                </div>
              </CardContent>
            </Card>

            {studentStats.studentId && (
              <div className="mt-6 rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Your Student ID</p>
                <p className="text-2xl font-bold text-primary">{studentStats.studentId}</p>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Student Approved Dashboard
  if (role === "student" && studentStatus === "approved") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Welcome back, {user?.user_metadata?.full_name?.split(" ")[0]}!
              </h1>
              <p className="text-muted-foreground">Here's an overview of your internship progress.</p>
            </div>
            <Badge variant="outline" className="w-fit bg-success/10 text-success">
              <CheckCircle className="mr-1 h-3 w-3" />
              Approved
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Student ID
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{studentStats.studentId || "N/A"}</p>
                {studentStats.batchName && (
                  <p className="text-xs text-muted-foreground">{studentStats.batchName}</p>
                )}
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Diary Entries
                </CardTitle>
                <BookOpen className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{studentStats.diaryEntries}</p>
                <p className="text-xs text-muted-foreground">Total entries logged</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Projects
                </CardTitle>
                <FolderKanban className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{studentStats.projects}</p>
                <p className="text-xs text-muted-foreground">Active projects</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Leave Requests
                </CardTitle>
                <CalendarOff className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{studentStats.leaves}</p>
                <p className="text-xs text-muted-foreground">Total requests</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks you might want to do</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/diary"
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-medium">Add Diary Entry</span>
              </a>
              <a
                href="/projects"
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <FolderKanban className="h-5 w-5 text-primary" />
                <span className="font-medium">View Projects</span>
              </a>
              <a
                href="/leaves"
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <CalendarOff className="h-5 w-5 text-primary" />
                <span className="font-medium">Request Leave</span>
              </a>
              <a
                href="/profile"
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <GraduationCap className="h-5 w-5 text-primary" />
                <span className="font-medium">Update Profile</span>
              </a>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Faculty Dashboard
  if (role === "faculty") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Faculty Dashboard</h1>
            <p className="text-muted-foreground">Monitor student progress and internship activities.</p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Read-Only Access</h3>
              <p className="text-center text-muted-foreground">
                As faculty, you can view student profiles, diaries, projects, and leave requests.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Admin Dashboard
  if (role === "admin") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage students, faculty, and platform settings.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Approvals
                </CardTitle>
                <Shield className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{adminStats.pendingApprovals}</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Students
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{adminStats.totalStudents}</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Faculty
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{adminStats.totalFaculty}</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Leaves
                </CardTitle>
                <CalendarOff className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{adminStats.pendingLeaves}</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open Queries
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{adminStats.pendingQueries}</p>
              </CardContent>
            </Card>
          </div>

          {/* Batch-wise Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Batch-wise Student Statistics</CardTitle>
              <CardDescription>Students enrolled by internship track</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <span className="font-bold">V</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{batchStats.vlsi}</p>
                    <p className="text-sm text-muted-foreground">VLSI</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <span className="font-bold">AI</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{batchStats.aiMl}</p>
                    <p className="text-sm text-muted-foreground">AI / ML</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <span className="font-bold">M</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{batchStats.mern}</p>
                    <p className="text-sm text-muted-foreground">MERN</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                    <span className="font-bold">J</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{batchStats.java}</p>
                    <p className="text-sm text-muted-foreground">Java</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return null;
}
