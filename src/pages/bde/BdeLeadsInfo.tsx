import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, Filter } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  college_name: string | null;
  branch: string | null;
  year: string | null;
  semester: string | null;
  phone: string | null;
  email: string | null;
  lead_type: string;
  status: string;
}

const statusColors: Record<string, string> = {
  initial_contact: "bg-blue-500/10 text-blue-700",
  whatsapp_group_created: "bg-green-500/10 text-green-700",
  re_initiate_call: "bg-yellow-500/10 text-yellow-700",
  converted: "bg-emerald-500/10 text-emerald-700",
  paid: "bg-purple-500/10 text-purple-700",
  not_interested: "bg-red-500/10 text-red-700",
};

const statusLabels: Record<string, string> = {
  initial_contact: "Initial Contact",
  whatsapp_group_created: "WhatsApp Group",
  re_initiate_call: "Re-Initiate Call",
  converted: "Converted",
  paid: "Paid",
  not_interested: "Not Interested",
};

export default function BdeLeadsInfo() {
  const { user, role } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [collegeFilter, setCollegeFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");

  useEffect(() => {
    const fetchLeads = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("assigned_bde_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setLeads((data || []) as Lead[]);
      setLoading(false);
    };
    fetchLeads();
  }, [user]);

  if (role !== "bde") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
        </div>
      </DashboardLayout>
    );
  }

  const filterLeads = (type: string) => {
    return leads.filter(l => {
      if (l.lead_type !== type) return false;
      if (collegeFilter && !l.college_name?.toLowerCase().includes(collegeFilter.toLowerCase())) return false;
      if (branchFilter && !l.branch?.toLowerCase().includes(branchFilter.toLowerCase())) return false;
      if (yearFilter !== "all" && l.year !== yearFilter) return false;
      if (semesterFilter !== "all" && l.semester !== semesterFilter) return false;
      return true;
    });
  };

  const LeadsTable = ({ type }: { type: string }) => {
    const filtered = filterLeads(type);
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.college_name || "-"}</TableCell>
                  <TableCell>{lead.branch || "-"}</TableCell>
                  <TableCell>{lead.year || "-"}</TableCell>
                  <TableCell>{lead.semester || "-"}</TableCell>
                  <TableCell>{lead.phone || "-"}</TableCell>
                  <TableCell>{lead.email || "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status] || ""} variant="outline">
                      {statusLabels[lead.status] || lead.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="fade-in">
          <h1 className="text-2xl font-bold md:text-3xl">Leads Information</h1>
          <p className="text-muted-foreground">View leads assigned to you.</p>
        </div>

        {/* Filters */}
        <Card className="slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" /> Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>College</Label>
                <Input placeholder="Search college..." value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input placeholder="Search branch..." value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="aicte" className="space-y-4">
          <TabsList>
            <TabsTrigger value="aicte">AICTE</TabsTrigger>
            <TabsTrigger value="internship">Internship</TabsTrigger>
          </TabsList>
          <TabsContent value="aicte">
            <Card><CardContent className="pt-6"><LeadsTable type="aicte" /></CardContent></Card>
          </TabsContent>
          <TabsContent value="internship">
            <Card><CardContent className="pt-6"><LeadsTable type="internship" /></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
