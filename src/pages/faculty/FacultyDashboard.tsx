import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Shield, Users, BookOpen, FolderKanban, CheckCircle, XCircle, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Student {
  id: string;
  user_id: string;
  student_id: string | null;
  batch_id: string | null;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface DiaryEntry {
  id: string;
  entry_date: string;
  user_id: string;
}

interface Batch {
  id: string;
  name: string;
}

export default function FacultyDashboard() {
  const { role, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [facultyName, setFacultyName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchFilter, setBatchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [diaryTab, setDiaryTab] = useState("submitted");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch faculty profile
        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();
          
          if (profileData) {
            setFacultyName(profileData.full_name || "");
          }
        }

        const [studentsRes, diariesRes, batchesRes] = await Promise.all([
          supabase
            .from("student_profiles")
            .select("id, user_id, student_id, batch_id")
            .eq("status", "approved"),
          supabase
            .from("internship_diary")
            .select("id, entry_date, user_id")
            .order("entry_date", { ascending: false }),
          supabase
            .from("batches")
            .select("id, name")
            .order("name"),
        ]);

        // Fetch profiles
        const userIds = studentsRes.data?.map(s => s.user_id) || [];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);

        const studentsWithProfiles = (studentsRes.data || []).map(s => ({
          ...s,
          profile: profilesData?.find(p => p.id === s.user_id) || null,
        }));

        setStudents(studentsWithProfiles as Student[]);
        setDiaryEntries(diariesRes.data || []);
        setBatches(batchesRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (role === "faculty") {
      fetchData();
    }
  }, [role, user]);

  // Filter students by batch
  const filteredStudents = batchFilter === "all" 
    ? students 
    : students.filter(s => s.batch_id === batchFilter);

  // Get diary submissions for selected date
  const todaySubmissions = diaryEntries.filter(e => e.entry_date === dateFilter);
  const submittedUserIds = new Set(todaySubmissions.map(e => e.user_id));
  
  const submittedStudents = filteredStudents.filter(s => submittedUserIds.has(s.user_id));
  const unsubmittedStudents = filteredStudents.filter(s => !submittedUserIds.has(s.user_id));

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (role !== "faculty") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">Only faculty members can access this page.</p>
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

  // Calculate today's submissions
  const today = new Date().toISOString().split('T')[0];
  const todayDiaryCount = diaryEntries.filter(e => e.entry_date === today).length;
  
  // Batch-wise student distribution
  const batchDistribution = batches.map(b => ({
    name: b.name,
    count: students.filter(s => s.batch_id === b.id).length,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Faculty Dashboard</h1>
          <p className="text-muted-foreground">Monitor student progress and internship activities.</p>
        </div>

        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 fade-in">
          <CardContent className="flex items-center gap-4 pt-6">
            <Avatar className="h-16 w-16 border-2 border-primary/30">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(facultyName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">Welcome back, {facultyName || "Faculty"}! 👋</h2>
              <p className="text-muted-foreground">Here's an overview of your students' activities.</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 slide-up">
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayDiaryCount}</p>
                <p className="text-sm text-muted-foreground">Today's Submissions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/50">
                <BookOpen className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{diaryEntries.length}</p>
                <p className="text-sm text-muted-foreground">Total Diary Entries</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <FolderKanban className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{batches.length}</p>
                <p className="text-sm text-muted-foreground">Active Batches</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Distribution */}
        {batchDistribution.length > 0 && (
          <Card className="slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Students by Batch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {batchDistribution.map((batch) => (
                  <div key={batch.name} className="flex items-center justify-between rounded-lg border p-3 transition-smooth hover:bg-muted/50">
                    <span className="font-medium">{batch.name}</span>
                    <Badge variant="secondary">{batch.count} students</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="students"><Users className="mr-2 h-4 w-4" />Students</TabsTrigger>
            <TabsTrigger value="diaries"><BookOpen className="mr-2 h-4 w-4" />Diaries</TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students" className="slide-up">
            <Card>
              <CardHeader>
                <CardTitle>Students List</CardTitle>
                <CardDescription>{students.length} approved students</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Batch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.profile?.full_name || "Unknown"}</TableCell>
                        <TableCell>{student.profile?.email || "-"}</TableCell>
                        <TableCell>{student.profile?.phone || "-"}</TableCell>
                        <TableCell><Badge variant="secondary">{batches.find(b => b.id === student.batch_id)?.name || "N/A"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diaries Tab */}
          <TabsContent value="diaries">
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" />Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <Select value={batchFilter} onValueChange={setBatchFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={diaryTab} onValueChange={setDiaryTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="submitted"><CheckCircle className="mr-2 h-4 w-4" />Submitted ({submittedStudents.length})</TabsTrigger>
                <TabsTrigger value="unsubmitted"><XCircle className="mr-2 h-4 w-4" />Not Submitted ({unsubmittedStudents.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="submitted">
                <Card>
                  <CardContent className="pt-6">
                    {submittedStudents.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No submissions for this date.</p>
                    ) : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Student ID</TableHead><TableHead>Batch</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {submittedStudents.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>{s.profile?.full_name || "Unknown"}</TableCell>
                              <TableCell><Badge variant="outline" className="font-mono">{s.student_id || "N/A"}</Badge></TableCell>
                              <TableCell><Badge variant="secondary">{batches.find(b => b.id === s.batch_id)?.name || "N/A"}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="unsubmitted">
                <Card>
                  <CardContent className="pt-6">
                    {unsubmittedStudents.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">All students have submitted!</p>
                    ) : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Student ID</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {unsubmittedStudents.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>{s.profile?.full_name || "Unknown"}</TableCell>
                              <TableCell><Badge variant="outline" className="font-mono">{s.student_id || "N/A"}</Badge></TableCell>
                              <TableCell>{s.profile?.email || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
