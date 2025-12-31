import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, BookOpen, Calendar, Clock, Lock, Pencil } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

interface DiaryEntry {
  id: string;
  week_number: number;
  entry_date: string;
  work_description: string;
  hours_worked: number;
  learning_outcome: string | null;
  title: string | null;
  work_summary: string | null;
  reference_links: string | null;
  skills_gained: string | null;
  is_locked: boolean;
  created_at: string;
}

export default function InternshipDiary() {
  const { user, studentStatus } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);

  // Form state
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [title, setTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [learningOutcome, setLearningOutcome] = useState("");
  const [skillsGained, setSkillsGained] = useState("");

  const fetchEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("internship_diary")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching diary entries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  const getCurrentWeek = () => {
    if (entries.length === 0) return 1;
    
    // Get the highest week number
    const maxWeek = Math.max(...entries.map((e) => e.week_number));
    
    // Check if current week has 7 entries
    const currentWeekEntries = entries.filter((e) => e.week_number === maxWeek);
    if (currentWeekEntries.length >= 7) {
      return maxWeek + 1;
    }
    
    return maxWeek;
  };

  const canEditEntry = (entry: DiaryEntry) => {
    const daysSinceCreation = differenceInDays(new Date(), parseISO(entry.created_at));
    return daysSinceCreation <= 7 && !entry.is_locked;
  };

  const handleSubmit = async () => {
    if (!user || !workDescription || !hoursWorked) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from("internship_diary")
          .update({
            entry_date: entryDate,
            title: title || null,
            work_description: workDescription,
            work_summary: workSummary || null,
            hours_worked: parseFloat(hoursWorked),
            reference_links: referenceLinks || null,
            learning_outcome: learningOutcome || null,
            skills_gained: skillsGained || null,
          })
          .eq("id", editingEntry.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Diary entry updated successfully.",
        });
      } else {
        // Create new entry
        const { error } = await supabase.from("internship_diary").insert({
          user_id: user.id,
          week_number: getCurrentWeek(),
          entry_date: entryDate,
          title: title || null,
          work_description: workDescription,
          work_summary: workSummary || null,
          hours_worked: parseFloat(hoursWorked),
          reference_links: referenceLinks || null,
          learning_outcome: learningOutcome || null,
          skills_gained: skillsGained || null,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Diary entry added successfully.",
        });
      }

      // Reset form and refresh
      setDialogOpen(false);
      setEditingEntry(null);
      resetForm();
      fetchEntries();
    } catch (error) {
      console.error("Error saving diary entry:", error);
      toast({
        title: "Error",
        description: "Failed to save diary entry.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
    setTitle("");
    setWorkDescription("");
    setWorkSummary("");
    setHoursWorked("");
    setReferenceLinks("");
    setLearningOutcome("");
    setSkillsGained("");
  };

  const openEditDialog = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setEntryDate(entry.entry_date);
    setTitle(entry.title || "");
    setWorkDescription(entry.work_description);
    setWorkSummary(entry.work_summary || "");
    setHoursWorked(entry.hours_worked.toString());
    setReferenceLinks(entry.reference_links || "");
    setLearningOutcome(entry.learning_outcome || "");
    setSkillsGained(entry.skills_gained || "");
    setDialogOpen(true);
  };

  // Group entries by week
  const entriesByWeek = entries.reduce((acc, entry) => {
    const week = entry.week_number;
    if (!acc[week]) acc[week] = [];
    acc[week].push(entry);
    return acc;
  }, {} as Record<number, DiaryEntry[]>);

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours_worked, 0);
  const currentWeek = getCurrentWeek();

  if (studentStatus !== "approved") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">
            This feature is available after your profile is approved.
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Internship Diary</h1>
            <p className="text-muted-foreground">Track your daily work and learnings.</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingEntry(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? "Edit Diary Entry" : "New Diary Entry"}
                </DialogTitle>
                <DialogDescription>
                  {editingEntry 
                    ? "Update your diary entry details."
                    : `Adding entry for Week ${currentWeek}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="entryDate">Date *</Label>
                    <Input
                      id="entryDate"
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hoursWorked">Hours Worked *</Label>
                    <Input
                      id="hoursWorked"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      placeholder="8"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Entry Title</Label>
                  <Input
                    id="title"
                    placeholder="Brief title for today's work..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workDescription">What I Worked On *</Label>
                  <Textarea
                    id="workDescription"
                    placeholder="Describe what you worked on today..."
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workSummary">Work Summary</Label>
                  <Textarea
                    id="workSummary"
                    placeholder="Brief summary of the day's work..."
                    value={workSummary}
                    onChange={(e) => setWorkSummary(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referenceLinks">Reference Links</Label>
                  <Input
                    id="referenceLinks"
                    placeholder="URLs to relevant resources, documentation..."
                    value={referenceLinks}
                    onChange={(e) => setReferenceLinks(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="learningOutcome">Learnings / Outcomes</Label>
                  <Textarea
                    id="learningOutcome"
                    placeholder="What did you learn today?"
                    value={learningOutcome}
                    onChange={(e) => setLearningOutcome(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skillsGained">Skills Gained</Label>
                  <Input
                    id="skillsGained"
                    placeholder="e.g., React, TypeScript, API integration..."
                    value={skillsGained}
                    onChange={(e) => setSkillsGained(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Entry"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{entries.length}</p>
                <p className="text-sm text-muted-foreground">Total Entries</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Total Hours</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Calendar className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">Week {currentWeek}</p>
                <p className="text-sm text-muted-foreground">Current Week</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entries by Week */}
        {Object.keys(entriesByWeek).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No entries yet</h3>
              <p className="mb-4 text-muted-foreground">
                Start tracking your internship by adding your first entry.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible defaultValue={`week-${currentWeek}`}>
            {Object.entries(entriesByWeek)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([week, weekEntries]) => (
                <AccordionItem key={week} value={`week-${week}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Week {week}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {weekEntries.length} entries • {weekEntries.reduce((sum, e) => sum + e.hours_worked, 0).toFixed(1)}h
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {weekEntries
                        .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
                        .map((entry) => (
                          <Card key={entry.id} className="transition-colors hover:bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex-1 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {format(parseISO(entry.entry_date), "EEEE, MMM d, yyyy")}
                                    </span>
                                    <Badge variant="secondary" className="ml-2">
                                      {entry.hours_worked}h
                                    </Badge>
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
                                  {entry.reference_links && (
                                    <p className="text-sm text-muted-foreground">
                                      <strong>References:</strong>{" "}
                                      <a
                                        href={entry.reference_links}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        {entry.reference_links}
                                      </a>
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {canEditEntry(entry) ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(entry)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground">
                                      <Lock className="mr-1 h-3 w-3" />
                                      Locked
                                    </Badge>
                                  )}
                                </div>
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
      </div>
    </DashboardLayout>
  );
}
