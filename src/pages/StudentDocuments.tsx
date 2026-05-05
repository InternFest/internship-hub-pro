import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import PizZip from "pizzip";
import { FileText, Loader2, Download } from "lucide-react";

type ReviewType = "review-1" | "review-2";

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function replacePlaceholders(xml: string, fullName: string, usn: string) {
  const safeName = escapeXml(fullName);
  const safeUsn = escapeXml(usn);
  // Replace text inside <w:t> nodes only to keep formatting intact
  return xml.replace(/(<w:t[^>]*>)([^<]*)(<\/w:t>)/g, (_m, open, text, close) => {
    let t = text;
    t = t.split("USN_Student").join(safeUsn);
    // Replace standalone "Name" word (case-sensitive); avoid replacing within other words
    t = t.replace(/\bName\b/g, safeName);
    return `${open}${t}${close}`;
  });
}

function ReviewSection({ type, label }: { type: ReviewType; label: string }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [usn, setUsn] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!fullName.trim() || !usn.trim()) {
      toast.error("Please enter Full Name and USN");
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch active template
      const { data: template, error: tErr } = await supabase
        .from("review_templates")
        .select("*")
        .eq("review_type", type)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!template) {
        toast.error(`No active ${label} template uploaded yet. Contact admin.`);
        return;
      }

      // 2. Download template
      const { data: blob, error: dErr } = await supabase.storage
        .from("review-templates")
        .download(template.file_path);
      if (dErr || !blob) throw dErr || new Error("Failed to download template");

      const buf = await blob.arrayBuffer();
      const zip = new PizZip(buf);

      // 3. Replace placeholders in document.xml (and headers/footers if any)
      const targets = Object.keys(zip.files).filter((p) =>
        p === "word/document.xml" || /^word\/(header|footer)\d*\.xml$/.test(p)
      );
      for (const path of targets) {
        const file = zip.file(path);
        if (!file) continue;
        const xml = file.asText();
        zip.file(path, replacePlaceholders(xml, fullName.trim(), usn.trim()));
      }

      const out = zip.generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const fileName = `${type === "review-1" ? "Review-1" : "Review-2"}_${usn.trim()}.docx`;

      // 4. Save to storage (user folder for RLS)
      const storagePath = `${user.id}/${Date.now()}_${fileName}`;
      const { error: upErr } = await supabase.storage
        .from("generated-reviews")
        .upload(storagePath, out, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: false,
        });
      if (upErr) throw upErr;

      // 5. Log row
      await supabase.from("generated_reviews").insert({
        user_id: user.id,
        review_type: type,
        full_name: fullName.trim(),
        usn: usn.trim(),
        template_id: template.id,
        file_path: storagePath,
        file_name: fileName,
      });

      // 6. Trigger download
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${label} generated successfully`);
      setFullName("");
      setUsn("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> {label} Rubrics
        </CardTitle>
        <CardDescription>Enter your details to generate a personalized {label} document.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${type}-name`}>Full Name</Label>
          <Input id={`${type}-name`} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Doe" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${type}-usn`}>USN</Label>
          <Input id={`${type}-usn`} value={usn} onChange={(e) => setUsn(e.target.value.toUpperCase())} placeholder="e.g. 1AB22CS001" />
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Generate {label} Rubrics
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StudentDocuments() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Generate your review rubrics documents.</p>
        </div>

        <Tabs defaultValue="review-1" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="review-1">Review-1</TabsTrigger>
            <TabsTrigger value="review-2">Review-2</TabsTrigger>
          </TabsList>
          <TabsContent value="review-1" className="mt-6">
            <ReviewSection type="review-1" label="Review-1" />
          </TabsContent>
          <TabsContent value="review-2" className="mt-6">
            <ReviewSection type="review-2" label="Review-2" />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
