import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Eye, Search } from "lucide-react";
import { format } from "date-fns";

type Row = {
  id: string;
  user_id: string;
  review_type: "review-1" | "review-2";
  full_name: string;
  usn: string;
  file_path: string;
  file_name: string;
  created_at: string;
  email?: string;
  phone?: string;
  college_name?: string;
  batch_name?: string;
};

export default function AdminReviewsGenerated() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"all" | "batch">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: gens } = await supabase
        .from("generated_reviews")
        .select("*")
        .order("created_at", { ascending: false });
      const list = (gens as any[]) || [];
      const userIds = Array.from(new Set(list.map((r) => r.user_id)));

      const [profilesRes, studentsRes, batchesRes] = await Promise.all([
        supabase.from("profiles").select("id, email, phone").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("student_profiles").select("user_id, college_name, batch_id").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase.from("batches").select("id, name"),
      ]);

      const profiles = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const students = new Map((studentsRes.data || []).map((s: any) => [s.user_id, s]));
      const batches = new Map((batchesRes.data || []).map((b: any) => [b.id, b.name]));

      const merged: Row[] = list.map((r: any) => {
        const p = profiles.get(r.user_id);
        const s = students.get(r.user_id);
        return {
          ...r,
          email: p?.email,
          phone: p?.phone,
          college_name: s?.college_name,
          batch_name: s?.batch_id ? batches.get(s.batch_id) : undefined,
        };
      });
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const colleges = useMemo(
    () => Array.from(new Set(rows.map((r) => r.college_name).filter(Boolean))) as string[],
    [rows]
  );
  const batches = useMemo(
    () => Array.from(new Set(rows.map((r) => r.batch_name).filter(Boolean))) as string[],
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.full_name} ${r.usn} ${r.email || ""} ${r.phone || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (collegeFilter !== "all" && r.college_name !== collegeFilter) return false;
      if (batchFilter !== "all" && r.batch_name !== batchFilter) return false;
      if (typeFilter !== "all" && r.review_type !== typeFilter) return false;
      return true;
    });
  }, [rows, search, collegeFilter, batchFilter, typeFilter]);

  const grouped = useMemo(() => {
    if (groupBy === "all") return [{ name: "All", rows: filtered }];
    const map = new Map<string, Row[]>();
    filtered.forEach((r) => {
      const key = r.batch_name || "No Batch";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).map(([name, rows]) => ({ name, rows }));
  }, [filtered, groupBy]);

  const download = async (r: Row) => {
    const { data, error } = await supabase.storage.from("generated-reviews").download(r.file_path);
    if (error || !data) { toast.error("Download failed"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = r.file_name; a.click();
    URL.revokeObjectURL(url);
  };

  const view = async (r: Row) => {
    const { data, error } = await supabase.storage.from("generated-reviews").download(r.file_path);
    if (error || !data) { toast.error("View failed"); return; }
    const url = URL.createObjectURL(data);
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews Generated</h1>
          <p className="text-muted-foreground">All review rubrics generated by interns.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, USN, email, mobile..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={collegeFilter} onValueChange={setCollegeFilter}>
              <SelectTrigger><SelectValue placeholder="College" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Colleges</SelectItem>
                {colleges.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Review Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="review-1">Review-1</SelectItem>
                <SelectItem value="review-2">Review-2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
              <SelectTrigger><SelectValue placeholder="Group By" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="batch">Batch-wise</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : grouped.map((g) => (
          <Card key={g.name}>
            {groupBy === "batch" && (
              <CardHeader><CardTitle className="text-base">{g.name} ({g.rows.length})</CardTitle></CardHeader>
            )}
            <CardContent className={groupBy === "batch" ? "" : "pt-6"}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>USN</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.rows.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No records</TableCell></TableRow>
                    ) : g.rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{r.usn}</TableCell>
                        <TableCell>{r.batch_name || "—"}</TableCell>
                        <TableCell>{r.college_name || "—"}</TableCell>
                        <TableCell>{r.email || "—"}</TableCell>
                        <TableCell>{r.phone || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{r.review_type === "review-1" ? "Review-1" : "Review-2"}</Badge></TableCell>
                        <TableCell>{format(new Date(r.created_at), "PP")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => view(r)}><Eye className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => download(r)}><Download className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
