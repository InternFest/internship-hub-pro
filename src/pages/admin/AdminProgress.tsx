import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { SkeletonTable } from "@/components/SkeletonCard";
import { Shield, Search, TrendingUp, Users, Calendar, Clock, Download, BarChart3, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO, subDays, subMonths, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface Student {
  user_id: string;
  student_id: string | null;
  batch_id: string | null;
  usn: string | null;
  profile: { full_name: string; email: string } | null;
}

interface DiaryEntry {
  id: string;
  user_id: string;
  entry_date: string;
  week_number: number;
  hours_worked: number;
  work_description: string;
  title: string | null;
  created_at: string;
}

interface Batch {
  id: string;
  name: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

export default function AdminProgress() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchFilter, setBatchFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState("week");

  useEffect(() => {
    if (role === "admin" || role === "faculty") fetchData();
  }, [role]);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [batchesRes, studentsRes, diariesRes] = await Promise.all([
        supabase.from("batches").select("id, name, end_date").gt("end_date", today).order("name"),
        supabase.from("student_profiles").select("user_id, student_id, batch_id, usn").eq("status", "approved"),
        supabase.from("internship_diary").select("id, user_id, entry_date, week_number, hours_worked, work_description, title, created_at").order("entry_date", { ascending: false }),
      ]);

      setBatches(batchesRes.data || []);

      const userIds = (studentsRes.data || []).map(s => s.user_id);
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);

      const studentsWithProfiles = (studentsRes.data || []).map(s => ({
        ...s,
        profile: profilesData?.find(p => p.id === s.user_id) || null,
      }));

      setStudents(studentsWithProfiles as Student[]);
      setDiaryEntries(diariesRes.data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const batchMatch = batchFilter === "all" || s.batch_id === batchFilter;
    const searchMatch = !searchQuery || 
      s.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.usn?.toLowerCase().includes(searchQuery.toLowerCase());
    return batchMatch && searchMatch;
  });

  const getStudentEntries = (userId: string) => diaryEntries.filter(e => e.user_id === userId);

  const getTimeFilteredEntries = (entries: DiaryEntry[]) => {
    const now = new Date();
    const cutoff = timeRange === "week" ? subDays(now, 7) : subMonths(now, 1);
    return entries.filter(e => new Date(e.entry_date) >= cutoff);
  };

  // Analytics data
  const now = new Date();
  const cutoff = timeRange === "week" ? subDays(now, 7) : subMonths(now, 1);
  const filteredEntries = diaryEntries.filter(e => {
    const batchMatch = batchFilter === "all" || filteredStudents.some(s => s.user_id === e.user_id);
    const dateMatch = new Date(e.entry_date) >= cutoff;
    return batchMatch && dateMatch;
  });

  // Daily submission data
  const days = eachDayOfInterval({ start: cutoff, end: now });
  const dailyData = days.map(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    const count = filteredEntries.filter(e => e.entry_date === dateStr).length;
    return { date: format(day, "MMM dd"), submissions: count };
  });

  // Weekly hours data
  const weeklyHoursMap: Record<number, number> = {};
  filteredEntries.forEach(e => {
    weeklyHoursMap[e.week_number] = (weeklyHoursMap[e.week_number] || 0) + Number(e.hours_worked);
  });
  const weeklyHoursData = Object.entries(weeklyHoursMap).sort(([a], [b]) => Number(a) - Number(b)).map(([week, hours]) => ({ week: `W${week}`, hours }));

  // Completion stats
  const totalStudentsFiltered = filteredStudents.length;
  const studentsWithEntries = new Set(filteredEntries.map(e => e.user_id)).size;
  const studentsWithoutEntries = totalStudentsFiltered - studentsWithEntries;
  const completionData = [
    { name: "Submitted", value: studentsWithEntries },
    { name: "Not Submitted", value: studentsWithoutEntries },
  ];

  // Batch comparison
  const batchCompData = batches.map(batch => {
    const batchStudentIds = students.filter(s => s.batch_id === batch.id).map(s => s.user_id);
    const batchEntries = filteredEntries.filter(e => batchStudentIds.includes(e.user_id));
    return { name: batch.name, entries: batchEntries.length, students: batchStudentIds.length };
  }).filter(b => b.students > 0);

  const exportCSV = () => {
    const rows = [["Student Name", "Student ID", "USN", "Entry Date", "Week", "Hours", "Title", "Description", "Submitted At"]];
    filteredStudents.forEach(student => {
      const entries = getTimeFilteredEntries(getStudentEntries(student.user_id));
      if (entries.length === 0) {
        rows.push([student.profile?.full_name || "", student.student_id || "", student.usn || "", "", "", "", "", "", ""]);
      } else {
        entries.forEach(e => {
          rows.push([
            student.profile?.full_name || "", student.student_id || "", student.usn || "",
            e.entry_date, `Week ${e.week_number}`, e.hours_worked.toString(),
            e.title || "", e.work_description.replace(/,/g, ";"), format(parseISO(e.created_at), "yyyy-MM-dd HH:mm"),
          ]);
        });
      }
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-progress-${format(now, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (role !== "admin" && role !== "faculty") {
    return <DashboardLayout><div className="flex flex-col items-center justify-center py-12"><Shield className="mb-4 h-12 w-12 text-muted-foreground" /><h3 className="text-lg font-semibold">Access Denied</h3></div></DashboardLayout>;
  }

  if (loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between fade-in">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Student Progress</h1>
            <p className="text-muted-foreground">Track diary entries, consistency, and submission trends.</p>
          </div>
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Batch</Label>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Name, USN, or FEST ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
              <div><p className="text-2xl font-bold">{totalStudentsFiltered}</p><p className="text-sm text-muted-foreground">Total Students</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10"><CheckCircle className="h-6 w-6 text-success" /></div>
              <div><p className="text-2xl font-bold">{studentsWithEntries}</p><p className="text-sm text-muted-foreground">Active</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10"><XCircle className="h-6 w-6 text-destructive" /></div>
              <div><p className="text-2xl font-bold">{studentsWithoutEntries}</p><p className="text-sm text-muted-foreground">Inactive</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"><TrendingUp className="h-6 w-6 text-accent" /></div>
              <div><p className="text-2xl font-bold">{filteredEntries.length}</p><p className="text-sm text-muted-foreground">Total Entries</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Daily Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="submissions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Weekly Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weeklyHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="hours" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Completion Rate</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={completionData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {completionData.map((_, i) => <Cell key={i} fill={i === 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Batch Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={batchCompData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="entries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Entries" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Student List */}
        <Card>
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
            <CardDescription>{filteredStudents.length} students</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No students match your filters.</p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filteredStudents.map(student => {
                  const entries = getTimeFilteredEntries(getStudentEntries(student.user_id));
                  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours_worked), 0);
                  return (
                    <AccordionItem key={student.user_id} value={student.user_id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-medium">{student.profile?.full_name || "Unknown"}</span>
                          <Badge variant="outline" className="font-mono text-xs">{student.student_id || "N/A"}</Badge>
                          {student.usn && <Badge variant="secondary" className="text-xs">{student.usn}</Badge>}
                          <span className="text-sm text-muted-foreground">{entries.length} entries • {totalHours}h</span>
                          {entries.length === 0 && <Badge variant="destructive" className="text-xs">No entries</Badge>}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {entries.length === 0 ? (
                          <p className="text-muted-foreground py-4 text-center">No diary entries in selected time range.</p>
                        ) : (
                          <div className="space-y-2 pt-2">
                            {entries.map(entry => (
                              <div key={entry.id} className="rounded-lg border p-3 bg-muted/30">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-medium">{format(parseISO(entry.entry_date), "EEEE, MMM d")}</span>
                                  <Badge variant="outline" className="text-xs">Week {entry.week_number}</Badge>
                                  <Badge variant="secondary" className="text-xs">{entry.hours_worked}h</Badge>
                                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {format(parseISO(entry.created_at), "MMM d, HH:mm")}
                                  </span>
                                </div>
                                {entry.title && <p className="text-sm font-medium">{entry.title}</p>}
                                <p className="text-sm text-muted-foreground line-clamp-2">{entry.work_description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
