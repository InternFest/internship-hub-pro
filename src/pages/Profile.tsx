import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonProfile } from "@/components/SkeletonCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Save, User } from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
}

interface StudentProfileData {
  student_id: string | null;
  usn: string | null;
  college_name: string | null;
  branch: string | null;
  internship_role: string | null;
  skill_level: string | null;
  status: string | null;
}

export default function Profile() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: null,
    date_of_birth: null,
    bio: null,
    avatar_url: null,
    linkedin_url: null,
    resume_url: null,
  });

  const [studentProfile, setStudentProfile] = useState<StudentProfileData>({
    student_id: null,
    usn: null,
    college_name: null,
    branch: null,
    internship_role: null,
    skill_level: null,
    status: null,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        // Fetch main profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          setProfile({
            full_name: profileData.full_name || "",
            email: profileData.email || "",
            phone: profileData.phone,
            date_of_birth: profileData.date_of_birth,
            bio: profileData.bio,
            avatar_url: profileData.avatar_url,
            linkedin_url: profileData.linkedin_url,
            resume_url: profileData.resume_url,
          });
        }

        // Fetch student profile if role is student
        if (role === "student") {
          const { data: studentData, error: studentError } = await supabase
            .from("student_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (studentError) throw studentError;

          if (studentData) {
            setStudentProfile({
              student_id: studentData.student_id,
              usn: studentData.usn,
              college_name: studentData.college_name,
              branch: studentData.branch,
              internship_role: studentData.internship_role,
              skill_level: studentData.skill_level,
              status: studentData.status,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, role, toast]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update main profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          bio: profile.bio,
          linkedin_url: profile.linkedin_url,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update student profile if role is student
      if (role === "student") {
        const { error: studentError } = await supabase
          .from("student_profiles")
          .update({
            usn: studentProfile.usn,
            college_name: studentProfile.college_name,
            branch: studentProfile.branch,
            internship_role: studentProfile.internship_role as any,
            skill_level: studentProfile.skill_level as any,
          })
          .eq("user_id", user.id);

        if (studentError) throw studentError;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast({
        title: "Success",
        description: "Profile photo updated.",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: "Failed to upload photo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/resume.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      // Update profile with new resume URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ resume_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, resume_url: publicUrl }));
      toast({
        title: "Success",
        description: "Resume uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast({
        title: "Error",
        description: "Failed to upload resume.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "approved":
        return "bg-success/10 text-success";
      case "rejected":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-warning/10 text-warning";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <SkeletonProfile />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and settings.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Avatar & Status */}
          <Card>
            <CardContent className="flex flex-col items-center pt-6">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>

              <h3 className="text-lg font-semibold">{profile.full_name}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>

              {role === "student" && (
                <div className="mt-4 w-full space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-sm text-muted-foreground">Student ID</span>
                    <span className="font-mono font-semibold text-primary">
                      {studentProfile.student_id || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(studentProfile.status)}>
                      {studentProfile.status || "Pending"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profile.email} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/..."
                    value={profile.linkedin_url || ""}
                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                />
              </div>

              {role === "student" && (
                <>
                  <div className="border-t pt-6">
                    <h4 className="mb-4 font-semibold">Academic Information</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="usn">USN</Label>
                        <Input
                          id="usn"
                          value={studentProfile.usn || ""}
                          onChange={(e) =>
                            setStudentProfile({ ...studentProfile, usn: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="college">College Name</Label>
                        <Input
                          id="college"
                          value={studentProfile.college_name || ""}
                          onChange={(e) =>
                            setStudentProfile({ ...studentProfile, college_name: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="branch">Branch</Label>
                        <Input
                          id="branch"
                          value={studentProfile.branch || ""}
                          onChange={(e) =>
                            setStudentProfile({ ...studentProfile, branch: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="internshipRole">Internship Role</Label>
                        <Select
                          value={studentProfile.internship_role || ""}
                          onValueChange={(value) =>
                            setStudentProfile({ ...studentProfile, internship_role: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ai-ml">AI-ML</SelectItem>
                            <SelectItem value="java">Java</SelectItem>
                            <SelectItem value="vlsi">VLSI</SelectItem>
                            <SelectItem value="mern">MERN</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="skillLevel">Skill Level</Label>
                        <Select
                          value={studentProfile.skill_level || ""}
                          onValueChange={(value) =>
                            setStudentProfile({ ...studentProfile, skill_level: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="mb-4 font-semibold">Resume</h4>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        disabled={uploading}
                      />
                      {profile.resume_url && (
                        <a
                          href={profile.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View current
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
