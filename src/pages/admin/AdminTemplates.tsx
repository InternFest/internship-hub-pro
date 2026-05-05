import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Upload, Download, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";

type Template = {
  id: string;
  review_type: "review-1" | "review-2";
  version: number;
  file_path: string;
  file_name: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminTemplates() {
  const { user } = useAuth();
  const [type, setType] = useState<"review-1" | "review-2">("review-1");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("review_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!file || !user) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("Only .docx files are allowed");
      return;
    }
    setUploading(true);
    try {
      // version = max + 1 for this type
      const { data: existing } = await supabase
        .from("review_templates")
        .select("version")
        .eq("review_type", type)
        .order("version", { ascending: false })
        .limit(1);
      const nextVersion = (existing && existing[0]?.version ? existing[0].version : 0) + 1;

      const path = `${type}/v${nextVersion}_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("review-templates")
        .upload(path, file, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
      if (upErr) throw upErr;

      // Deactivate previous active for this type
      await supabase.from("review_templates").update({ is_active: false }).eq("review_type", type).eq("is_active", true);

      const { error: insErr } = await supabase.from("review_templates").insert({
        review_type: type,
        version: nextVersion,
        file_path: path,
        file_name: file.name,
        is_active: true,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;

      toast.success("Template uploaded and set active");
      setFile(null);
      (document.getElementById("template-file") as HTMLInputElement).value = "";
      load();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setActive = async (t: Template) => {
    await supabase.from("review_templates").update({ is_active: false }).eq("review_type", t.review_type);
    const { error } = await supabase.from("review_templates").update({ is_active: true }).eq("id", t.id);
    if (error) toast.error(error.message);
    else { toast.success("Marked as active"); load(); }
  };

  const downloadTemplate = async (t: Template) => {
    const { data, error } = await supabase.storage.from("review-templates").download(t.file_path);
    if (error || !data) { toast.error("Download failed"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = t.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteTemplate = async (t: Template) => {
    if (!confirm("Delete this template?")) return;
    await supabase.storage.from("review-templates").remove([t.file_path]);
    const { error } = await supabase.from("review_templates").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates Management</h1>
          <p className="text-muted-foreground">Upload and manage Review-1 and Review-2 Word templates.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Template</CardTitle>
            <CardDescription>Use placeholders <code className="bg-muted px-1 rounded">USN_Student</code> and <code className="bg-muted px-1 rounded">Name</code> in your .docx.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="review-1">Review-1</SelectItem>
                    <SelectItem value="review-2">Review-2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-file">File (.docx)</Label>
                <Input id="template-file" type="file" accept=".docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uploaded Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : templates.length === 0 ? (
              <p className="text-muted-foreground text-sm">No templates uploaded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell><Badge variant="outline">{t.review_type === "review-1" ? "Review-1" : "Review-2"}</Badge></TableCell>
                        <TableCell className="max-w-[240px] truncate">{t.file_name}</TableCell>
                        <TableCell>v{t.version}</TableCell>
                        <TableCell>{format(new Date(t.created_at), "PP")}</TableCell>
                        <TableCell>
                          {t.is_active ? <Badge className="bg-success text-success-foreground">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {!t.is_active && (
                              <Button size="sm" variant="ghost" onClick={() => setActive(t)} title="Set Active">
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => downloadTemplate(t)} title="Download">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t)} title="Delete" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
