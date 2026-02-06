import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Shield, FolderKanban, Filter, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format, parseISO } from "date-fns";

interface ProjectMember {
  id: string;
  user_id: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  student_profile: {
    internship_role: string | null;
  } | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  lead_id: string;
  created_at: string;
  lead_profile: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  lead_student: {
    internship_role: string | null;
    batch_id: string | null;
  } | null;
  members: ProjectMember[];
}

interface Batch {
  id: string;
  name: string;
  assigned_faculty_id?: string | null;
}

const ITEMS_PER_PAGE = 20;

export default function AdminProjects() {
  const { role, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [facultyBatchIds, setFacultyBatchIds] = useState<string[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination logic
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [courseFilter, batchFilter, dateFilter, searchQuery]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch batches (only non-completed for filters)
        const { data: batchesData, error: batchesError } = await supabase
          .from("batches")
          .select("id, name, end_date, assigned_faculty_id")
          .gt("end_date", today)
          .order("name");

        if (batchesError) throw batchesError;

        // For faculty, filter batches to only those assigned to them
        let availableBatches = batchesData || [];
        let assignedBatchIds: string[] = [];
        
        if (role === "faculty" && user) {
          availableBatches = availableBatches.filter(b => b.assigned_faculty_id === user.id);
          assignedBatchIds = availableBatches.map(b => b.id);
          setFacultyBatchIds(assignedBatchIds);
        }
        
        setBatches(availableBatches);

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (projectsError) throw projectsError;

        // Fetch lead profiles and student profiles
        const leadIds = projectsData?.map(p => p.lead_id) || [];
        const [profilesRes, studentProfilesRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email, phone").in("id", leadIds),
          supabase.from("student_profiles").select("user_id, internship_role, batch_id").in("user_id", leadIds),
        ]);

        // Fetch project members
        const projectIds = projectsData?.map(p => p.id) || [];
        const { data: membersData } = await supabase
          .from("project_members")
          .select("id, user_id, project_id")
          .in("project_id", projectIds);

        // Fetch member profiles
        const memberUserIds = [...new Set((membersData || []).map(m => m.user_id))];
        const { data: memberProfilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", memberUserIds);

        const { data: memberStudentProfilesData } = await supabase
          .from("student_profiles")
          .select("user_id, internship_role")
          .in("user_id", memberUserIds);

        // Build projects with all data
        let projectsWithData = (projectsData || []).map(project => ({
          ...project,
          lead_profile: profilesRes.data?.find(p => p.id === project.lead_id) || null,
          lead_student: studentProfilesRes.data?.find(sp => sp.user_id === project.lead_id) || null,
          members: (membersData || [])
            .filter(m => m.project_id === project.id)
            .map(m => ({
              id: m.id,
              user_id: m.user_id,
              profile: memberProfilesData?.find(p => p.id === m.user_id) || null,
              student_profile: memberStudentProfilesData?.find(sp => sp.user_id === m.user_id) || null,
            })),
        }));

        // For faculty, filter projects to only those from their assigned batches
        if (role === "faculty" && assignedBatchIds.length > 0) {
          projectsWithData = projectsWithData.filter(
            p => p.lead_student?.batch_id && assignedBatchIds.includes(p.lead_student.batch_id)
          );
        } else if (role === "faculty" && assignedBatchIds.length === 0) {
          projectsWithData = [];
        }

        setProjects(projectsWithData as unknown as Project[]);
        setFilteredProjects(projectsWithData as unknown as Project[]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (role === "admin" || role === "faculty") {
      fetchData();
    }
  }, [role, user]);

  useEffect(() => {
    let result = projects;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.lead_profile?.full_name?.toLowerCase().includes(query)
      );
    }

    if (courseFilter !== "all") {
      result = result.filter((p) => p.lead_student?.internship_role === courseFilter);
    }

    if (batchFilter !== "all") {
      result = result.filter((p) => p.lead_student?.batch_id === batchFilter);
    }

    if (dateFilter) {
      result = result.filter((p) => p.created_at.startsWith(dateFilter));
    }

    setFilteredProjects(result);
  }, [courseFilter, batchFilter, dateFilter, searchQuery, projects]);

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "ai-ml":
        return "bg-purple-100 text-purple-700";
      case "java":
        return "bg-orange-100 text-orange-700";
      case "vlsi":
        return "bg-blue-100 text-blue-700";
      case "mern":
        return "bg-green-100 text-green-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Wait for auth to load before checking access
  if (authLoading) {
    return (
      <DashboardLayout>
        <SkeletonTable />
      </DashboardLayout>
    );
  }

  if (role !== "admin" && role !== "faculty") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
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
          <h1 className="text-2xl font-bold md:text-3xl">Project Teams</h1>
          <p className="text-muted-foreground">View all student projects and team members.</p>
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
                  placeholder="Search by project name, description, or lead name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    <SelectItem value="ai-ml">AI-ML</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="vlsi">VLSI</SelectItem>
                    <SelectItem value="mern">MERN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Batch</Label>
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
                <Label>Created Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              All Projects
            </CardTitle>
            <CardDescription>
              {filteredProjects.length} project(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 fade-in">
                <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground bounce-in" />
                <h3 className="text-lg font-semibold">No projects found</h3>
                <p className="text-muted-foreground">
                  No projects match your current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Project Lead</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Team Size</TableHead>
                      <TableHead className="text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProjects.map((project, index) => (
                      <TableRow key={project.id} className="slide-up transition-smooth hover:bg-muted/50" style={{ animationDelay: `${index * 0.03}s` }}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {project.description || "-"}
                          </p>
                        </TableCell>
                        <TableCell>{project.lead_profile?.full_name || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(project.lead_student?.internship_role)}>
                            {project.lead_student?.internship_role?.toUpperCase() || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.members.length} members</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProject(project);
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
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length} projects
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name}</DialogTitle>
            <DialogDescription>
              {selectedProject?.description || "No description provided"}
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Project Lead</span>
                  <span className="font-medium">
                    {selectedProject.lead_profile?.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Lead Email</span>
                  <span className="text-sm">{selectedProject.lead_profile?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Lead Phone</span>
                  <span>{selectedProject.lead_profile?.phone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span>
                    {format(parseISO(selectedProject.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Team Members ({selectedProject.members.length})
                </h4>
                <div className="space-y-2">
                  {selectedProject.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.profile?.full_name}</p>
                          {member.user_id === selectedProject.lead_id && (
                            <Badge variant="secondary" className="text-xs">Lead</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.profile?.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{member.profile?.phone || "-"}</p>
                        {member.student_profile?.internship_role && (
                          <Badge
                            className={`text-xs ${getRoleBadgeColor(member.student_profile.internship_role)}`}
                          >
                            {member.student_profile.internship_role.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
