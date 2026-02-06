import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Send,
} from "lucide-react";
import { useAuth } from "../../hooks";
import { useUIStore } from "../../stores/uiStore";
import { useI18n } from "../../i18n";

export function Sidebar() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { t } = useI18n();

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
    { to: "/contacts", icon: Users, label: t.nav.contacts },
    { to: "/campaigns", icon: Mail, label: t.nav.campaigns },
    { to: "/templates", icon: FileText, label: t.nav.templates },
    { to: "/analytics", icon: BarChart3, label: t.nav.analytics },
    { to: "/settings", icon: Settings, label: t.nav.settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-surface transition-all duration-300 ${
        sidebarOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Send className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-xl font-bold text-text">SuperSend</span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-text-muted hover:bg-surface-light hover:text-text"
        >
          <ChevronLeft
            className={`h-5 w-5 transition-transform ${
              sidebarOpen ? "" : "rotate-180"
            }`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-text-muted hover:bg-surface-light hover:text-text"
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-border p-4">
        {sidebarOpen && user && (
          <div className="mb-3 truncate text-sm">
            <p className="font-medium text-text">{user.displayName || t.common.user}</p>
            <p className="truncate text-text-muted">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-text-muted transition-colors hover:bg-error/10 hover:text-error"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {sidebarOpen && <span>{t.auth.signOut}</span>}
        </button>
      </div>
    </aside>
  );
}
