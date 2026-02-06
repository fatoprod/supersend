import { useState } from "react";
import { Header } from "../components/layout";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input } from "../components/ui";
import { useAuth, useToast, useSettings, useUpdateSettings, useChangePassword } from "../hooks";
import { Save, User, Mail, Key, Bell, Shield, Globe, Loader2 } from "lucide-react";
import { useI18n } from "../i18n";

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, locale, setLocale } = useI18n();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const changePasswordMutation = useChangePassword();
  const [activeTab, setActiveTab] = useState("profile");

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [defaultFromName, setDefaultFromName] = useState("");
  const [defaultFromEmail, setDefaultFromEmail] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [unsubscribeLinkText, setUnsubscribeLinkText] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifications, setNotifications] = useState({
    campaignCompleted: true,
    newSubscriber: true,
    weeklyDigest: true,
    productUpdates: true,
  });
  const [initialized, setInitialized] = useState(false);

  // Initialize form with settings data
  if (settings && !initialized) {
    setDisplayName(settings.displayName || user?.displayName || "");
    setDefaultFromName(settings.defaultFromName || "SuperSend");
    setDefaultFromEmail(settings.defaultFromEmail || "noreply@supersend.app");
    setReplyToEmail(settings.replyToEmail || "");
    setUnsubscribeLinkText(settings.unsubscribeLinkText || "Unsubscribe");
    if (settings.notifications) {
      setNotifications(settings.notifications);
    }
    setInitialized(true);
  }

  const tabs = [
    { id: "profile", label: t.settings.profile, icon: User },
    { id: "email", label: t.settings.emailSettings, icon: Mail },
    { id: "security", label: t.settings.security, icon: Shield },
    { id: "notifications", label: t.settings.notifications, icon: Bell },
    { id: "api", label: t.settings.apiKeys, icon: Key },
  ];

  const handleSaveProfile = async () => {
    try {
      await updateSettings.mutateAsync({ displayName });
      toast.success(t.settings.settingsSaved, t.settings.changesSaved);
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleSaveEmail = async () => {
    try {
      await updateSettings.mutateAsync({
        defaultFromName,
        defaultFromEmail,
        replyToEmail,
        unsubscribeLinkText,
      });
      toast.success(t.settings.settingsSaved, t.settings.changesSaved);
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateSettings.mutateAsync({ notifications });
      toast.success(t.settings.settingsSaved, t.settings.changesSaved);
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title={t.settings.title} subtitle={t.settings.subtitle} />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={t.settings.title} subtitle={t.settings.subtitle} />

      <div className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary text-white"
                          : "text-text-muted hover:bg-surface-light hover:text-text"
                      }`}
                    >
                      <tab.icon className="h-5 w-5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === "profile" && (
              <>
              <Card>
                <CardHeader>
                  <CardTitle>{t.settings.profileInfo}</CardTitle>
                  <CardDescription>
                    {t.settings.updateProfileDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 overflow-hidden rounded-full bg-primary/20">
                        {user?.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || t.common.user}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label={t.settings.displayName}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t.settings.yourName}
                      />
                      <Input
                        label={t.settings.emailLabel}
                        type="email"
                        defaultValue={user?.email || ""}
                        disabled
                        helperText={t.settings.emailCannotChange}
                      />
                    </div>

                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {t.settings.saveChanges}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Language Card */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {t.settings.language}
                  </CardTitle>
                  <CardDescription>
                    {t.settings.languageDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setLocale("pt-BR")}
                      className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors ${
                        locale === "pt-BR"
                          ? "border-primary bg-primary/5 text-text"
                          : "border-border text-text-muted hover:border-primary/50 hover:text-text"
                      }`}
                    >
                      <span className="font-medium">{"Português (Brasil)"}</span>
                    </button>
                    <button
                      onClick={() => setLocale("en")}
                      className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors ${
                        locale === "en"
                          ? "border-primary bg-primary/5 text-text"
                          : "border-border text-text-muted hover:border-primary/50 hover:text-text"
                      }`}
                    >
                      <span className="font-medium">English</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
              </>
            )}

            {activeTab === "email" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.settings.emailSettingsTitle}</CardTitle>
                  <CardDescription>
                    {t.settings.emailSettingsDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveEmail(); }}>
                    <Input
                      label={t.settings.defaultFromName}
                      placeholder={t.settings.defaultFromNamePlaceholder}
                      value={defaultFromName}
                      onChange={(e) => setDefaultFromName(e.target.value)}
                    />
                    <Input
                      label={t.settings.defaultFromEmail}
                      type="email"
                      placeholder={t.settings.defaultFromEmailPlaceholder}
                      value={defaultFromEmail}
                      onChange={(e) => setDefaultFromEmail(e.target.value)}
                    />
                    <Input
                      label={t.settings.replyToEmail}
                      type="email"
                      placeholder={t.settings.replyToEmailPlaceholder}
                      value={replyToEmail}
                      onChange={(e) => setReplyToEmail(e.target.value)}
                    />
                    <Input
                      label={t.settings.unsubscribeLinkText}
                      placeholder={t.settings.unsubscribeLinkPlaceholder}
                      value={unsubscribeLinkText}
                      onChange={(e) => setUnsubscribeLinkText(e.target.value)}
                    />

                    <Button type="submit" disabled={updateSettings.isPending}>
                      {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {t.settings.saveChanges}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === "security" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.settings.securityTitle}</CardTitle>
                  <CardDescription>
                    {t.settings.securityDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
                    <Input
                      label={t.settings.currentPassword}
                      type="password"
                      placeholder={t.settings.currentPasswordPlaceholder}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Input
                      label={t.settings.newPassword}
                      type="password"
                      placeholder={t.settings.newPasswordPlaceholder}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Input
                      label={t.settings.confirmNewPassword}
                      type="password"
                      placeholder={t.settings.confirmNewPasswordPlaceholder}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    <Button type="submit" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {t.settings.updatePassword}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.settings.notificationPreferences}</CardTitle>
                  <CardDescription>
                    {t.settings.notificationDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {([
                      { key: "campaignCompleted" as const, label: t.settings.campaignCompleted, description: t.settings.campaignCompletedDesc },
                      { key: "newSubscriber" as const, label: t.settings.newSubscriber, description: t.settings.newSubscriberDesc },
                      { key: "weeklyDigest" as const, label: t.settings.weeklyDigest, description: t.settings.weeklyDigestDesc },
                      { key: "productUpdates" as const, label: t.settings.productUpdates, description: t.settings.productUpdatesDesc },
                    ]).map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                          <p className="font-medium text-text">{item.label}</p>
                          <p className="text-sm text-text-muted">{item.description}</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={notifications[item.key]}
                            onChange={(e) => setNotifications((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                            className="peer sr-only"
                          />
                          <div className="peer h-6 w-11 rounded-full bg-surface-light after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-text-muted after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:bg-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20"></div>
                        </label>
                      </div>
                    ))}

                    <Button onClick={handleSaveNotifications} disabled={updateSettings.isPending}>
                      {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      {t.settings.savePreferences}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "api" && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.settings.apiKeysTitle}</CardTitle>
                  <CardDescription>
                    {t.settings.apiKeysDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text">{t.settings.productionApiKey}</p>
                          <p className="mt-1 font-mono text-sm text-text-muted">
                            sk_live_••••••••••••••••
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm">
                            {t.common.copy}
                          </Button>
                          <Button variant="ghost" size="sm">
                            {t.settings.regenerate}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text">{t.settings.testApiKey}</p>
                          <p className="mt-1 font-mono text-sm text-text-muted">
                            sk_test_••••••••••••••••
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm">
                            {t.common.copy}
                          </Button>
                          <Button variant="ghost" size="sm">
                            {t.settings.regenerate}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button>
                      {t.settings.generateNewApiKey}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
