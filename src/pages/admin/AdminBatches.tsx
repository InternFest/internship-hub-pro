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
import { Loader2, Plus, Shield, FolderKanban, Pencil, Calendar, Clock, CheckCircle, PlayCircle } from "lucide-react";
import { format, parseISO, isAfter, isBefore, isEqual } from "date-fns";

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
      // Fetch batches
      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("*")
        .order("created_at", { ascending: false });

      if (batchesError) throw batchesError;

      // Fetch faculty roles
      const { data: facultyRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "faculty");

      if (rolesError) throw rolesError;

      // Fetch faculty profiles
      const facultyIds = facultyRoles?.map(f => f.user_id) || [];
      const { data: facultyProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", facultyIds);

      setBatches(batchesData || []);
      setFacultyOptions(
        (facultyProfiles || []).map(f => ({
          user_id: f.id,
          full_name: f.full_name || "Unknown",
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

  const getBatchStatus = (batch: Batch) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = parseISO(batch.start_date);
    const endDate = parseISO(batch.end_date);
    
    if (isBefore(today, startDate)) {
      return { label: "Yet to Start", color: "bg-warning/10 text-warning", icon: Clock };
    } else if (isAfter(today, endDate)) {
      return { label: "Completed", color: "bg-muted text-muted-foreground", icon: CheckCircle };
    } else {
      return { label: "Ongoing", color: "bg-success/10 text-success", icon: PlayCircle };
    }
  };

  const isBatchCompleted = (batch: Batch) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = parseISO(batch.end_date);
    return isAfter(today, endDate);
  };

  if (role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between fade-in">
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
              <Button className="transition-smooth hover:scale-105">
                <Plus className="mr-2 h-4 w-4" />
                Create Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scale-in">
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

        <Card className="slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              All Batches
            </CardTitle>
            <CardDescription>{batches.length} batch(es) created</CardDescription>
          </CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 fade-in">
                <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
                <h3 className="text-lg font-semibold">No batches yet</h3>
                <p className="mb-4 text-muted-foreground">
                  Create your first batch to get started.
                </p>
                <Button onClick={() => setDialogOpen(true)} className="transition-smooth hover:scale-105">
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
                      <TableHead>Status</TableHead>
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
                      const status = getBatchStatus(batch);
                      const StatusIcon = status.icon;
                      const isCompleted = isBatchCompleted(batch);
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
                            <Badge className={status.color}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {batch.batch_strength || "-"} students
                            </Badge>
                          </TableCell>
                          <TableCell>{batch.batch_timings || "-"}</TableCell>
                          <TableCell>{faculty?.full_name || "-"}</TableCell>
                          <TableCell className="text-right">
                            {!isCompleted && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(batch)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
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
