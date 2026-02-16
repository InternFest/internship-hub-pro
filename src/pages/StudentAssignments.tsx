import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Upload, Lock, FileText, ExternalLink, Loader2, CheckCircle } from "lucide-react";
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

        setSubmissions(subsData || []);
      } catch (error) {
        console.error("Error fetching assignments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getSubmission = (assignmentId: string) =>
    submissions.find((s) => s.assignment_id === assignmentId);

  const isDeadlinePassed = (deadline: string) => new Date(deadline) < new Date();

  const handleUpload = async (file: File) => {
    if (!user || !selectedAssignment) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${selectedAssignment.id}/${Date.now()}.${fileExt}`;

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
        });

      if (insertError) throw insertError;

      // Refresh submissions
      const { data: subsData } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("student_id", user.id);

      setSubmissions(subsData || []);
      toast({ title: "Success", description: "Assignment submitted successfully." });
      setDialogOpen(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Error", description: "Failed to submit assignment.", variant: "destructive" });
    } finally {
      setUploading(false);
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
              const submission = getSubmission(assignment.id);
              const deadlinePassed = isDeadlinePassed(assignment.deadline);
              return (
                <Card
                  key={assignment.id}
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => { setSelectedAssignment(assignment); setDialogOpen(true); }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">#{assignment.assignment_number}</Badge>
                      {submission ? (
                        <Badge className="bg-success/10 text-success">Submitted</Badge>
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

                {selectedAssignment.links && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Reference Links</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAssignment.links.split(",").map((link, i) => (
                        <Button key={i} variant="outline" size="sm" onClick={() => window.open(link.trim(), "_blank")}>
                          <ExternalLink className="mr-1 h-3 w-3" /> Link {i + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAssignment.pdf_url && (
                  <Button variant="outline" onClick={() => handleViewPdf(selectedAssignment.pdf_url!)}>
                    <FileText className="mr-2 h-4 w-4" /> View Assignment PDF
                  </Button>
                )}

                {(() => {
                  const submission = getSubmission(selectedAssignment.id);
                  if (submission) {
                    return (
                      <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                        <div className="flex items-center gap-2 text-success mb-2">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Submitted</span>
                        </div>
                        <p className="text-sm text-muted-foreground">File: {submission.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          On: {format(new Date(submission.submitted_at), "MMM dd, yyyy HH:mm")}
                        </p>
                      </div>
                    );
                  }

                  if (isDeadlinePassed(selectedAssignment.deadline)) {
                    return (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                        <p className="text-sm text-destructive font-medium">Deadline has passed. Submission closed.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Upload Your Submission</p>
                      <Input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file);
                        }}
                      />
                      {uploading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
