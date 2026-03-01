import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/SkeletonCard";
import { Calendar, FileText, Lock, Download } from "lucide-react";
import { format } from "date-fns";

interface CalendarItem {
  id: string;
  title: string;
  pdf_url: string;
  created_at: string;
}

export default function StudentCalendar() {
  const { user, studentStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);

  useEffect(() => {
    const fetchCalendars = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("calendars")
          .select("id, title, pdf_url, created_at")
          .order("created_at", { ascending: false });
        setCalendars(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendars();
  }, [user]);

  const handleViewPdf = async (pdfUrl: string, title: string) => {
    try {
      const { data, error } = await supabase.storage.from("calendar-files").download(pdfUrl);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    } catch {
      console.error("Failed to open PDF");
    }
  };

  const handleDownloadPdf = async (pdfUrl: string, title: string) => {
    try {
      const { data, error } = await supabase.storage.from("calendar-files").download(pdfUrl);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Failed to download PDF");
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

  if (loading) return <DashboardLayout><SkeletonTable /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Working Calendar</h1>
          <p className="text-muted-foreground">View your batch working calendar.</p>
        </div>

        {calendars.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No calendar available</h3>
              <p className="text-muted-foreground">Your working calendar will appear here once uploaded.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {calendars.map(cal => (
              <Card key={cal.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-5 w-5 text-primary" />
                    {cal.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Updated: {format(new Date(cal.created_at), "MMM dd, yyyy")}
                  </p>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewPdf(cal.pdf_url, cal.title)}>
                    <FileText className="mr-2 h-4 w-4" /> View PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(cal.pdf_url, cal.title)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
