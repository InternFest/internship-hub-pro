import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Loader2, Pencil } from "lucide-react";

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
  reminder_date: string | null;
  assigned_bde_id: string | null;
  created_by: string;
}

const statusOptions = [
  { value: "initial_contact", label: "Initial Contact" },
  { value: "whatsapp_group_created", label: "WhatsApp Group Created" },
  { value: "re_initiate_call", label: "Re-Initiate Call" },
  { value: "converted", label: "Converted" },
  { value: "paid", label: "Paid" },
  { value: "not_interested", label: "Not Interested" },
];

const statusColors: Record<string, string> = {
  initial_contact: "bg-blue-500/10 text-blue-700",
  whatsapp_group_created: "bg-green-500/10 text-green-700",
  re_initiate_call: "bg-yellow-500/10 text-yellow-700",
  converted: "bg-emerald-500/10 text-emerald-700",
  paid: "bg-purple-500/10 text-purple-700",
  not_interested: "bg-red-500/10 text-red-700",
};

export default function BdeLeadsGenerated() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBranch, setFormBranch] = useState("");
  const [formCollege, setFormCollege] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formCourse, setFormCourse] = useState("");
  const [formStatus, setFormStatus] = useState("initial_contact");
  const [formLeadType, setFormLeadType] = useState("internship");
  const [formReminder, setFormReminder] = useState("");

  const fetchLeads = async () => {
    if (!user) return;
    // Leads created by BDE
    const { data: created } = await supabase
      .from("leads")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    // Leads assigned to BDE (for status update)
    const { data: assigned } = await supabase
      .from("leads")
      .select("*")
      .eq("assigned_bde_id", user.id)
      .order("created_at", { ascending: false });

    setLeads((created || []) as Lead[]);
    setAssignedLeads((assigned || []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [user]);

  const resetForm = () => {
    setFormName(""); setFormPhone(""); setFormBranch(""); setFormCollege("");
    setFormYear(""); setFormCourse(""); setFormStatus("initial_contact");
    setFormLeadType("internship"); setFormReminder(""); setEditingLead(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingLead) {
        // Update existing lead status
        const updateData: any = { status: formStatus };
        if (formStatus === "re_initiate_call" && formReminder) {
          updateData.reminder_date = new Date(formReminder).toISOString();
        }
        const { error } = await supabase.from("leads").update(updateData).eq("id", editingLead.id);
        if (error) throw error;
        toast({ title: "Updated", description: "Lead status updated." });
      } else {
        // Create new lead
        const { error } = await supabase.from("leads").insert({
          name: formName, phone: formPhone, branch: formBranch,
          college_name: formCollege, year: formYear, course_interested: formCourse,
          status: formStatus, lead_type: formLeadType,
          created_by: user!.id, assigned_bde_id: user!.id,
          reminder_date: formStatus === "re_initiate_call" && formReminder ? new Date(formReminder).toISOString() : null,
        });
        if (error) throw error;
        toast({ title: "Created", description: "New lead added." });
      }
      resetForm();
      setDialogOpen(false);
      fetchLeads();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (lead: Lead) => {
    setEditingLead(lead);
    setFormName(lead.name);
    setFormPhone(lead.phone || "");
    setFormBranch(lead.branch || "");
    setFormCollege(lead.college_name || "");
    setFormYear(lead.year || "");
    setFormCourse(lead.course_interested || "");
    setFormStatus(lead.status);
    setFormLeadType(lead.lead_type);
    setFormReminder(lead.reminder_date ? lead.reminder_date.split("T")[0] : "");
    setDialogOpen(true);
  };

  if (role !== "bde") {
    return <DashboardLayout><div className="flex flex-col items-center justify-center py-12"><Shield className="mb-4 h-12 w-12 text-muted-foreground" /><h3>Access Denied</h3></div></DashboardLayout>;
  }

  // Merge assigned leads + created leads, deduplicate
  const allLeads = [...assignedLeads, ...leads].reduce((acc, lead) => {
    if (!acc.find(l => l.id === lead.id)) acc.push(lead);
    return acc;
  }, [] as Lead[]);

  const LeadsTable = ({ type }: { type: string }) => {
    const filtered = allLeads.filter(l => l.lead_type === type);
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leads</TableCell></TableRow>
            ) : (
              filtered.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.college_name || "-"}</TableCell>
                  <TableCell>{lead.phone || "-"}</TableCell>
                  <TableCell>{lead.course_interested || "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[lead.status] || ""} variant="outline">
                      {statusOptions.find(s => s.value === lead.status)?.label || lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(lead)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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
        <div className="flex items-center justify-between fade-in">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Leads Generated</h1>
            <p className="text-muted-foreground">Manage and create new leads.</p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Create Lead
          </Button>
        </div>

        <Tabs defaultValue="aicte" className="space-y-4">
          <TabsList>
            <TabsTrigger value="aicte">AICTE</TabsTrigger>
            <TabsTrigger value="internship">Internship</TabsTrigger>
          </TabsList>
          <TabsContent value="aicte"><Card><CardContent className="pt-6"><LeadsTable type="aicte" /></CardContent></Card></TabsContent>
          <TabsContent value="internship"><Card><CardContent className="pt-6"><LeadsTable type="internship" /></CardContent></Card></TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Update Lead Status" : "Create New Lead"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingLead && (
              <>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Lead name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Phone number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Input value={formBranch} onChange={e => setFormBranch(e.target.value)} placeholder="Branch" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>College</Label>
                    <Input value={formCollege} onChange={e => setFormCollege(e.target.value)} placeholder="College name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input value={formYear} onChange={e => setFormYear(e.target.value)} placeholder="Year" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Course Interested In</Label>
                  <Input value={formCourse} onChange={e => setFormCourse(e.target.value)} placeholder="Course" />
                </div>
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
              </>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {formStatus === "re_initiate_call" && (
              <div className="space-y-2">
                <Label>Reminder Date</Label>
                <Input type="date" value={formReminder} onChange={e => setFormReminder(e.target.value)} />
              </div>
            )}
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingLead ? "Update Status" : "Create Lead"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
