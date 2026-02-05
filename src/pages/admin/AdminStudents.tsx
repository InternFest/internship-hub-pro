import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkeletonTable } from "@/components/SkeletonCard";
import { Shield, Users, Filter, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format, parseISO } from "date-fns";

interface Student {
  id: string;
  user_id: string;
  student_id: string | null;
  usn: string | null;
  internship_role: string | null;
  skill_level: string | null;
  status: string | null;
  college_name: string | null;
  branch: string | null;
  batch_id: string | null;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    date_of_birth: string | null;
    bio: string | null;
    linkedin_url: string | null;
    resume_url: string | null;
  } | null;
}

interface Batch {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 20;

export default function AdminStudents() {
  const { role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("approved");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [batchFilter, statusFilter, searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student profiles
        const { data: studentsData, error: studentsError } = await supabase
          .from("student_profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (studentsError) throw studentsError;

        // Fetch profiles for all students
        const userIds = studentsData?.map(s => s.user_id) || [];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url, date_of_birth, bio, linkedin_url, resume_url")
          .in("id", userIds);

        // Fetch batches
        const { data: batchesData, error: batchesError } = await supabase
          .from("batches")
          .select("id, name")
          .order("name");

        if (batchesError) throw batchesError;

        // Merge data
        const studentsWithProfiles = (studentsData || []).map(student => ({
          ...student,
          profile: profilesData?.find(p => p.id === student.user_id) || null,
        }));

        setStudents(studentsWithProfiles as unknown as Student[]);
        setFilteredStudents(studentsWithProfiles as unknown as Student[]);
        setBatches(batchesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (role === "admin" || role === "faculty") {
      fetchData();
    }
  }, [role]);

  useEffect(() => {
    let result = students;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((s) => 
        s.profile?.full_name?.toLowerCase().includes(query) ||
        s.profile?.email?.toLowerCase().includes(query) ||
        s.profile?.phone?.includes(query) ||
        s.student_id?.toLowerCase().includes(query) ||
        s.usn?.toLowerCase().includes(query)
      );
    }

    // Filter by batch using batch_id
    if (batchFilter !== "all") {
      result = result.filter((s) => s.batch_id === batchFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    setFilteredStudents(result);
  }, [batchFilter, statusFilter, searchQuery, students]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success/10 text-success">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning">Pending</Badge>;
    }
  };

  // Calculate stats
  const totalStudents = students.length;
  const approvedCount = students.filter((s) => s.status === "approved").length;
  const pendingCount = students.filter((s) => s.status === "pending").length;
  
  // Batch stats based on batch_id
  const batchStats = batches.map((batch) => ({
    name: batch.name,
    count: students.filter((s) => s.batch_id === batch.id).length,
  }));

  // Wait for auth to load before checking access
  if (authLoading) {
    return (
      <DashboardLayout>
        <SkeletonTable />
      </DashboardLayout>
    );
  }

  // Allow both admin and faculty roles
  const hasAccess = role === "admin" || role === "faculty";
  
  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">
            Only administrators and faculty can access this page.
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
          <h1 className="text-2xl font-bold md:text-3xl">Students Management</h1>
          <p className="text-muted-foreground">View and manage all students.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 fade-in">
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStudents}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Users className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          {batchStats.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground">Batch-wise</p>
                <div className="mt-2 space-y-1">
                  {batchStats.slice(0, 3).map((stat) => (
                    <div key={stat.name} className="flex justify-between text-sm">
                      <span>{stat.name}</span>
                      <span className="font-medium">{stat.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters */}
        <Card className="slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, student ID, or USN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Batch (Internship Role)</Label>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Students
            </CardTitle>
            <CardDescription>
              {filteredStudents.length} student(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No students found</h3>
                <p className="text-muted-foreground">
                  No students match your current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student, index) => (
                      <TableRow key={student.id} className="slide-up transition-smooth hover:bg-muted/50" style={{ animationDelay: `${index * 0.03}s` }}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profile?.avatar_url || ""} />
                              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                                {getInitials(student.profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {student.profile?.full_name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {student.student_id || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>{student.profile?.email || "-"}</TableCell>
                        <TableCell>{student.profile?.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {batches.find(b => b.id === student.batch_id)?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of {filteredStudents.length} students
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scale-in">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>Complete student profile information</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedStudent.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                    {getInitials(selectedStudent.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedStudent.profile?.full_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.profile?.email}
                  </p>
                  {getStatusBadge(selectedStudent.status)}
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student ID</span>
                  <span className="font-mono font-medium">
                    {selectedStudent.student_id || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">USN</span>
                  <span className="font-mono">{selectedStudent.usn || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span>{selectedStudent.profile?.phone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date of Birth</span>
                  <span>
                    {selectedStudent.profile?.date_of_birth
                      ? format(parseISO(selectedStudent.profile.date_of_birth), "MMM d, yyyy")
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Batch</span>
                  <Badge variant="secondary">
                    {batches.find(b => b.id === selectedStudent.batch_id)?.name || "N/A"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Skill Level</span>
                  <span className="capitalize">{selectedStudent.skill_level || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">College</span>
                  <span>{selectedStudent.college_name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Branch</span>
                  <span>{selectedStudent.branch || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Registered</span>
                  <span>
                    {format(parseISO(selectedStudent.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              {selectedStudent.profile?.bio && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Bio</h4>
                  <p className="mt-1 text-sm">{selectedStudent.profile.bio}</p>
                </div>
              )}

              {selectedStudent.profile?.linkedin_url && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">LinkedIn</h4>
                  <a
                    href={selectedStudent.profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-primary hover:underline"
                  >
                    {selectedStudent.profile.linkedin_url}
                  </a>
                </div>
              )}

              {selectedStudent.profile?.resume_url && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Resume</h4>
                  <Button
                    variant="link"
                    className="mt-1 h-auto p-0 text-sm text-primary hover:underline"
                    onClick={async () => {
                      if (!selectedStudent.profile?.resume_url) return;
                      try {
                        const { data, error } = await supabase.storage
                          .from("resumes")
                          .createSignedUrl(selectedStudent.profile.resume_url, 60 * 60);
                        if (error) throw error;
                        if (data?.signedUrl) {
                          window.open(data.signedUrl, "_blank");
                        }
                      } catch (err) {
                        console.error("Error getting resume URL:", err);
                      }
                    }}
                  >
                    View Resume
                  </Button>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
