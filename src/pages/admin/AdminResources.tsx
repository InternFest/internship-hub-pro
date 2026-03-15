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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, BookOpen, Video, FileText, File, Lock, Upload, AlertCircle, Play, Download, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { resourceSchema } from "@/lib/validations";
import { RichTextEditor, RichTextContent } from "@/components/RichTextEditor";

interface Resource {
  id: string;
  batch_id: string;
  module_number: number;
  title: string;
  description: string | null;
  resource_type: "video" | "text" | "notes" | "external_link";
  content_url: string | null;
  content_text: string | null;
  pdf_url: string | null;
  created_at: string;
  batches?: { name: string };
}

interface Batch {
  id: string;
  name: string;
  assigned_faculty_id?: string | null;
}

export default function AdminResources() {
  const { user, role, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [batchId, setBatchId] = useState("");
  const [moduleNumber, setModuleNumber] = useState("1");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState<"video" | "text" | "notes" | "external_link">("video");
  const [contentUrl, setContentUrl] = useState("");
  const [contentText, setContentText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("id, name, end_date, assigned_faculty_id")
        .gt("end_date", today)
        .order("name");
      if (batchesError) throw batchesError;

      let availableBatches = batchesData || [];
      if (role === "faculty" && user) {
        availableBatches = availableBatches.filter(b => b.assigned_faculty_id === user.id);
      }
      setBatches(availableBatches);

      const facultyBatchIds = role === "faculty" && user ? availableBatches.map(b => b.id) : null;

      let resourcesQuery = supabase
        .from("resources")
        .select("*, batches(name)")
        .order("batch_id")
        .order("module_number")
        .order("created_at", { ascending: false });

      if (facultyBatchIds && facultyBatchIds.length > 0) {
        resourcesQuery = resourcesQuery.in("batch_id", facultyBatchIds);
      } else if (facultyBatchIds && facultyBatchIds.length === 0) {
        setResources([]);
        setLoading(false);
        return;
      }

      const { data: resourcesData, error: resourcesError } = await resourcesQuery;
      if (resourcesError) throw resourcesError;
      setResources((resourcesData as Resource[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load resources.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const resetForm = () => {
    setBatchId("");
    setModuleNumber("1");
    setTitle("");
    setDescription("");
    setResourceType("video");
    setContentUrl("");
    setContentText("");
    setPdfFile(null);
    setErrors({});
    setEditMode(false);
    setEditingResource(null);
  };

  const populateFormForEdit = (resource: Resource) => {
    setEditMode(true);
    setEditingResource(resource);
    setBatchId(resource.batch_id);
    setModuleNumber(resource.module_number.toString());
    setTitle(resource.title);
    setDescription(resource.description || "");
    setResourceType(resource.resource_type);
    setContentUrl(resource.content_url || "");
    setContentText(resource.content_text || "");
    setPdfFile(null);
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setErrors({});

    try {
      resourceSchema.parse({
        batchId, moduleNumber, title, description,
        resourceType,
        contentUrl: (resourceType === "video" || resourceType === "external_link") ? contentUrl : "",
        contentText: resourceType === "text" ? contentText : "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }

    if (resourceType === "video" && !contentUrl) { setErrors({ contentUrl: "Video URL is required" }); return; }
    if (resourceType === "external_link" && !contentUrl) { setErrors({ contentUrl: "External link URL is required" }); return; }
    if (resourceType === "text" && !contentText) { setErrors({ contentText: "Text content is required" }); return; }
    if (resourceType === "notes" && !pdfFile && !editMode) { setErrors({ pdfFile: "PDF file is required" }); return; }

    setSaving(true);
    try {
      let pdfUrl = editingResource?.pdf_url || null;

      if (resourceType === "notes" && pdfFile) {
        setUploading(true);
        const fileExt = pdfFile.name.split(".").pop();
        const filePath = `${batchId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("resource-files").upload(filePath, pdfFile);
        if (uploadError) throw uploadError;
        pdfUrl = filePath;
        setUploading(false);
      }

      if (editMode && editingResource) {
        const { error } = await supabase.from("resources").update({
          batch_id: batchId,
          module_number: parseInt(moduleNumber),
          title,
          description: description || null,
          resource_type: resourceType,
          content_url: (resourceType === "video" || resourceType === "external_link") ? contentUrl : null,
          content_text: resourceType === "text" ? contentText : null,
          pdf_url: resourceType === "notes" ? pdfUrl : null,
        }).eq("id", editingResource.id);
        if (error) throw error;
        toast({ title: "Success", description: "Resource updated successfully." });
      } else {
        const { error } = await supabase.from("resources").insert({
          batch_id: batchId,
          module_number: parseInt(moduleNumber),
          title,
          description: description || null,
          resource_type: resourceType,
          content_url: (resourceType === "video" || resourceType === "external_link") ? contentUrl : null,
          content_text: resourceType === "text" ? contentText : null,
          pdf_url: resourceType === "notes" ? pdfUrl : null,
          created_by: user.id,
        });
        if (error) throw error;
        toast({ title: "Success", description: "Resource created successfully." });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving resource:", error);
      toast({ title: "Error", description: "Failed to save resource.", variant: "destructive" });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingResource) return;
    setDeleting(true);
    try {
      // Delete file from storage if exists
      if (deletingResource.pdf_url) {
        await supabase.storage.from("resource-files").remove([deletingResource.pdf_url]);
      }
      const { error } = await supabase.from("resources").delete().eq("id", deletingResource.id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Resource deleted successfully." });
      setDeleteDialogOpen(false);
      setDeletingResource(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "Error", description: "Failed to delete resource.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-4 w-4 text-primary" />;
      case "text": return <FileText className="h-4 w-4 text-accent" />;
      case "notes": return <File className="h-4 w-4 text-success" />;
      case "external_link": return <ExternalLink className="h-4 w-4 text-orange-500" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case "video": return <Badge className="bg-primary/10 text-primary">Video</Badge>;
      case "text": return <Badge className="bg-accent/10 text-accent">Text</Badge>;
      case "notes": return <Badge className="bg-success/10 text-success">PDF</Badge>;
      case "external_link": return <Badge className="bg-orange-500/10 text-orange-500">Link</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredResources = selectedBatchFilter === "all" ? resources : resources.filter((r) => r.batch_id === selectedBatchFilter);

  const resourcesByBatchAndModule = filteredResources.reduce((acc, resource) => {
    const batchName = resource.batches?.name || "Unknown Batch";
    if (!acc[batchName]) acc[batchName] = {};
    if (!acc[batchName][resource.module_number]) acc[batchName][resource.module_number] = [];
    acc[batchName][resource.module_number].push(resource);
    return acc;
  }, {} as Record<string, Record<number, Resource[]>>);

  if (authLoading || loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  if (role !== "admin" && role !== "faculty") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">Only Admin and Faculty can access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between fade-in">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Resources Management</h1>
            <p className="text-muted-foreground">Manage learning resources for all batches.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="transition-smooth hover:scale-105 active-press">
                <Plus className="mr-2 h-4 w-4" /> Create Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMode ? "Edit Resource" : "Create New Resource"}</DialogTitle>
                <DialogDescription>{editMode ? "Update the resource details." : "Add learning material for students."}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Batch *</Label>
                    <Select value={batchId} onValueChange={setBatchId}>
                      <SelectTrigger className={errors.batchId ? "border-destructive" : ""}><SelectValue placeholder="Select batch" /></SelectTrigger>
                      <SelectContent>{batches.map((batch) => (<SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>))}</SelectContent>
                    </Select>
                    {errors.batchId && <p className="text-xs text-destructive">{errors.batchId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Module Number *</Label>
                    <Input type="number" min="1" max="100" value={moduleNumber} onChange={(e) => setModuleNumber(e.target.value)} className={errors.moduleNumber ? "border-destructive" : ""} />
                    {errors.moduleNumber && <p className="text-xs text-destructive">{errors.moduleNumber}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input placeholder="Resource title..." value={title} onChange={(e) => setTitle(e.target.value)} className={errors.title ? "border-destructive" : ""} />
                  {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="Brief description..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Resource Type *</Label>
                  <Select value={resourceType} onValueChange={(v) => setResourceType(v as "video" | "text" | "notes" | "external_link")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video"><div className="flex items-center gap-2"><Video className="h-4 w-4" /> Video / Video URL</div></SelectItem>
                      <SelectItem value="text"><div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Text Content</div></SelectItem>
                      <SelectItem value="notes"><div className="flex items-center gap-2"><File className="h-4 w-4" /> Notes (PDF)</div></SelectItem>
                      <SelectItem value="external_link"><div className="flex items-center gap-2"><ExternalLink className="h-4 w-4" /> External Link</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {resourceType === "video" && (
                  <div className="space-y-2">
                    <Label>Video URL *</Label>
                    <Input placeholder="https://youtube.com/watch?v=..." value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} className={errors.contentUrl ? "border-destructive" : ""} />
                    {errors.contentUrl && <p className="text-xs text-destructive">{errors.contentUrl}</p>}
                    <p className="text-xs text-muted-foreground">Supports YouTube, Vimeo, and direct video URLs</p>
                  </div>
                )}
                {resourceType === "external_link" && (
                  <div className="space-y-2">
                    <Label>External Link URL *</Label>
                    <Input placeholder="https://github.com/..." value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} className={errors.contentUrl ? "border-destructive" : ""} />
                    {errors.contentUrl && <p className="text-xs text-destructive">{errors.contentUrl}</p>}
                    <p className="text-xs text-muted-foreground">GitHub, documentation, or any external link</p>
                  </div>
                )}
                {resourceType === "text" && (
                  <div className="space-y-2">
                    <Label>Text Content *</Label>
                    <p className="text-xs text-muted-foreground mb-2">Use the toolbar to format text.</p>
                    <RichTextEditor content={contentText} onChange={setContentText} placeholder="Enter your content here..." className={errors.contentText ? "border-destructive" : ""} />
                    {errors.contentText && <p className="text-xs text-destructive">{errors.contentText}</p>}
                  </div>
                )}
                {resourceType === "notes" && (
                  <div className="space-y-2">
                    <Label>PDF File {editMode ? "(leave empty to keep current)" : "*"}</Label>
                    <div className="flex items-center gap-2">
                      <Input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className={errors.pdfFile ? "border-destructive" : ""} />
                      {pdfFile && <Badge variant="outline">{pdfFile.name}</Badge>}
                    </div>
                    {errors.pdfFile && <p className="text-xs text-destructive">{errors.pdfFile}</p>}
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={saving || uploading}>
                    {saving || uploading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {uploading ? "Uploading..." : "Saving..."}</>
                    ) : (
                      <>{editMode ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />} {editMode ? "Update" : "Create"}</>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Label>Filter by Batch:</Label>
          <Select value={selectedBatchFilter} onValueChange={setSelectedBatchFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((batch) => (<SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="card-hover slide-up stagger-1">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Video className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{resources.filter((r) => r.resource_type === "video").length}</p>
                <p className="text-sm text-muted-foreground">Videos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover slide-up stagger-2">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"><FileText className="h-6 w-6 text-accent" /></div>
              <div>
                <p className="text-2xl font-bold">{resources.filter((r) => r.resource_type === "text").length}</p>
                <p className="text-sm text-muted-foreground">Text Resources</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover slide-up stagger-3">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10"><File className="h-6 w-6 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">{resources.filter((r) => r.resource_type === "notes").length}</p>
                <p className="text-sm text-muted-foreground">PDF Notes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resources List */}
        {Object.keys(resourcesByBatchAndModule).length === 0 ? (
          <Card className="fade-in">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
              <h3 className="text-lg font-semibold">No resources yet</h3>
              <p className="mb-4 text-muted-foreground">Create your first learning resource.</p>
              <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Resource</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(resourcesByBatchAndModule).map(([batchName, modules]) => (
              <Card key={batchName} className="slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Badge variant="outline">{batchName}</Badge></CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {Object.entries(modules).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([module, moduleResources]) => (
                      <AccordionItem key={module} value={`module-${module}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span>Module {module}</span>
                            <Badge variant="secondary">{moduleResources.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {moduleResources.map((resource) => (
                              <div key={resource.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                                <div
                                  className="flex items-center gap-3 flex-1 cursor-pointer"
                                  onClick={() => { setSelectedResource(resource); setViewDialogOpen(true); }}
                                >
                                  {getResourceIcon(resource.resource_type)}
                                  <div>
                                    <p className="font-medium">{resource.title}</p>
                                    {resource.description && (
                                      <p className="text-sm text-muted-foreground line-clamp-1">{resource.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getResourceTypeBadge(resource.resource_type)}
                                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); populateFormForEdit(resource); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingResource(resource); setDeleteDialogOpen(true); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedResource && getResourceIcon(selectedResource.resource_type)}
              {selectedResource?.title}
            </DialogTitle>
            {selectedResource?.description && <DialogDescription>{selectedResource.description}</DialogDescription>}
          </DialogHeader>
          {selectedResource?.resource_type === "video" && selectedResource.content_url && (
            <div className="space-y-4">
              <div className="aspect-video w-full">
                <iframe
                  src={(() => {
                    const url = selectedResource.content_url!;
                    if (url.includes("youtube.com/watch")) {
                      const videoId = new URL(url).searchParams.get("v");
                      return `https://www.youtube.com/embed/${videoId}`;
                    }
                    if (url.includes("youtu.be/")) {
                      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
                      return `https://www.youtube.com/embed/${videoId}`;
                    }
                    return url;
                  })()}
                  className="h-full w-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => window.open(selectedResource.content_url!, "_blank")}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Open in New Tab
                </Button>
              </div>
            </div>
          )}
          {selectedResource?.resource_type === "text" && selectedResource.content_text && (
            <ScrollArea className="max-h-[60vh]">
              <div className="rounded-lg border bg-card p-6">
                <RichTextContent content={selectedResource.content_text} />
              </div>
            </ScrollArea>
          )}
          {selectedResource?.resource_type === "notes" && selectedResource.pdf_url && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <File className="h-16 w-16 text-success" />
              <p className="text-muted-foreground text-center">Click to download this PDF document.</p>
              <Button onClick={async () => {
                try {
                  const { data, error } = await supabase.storage.from("resource-files").download(selectedResource.pdf_url!);
                  if (error) throw error;
                  const url = URL.createObjectURL(data);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${selectedResource.title}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch {
                  toast({ title: "Error", description: "Failed to download PDF.", variant: "destructive" });
                }
              }}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingResource?.title}"? This action cannot be undone.
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
