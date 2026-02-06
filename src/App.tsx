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
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import InternshipDiary from "./pages/InternshipDiary";
import LeaveRequests from "./pages/LeaveRequests";
import AdminQueries from "./pages/AdminQueries";
import Approvals from "./pages/Approvals";
import Projects from "./pages/Projects";
import StudentResources from "./pages/StudentResources";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    // Redirect faculty to students page instead of dashboard
    if (role === "faculty") {
      return <Navigate to="/students" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Faculty Dashboard Redirect wrapper
function FacultyDashboardRedirect({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (role === "faculty") {
    return <Navigate to="/students" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <FacultyDashboardRedirect>
              <Dashboard />
            </FacultyDashboardRedirect>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diary"
        element={
          <ProtectedRoute>
            <InternshipDiary />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves"
        element={
          <ProtectedRoute>
            <LeaveRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/queries"
        element={
          <ProtectedRoute>
            <AdminQueries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources"
        element={
          <ProtectedRoute>
            <StudentResources />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <Approvals />
          </ProtectedRoute>
        }
      />

      {/* Students route - shared by admin and faculty */}
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <AdminStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/view-diaries"
        element={
          <ProtectedRoute>
            <AdminDiaries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/view-projects"
        element={
          <ProtectedRoute>
            <AdminProjects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/view-leaves"
        element={
          <ProtectedRoute>
            <AdminLeaves />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty-leaves"
        element={
          <ProtectedRoute>
            <FacultyLeaveRequests />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute>
            <AdminFaculty />
          </ProtectedRoute>
        }
      />
      <Route
        path="/batches"
        element={
          <ProtectedRoute>
            <AdminBatches />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-queries"
        element={
          <ProtectedRoute>
            <AdminQueriesManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-resources"
        element={
          <ProtectedRoute>
            <AdminResources />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
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
