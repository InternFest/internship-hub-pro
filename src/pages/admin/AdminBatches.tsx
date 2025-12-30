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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Shield, FolderKanban, Pencil, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

interface FacultyOption {
  user_id: string;
  full_name: string;
}

interface Batch {
  id: string;
  name: string;
  description: string | null;
  course_code: string;
  start_date: string;
  end_date: string;
  batch_strength: number | null;
  batch_timings: string | null;
  assigned_faculty_id: string | null;
  created_at: string;
}

export default function AdminBatches() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [facultyOptions, setFacultyOptions] = useState<FacultyOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [courseCode, setCourseCode] = useState("01");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [batchStrength, setBatchStrength] = useState("");
  const [batchTimings, setBatchTimings] = useState("");
  const [assignedFacultyId, setAssignedFacultyId] = useState("");

  const fetchData = async () => {
    try {
      const [batchesRes, facultyRes] = await Promise.all([
        supabase.from("batches").select("*").order("created_at", { ascending: false }),
        supabase
          .from("user_roles")
          .select(`
            user_id,
            profile:profiles!user_roles_user_id_fkey (full_name)
          `)
          .eq("role", "faculty"),
      ]);

      if (batchesRes.error) throw batchesRes.error;
      if (facultyRes.error) throw facultyRes.error;

      setBatches(batchesRes.data || []);
      setFacultyOptions(
        (facultyRes.data || []).map((f: any) => ({
          user_id: f.user_id,
          full_name: f.profile?.full_name || "Unknown",
        }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") {
      fetchData();
    }
  }, [role]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCourseCode("01");
    setStartDate("");
    setEndDate("");
    setBatchStrength("");
    setBatchTimings("");
    setAssignedFacultyId("");
    setEditingBatch(null);
  };

  const openEditDialog = (batch: Batch) => {
    setEditingBatch(batch);
    setName(batch.name);
    setDescription(batch.description || "");
    setCourseCode(batch.course_code);
    setStartDate(batch.start_date);
    setEndDate(batch.end_date);
    setBatchStrength(batch.batch_strength?.toString() || "");
    setBatchTimings(batch.batch_timings || "");
    setAssignedFacultyId(batch.assigned_faculty_id || "");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const batchData = {
        name,
        description: description || null,
        course_code: courseCode,
        start_date: startDate,
        end_date: endDate,
        batch_strength: batchStrength ? parseInt(batchStrength) : null,
        batch_timings: batchTimings || null,
        assigned_faculty_id: assignedFacultyId || null,
      };

      if (editingBatch) {
        const { error } = await supabase
          .from("batches")
          .update(batchData)
          .eq("id", editingBatch.id);

        if (error) throw error;
        toast({ title: "Success", description: "Batch updated successfully." });
      } else {
        const { error } = await supabase.from("batches").insert(batchData);

        if (error) throw error;
        toast({ title: "Success", description: "Batch created successfully." });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving batch:", error);
      toast({
        title: "Error",
        description: "Failed to save batch.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">
            Only administrators can access this page.
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
            <h1 className="text-2xl font-bold md:text-3xl">Batch Management</h1>
            <p className="text-muted-foreground">Create and manage internship batches.</p>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBatch ? "Edit Batch" : "Create New Batch"}
                </DialogTitle>
                <DialogDescription>
                  {editingBatch
                    ? "Update the batch details."
                    : "Fill in the details to create a new batch."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Batch Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Batch 2025-A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Batch description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="batchStrength">Batch Strength</Label>
                    <Input
                      id="batchStrength"
                      type="number"
                      placeholder="e.g., 30"
                      value={batchStrength}
                      onChange={(e) => setBatchStrength(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batchTimings">Batch Timings</Label>
                    <Input
                      id="batchTimings"
                      placeholder="e.g., 9 AM - 5 PM"
                      value={batchTimings}
                      onChange={(e) => setBatchTimings(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="faculty">Assigned Faculty</Label>
                  <Select value={assignedFacultyId} onValueChange={setAssignedFacultyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {facultyOptions.map((f) => (
                        <SelectItem key={f.user_id} value={f.user_id}>
                          {f.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingBatch ? (
                      "Update Batch"
                    ) : (
                      "Create Batch"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              All Batches
            </CardTitle>
            <CardDescription>{batches.length} batch(es) created</CardDescription>
          </CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No batches yet</h3>
                <p className="mb-4 text-muted-foreground">
                  Create your first batch to get started.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Batch
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Strength</TableHead>
                      <TableHead>Timings</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const faculty = facultyOptions.find(
                        (f) => f.user_id === batch.assigned_faculty_id
                      );
                      return (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{batch.name}</p>
                              {batch.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {batch.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(parseISO(batch.start_date), "MMM d")} -{" "}
                              {format(parseISO(batch.end_date), "MMM d, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {batch.batch_strength || "-"} students
                            </Badge>
                          </TableCell>
                          <TableCell>{batch.batch_timings || "-"}</TableCell>
                          <TableCell>{faculty?.full_name || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(batch)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
