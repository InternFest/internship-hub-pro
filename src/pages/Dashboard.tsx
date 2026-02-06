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
  PlayCircle,
} from "lucide-react";
import { filterOngoingBatches, filterCompletedBatches, Batch } from "@/lib/batchUtils";

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

interface BatchWithStudentCount extends Batch {
  studentCount: number;
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
  const [ongoingBatches, setOngoingBatches] = useState<BatchWithStudentCount[]>([]);
  const [completedBatches, setCompletedBatches] = useState<BatchWithStudentCount[]>([]);

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
            { data: studentProfiles },
            { data: batchesData },
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
              .select("batch_id")
              .eq("status", "approved"),
            supabase
              .from("batches")
              .select("id, name, start_date, end_date")
              .order("name"),
          ]);

          // Calculate batch-wise student counts
          const allBatches = (batchesData || []) as Batch[];
          const batchStudentCounts = (studentProfiles || []).reduce((acc, sp) => {
            if (sp.batch_id) {
              acc[sp.batch_id] = (acc[sp.batch_id] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);

          const batchesWithCounts: BatchWithStudentCount[] = allBatches.map(b => ({
            ...b,
            studentCount: batchStudentCounts[b.id] || 0,
          }));

          setOngoingBatches(filterOngoingBatches(batchesWithCounts) as BatchWithStudentCount[]);
          setCompletedBatches(filterCompletedBatches(batchesWithCounts) as BatchWithStudentCount[]);

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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between fade-in">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Welcome back, {user?.user_metadata?.full_name?.split(" ")[0]}!
              </h1>
              <p className="text-muted-foreground">Here's an overview of your internship progress.</p>
            </div>
            <Badge variant="outline" className="w-fit bg-success/10 text-success bounce-in">
              <CheckCircle className="mr-1 h-3 w-3" />
              Approved
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="card-hover slide-up stagger-1">
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

            <Card className="card-hover slide-up stagger-2">
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

            <Card className="card-hover slide-up stagger-3">
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

            <Card className="card-hover slide-up stagger-4">
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
          <Card className="slide-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks you might want to do</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/diary"
                className="flex items-center gap-3 rounded-lg border p-4 transition-smooth hover:bg-accent hover:scale-[1.02] hover:shadow-md active-press"
              >
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-medium">Add Diary Entry</span>
              </a>
              <a
                href="/projects"
                className="flex items-center gap-3 rounded-lg border p-4 transition-smooth hover:bg-accent hover:scale-[1.02] hover:shadow-md active-press"
              >
                <FolderKanban className="h-5 w-5 text-primary" />
                <span className="font-medium">View Projects</span>
              </a>
              <a
                href="/leaves"
                className="flex items-center gap-3 rounded-lg border p-4 transition-smooth hover:bg-accent hover:scale-[1.02] hover:shadow-md active-press"
              >
                <CalendarOff className="h-5 w-5 text-primary" />
                <span className="font-medium">Request Leave</span>
              </a>
              <a
                href="/profile"
                className="flex items-center gap-3 rounded-lg border p-4 transition-smooth hover:bg-accent hover:scale-[1.02] hover:shadow-md active-press"
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

  // Faculty Dashboard - redirect to students page
  if (role === "faculty") {
    // Import Navigate at the top and use it here
    return null; // Will be handled by App.tsx redirect
  }

  // Admin Dashboard
  if (role === "admin") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="fade-in">
            <h1 className="text-2xl font-bold md:text-3xl">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage students, faculty, and platform settings.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="card-hover slide-up stagger-1">
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

            <Card className="card-hover slide-up stagger-2">
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

            <Card className="card-hover slide-up stagger-3">
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

            <Card className="card-hover slide-up stagger-4">
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

            <Card className="card-hover slide-up stagger-5">
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

          {/* Batch-wise Stats - Ongoing Batches */}
          {ongoingBatches.length > 0 && (
            <Card className="slide-up" style={{ animationDelay: '0.35s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-success" />
                  Ongoing Batches
                </CardTitle>
                <CardDescription>Currently active batches with enrolled students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {ongoingBatches.map((batch, index) => (
                    <div 
                      key={batch.id} 
                      className="flex items-center gap-4 rounded-lg border border-success/20 bg-success/5 p-4 transition-smooth hover:shadow-md hover:border-success/40"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20 text-success">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-2xl font-bold">{batch.studentCount}</p>
                        <p className="text-sm text-muted-foreground truncate">{batch.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Batch-wise Stats - Completed Batches */}
          {completedBatches.length > 0 && (
            <Card className="slide-up" style={{ animationDelay: '0.4s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  Completed Batches
                </CardTitle>
                <CardDescription>Past batches that have concluded</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {completedBatches.map((batch) => (
                    <div 
                      key={batch.id} 
                      className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4 transition-smooth hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-2xl font-bold">{batch.studentCount}</p>
                        <p className="text-sm text-muted-foreground truncate">{batch.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return null;
}
