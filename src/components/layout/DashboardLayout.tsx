import { Outlet, Navigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../hooks";
import { useUIStore } from "../../stores/uiStore";
import { ToastContainer } from "../../hooks/useToast";
import { Loader2 } from "lucide-react";

export function DashboardLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { sidebarOpen } = useUIStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to verify-email if not verified
  if (user && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={`min-h-screen transition-all duration-300 ${
          sidebarOpen ? "lg:pl-64" : "lg:pl-20"
        }`}
      >
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
