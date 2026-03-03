import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Upload, Lock, FileText, ExternalLink, Loader2, CheckCircle, Link2, Type, Image, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Assignment {
  id: string;
  assignment_number: number;
  title: string;
  description: string | null;
  pdf_url: string | null;
  links: string | null;
  start_date: string;
  deadline: string;
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  file_url: string;
  file_name: string;
  submitted_at: string;
  text_content: string | null;
  submission_type: string | null;
}

export default function StudentAssignments() {
  const { user, studentStatus } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Multi-type submission state
  const [textContent, setTextContent] = useState("");
  const [linkContent, setLinkContent] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data: assignmentsData, error } = await supabase
          .from("assignments")
          .select("*")
          .order("assignment_number", { ascending: true });

        if (error) throw error;
        setAssignments(assignmentsData || []);

        const { data: subsData } = await supabase
          .from("assignment_submissions")
          .select("*")
          .eq("student_id", user.id);

        setSubmissions((subsData || []) as Submission[]);
      } catch (error) {
        console.error("Error fetching assignments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getSubmissions = (assignmentId: string) =>
    submissions.filter((s) => s.assignment_id === assignmentId);

  const isDeadlinePassed = (deadline: string) => new Date(deadline) < new Date();

  const refreshSubmissions = async () => {
    if (!user) return;
    const { data: subsData } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("student_id", user.id);
    setSubmissions((subsData || []) as Submission[]);
  };

  const handleFileUpload = async (files: FileList) => {
    if (!user || !selectedAssignment) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const isImage = file.type.startsWith("image/");
        const filePath = `${user.id}/${selectedAssignment.id}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("assignment-files")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from("assignment_submissions")
          .insert({
            assignment_id: selectedAssignment.id,
            student_id: user.id,
            file_url: filePath,
            file_name: file.name,
            submission_type: isImage ? "image" : "file",
          });
        if (insertError) throw insertError;
      }

      await refreshSubmissions();
      toast({ title: "Success", description: "File(s) submitted successfully." });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Error", description: "Failed to submit file.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!user || !selectedAssignment || !textContent.trim()) return;
    setUploading(true);
    try {
      const { error } = await supabase.from("assignment_submissions").insert({
        assignment_id: selectedAssignment.id,
        student_id: user.id,
        file_url: "",
        file_name: "Text submission",
        text_content: textContent,
        submission_type: "text",
      });
      if (error) throw error;
      setTextContent("");
      await refreshSubmissions();
      toast({ title: "Success", description: "Text submitted." });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to submit.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleLinkSubmit = async () => {
    if (!user || !selectedAssignment || !linkContent.trim()) return;
    setUploading(true);
    try {
      const { error } = await supabase.from("assignment_submissions").insert({
        assignment_id: selectedAssignment.id,
        student_id: user.id,
        file_url: "",
        file_name: "Link submission",
        text_content: linkContent,
        submission_type: "link",
      });
      if (error) throw error;
      setLinkContent("");
      await refreshSubmissions();
      toast({ title: "Success", description: "Link submitted." });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to submit.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSubmission = async (subId: string) => {
    try {
      const { error } = await supabase.from("assignment_submissions").delete().eq("id", subId);
      if (error) throw error;
      await refreshSubmissions();
      toast({ title: "Deleted", description: "Submission removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleViewPdf = async (pdfUrl: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("assignment-files")
        .download(pdfUrl);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    } catch {
      toast({ title: "Error", description: "Failed to open file.", variant: "destructive" });
    }
  };

  if (studentStatus !== "approved") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">Available after your profile is approved.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return <DashboardLayout><SkeletonTable /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Assignments</h1>
          <p className="text-muted-foreground">View and submit your assignments.</p>
        </div>

        {assignments.length === 0 ? (
          <Card className="fade-in">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No assignments yet</h3>
              <p className="text-muted-foreground">Assignments will appear here once assigned.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => {
              const subs = getSubmissions(assignment.id);
              const deadlinePassed = isDeadlinePassed(assignment.deadline);
              return (
                <Card
                  key={assignment.id}
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => { setSelectedAssignment(assignment); setDialogOpen(true); setTextContent(""); setLinkContent(""); }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">#{assignment.assignment_number}</Badge>
                      {subs.length > 0 ? (
                        <Badge className="bg-success/10 text-success">Submitted ({subs.length})</Badge>
                      ) : deadlinePassed ? (
                        <Badge variant="destructive">Missed</Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning">Pending</Badge>
                      )}
                    </div>
                    <CardTitle className="text-base mt-2">{assignment.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>Start: {format(new Date(assignment.start_date), "MMM dd, yyyy")}</p>
                    <p>Deadline: {format(new Date(assignment.deadline), "MMM dd, yyyy")}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedAssignment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Assignment #{selectedAssignment.assignment_number}: {selectedAssignment.title}
                </DialogTitle>
                {selectedAssignment.description && (
                  <DialogDescription>{selectedAssignment.description}</DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-muted-foreground">Start Date</p>
                    <p className="font-medium">{format(new Date(selectedAssignment.start_date), "MMM dd, yyyy")}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-muted-foreground">Deadline</p>
                    <p className="font-medium">{format(new Date(selectedAssignment.deadline), "MMM dd, yyyy")}</p>
                  </div>
                </div>

                {selectedAssignment.links && (() => {
                  const linksStr = selectedAssignment.links.split("|")[0];
                  if (!linksStr) return null;
                  return (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Reference Links</p>
                      <div className="flex flex-wrap gap-2">
                        {linksStr.split(",").filter(l => l.trim()).map((link, i) => (
                          <Button key={i} variant="outline" size="sm" onClick={() => window.open(link.trim(), "_blank")}>
                            <ExternalLink className="mr-1 h-3 w-3" /> Link {i + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {selectedAssignment.pdf_url && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Assignment Files</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAssignment.pdf_url.split(",").map((url, i) => (
                        <Button key={i} variant="outline" size="sm" onClick={() => handleViewPdf(url)}>
                          <FileText className="mr-2 h-4 w-4" /> File {i + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing submissions */}
                {(() => {
                  const subs = getSubmissions(selectedAssignment.id);
                  if (subs.length > 0) {
                    return (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Your Submissions ({subs.length})</p>
                        {subs.map((sub) => (
                          <div key={sub.id} className="rounded-lg border border-success/30 bg-success/5 p-3 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-success mb-1">
                                <CheckCircle className="h-4 w-4" />
                                <Badge variant="outline" className="text-xs">{sub.submission_type || "file"}</Badge>
                                <span className="text-xs font-medium">{sub.file_name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(sub.submitted_at), "MMM dd, yyyy HH:mm")}
                              </p>
                              {sub.text_content && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sub.text_content}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteSubmission(sub.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Submission area */}
                {isDeadlinePassed(selectedAssignment.deadline) ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm text-destructive font-medium">Deadline has passed. Submission closed.</p>
                  </div>
                ) : (
                  <div className="space-y-4 border-t pt-4">
                    <p className="text-sm font-medium">Add Submission</p>
                    
                    {/* File upload */}
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs"><FileText className="h-3 w-3" /> Upload Files (PDF, Doc, Images)</Label>
                      <Input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                        multiple
                        disabled={uploading}
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) handleFileUpload(files);
                        }}
                      />
                    </div>

                    {/* Link submission */}
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs"><Link2 className="h-3 w-3" /> External Link</Label>
                      <div className="flex gap-2">
                        <Input placeholder="https://..." value={linkContent} onChange={(e) => setLinkContent(e.target.value)} disabled={uploading} />
                        <Button size="sm" onClick={handleLinkSubmit} disabled={uploading || !linkContent.trim()}>Submit</Button>
                      </div>
                    </div>

                    {/* Text submission */}
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs"><Type className="h-3 w-3" /> Text Response</Label>
                      <Textarea placeholder="Type your response..." value={textContent} onChange={(e) => setTextContent(e.target.value)} disabled={uploading} rows={3} />
                      <Button size="sm" onClick={handleTextSubmit} disabled={uploading || !textContent.trim()}>Submit Text</Button>
                    </div>

                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
