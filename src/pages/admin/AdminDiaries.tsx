import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SkeletonTable } from "@/components/SkeletonCard";
import { Shield, BookOpen, Calendar, Filter, CheckCircle, XCircle, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

interface DiaryEntry {
  id: string;
  week_number: number;
  entry_date: string;
  work_description: string;
  hours_worked: number;
  learning_outcome: string | null;
  title: string | null;
  work_summary: string | null;
  skills_gained: string | null;
  user_id: string;
  profile: {
    full_name: string;
    email: string;
  } | null;
  student_profile: {
    internship_role: string | null;
    student_id: string | null;
  } | null;
}

interface Student {
  user_id: string;
  student_id: string | null;
  internship_role: string | null;
  profile: {
    full_name: string;
    email: string;
  } | null;
}

interface Batch {
  id: string;
  name: string;
}

export default function AdminDiaries() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DiaryEntry[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchFilter, setBatchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState("submitted");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch batches
        const { data: batchesData } = await supabase
          .from("batches")
          .select("id, name")
          .order("name");

        setBatches(batchesData || []);

        // Fetch all approved students
        const { data: studentsData } = await supabase
          .from("student_profiles")
          .select("user_id, student_id, internship_role")
          .eq("status", "approved");

        // Fetch profiles for students
        const studentUserIds = studentsData?.map(s => s.user_id) || [];
        const { data: studentProfilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentUserIds);

        const studentsWithProfiles = (studentsData || []).map(s => ({
          ...s,
          profile: studentProfilesData?.find(p => p.id === s.user_id) || null,
        }));

        setAllStudents(studentsWithProfiles as unknown as Student[]);

        // Fetch diary entries
        const { data: diaryData, error } = await supabase
          .from("internship_diary")
          .select("*")
          .order("entry_date", { ascending: false });

        if (error) throw error;

        // Fetch profiles and student profiles for diary entries
        const userIds = [...new Set(diaryData?.map(d => d.user_id) || [])];
        const [profilesRes, studentProfilesRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email").in("id", userIds),
          supabase.from("student_profiles").select("user_id, internship_role, student_id").in("user_id", userIds),
        ]);

        // Merge data
        const entriesWithProfiles = (diaryData || []).map(entry => ({
          ...entry,
          profile: profilesRes.data?.find(p => p.id === entry.user_id) || null,
          student_profile: studentProfilesRes.data?.find(sp => sp.user_id === entry.user_id) || null,
        }));

        setEntries(entriesWithProfiles as unknown as DiaryEntry[]);
        setFilteredEntries(entriesWithProfiles as unknown as DiaryEntry[]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (role === "admin" || role === "faculty") {
      fetchData();
    }
  }, [role]);

  useEffect(() => {
    let result = entries;

    if (batchFilter !== "all") {
      result = result.filter(
        (e) => e.student_profile?.internship_role === batchFilter
      );
    }

    if (dateFilter) {
      result = result.filter((e) => e.entry_date === dateFilter);
    }

    setFilteredEntries(result);
  }, [batchFilter, dateFilter, entries]);

  // Get students who submitted on selected date
  const submittedUserIds = new Set(
    filteredEntries.map(e => e.user_id)
  );

  // Filter students by batch
  const filteredStudents = batchFilter === "all" 
    ? allStudents 
    : allStudents.filter(s => s.internship_role === batchFilter);

  // Get students who have NOT submitted on selected date
  const unsubmittedStudents = filteredStudents.filter(
    s => !submittedUserIds.has(s.user_id)
  );

  // Group entries by student
  const entriesByStudent = filteredEntries.reduce((acc, entry) => {
    const key = entry.user_id;
    if (!acc[key]) {
      acc[key] = {
        profile: entry.profile,
        studentProfile: entry.student_profile,
        entries: [],
      };
    }
    acc[key].entries.push(entry);
    return acc;
  }, {} as Record<string, { profile: DiaryEntry["profile"]; studentProfile: DiaryEntry["student_profile"]; entries: DiaryEntry[] }>);

  if (role !== "admin" && role !== "faculty") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">
            Only administrators and faculty can access this page.
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
          <h1 className="text-2xl font-bold md:text-3xl">Internship Diaries</h1>
          <p className="text-muted-foreground">View all student internship diary entries.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3 slide-up">
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
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
                <p className="text-2xl font-bold">{submittedUserIds.size}</p>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unsubmittedStudents.length}</p>
                <p className="text-sm text-muted-foreground">Not Submitted</p>
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
                <Label>Filter by Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Submitted/Unsubmitted */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submitted" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Submitted ({submittedUserIds.size})
            </TabsTrigger>
            <TabsTrigger value="unsubmitted" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Not Submitted ({unsubmittedStudents.length})
            </TabsTrigger>
          </TabsList>

          {/* Submitted Tab */}
          <TabsContent value="submitted">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Submitted Diary Entries
                </CardTitle>
                <CardDescription>
                  {filteredEntries.length} entries from {Object.keys(entriesByStudent).length} students on {dateFilter ? format(parseISO(dateFilter), "MMM d, yyyy") : "selected date"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(entriesByStudent).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No entries found</h3>
                    <p className="text-muted-foreground">
                      No diary entries match your current filters.
                    </p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {Object.entries(entriesByStudent).map(([userId, data]) => (
                      <AccordionItem key={userId} value={userId}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-medium">
                              {data.profile?.full_name || "Unknown Student"}
                            </span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {data.studentProfile?.student_id || "N/A"}
                            </Badge>
                            <Badge variant="secondary">
                              {data.studentProfile?.internship_role || "N/A"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {data.entries.length} entries
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {data.entries.map((entry) => (
                              <Card key={entry.id} className="bg-muted/30">
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">
                                        {format(parseISO(entry.entry_date), "EEEE, MMM d, yyyy")}
                                      </span>
                                      <Badge variant="outline">Week {entry.week_number}</Badge>
                                      <Badge variant="secondary">{entry.hours_worked}h</Badge>
                                    </div>
                                    {entry.title && (
                                      <p className="font-medium">{entry.title}</p>
                                    )}
                                    <p className="text-sm">{entry.work_description}</p>
                                    {entry.work_summary && (
                                      <p className="text-sm text-muted-foreground">
                                        <strong>Summary:</strong> {entry.work_summary}
                                      </p>
                                    )}
                                    {entry.learning_outcome && (
                                      <p className="text-sm text-muted-foreground">
                                        <strong>Learning:</strong> {entry.learning_outcome}
                                      </p>
                                    )}
                                    {entry.skills_gained && (
                                      <p className="text-sm text-muted-foreground">
                                        <strong>Skills:</strong> {entry.skills_gained}
                                      </p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unsubmitted Tab */}
          <TabsContent value="unsubmitted">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Students Who Have Not Submitted
                </CardTitle>
                <CardDescription>
                  {unsubmittedStudents.length} student(s) have not submitted diary for {dateFilter ? format(parseISO(dateFilter), "MMM d, yyyy") : "selected date"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unsubmittedStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="mb-4 h-12 w-12 text-success" />
                    <h3 className="text-lg font-semibold">All students have submitted!</h3>
                    <p className="text-muted-foreground">
                      Everyone has submitted their diary for the selected date.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Batch</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unsubmittedStudents.map((student) => (
                          <TableRow key={student.user_id}>
                            <TableCell className="font-medium">
                              {student.profile?.full_name || "Unknown"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {student.student_id || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>{student.profile?.email || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {student.internship_role || "N/A"}
                              </Badge>
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
    </DashboardLayout>
  );
}
