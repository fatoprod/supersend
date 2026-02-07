import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthLayout, DashboardLayout } from "./components/layout";
import { Loader2 } from "lucide-react";
import { useI18n } from "./i18n";

// Lazy load pages for better performance
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const ContactListsPage = lazy(() => import("./pages/ContactListsPage").then(m => ({ default: m.ContactListsPage })));
const ListContactsPage = lazy(() => import("./pages/ListContactsPage").then(m => ({ default: m.ListContactsPage })));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage").then(m => ({ default: m.CampaignsPage })));
const CampaignEditorPage = lazy(() => import("./pages/CampaignEditorPage").then(m => ({ default: m.CampaignEditorPage })));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage").then(m => ({ default: m.TemplatesPage })));
const TemplateEditorPage = lazy(() => import("./pages/TemplateEditorPage").then(m => ({ default: m.TemplateEditorPage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const LoginPage = lazy(() => import("./pages/auth/LoginPage").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage").then(m => ({ default: m.RegisterPage })));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage").then(m => ({ default: m.VerifyEmailPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-text">{t.notFound.title}</h1>
        <p className="mt-4 text-text-muted">{t.notFound.message}</p>
        <a href="/dashboard" className="mt-6 inline-block text-primary hover:underline">
          {t.notFound.goToDashboard}
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>} />
            <Route path="/verify-email" element={<Suspense fallback={<PageLoader />}><VerifyEmailPage /></Suspense>} />
          </Route>

          {/* Dashboard Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
            <Route path="/contacts" element={<Suspense fallback={<PageLoader />}><ContactListsPage /></Suspense>} />
            <Route path="/contacts/:listId" element={<Suspense fallback={<PageLoader />}><ListContactsPage /></Suspense>} />
            <Route path="/campaigns" element={<Suspense fallback={<PageLoader />}><CampaignsPage /></Suspense>} />
            <Route path="/campaigns/new" element={<Suspense fallback={<PageLoader />}><CampaignEditorPage /></Suspense>} />
            <Route path="/campaigns/:campaignId/edit" element={<Suspense fallback={<PageLoader />}><CampaignEditorPage /></Suspense>} />
            <Route path="/templates" element={<Suspense fallback={<PageLoader />}><TemplatesPage /></Suspense>} />
            <Route path="/templates/new" element={<Suspense fallback={<PageLoader />}><TemplateEditorPage /></Suspense>} />
            <Route path="/templates/:templateId/edit" element={<Suspense fallback={<PageLoader />}><TemplateEditorPage /></Suspense>} />
            <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
