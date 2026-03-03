import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/SkeletonCard";
import { TrendingUp, BookOpen, FolderKanban, ClipboardList, CheckCircle, XCircle, Clock, AlertTriangle, BarChart3 } from "lucide-react";
import { format, parseISO, subDays, eachDayOfInterval, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface DiaryEntry {
  id: string;
  entry_date: string;
  week_number: number;
  hours_worked: number;
  title: string | null;
  created_at: string;
}

export default function StudentProgress() {
  const { user, role, studentStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [assignmentStats, setAssignmentStats] = useState({ total: 0, submitted: 0 });
  const [missedDays, setMissedDays] = useState<string[]>([]);

  useEffect(() => {
    if (user && role === "student" && studentStatus === "approved") fetchData();
  }, [user, role, studentStatus]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [diariesRes, projectsRes, studentProfileRes] = await Promise.all([
        supabase.from("internship_diary").select("id, entry_date, week_number, hours_worked, title, created_at").eq("user_id", user.id).order("entry_date", { ascending: false }),
        supabase.from("project_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("student_profiles").select("batch_id").eq("user_id", user.id).maybeSingle(),
      ]);

      setDiaryEntries(diariesRes.data || []);
      setProjectCount(projectsRes.count || 0);

      // Fetch assignment stats
      if (studentProfileRes.data?.batch_id) {
        const { data: assignments } = await supabase.from("assignments").select("id, deadline").eq("batch_id", studentProfileRes.data.batch_id);
        const { data: submissions } = await supabase.from("assignment_submissions").select("assignment_id").eq("student_id", user.id);
        
        const submittedIds = new Set(submissions?.map(s => s.assignment_id) || []);
        setAssignmentStats({
          total: assignments?.length || 0,
          submitted: submittedIds.size,
        });
      }

      // Check missed days (last 7 days excluding weekends)
      const entryDates = new Set((diariesRes.data || []).map(e => e.entry_date));
      const last7 = eachDayOfInterval({ start: subDays(new Date(), 7), end: subDays(new Date(), 1) });
      const missed = last7
        .filter(d => d.getDay() !== 0 && d.getDay() !== 6) // exclude weekends
        .filter(d => !entryDates.has(format(d, "yyyy-MM-dd")))
        .map(d => format(d, "MMM dd"));
      setMissedDays(missed);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (role !== "student" || studentStatus !== "approved") {
    return <DashboardLayout><div className="py-12 text-center text-muted-foreground">Access denied.</div></DashboardLayout>;
  }
  if (loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  // Analytics
  const totalEntries = diaryEntries.length;
  const totalHours = diaryEntries.reduce((s, e) => s + Number(e.hours_worked), 0);
  const onTimeEntries = diaryEntries.filter(e => {
    const entryDate = e.entry_date;
    const submittedDate = format(parseISO(e.created_at), "yyyy-MM-dd");
    return entryDate === submittedDate;
  }).length;
  const lateEntries = totalEntries - onTimeEntries;
  const missedAssignments = assignmentStats.total - assignmentStats.submitted;

  // Daily submissions (last 30 days)
  const days30 = eachDayOfInterval({ start: subDays(new Date(), 30), end: new Date() });
  const entryDateSet = new Set(diaryEntries.map(e => e.entry_date));
  const dailyData = days30.map(d => ({
    date: format(d, "MMM dd"),
    submitted: entryDateSet.has(format(d, "yyyy-MM-dd")) ? 1 : 0,
  }));

  // Weekly hours
  const weeklyMap: Record<number, number> = {};
  diaryEntries.forEach(e => { weeklyMap[e.week_number] = (weeklyMap[e.week_number] || 0) + Number(e.hours_worked); });
  const weeklyData = Object.entries(weeklyMap).sort(([a], [b]) => Number(a) - Number(b)).map(([w, h]) => ({ week: `W${w}`, hours: h }));

  // On-time vs late pie
  const timelinessData = [
    { name: "On Time", value: onTimeEntries },
    { name: "Late", value: lateEntries },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">My Progress</h1>
          <p className="text-muted-foreground">Track your internship journey and performance.</p>
        </div>

        {/* Missed entries notification */}
        {missedDays.length > 0 && (
          <Card className="border-warning/30 bg-warning/5 fade-in">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-warning">Missed Diary Entries</p>
                <p className="text-sm text-muted-foreground">
                  You missed work diary entries for: <strong>{missedDays.join(", ")}</strong>. Please update them as soon as possible.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><BookOpen className="h-6 w-6 text-primary" /></div>
              <div><p className="text-2xl font-bold">{totalEntries}</p><p className="text-sm text-muted-foreground">Total Entries</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10"><CheckCircle className="h-6 w-6 text-success" /></div>
              <div><p className="text-2xl font-bold">{onTimeEntries}</p><p className="text-sm text-muted-foreground">On Time</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10"><Clock className="h-6 w-6 text-warning" /></div>
              <div><p className="text-2xl font-bold">{lateEntries}</p><p className="text-sm text-muted-foreground">Late Entries</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"><FolderKanban className="h-6 w-6 text-accent" /></div>
              <div><p className="text-2xl font-bold">{projectCount}</p><p className="text-sm text-muted-foreground">Projects</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10"><ClipboardList className="h-6 w-6 text-destructive" /></div>
              <div><p className="text-2xl font-bold">{assignmentStats.submitted}/{assignmentStats.total}</p><p className="text-sm text-muted-foreground">Assignments</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Daily Submission Streak (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 1]} ticks={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="submitted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Weekly Hours Worked</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weeklyData}>
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
              <CardTitle className="flex items-center gap-2 text-base"><CheckCircle className="h-4 w-4" /> On-time vs Late Entries</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={timelinessData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    <Cell fill="hsl(var(--success))" />
                    <Cell fill="hsl(var(--warning))" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" /> Assignment Status</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Submitted", value: assignmentStats.submitted },
                      { name: "Missed", value: missedAssignments > 0 ? missedAssignments : 0 },
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill="hsl(var(--success))" />
                    <Cell fill="hsl(var(--destructive))" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Total Hours Summary */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Clock className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold">{totalHours.toFixed(1)} hours</p>
              <p className="text-sm text-muted-foreground">Total hours logged across all entries</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
