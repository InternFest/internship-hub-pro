import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonDashboard } from "@/components/SkeletonCard";
import { Users, UserCheck, TrendingUp, Shield } from "lucide-react";

export default function BdeDashboard() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ reached: 0, converted: 0, generated: 0 });
  const [aicteStats, setAicteStats] = useState({ reached: 0, converted: 0, generated: 0 });
  const [internshipStats, setInternshipStats] = useState({ reached: 0, converted: 0, generated: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        // Fetch all leads assigned to or created by this BDE
        const { data: assignedLeads } = await supabase
          .from("leads")
          .select("id, status, lead_type")
          .eq("assigned_bde_id", user.id);

        const { data: createdLeads } = await supabase
          .from("leads")
          .select("id, status, lead_type")
          .eq("created_by", user.id);

        const allAssigned = assignedLeads || [];
        const allCreated = createdLeads || [];

        // Overall
        setStats({
          reached: allAssigned.length,
          converted: allAssigned.filter(l => l.status === "converted" || l.status === "paid").length,
          generated: allCreated.length,
        });

        // AICTE
        const aicteAssigned = allAssigned.filter(l => l.lead_type === "aicte");
        const aicteCreated = allCreated.filter(l => l.lead_type === "aicte");
        setAicteStats({
          reached: aicteAssigned.length,
          converted: aicteAssigned.filter(l => l.status === "converted" || l.status === "paid").length,
          generated: aicteCreated.length,
        });

        // Internship
        const intAssigned = allAssigned.filter(l => l.lead_type === "internship");
        const intCreated = allCreated.filter(l => l.lead_type === "internship");
        setInternshipStats({
          reached: intAssigned.length,
          converted: intAssigned.filter(l => l.status === "converted" || l.status === "paid").length,
          generated: intCreated.length,
        });
      } catch (error) {
        console.error("Error fetching BDE stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (role !== "bde") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">Only BDE users can access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) return <DashboardLayout><SkeletonDashboard /></DashboardLayout>;

  const StatsCards = ({ data }: { data: { reached: number; converted: number; generated: number } }) => (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="card-3d slide-up">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Students Reached Out</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{data.reached}</p>
        </CardContent>
      </Card>
      <Card className="card-3d slide-up" style={{ animationDelay: "0.1s" }}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Converted / Joined</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
            <UserCheck className="h-4 w-4 text-success" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-success">{data.converted}</p>
        </CardContent>
      </Card>
      <Card className="card-3d slide-up" style={{ animationDelay: "0.2s" }}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Leads Generated</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-accent">{data.generated}</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">BDE Dashboard</h1>
          <p className="text-muted-foreground">Track your leads and performance.</p>
        </div>

        <Tabs defaultValue="aicte" className="space-y-4">
          <TabsList>
            <TabsTrigger value="aicte">AICTE</TabsTrigger>
            <TabsTrigger value="internship">Internship</TabsTrigger>
          </TabsList>
          <TabsContent value="aicte"><StatsCards data={aicteStats} /></TabsContent>
          <TabsContent value="internship"><StatsCards data={internshipStats} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
