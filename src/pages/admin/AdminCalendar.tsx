import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Lock, Plus, Calendar, Upload, Loader2, FileText, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

interface CalendarItem {
  id: string;
  batch_id: string;
  title: string;
  pdf_url: string;
  created_at: string;
  batches?: { name: string };
}

interface Batch {
  id: string;
  name: string;
  assigned_faculty_id?: string | null;
}

export default function AdminCalendar() {
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCalendar, setDeletingCalendar] = useState<CalendarItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [batchId, setBatchId] = useState("");
  const [title, setTitle] = useState("Working Calendar");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: batchesData } = await supabase.from("batches").select("id, name, end_date, assigned_faculty_id").gt("end_date", today).order("name");
      
      let availableBatches = batchesData || [];
      if (role === "faculty" && user) {
        availableBatches = availableBatches.filter(b => b.assigned_faculty_id === user.id);
      }
      setBatches(availableBatches);

      const { data: calendarsData } = await supabase
        .from("calendars")
        .select("*, batches(name)")
        .order("created_at", { ascending: false });
      
      setCalendars((calendarsData as CalendarItem[]) || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const handleUpload = async () => {
    if (!user || !batchId || !pdfFile) {
      toast({ title: "Error", description: "Please select a batch and upload a PDF.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const filePath = `${batchId}/${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage.from("calendar-files").upload(filePath, pdfFile);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("calendars").insert({
        batch_id: batchId,
        title,
        pdf_url: filePath,
        uploaded_by: user.id,
      });
      if (error) throw error;

      toast({ title: "Success", description: "Calendar uploaded successfully." });
      setDialogOpen(false);
      setBatchId("");
      setTitle("Working Calendar");
      setPdfFile(null);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to upload calendar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCalendar) return;
    setDeleting(true);
    try {
      await supabase.storage.from("calendar-files").remove([deletingCalendar.pdf_url]);
      const { error } = await supabase.from("calendars").delete().eq("id", deletingCalendar.id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Calendar deleted." });
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleViewPdf = async (pdfUrl: string) => {
    try {
      const { data, error } = await supabase.storage.from("calendar-files").download(pdfUrl);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    } catch {
      toast({ title: "Error", description: "Failed to open PDF.", variant: "destructive" });
    }
  };

  if (authLoading || loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  if (role !== "admin" && role !== "faculty") {
    return <DashboardLayout><div className="flex flex-col items-center justify-center py-12"><Lock className="mb-4 h-12 w-12 text-muted-foreground" /><h3>Access Denied</h3></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between fade-in">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Working Calendar</h1>
            <p className="text-muted-foreground">Upload and manage batch-wise working calendars.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Upload Calendar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Working Calendar</DialogTitle>
                <DialogDescription>Upload a PDF calendar for a specific batch/course.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Batch *</Label>
                  <Select value={batchId} onValueChange={setBatchId}>
                    <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Working Calendar" />
                </div>
                <div className="space-y-2">
                  <Label>PDF File *</Label>
                  <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                  {pdfFile && <Badge variant="outline">{pdfFile.name}</Badge>}
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpload} disabled={saving}>
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="mr-2 h-4 w-4" /> Upload</>}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {calendars.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No calendars yet</h3>
            <p className="mb-4 text-muted-foreground">Upload a working calendar for a batch.</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Upload Calendar</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {calendars.map(cal => (
              <Card key={cal.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{cal.batches?.name}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(cal.created_at), "MMM dd, yyyy")}</span>
                  </div>
                  <CardTitle className="text-base mt-2 flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{cal.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewPdf(cal.pdf_url)}>
                    <FileText className="mr-2 h-4 w-4" /> View PDF
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeletingCalendar(cal); setDeleteDialogOpen(true); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calendar</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
