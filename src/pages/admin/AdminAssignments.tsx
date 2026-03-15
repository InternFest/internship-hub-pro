import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ClipboardList, Lock, Users, CheckCircle, XCircle, FileText, Pencil, Trash2, Image, Link2, Type, Award } from "lucide-react";
import { format } from "date-fns";

interface Assignment {
  id: string;
  batch_id: string;
  assignment_number: number;
  title: string;
  description: string | null;
  pdf_url: string | null;
  links: string | null;
  start_date: string;
  deadline: string;
  created_at: string;
  batches?: { name: string };
}

interface Batch {
  id: string;
  name: string;
  assigned_faculty_id?: string | null;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  submitted_at: string;
  text_content: string | null;
  submission_type: string | null;
}

interface StudentInfo {
  user_id: string;
  profiles?: { full_name: string; email: string };
  student_id: string | null;
}

export default function AdminAssignments() {
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [batchStudents, setBatchStudents] = useState<StudentInfo[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [batchId, setBatchId] = useState("");
  const [assignmentNumber, setAssignmentNumber] = useState("1");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [deadline, setDeadline] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("23:59");
  const [pdfFiles, setPdfFiles] = useState<FileList | null>(null);

  // Submission type toggles for assignment creation
  const [allowPdf, setAllowPdf] = useState(true);
  const [allowLink, setAllowLink] = useState(false);
  const [allowText, setAllowText] = useState(false);
  const [allowImage, setAllowImage] = useState(false);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: batchesData } = await supabase
        .from("batches").select("id, name, end_date, assigned_faculty_id").gt("end_date", today).order("name");

      let availableBatches = batchesData || [];
      if (role === "faculty" && user) {
        availableBatches = availableBatches.filter((b) => b.assigned_faculty_id === user.id);
      }
      setBatches(availableBatches);

      const facultyBatchIds = role === "faculty" && user ? availableBatches.map((b) => b.id) : null;

      let query = supabase.from("assignments").select("*, batches(name)").order("assignment_number", { ascending: true });

      if (facultyBatchIds && facultyBatchIds.length > 0) {
        query = query.in("batch_id", facultyBatchIds);
      } else if (facultyBatchIds && facultyBatchIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const resetForm = () => {
    setBatchId(""); setAssignmentNumber("1"); setTitle(""); setDescription("");
    setLinks(""); setStartDate(new Date().toISOString().split("T")[0]); setDeadline("");
    setDeadlineTime("23:59"); setPdfFiles(null); setEditMode(false); setEditingAssignment(null);
    setAllowPdf(true); setAllowLink(false); setAllowText(false); setAllowImage(false);
  };

  const populateFormForEdit = (assignment: Assignment) => {
    setEditMode(true);
    setEditingAssignment(assignment);
    setBatchId(assignment.batch_id);
    setAssignmentNumber(assignment.assignment_number.toString());
    setTitle(assignment.title);
    setDescription(assignment.description || "");
    setLinks(assignment.links || "");
    setStartDate(assignment.start_date);
    setDeadline(assignment.deadline);
    setDeadlineTime((assignment as any).deadline_time || "23:59");
    setPdfFiles(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !batchId || !title || !deadline) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let pdfUrl = editingAssignment?.pdf_url || null;
      if (pdfFiles && pdfFiles.length > 0) {
        setUploading(true);
        // Upload first file as primary PDF (multiple files stored as comma-separated)
        const urls: string[] = [];
        for (let i = 0; i < pdfFiles.length; i++) {
          const file = pdfFiles[i];
          const fileExt = file.name.split(".").pop();
          const filePath = `${user.id}/${Date.now()}_${i}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from("assignment-files").upload(filePath, file);
          if (uploadError) throw uploadError;
          urls.push(filePath);
        }
        pdfUrl = urls.join(",");
        setUploading(false);
      }

      // Store allowed submission types in description metadata
      const submissionTypes = [
        allowPdf && "pdf",
        allowLink && "link",
        allowText && "text",
        allowImage && "image",
      ].filter(Boolean).join(",");

      const payload = {
        batch_id: batchId,
        assignment_number: parseInt(assignmentNumber),
        title,
        description: description || null,
        pdf_url: pdfUrl,
        links: links ? `${links}${submissionTypes ? `|types:${submissionTypes}` : ""}` : (submissionTypes ? `|types:${submissionTypes}` : null),
        start_date: startDate,
        deadline,
        deadline_time: deadlineTime || "23:59",
      };

      if (editMode && editingAssignment) {
        const { error } = await supabase.from("assignments").update(payload).eq("id", editingAssignment.id);
        if (error) throw error;
        toast({ title: "Success", description: "Assignment updated." });
      } else {
        const { error } = await supabase.from("assignments").insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast({ title: "Success", description: "Assignment created." });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to save assignment.", variant: "destructive" });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAssignment) return;
    setDeleting(true);
    try {
      if (deletingAssignment.pdf_url) {
        const urls = deletingAssignment.pdf_url.split(",");
        await supabase.storage.from("assignment-files").remove(urls);
      }
      const { error } = await supabase.from("assignments").delete().eq("id", deletingAssignment.id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Assignment deleted successfully." });
      setDeleteDialogOpen(false);
      setDeletingAssignment(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "Error", description: "Failed to delete assignment.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleViewTracking = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setTrackingDialogOpen(true);
    try {
      const { data: subs } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", assignment.id);
      setSubmissions((subs || []) as Submission[]);

      const { data: studentProfiles } = await supabase
        .from("student_profiles").select("user_id, student_id").eq("batch_id", assignment.batch_id).eq("status", "approved");

      if (!studentProfiles || studentProfiles.length === 0) { setBatchStudents([]); return; }

      const userIds = studentProfiles.map((s) => s.user_id);
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);

      const merged: StudentInfo[] = studentProfiles.map((sp) => {
        const profile = profilesData?.find((p) => p.id === sp.user_id);
        return {
          user_id: sp.user_id,
          student_id: sp.student_id,
          profiles: profile ? { full_name: profile.full_name, email: profile.email } : undefined,
        };
      });
      setBatchStudents(merged);
    } catch (error) {
      console.error("Error fetching tracking data:", error);
    }
  };

  const handleViewFile = async (fileUrl: string) => {
    try {
      const { data, error } = await supabase.storage.from("assignment-files").download(fileUrl);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    } catch {
      toast({ title: "Error", description: "Failed to open file.", variant: "destructive" });
    }
  };

  const filteredAssignments = selectedBatchFilter === "all" ? assignments : assignments.filter((a) => a.batch_id === selectedBatchFilter);

  if (authLoading || loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  if (role !== "admin" && role !== "faculty") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
        </div>
      </DashboardLayout>
    );
  }

  const submittedStudentIds = [...new Set(submissions.map((s) => s.student_id))];
  const submittedStudents = batchStudents.filter((s) => submittedStudentIds.includes(s.user_id));
  const notSubmittedStudents = batchStudents.filter((s) => !submittedStudentIds.includes(s.user_id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between fade-in">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Assignments</h1>
            <p className="text-muted-foreground">Create and track assignments.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Create Assignment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMode ? "Edit Assignment" : "Create Assignment"}</DialogTitle>
                <DialogDescription>{editMode ? "Update assignment details." : "Create a new assignment for a batch."}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Batch *</Label>
                    <Select value={batchId} onValueChange={setBatchId}>
                      <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                      <SelectContent>{batches.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assignment Number *</Label>
                    <Input type="number" min="1" value={assignmentNumber} onChange={(e) => setAssignmentNumber(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title..." />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Assignment description..." />
                </div>
                <div className="space-y-2">
                  <Label>Reference Links (comma-separated)</Label>
                  <Input value={links} onChange={(e) => setLinks(e.target.value)} placeholder="https://link1.com, https://link2.com" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Deadline *</Label>
                    <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Deadline Time *</Label>
                  <Input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Submissions allowed until this time on the deadline date.</p>
                </div>
                <div className="space-y-2">
                  <Label>PDF Attachments {editMode ? "(leave empty to keep current)" : ""}</Label>
                  <Input type="file" accept=".pdf,.doc,.docx" multiple onChange={(e) => setPdfFiles(e.target.files)} />
                  {pdfFiles && Array.from(pdfFiles).map((f, i) => <Badge key={i} variant="outline" className="mr-1">{f.name}</Badge>)}
                </div>

                {/* Allowed submission types */}
                <div className="space-y-2">
                  <Label>Allowed Submission Types</Label>
                  <p className="text-xs text-muted-foreground">Students can submit any combination of selected types.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={allowPdf} onCheckedChange={(c) => setAllowPdf(!!c)} />
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">PDF / Files</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={allowLink} onCheckedChange={(c) => setAllowLink(!!c)} />
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">External Link</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={allowText} onCheckedChange={(c) => setAllowText(!!c)} />
                      <Type className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Text Input</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={allowImage} onCheckedChange={(c) => setAllowImage(!!c)} />
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Image Upload</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={saving || uploading}>
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : editMode ? <><Pencil className="mr-2 h-4 w-4" /> Update</> : <><Plus className="mr-2 h-4 w-4" /> Create</>}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Label>Filter by Batch:</Label>
          <Select value={selectedBatchFilter} onValueChange={setSelectedBatchFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filteredAssignments.length === 0 ? (
          <Card className="fade-in">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No assignments yet</h3>
              <p className="mb-4 text-muted-foreground">Create your first assignment.</p>
              <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Assignment</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="transition-all hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <ClipboardList className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">#{assignment.assignment_number}: {assignment.title}</h4>
                        <Badge variant="outline">{assignment.batches?.name}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(assignment.start_date), "MMM dd")} – {format(new Date(assignment.deadline), "MMM dd, yyyy")}
                        {(assignment as any).deadline_time ? ` at ${(assignment as any).deadline_time}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewTracking(assignment)}>
                      <Users className="mr-2 h-4 w-4" /> Track
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => populateFormForEdit(assignment)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeletingAssignment(assignment); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tracking Dialog */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAssignment && (
            <>
              <DialogHeader>
                <DialogTitle>Assignment #{selectedAssignment.assignment_number}: {selectedAssignment.title}</DialogTitle>
                <DialogDescription>
                  {selectedAssignment.batches?.name} • Deadline: {format(new Date(selectedAssignment.deadline), "MMM dd, yyyy")}{(selectedAssignment as any).deadline_time ? ` at ${(selectedAssignment as any).deadline_time}` : ""}
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="submitted">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="submitted">Submitted ({submittedStudents.length})</TabsTrigger>
                  <TabsTrigger value="not-submitted">Not Submitted ({notSubmittedStudents.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="submitted" className="space-y-2 mt-4">
                  {submittedStudents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No submissions yet.</p>
                  ) : (
                    submittedStudents.map((student) => {
                      const studentSubs = submissions.filter((s) => s.student_id === student.user_id);
                      return (
                        <div key={student.user_id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                            <div>
                              <p className="font-medium text-sm">{student.profiles?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{student.student_id} • {studentSubs.length} submission(s)</p>
                            </div>
                          </div>
                          {studentSubs.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between pl-6 text-xs border-t pt-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{sub.submission_type || "file"}</Badge>
                                <span className="text-muted-foreground">{sub.file_name}</span>
                                <span className="text-muted-foreground">{format(new Date(sub.submitted_at), "MMM dd, HH:mm")}</span>
                              </div>
                              {sub.file_url && sub.submission_type !== "text" && sub.submission_type !== "link" && (
                                <Button variant="outline" size="sm" onClick={() => handleViewFile(sub.file_url)}>
                                  <FileText className="mr-1 h-3 w-3" /> View
                                </Button>
                              )}
                              {sub.submission_type === "link" && sub.text_content && (
                                <Button variant="outline" size="sm" onClick={() => window.open(sub.text_content!, "_blank")}>
                                  <Link2 className="mr-1 h-3 w-3" /> Open
                                </Button>
                              )}
                              {sub.submission_type === "text" && sub.text_content && (
                                <span className="text-muted-foreground max-w-[200px] truncate">{sub.text_content}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })
                  )}
                </TabsContent>
                <TabsContent value="not-submitted" className="space-y-2 mt-4">
                  {notSubmittedStudents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">All students submitted!</p>
                  ) : (
                    notSubmittedStudents.map((student) => (
                      <div key={student.user_id} className="flex items-center gap-2 rounded-lg border p-3">
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{student.profiles?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.student_id}</p>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAssignment?.title}"? This will also remove all student submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
