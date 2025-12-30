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
import { SkeletonTable } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, FolderKanban, Lock, Users, Crown, UserPlus, Search } from "lucide-react";

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
}

export default function Projects() {
  const { user, studentStatus } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  // Form state
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const fetchProjects = async () => {
    if (!user) return;

    try {
      // Get projects where user is lead
      const { data: leadProjects, error: leadError } = await supabase
        .from("projects")
        .select(`
          *,
          members:project_members (
            id,
            user_id,
            profile:profiles!project_members_user_id_fkey (full_name, email, phone, avatar_url)
          )
        `)
        .eq("lead_id", user.id);

      if (leadError) throw leadError;

      // Get projects where user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from("project_members")
        .select(`
          project:projects (
            *,
            members:project_members (
              id,
              user_id,
              profile:profiles!project_members_user_id_fkey (full_name, email, phone, avatar_url)
            )
          )
        `)
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      const allProjects = [
        ...(leadProjects || []),
        ...((memberProjects || []).map((m: any) => m.project).filter(Boolean)),
      ];

      // Remove duplicates
      const uniqueProjects = allProjects.reduce((acc: Project[], project) => {
        if (!acc.find((p) => p.id === project.id)) {
          acc.push(project as Project);
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

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleCreateProject = async () => {
    if (!user || !projectName) {
      toast({
        title: "Error",
        description: "Please provide a project name.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Create project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          description: projectDescription || null,
          lead_id: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Add lead as member
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: project.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      toast({
        title: "Success",
        description: "Project created successfully.",
      });

      setDialogOpen(false);
      setIsLead(null);
      setProjectName("");
      setProjectDescription("");
      fetchProjects();
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
        <div className="flex flex-col items-center justify-center py-12">
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Projects</h1>
            <p className="text-muted-foreground">Manage your team projects.</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setIsLead(null);
              setProjectName("");
              setProjectDescription("");
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setConfirmOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  You are creating a project as the team lead.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Title *</Label>
                  <Input
                    id="projectName"
                    placeholder="Enter project name..."
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Project Description</Label>
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
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you the project lead?</AlertDialogTitle>
                <AlertDialogDescription>
                  As the project lead, you'll be able to add team members and manage the project.
                  Team size is limited to 5 members.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No, I'm joining a team</AlertDialogCancel>
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
        </div>

        {/* Projects List */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No projects yet</h3>
              <p className="mb-4 text-muted-foreground">
                Create your first project or join an existing team.
              </p>
              <Button onClick={() => setConfirmOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const isLeader = project.lead_id === user?.id;
              return (
                <Card key={project.id}>
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
                            className="flex items-center gap-2 rounded-lg border bg-muted/50 px-2 py-1"
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
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={(open) => {
        setAddMemberDialogOpen(open);
        if (!open) {
          setSearchPhone("");
          setSearchResult(null);
        }
      }}>
        <DialogContent>
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
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{searchResult.full_name}</p>
                    <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                  </div>
                  <Button onClick={handleAddMember} disabled={addingMember}>
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
