import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SkeletonTable } from "@/components/SkeletonCard";
import { Shield, BookOpen, Calendar, Filter } from "lucide-react";
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

export default function AdminDiaries() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DiaryEntry[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const fetchDiaries = async () => {
      try {
        const { data, error } = await supabase
          .from("internship_diary")
          .select(`
            *,
            profile:profiles!internship_diary_user_id_fkey (full_name, email),
            student_profile:student_profiles!internship_diary_user_id_fkey (internship_role, student_id)
          `)
          .order("entry_date", { ascending: false });

        if (error) throw error;
        setEntries((data as unknown as DiaryEntry[]) || []);
        setFilteredEntries((data as unknown as DiaryEntry[]) || []);
      } catch (error) {
        console.error("Error fetching diaries:", error);
      } finally {
        setLoading(false);
      }
    };

    if (role === "admin" || role === "faculty") {
      fetchDiaries();
    }
  }, [role]);

  useEffect(() => {
    let result = entries;

    if (courseFilter !== "all") {
      result = result.filter(
        (e) => e.student_profile?.internship_role === courseFilter
      );
    }

    if (dateFilter) {
      result = result.filter((e) => e.entry_date === dateFilter);
    }

    setFilteredEntries(result);
  }, [courseFilter, dateFilter, entries]);

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

  if (role !== "admin" && role !== "faculty") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
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
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Internship Diaries</h1>
          <p className="text-muted-foreground">View all student internship diary entries.</p>
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
                <Label>Course / Internship Role</Label>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    <SelectItem value="ai-ml">AI-ML</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="vlsi">VLSI</SelectItem>
                    <SelectItem value="mern">MERN</SelectItem>
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

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Diary Entries
            </CardTitle>
            <CardDescription>
              {filteredEntries.length} entries from {Object.keys(entriesByStudent).length} students
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
                        <Badge className={getRoleBadgeColor(data.studentProfile?.internship_role)}>
                          {data.studentProfile?.internship_role?.toUpperCase() || "N/A"}
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
      </div>
    </DashboardLayout>
  );
}
