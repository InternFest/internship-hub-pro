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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SkeletonTable } from "@/components/SkeletonCard";
import { Shield, FolderKanban, Filter, Eye, Users } from "lucide-react";
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
}

const ITEMS_PER_PAGE = 20;

export default function AdminProjects() {
  const { role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (projectsError) throw projectsError;

        // Fetch batches
        const { data: batchesData, error: batchesError } = await supabase
          .from("batches")
          .select("id, name")
          .order("name");

        if (batchesError) throw batchesError;

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
        const projectsWithData = (projectsData || []).map(project => ({
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

        setProjects(projectsWithData as unknown as Project[]);
        setFilteredProjects(projectsWithData as unknown as Project[]);
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
    let result = projects;

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
    setCurrentPage(1); // Reset to first page on filter change
  }, [courseFilter, batchFilter, dateFilter, projects]);

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

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
          <h1 className="text-2xl font-bold md:text-3xl">Projects Management</h1>
          <p className="text-muted-foreground">View all student projects and team members.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 fade-in">
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-sm text-muted-foreground">Total Projects</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Users className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {projects.reduce((acc, p) => acc + p.members.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <FolderKanban className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(projects.reduce((acc, p) => acc + p.members.length, 0) / Math.max(projects.length, 1)).toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">Avg Team Size</p>
              </div>
            </CardContent>
          </Card>
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
              Showing {startIndex + 1}-{Math.min(endIndex, filteredProjects.length)} of {filteredProjects.length} project(s)
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
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Lead Name</TableHead>
                        <TableHead>Team Size</TableHead>
                        <TableHead className="text-right">Action</TableHead>
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
                              title="View Members"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Dialog - Project Members */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scale-in">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name}</DialogTitle>
            <DialogDescription>
              {selectedProject?.description || "No description provided"}
            </DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              {/* Project Lead Info */}
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">Project Lead</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="font-medium">{selectedProject.lead_profile?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="text-sm">{selectedProject.lead_profile?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <span>{selectedProject.lead_profile?.phone || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span>{format(parseISO(selectedProject.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Team Members ({selectedProject.members.length})
                </h4>
                <div className="space-y-2">
                  {selectedProject.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No team members yet.</p>
                  ) : (
                    selectedProject.members.map((member, idx) => (
                      <div
                        key={member.id}
                        className="rounded-lg border p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Candidate {idx + 1}</span>
                          {member.user_id === selectedProject.lead_id && (
                            <Badge variant="secondary" className="text-xs">Lead</Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Name</span>
                            <span className="font-medium">{member.profile?.full_name || "Unknown"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Email</span>
                            <span className="text-sm">{member.profile?.email || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Phone</span>
                            <span>{member.profile?.phone || "-"}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
