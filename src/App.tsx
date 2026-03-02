import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/LoadingScreen";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import InternshipDiary from "./pages/InternshipDiary";
import LeaveRequests from "./pages/LeaveRequests";
import AdminQueries from "./pages/AdminQueries";
import Approvals from "./pages/Approvals";
import Projects from "./pages/Projects";
import StudentResources from "./pages/StudentResources";
import StudentCalendar from "./pages/StudentCalendar";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultyLeaveRequests from "./pages/faculty/FacultyLeaveRequests";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminFaculty from "./pages/admin/AdminFaculty";
import AdminBatches from "./pages/admin/AdminBatches";
import AdminDiaries from "./pages/admin/AdminDiaries";
import AdminLeaves from "./pages/admin/AdminLeaves";
import AdminQueriesManagement from "./pages/admin/AdminQueriesManagement";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminResources from "./pages/admin/AdminResources";
import AdminAssignments from "./pages/admin/AdminAssignments";
import AdminProgress from "./pages/admin/AdminProgress";
import AdminCalendar from "./pages/admin/AdminCalendar";
import StudentAssignments from "./pages/StudentAssignments";
import StudentProgress from "./pages/StudentProgress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen message="Authenticating..." />;
  if (!user) return <Navigate to="/auth?mode=login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    if (role === "faculty") return <Navigate to="/students" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function FacultyDashboardRedirect({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (role === "faculty") return <Navigate to="/students" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/dashboard" element={<ProtectedRoute><FacultyDashboardRedirect><Dashboard /></FacultyDashboardRedirect></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/diary" element={<ProtectedRoute><InternshipDiary /></ProtectedRoute>} />
      <Route path="/leaves" element={<ProtectedRoute><LeaveRequests /></ProtectedRoute>} />
      <Route path="/queries" element={<ProtectedRoute><AdminQueries /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><StudentResources /></ProtectedRoute>} />
      <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><StudentCalendar /></ProtectedRoute>} />
      <Route path="/assignments" element={<ProtectedRoute><StudentAssignments /></ProtectedRoute>} />
      <Route path="/my-progress" element={<ProtectedRoute><StudentProgress /></ProtectedRoute>} />

      {/* Shared admin/faculty routes */}
      <Route path="/students" element={<ProtectedRoute><AdminStudents /></ProtectedRoute>} />
      <Route path="/view-diaries" element={<ProtectedRoute><AdminDiaries /></ProtectedRoute>} />
      <Route path="/view-projects" element={<ProtectedRoute><AdminProjects /></ProtectedRoute>} />
      <Route path="/view-leaves" element={<ProtectedRoute><AdminLeaves /></ProtectedRoute>} />
      <Route path="/faculty-leaves" element={<ProtectedRoute><FacultyLeaveRequests /></ProtectedRoute>} />
      <Route path="/check-progress" element={<ProtectedRoute><AdminProgress /></ProtectedRoute>} />
      <Route path="/manage-calendar" element={<ProtectedRoute><AdminCalendar /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/faculty" element={<ProtectedRoute><AdminFaculty /></ProtectedRoute>} />
      <Route path="/batches" element={<ProtectedRoute><AdminBatches /></ProtectedRoute>} />
      <Route path="/admin-queries" element={<ProtectedRoute><AdminQueriesManagement /></ProtectedRoute>} />
      <Route path="/manage-resources" element={<ProtectedRoute><AdminResources /></ProtectedRoute>} />
      <Route path="/manage-assignments" element={<ProtectedRoute><AdminAssignments /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
