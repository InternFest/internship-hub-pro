import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, FolderKanban, Lock, Users, Crown, UserPlus, Search, LogIn } from "lucide-react";
import { z } from "zod";
import { projectSchema } from "@/lib/validations";

interface ProjectMember {
  id: string;
  user_id: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  lead_id: string;
  created_at: string;
  members: ProjectMember[];
  lead_profile?: {
    full_name: string;
    email: string;
  } | null;
}

export default function Projects() {
  const { user, studentStatus } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [isLead, setIsLead] = useState<boolean | null>(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResult, setSearchResult] = useState<{
    user_id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [joiningProject, setJoiningProject] = useState<string | null>(null);
  const [userBatchId, setUserBatchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchProjects = async () => {
    if (!user) return;

    try {
      // First get the user's batch_id
      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("batch_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const batchId = studentProfile?.batch_id;
      setUserBatchId(batchId);
      // Get projects where user is lead
      const { data: leadProjects, error: leadError } = await supabase
        .from("projects")
        .select("*")
        .eq("lead_id", user.id);

      if (leadError) throw leadError;

      // Get projects where user is a member
      const { data: membershipData, error: memberError } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      // Get projects from memberships
      const projectIds = membershipData?.map(m => m.project_id) || [];
      let memberProjects: any[] = [];
      if (projectIds.length > 0) {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .in("id", projectIds);
        if (!error) memberProjects = data || [];
      }

      // Combine and dedupe
      const allProjectIds = [...new Set([
        ...(leadProjects || []).map(p => p.id),
        ...memberProjects.map(p => p.id),
      ])];

      // Get all members for all projects
      let allMembers: any[] = [];
      if (allProjectIds.length > 0) {
        const { data } = await supabase
          .from("project_members")
          .select("id, user_id, project_id")
          .in("project_id", allProjectIds);
        allMembers = data || [];
      }

      // Get profiles for members
      const memberUserIds = [...new Set((allMembers || []).map(m => m.user_id))];
      let profilesData: any[] = [];
      if (memberUserIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url")
          .in("id", memberUserIds);
        profilesData = data || [];
      }

      // Build projects with members
      const allProjectsData = [...(leadProjects || []), ...memberProjects];
      const uniqueProjects = allProjectsData.reduce((acc: Project[], project) => {
        if (!acc.find((p) => p.id === project.id)) {
          const projectMembers = (allMembers || [])
            .filter(m => m.project_id === project.id)
            .map(m => ({
              id: m.id,
              user_id: m.user_id,
              profile: profilesData?.find(p => p.id === m.user_id) || null,
            }));
          acc.push({ ...project, members: projectMembers } as Project);
        }
        return acc;
      }, []);

      setProjects(uniqueProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProjects = async () => {
    if (!user || !userBatchId) return;

    try {
      // Get student profiles for users in the same batch to filter projects
      const { data: batchStudents } = await supabase
        .from("student_profiles")
        .select("user_id")
        .eq("batch_id", userBatchId);

      const batchUserIds = batchStudents?.map(s => s.user_id) || [];
      
      if (batchUserIds.length === 0) {
        setAllProjects([]);
        return;
      }

      // Get projects where lead is from the same batch
      const { data: projectsData, error } = await supabase
        .from("projects")
        .select("*")
        .in("lead_id", batchUserIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get all members
      const projectIds = projectsData?.map(p => p.id) || [];
      let allMembers: any[] = [];
      if (projectIds.length > 0) {
        const { data } = await supabase
          .from("project_members")
          .select("id, user_id, project_id")
          .in("project_id", projectIds);
        allMembers = data || [];
      }

      // Get lead profiles
      const leadIds = [...new Set(projectsData?.map(p => p.lead_id) || [])];
      let leadProfiles: any[] = [];
      if (leadIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", leadIds);
        leadProfiles = data || [];
      }

      // Filter out projects where user is already a member or lead
      const userProjectIds = new Set(allMembers.filter(m => m.user_id === user.id).map(m => m.project_id));
      
      const availableProjects = (projectsData || [])
        .filter(p => !userProjectIds.has(p.id) && p.lead_id !== user.id)
        .map(p => ({
          ...p,
          members: allMembers.filter(m => m.project_id === p.id),
          lead_profile: leadProfiles.find(lp => lp.id === p.lead_id) || null,
        }));

      setAllProjects(availableProjects as Project[]);
    } catch (error) {
      console.error("Error fetching all projects:", error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleCreateProject = async () => {
    if (!user) return;

    setErrors({});

    // Validate form
    try {
      projectSchema.parse({
        name: projectName,
        description: projectDescription,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setSaving(true);
    try {
      // Create project first
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          lead_id: user.id,
        })
        .select()
        .single();

      if (projectError) {
        console.error("Project creation error:", projectError);
        throw projectError;
      }

      if (!project) {
        throw new Error("Project was not created");
      }

      // Add lead as member after project is created
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: project.id,
          user_id: user.id,
        });

      if (memberError) {
        console.error("Member insert error:", memberError);
      }

      toast({
        title: "Success",
        description: "Project created successfully.",
      });

      setDialogOpen(false);
      setIsLead(null);
      setProjectName("");
      setProjectDescription("");
      fetchProjects();
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create project.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleJoinProject = async (projectId: string) => {
    if (!user) return;

    setJoiningProject(projectId);
    try {
      const { error } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "You have joined the project successfully!",
      });

      setJoinDialogOpen(false);
      fetchProjects();
      fetchAllProjects();
    } catch (error) {
      console.error("Error joining project:", error);
      toast({
        title: "Error",
        description: "Failed to join project.",
        variant: "destructive",
      });
    } finally {
      setJoiningProject(null);
    }
  };

  const handleSearchMember = async () => {
    if (!searchPhone) {
      toast({
        title: "Error",
        description: "Please enter a phone number.",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    setSearchResult(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("phone", searchPhone)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSearchResult({
          user_id: data.id,
          full_name: data.full_name,
          email: data.email,
        });
      } else {
        toast({
          title: "Not Found",
          description: "No user found with that phone number.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching member:", error);
      toast({
        title: "Error",
        description: "Failed to search for member.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedProjectId || !searchResult) return;

    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    if (project.members.length >= 5) {
      toast({
        title: "Error",
        description: "Maximum team size is 5 members.",
        variant: "destructive",
      });
      return;
    }

    if (project.members.find((m) => m.user_id === searchResult.user_id)) {
      toast({
        title: "Error",
        description: "This user is already a team member.",
        variant: "destructive",
      });
      return;
    }

    setAddingMember(true);
    try {
      const { error } = await supabase.from("project_members").insert({
        project_id: selectedProjectId,
        user_id: searchResult.user_id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member added successfully.",
      });

      setAddMemberDialogOpen(false);
      setSearchPhone("");
      setSearchResult(null);
      fetchProjects();
    } catch (error) {
      console.error("Error adding member:", error);
      toast({
        title: "Error",
        description: "Failed to add member.",
        variant: "destructive",
      });
    } finally {
      setAddingMember(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (studentStatus !== "approved") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12 fade-in">
          <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between fade-in">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Projects</h1>
            <p className="text-muted-foreground">Manage your team projects.</p>
          </div>

          <Button onClick={() => setConfirmOpen(true)} className="transition-smooth hover:scale-105">
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setIsLead(null);
              setProjectName("");
              setProjectDescription("");
              setErrors({});
            }
          }}>
            <DialogContent className="scale-in">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  You are creating a project as the team lead.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Title * (min 3 characters)</Label>
                  <Input
                    id="projectName"
                    placeholder="Enter project name..."
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Project Description (optional)</Label>
                  <Textarea
                    id="projectDescription"
                    placeholder="Describe your project..."
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Lead Confirmation Dialog */}
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent className="scale-in">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you the project lead?</AlertDialogTitle>
                <AlertDialogDescription>
                  As the project lead, you'll be able to add team members and manage the project.
                  Team size is limited to 5 members.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setConfirmOpen(false);
                  fetchAllProjects();
                  setJoinDialogOpen(true);
                }}>
                  No, I'm joining a team
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setConfirmOpen(false);
                  setIsLead(true);
                  setDialogOpen(true);
                }}>
                  Yes, I'm the lead
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Join Team Dialog */}
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto scale-in">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join a Team
                </DialogTitle>
                <DialogDescription>
                  Browse available projects and join a team.
                </DialogDescription>
              </DialogHeader>

              {allProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No Available Projects</h3>
                  <p className="text-muted-foreground text-center">
                    There are no projects available to join at the moment.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Team Lead</TableHead>
                        <TableHead>Team Size</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProjects.map((project, index) => (
                        <TableRow key={project.id} className="slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {project.id.slice(0, 8)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {project.description || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Crown className="h-3 w-3 text-primary" />
                              {project.lead_profile?.full_name || "Unknown"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {project.members?.length || 1}/5
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleJoinProject(project.id)}
                              disabled={joiningProject === project.id || (project.members?.length || 0) >= 5}
                              className="transition-smooth hover:scale-105"
                            >
                              {joiningProject === project.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <LogIn className="mr-1 h-3 w-3" />
                                  Join
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <Card className="slide-up">
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by project name or lead name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        {(() => {
          const filteredProjects = projects.filter(p => {
            if (!searchQuery.trim()) return true;
            const query = searchQuery.toLowerCase().trim();
            const leadName = p.members.find(m => m.user_id === p.lead_id)?.profile?.full_name?.toLowerCase() || "";
            return p.name.toLowerCase().includes(query) || 
                   (p.description?.toLowerCase().includes(query) || false) ||
                   leadName.includes(query);
          });

          return filteredProjects.length === 0 ? (
          <Card className="fade-in card-hover">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{searchQuery ? "No matching projects" : "No projects yet"}</h3>
              <p className="mb-4 text-muted-foreground">
                {searchQuery ? "Try adjusting your search." : "Create your first project or join an existing team."}
              </p>
              {!searchQuery && (
                <Button onClick={() => setConfirmOpen(true)} className="transition-smooth hover:scale-105">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProjects.map((project, index) => {
              const isLeader = project.lead_id === user?.id;
              return (
                <Card key={project.id} className="card-hover slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {project.name}
                          {isLeader && (
                            <Badge className="bg-primary/10 text-primary">
                              <Crown className="mr-1 h-3 w-3" />
                              Lead
                            </Badge>
                          )}
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Users className="h-4 w-4" />
                          Team Members ({project.members.length}/5)
                        </span>
                        {isLeader && project.members.length < 5 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProjectId(project.id);
                              setAddMemberDialogOpen(true);
                            }}
                            className="transition-smooth hover:scale-105"
                          >
                            <UserPlus className="mr-1 h-3 w-3" />
                            Add
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 rounded-lg border bg-muted/50 px-2 py-1 transition-smooth hover:bg-muted"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.profile?.avatar_url || ""} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(member.profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{member.profile?.full_name}</span>
                            {member.user_id === project.lead_id && (
                              <Crown className="h-3 w-3 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
        })()}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={(open) => {
        setAddMemberDialogOpen(open);
        if (!open) {
          setSearchPhone("");
          setSearchResult(null);
        }
      }}>
        <DialogContent className="scale-in">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Search for a team member by their phone number.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter phone number..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
              />
              <Button onClick={handleSearchMember} disabled={searching}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchResult && (
              <Card className="fade-in">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{searchResult.full_name}</p>
                    <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                  </div>
                  <Button onClick={handleAddMember} disabled={addingMember} className="transition-smooth hover:scale-105">
                    {addingMember ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-4 w-4" />
                        Add
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
