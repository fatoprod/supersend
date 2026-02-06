import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks";
import { ToastContainer } from "../../hooks/useToast";
import { Loader2, Send } from "lucide-react";

export function AuthLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to dashboard if already authenticated and verified
  if (isAuthenticated && user?.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Send className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-text">SuperSend</span>
      </div>
      
      <Outlet />
      
      <ToastContainer />
    </div>
  );
}
