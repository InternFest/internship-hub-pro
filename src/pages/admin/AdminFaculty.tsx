import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkeletonTable } from "@/components/SkeletonCard";
import { Shield, UserCog } from "lucide-react";

interface FacultyMember {
  id: string;
  user_id: string;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export default function AdminFaculty() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select(`
            id,
            user_id,
            profile:profiles!user_roles_user_id_fkey (
              full_name,
              email,
              phone,
              avatar_url
            )
          `)
          .eq("role", "faculty");

        if (error) throw error;
        setFaculty((data as unknown as FacultyMember[]) || []);
      } catch (error) {
        console.error("Error fetching faculty:", error);
      } finally {
        setLoading(false);
      }
    };

    if (role === "admin") {
      fetchFaculty();
    }
  }, [role]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">
            Only administrators can access this page.
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
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Faculty Management</h1>
          <p className="text-muted-foreground">View all registered faculty members.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Faculty List
            </CardTitle>
            <CardDescription>
              {faculty.length} faculty member(s) registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {faculty.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <UserCog className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No faculty members</h3>
                <p className="text-muted-foreground">
                  No faculty members have been registered yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faculty Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faculty.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.profile?.avatar_url || ""} />
                              <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                                {getInitials(member.profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {member.profile?.full_name || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{member.profile?.email || "-"}</TableCell>
                        <TableCell>{member.profile?.phone || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
