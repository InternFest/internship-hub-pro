import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkeletonTable } from "@/components/SkeletonCard";
import { BookOpen, Video, FileText, File, Lock, ExternalLink, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextContent } from "@/components/RichTextEditor";

interface Resource {
  id: string;
  batch_id: string;
  module_number: number;
  title: string;
  description: string | null;
  resource_type: "video" | "text" | "notes";
  content_url: string | null;
  content_text: string | null;
  pdf_url: string | null;
  created_at: string;
}

export default function StudentResources() {
  const { user, studentStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      if (!user) return;

      try {
        // Fetch student's batch
        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("batch_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!studentProfile?.batch_id) {
          setLoading(false);
          return;
        }

        // Fetch resources for the student's batch
        const { data, error } = await supabase
          .from("resources")
          .select("*")
          .eq("batch_id", studentProfile.batch_id)
          .order("module_number", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) throw error;
        setResources((data as Resource[]) || []);
      } catch (error) {
        console.error("Error fetching resources:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [user]);

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5 text-primary" />;
      case "text":
        return <FileText className="h-5 w-5 text-accent" />;
      case "notes":
        return <File className="h-5 w-5 text-success" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case "video":
        return <Badge className="bg-primary/10 text-primary">Video</Badge>;
      case "text":
        return <Badge className="bg-accent/10 text-accent">Text</Badge>;
      case "notes":
        return <Badge className="bg-success/10 text-success">PDF Notes</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleResourceClick = async (resource: Resource) => {
    if (resource.resource_type === "video" && resource.content_url) {
      // Open video in dialog or new tab
      setSelectedResource(resource);
      setDialogOpen(true);
    } else if (resource.resource_type === "text") {
      setSelectedResource(resource);
      setDialogOpen(true);
    } else if (resource.resource_type === "notes" && resource.pdf_url) {
      // Open PDF in dialog for viewing
      setSelectedResource(resource);
      setDialogOpen(true);
    }
  };

  const handleDownloadPdf = async (resource: Resource) => {
    if (!resource.pdf_url) return;

    try {
      // Download as blob to avoid ad-blocker issues with Supabase domain
      const { data, error } = await supabase.storage
        .from("resource-files")
        .download(resource.pdf_url);

      if (error) throw error;

      if (data) {
        // Create blob URL and trigger download
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = resource.title + ".pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      // Fallback for legacy data with full URLs
      window.open(resource.pdf_url, "_blank");
    }
  };

  const handleViewPdf = async (resource: Resource) => {
    if (!resource.pdf_url) return;

    try {
      // Download as blob to avoid ad-blocker issues
      const { data, error } = await supabase.storage
        .from("resource-files")
        .download(resource.pdf_url);

      if (error) throw error;

      if (data) {
        // Create blob URL and open in new tab
        const url = URL.createObjectURL(data);
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Error viewing PDF:", error);
      window.open(resource.pdf_url, "_blank");
    }
  };

  const getVideoEmbedUrl = (url: string) => {
    // Convert YouTube watch URL to embed URL
    if (url.includes("youtube.com/watch")) {
      const videoId = new URL(url).searchParams.get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  // Group resources by module
  const resourcesByModule = resources.reduce((acc, resource) => {
    const module = resource.module_number;
    if (!acc[module]) acc[module] = [];
    acc[module].push(resource);
    return acc;
  }, {} as Record<number, Resource[]>);

  if (studentStatus !== "approved") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
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
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Learning Resources</h1>
          <p className="text-muted-foreground">
            Access course materials, videos, and notes for your batch.
          </p>
        </div>

        {Object.keys(resourcesByModule).length === 0 ? (
          <Card className="fade-in">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
              <h3 className="text-lg font-semibold">No resources available</h3>
              <p className="text-muted-foreground">
                Resources for your batch will appear here once added.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible defaultValue="module-1" className="space-y-4">
            {Object.entries(resourcesByModule)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([module, moduleResources]) => (
                <AccordionItem
                  key={module}
                  value={`module-${module}`}
                  className="rounded-lg border bg-card px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">Module {module}</h3>
                        <p className="text-sm text-muted-foreground">
                          {moduleResources.length} resource{moduleResources.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pb-4">
                      {moduleResources.map((resource) => (
                        <Card
                          key={resource.id}
                          className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md"
                          onClick={() => handleResourceClick(resource)}
                        >
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                              {getResourceIcon(resource.resource_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{resource.title}</h4>
                                {getResourceTypeBadge(resource.resource_type)}
                              </div>
                              {resource.description && (
                                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                                  {resource.description}
                                </p>
                              )}
                            </div>
                            {resource.resource_type === "video" && (
                              <Play className="h-5 w-5 text-muted-foreground" />
                            )}
                            {resource.resource_type !== "text" && (
                              <ExternalLink className="h-5 w-5 text-muted-foreground" />
                            )}
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

      {/* Resource View Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedResource && getResourceIcon(selectedResource.resource_type)}
              {selectedResource?.title}
            </DialogTitle>
            {selectedResource?.description && (
              <DialogDescription>{selectedResource.description}</DialogDescription>
            )}
          </DialogHeader>

          {selectedResource?.resource_type === "video" && selectedResource.content_url && (
            <div className="aspect-video w-full">
              <iframe
                src={getVideoEmbedUrl(selectedResource.content_url)}
                className="h-full w-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {selectedResource?.resource_type === "text" && selectedResource.content_text && (
            <ScrollArea className="max-h-[60vh]">
              <div className="resource-content-view rounded-lg border bg-card p-6">
                <RichTextContent content={selectedResource.content_text} />
              </div>
            </ScrollArea>
          )}

          {selectedResource?.resource_type === "notes" && selectedResource.pdf_url && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <File className="h-16 w-16 text-success" />
              <p className="text-muted-foreground text-center">
                Click the buttons below to view or download this PDF document.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleViewPdf(selectedResource)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View PDF
                </Button>
                <Button onClick={() => handleDownloadPdf(selectedResource)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}

          {selectedResource?.resource_type === "video" && selectedResource.content_url && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => window.open(selectedResource.content_url!, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
