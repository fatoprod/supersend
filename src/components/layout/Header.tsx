import { Menu, Bell, Search, Globe } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useAuth } from "../../hooks";
import { useI18n } from "../../i18n";
import type { Locale } from "../../i18n/types";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { toggleSidebar } = useUIStore();
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const localeLabels: Record<Locale, string> = {
    "pt-BR": "PT",
    en: "EN",
  };

  const toggleLocale = () => {
    setLocale(locale === "pt-BR" ? "en" : "pt-BR");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-text lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text">{title}</h1>
            {subtitle && (
              <p className="text-sm text-text-muted">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={t.common.search}
              className="w-64 rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Notifications */}
          <button className="relative rounded-lg p-2 text-text-muted hover:bg-surface hover:text-text">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text"
            title={t.settings.language}
          >
            <Globe className="h-4 w-4" />
            <span>{localeLabels[locale]}</span>
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-primary/20">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || t.common.user}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-primary">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
