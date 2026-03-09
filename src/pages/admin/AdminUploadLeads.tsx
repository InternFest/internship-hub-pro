import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Upload, Plus, Loader2, Filter } from "lucide-react";

interface BdeUser {
  user_id: string;
  profile?: { full_name: string; email: string } | null;
}

interface Lead {
  id: string;
  name: string;
  college_name: string | null;
  branch: string | null;
  year: string | null;
  semester: string | null;
  phone: string | null;
  email: string | null;
  course_interested: string | null;
  lead_type: string;
  status: string;
  assigned_bde_id: string | null;
  created_by: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  initial_contact: "Initial Contact",
  whatsapp_group_created: "WhatsApp Group",
  re_initiate_call: "Re-Initiate Call",
  converted: "Converted",
  paid: "Paid",
  not_interested: "Not Interested",
};

export default function AdminUploadLeads() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bdeUsers, setBdeUsers] = useState<BdeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filters
  const [branchFilter, setBranchFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");

  // Form
  const [formName, setFormName] = useState("");
  const [formCollege, setFormCollege] = useState("");
  const [formBranch, setFormBranch] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formSemester, setFormSemester] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCourse, setFormCourse] = useState("");
  const [formLeadType, setFormLeadType] = useState("internship");
  const [formAssignedBde, setFormAssignedBde] = useState("");

  const fetchData = async () => {
    // Fetch all leads
    const { data: leadsData } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads((leadsData || []) as Lead[]);

    // Fetch BDE users
    const { data: bdeRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "bde");

    if (bdeRoles && bdeRoles.length > 0) {
      const bdeIds = bdeRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", bdeIds);

      setBdeUsers(bdeRoles.map(r => ({
        user_id: r.user_id,
        profile: profiles?.find(p => p.id === r.user_id) ? { full_name: profiles.find(p => p.id === r.user_id)!.full_name, email: profiles.find(p => p.id === r.user_id)!.email } : null,
      })));
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateLead = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: formName, college_name: formCollege, branch: formBranch,
        year: formYear, semester: formSemester, phone: formPhone,
        email: formEmail, course_interested: formCourse, lead_type: formLeadType,
        assigned_bde_id: formAssignedBde || null,
        created_by: user!.id,
        status: "initial_contact",
      });
      if (error) throw error;
      toast({ title: "Lead Created", description: "Lead has been added successfully." });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName(""); setFormCollege(""); setFormBranch(""); setFormYear("");
    setFormSemester(""); setFormPhone(""); setFormEmail(""); setFormCourse("");
    setFormLeadType("internship"); setFormAssignedBde("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv"].includes(ext || "")) {
      toast({ title: "Error", description: "Only CSV files are supported for upload.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) throw new Error("CSV file must have headers and at least one data row.");

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const leadsToInsert = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const row: any = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

        leadsToInsert.push({
          name: row.name || row.student_name || `Lead ${i}`,
          college_name: row.college_name || row.college || null,
          branch: row.branch || null,
          year: row.year || null,
          semester: row.semester || null,
          phone: row.phone || row.phone_number || null,
          email: row.email || null,
          course_interested: row.course_interested || row.course || null,
          lead_type: row.lead_type || "internship",
          status: "initial_contact",
          created_by: user!.id,
          assigned_bde_id: formAssignedBde || null,
        });
      }

      const { error } = await supabase.from("leads").insert(leadsToInsert);
      if (error) throw error;

      toast({ title: "Upload Successful", description: `${leadsToInsert.length} leads imported.` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (role !== "admin") {
    return <DashboardLayout><div className="flex flex-col items-center justify-center py-12"><Shield className="mb-4 h-12 w-12 text-muted-foreground" /><h3>Access Denied</h3></div></DashboardLayout>;
  }

  const filteredLeads = leads.filter(l => {
    if (branchFilter && !l.branch?.toLowerCase().includes(branchFilter.toLowerCase())) return false;
    if (collegeFilter && !l.college_name?.toLowerCase().includes(collegeFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between fade-in">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Upload Leads</h1>
            <p className="text-muted-foreground">Upload CSV files or create leads manually.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload CSV
              </Button>
            </div>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Create Lead
            </Button>
          </div>
        </div>

        {/* Assign BDE for uploaded leads */}
        {bdeUsers.length > 0 && (
          <Card className="slide-up">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assign BDE for Uploads</CardTitle>
              <CardDescription>Select a BDE before uploading CSV - leads will be auto-assigned.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={formAssignedBde} onValueChange={setFormAssignedBde}>
                <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select BDE..." /></SelectTrigger>
                <SelectContent>
                  {bdeUsers.map(b => (
                    <SelectItem key={b.user_id} value={b.user_id}>
                      {b.profile?.full_name || b.profile?.email || b.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" /> Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>College</Label>
                <Input placeholder="Filter by college..." value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input placeholder="Filter by branch..." value={branchFilter} onChange={e => setBranchFilter(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Leads ({filteredLeads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned BDE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
                  ) : (
                    filteredLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.college_name || "-"}</TableCell>
                        <TableCell>{lead.branch || "-"}</TableCell>
                        <TableCell>{lead.phone || "-"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{lead.lead_type}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{statusLabels[lead.status] || lead.status}</Badge></TableCell>
                        <TableCell>{bdeUsers.find(b => b.user_id === lead.assigned_bde_id)?.profile?.full_name || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Lead</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>College</Label><Input value={formCollege} onChange={e => setFormCollege(e.target.value)} /></div>
              <div className="space-y-2"><Label>Branch</Label><Input value={formBranch} onChange={e => setFormBranch(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Year</Label><Input value={formYear} onChange={e => setFormYear(e.target.value)} /></div>
              <div className="space-y-2"><Label>Semester</Label><Input value={formSemester} onChange={e => setFormSemester(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={formPhone} onChange={e => setFormPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={formEmail} onChange={e => setFormEmail(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Course Interested</Label><Input value={formCourse} onChange={e => setFormCourse(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Lead Type</Label>
              <Select value={formLeadType} onValueChange={setFormLeadType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aicte">AICTE</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bdeUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to BDE</Label>
                <Select value={formAssignedBde} onValueChange={setFormAssignedBde}>
                  <SelectTrigger><SelectValue placeholder="Select BDE..." /></SelectTrigger>
                  <SelectContent>
                    {bdeUsers.map(b => (
                      <SelectItem key={b.user_id} value={b.user_id}>{b.profile?.full_name || b.user_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleCreateLead} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
