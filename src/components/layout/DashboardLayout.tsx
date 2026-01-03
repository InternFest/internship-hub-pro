import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  GraduationCap,
  LayoutDashboard,
  User,
  BookOpen,
  FolderKanban,
  CalendarOff,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  Shield,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  tooltip?: string;
}

const studentNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Profile", href: "/profile", icon: User },
  { title: "Internship Diary", href: "/diary", icon: BookOpen },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Leave Requests", href: "/leaves", icon: CalendarOff },
  { title: "Write to Admin", href: "/queries", icon: MessageSquare },
];

const facultyNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Students", href: "/students", icon: Users },
  { title: "Internship Diaries", href: "/view-diaries", icon: BookOpen },
  { title: "Projects", href: "/view-projects", icon: FolderKanban },
  { title: "Student Leaves", href: "/view-leaves", icon: CalendarOff },
  { title: "My Leave Requests", href: "/faculty-leaves", icon: CalendarOff },
];

const adminNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Approvals", href: "/approvals", icon: Shield },
  { title: "Students", href: "/students", icon: Users },
  { title: "Projects", href: "/view-projects", icon: FolderKanban },
  { title: "Faculty", href: "/faculty", icon: UserCog },
  { title: "Batches", href: "/batches", icon: GraduationCap },
  { title: "Diaries", href: "/view-diaries", icon: BookOpen },
  { title: "Leaves", href: "/view-leaves", icon: CalendarOff },
  { title: "Queries", href: "/admin-queries", icon: MessageSquare },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role, studentStatus, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
  } | null>(null);

  // Fetch user profile for avatar
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data) {
        setUserProfile(data);
      }
    };
    
    fetchProfile();
  }, [user]);

  // Get navigation items based on role
  const getNavItems = (): NavItem[] => {
    if (role === "admin") return adminNavItems;
    if (role === "faculty") return facultyNavItems;

    // For students, disable certain items if not approved
    if (role === "student") {
      return studentNavItems.map((item) => {
        if (studentStatus !== "approved" && !["Dashboard", "Profile"].includes(item.title)) {
          return { ...item, disabled: true, tooltip: "Available after approval" };
        }
        return item;
      });
    }

    return studentNavItems;
  };

  const navItems = getNavItems();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn("flex flex-col gap-1", mobile ? "p-4" : "p-3")}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        const NavLink = (
          <Link
            key={item.href}
            to={item.disabled ? "#" : item.href}
            onClick={() => mobile && setMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : item.disabled
                ? "cursor-not-allowed text-muted-foreground/50"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.title}</span>
            {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
          </Link>
        );

        if (item.disabled && item.tooltip) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{NavLink}</TooltipTrigger>
              <TooltipContent side="right">{item.tooltip}</TooltipContent>
            </Tooltip>
          );
        }

        return NavLink;
      })}
    </nav>
  );

  const MobileBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-lg md:hidden">
      <nav className="flex items-center justify-around py-2">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.disabled ? "#" : item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : item.disabled
                  ? "text-muted-foreground/40"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.title.split(" ")[0]}</span>
            </Link>
          );
        })}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 px-3 py-2 text-muted-foreground">
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <div className="border-b p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(userProfile?.full_name || user?.user_metadata?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium">{userProfile?.full_name || user?.user_metadata?.full_name || "User"}</p>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "mt-0.5 text-xs capitalize",
                      role === "admin" && "border-destructive/50 text-destructive",
                      role === "faculty" && "border-accent/50 text-accent",
                      role === "student" && "border-primary/50 text-primary"
                    )}
                  >
                    {role}
                  </Badge>
                </div>
              </div>
            </div>
            <NavContent mobile />
            <div className="absolute bottom-0 left-0 right-0 border-t p-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-card md:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">FEST Interns</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <NavContent />
        </div>

        {/* User section */}
        <div className="border-t p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userProfile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(userProfile?.full_name || user?.user_metadata?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">
                    {userProfile?.full_name || user?.user_metadata?.full_name || "User"}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "mt-0.5 text-xs capitalize",
                      role === "admin" && "border-destructive/50 text-destructive",
                      role === "faculty" && "border-accent/50 text-accent",
                      role === "student" && "border-primary/50 text-primary"
                    )}
                  >
                    {role}
                  </Badge>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur-lg md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">FEST Interns</span>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(userProfile?.full_name || user?.user_metadata?.full_name)}
            </AvatarFallback>
          </Avatar>
        </header>

        {/* Page Content */}
        <div className="container max-w-7xl py-6 pb-24 md:py-8 md:pb-8">{children}</div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </main>
    </div>
  );
}
