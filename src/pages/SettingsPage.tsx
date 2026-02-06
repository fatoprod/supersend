import { useState } from "react";
import { Header } from "../components/layout";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input } from "../components/ui";
import { useAuth, useToast } from "../hooks";
import { Save, User, Mail, Key, Bell, Shield, Globe } from "lucide-react";
import { useI18n } from "../i18n";

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, locale, setLocale } = useI18n();
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: t.settings.profile, icon: User },
    { id: "email", label: t.settings.emailSettings, icon: Mail },
    { id: "security", label: t.settings.security, icon: Shield },
    { id: "notifications", label: t.settings.notifications, icon: Bell },
    { id: "api", label: t.settings.apiKeys, icon: Key },
  ];

  const handleSave = () => {
    toast.success(t.settings.settingsSaved, t.settings.changesSaved);
  };

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
                  <form className="space-y-4">
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
                      <div>
                        <Button variant="secondary" size="sm">
                          {t.settings.changePhoto}
                        </Button>
                        <p className="mt-2 text-xs text-text-muted">
                          {t.settings.photoHelp}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label={t.settings.displayName}
                        defaultValue={user?.displayName || ""}
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

                    <Button onClick={handleSave}>
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
                  <form className="space-y-4">
                    <Input
                      label={t.settings.defaultFromName}
                      placeholder={t.settings.defaultFromNamePlaceholder}
                      defaultValue="SuperSend"
                    />
                    <Input
                      label={t.settings.defaultFromEmail}
                      type="email"
                      placeholder={t.settings.defaultFromEmailPlaceholder}
                      defaultValue="noreply@supersend.app"
                    />
                    <Input
                      label={t.settings.replyToEmail}
                      type="email"
                      placeholder={t.settings.replyToEmailPlaceholder}
                    />
                    <Input
                      label={t.settings.unsubscribeLinkText}
                      placeholder={t.settings.unsubscribeLinkPlaceholder}
                      defaultValue={t.settings.unsubscribe}
                    />

                    <Button onClick={handleSave}>
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
                  <form className="space-y-4">
                    <Input
                      label={t.settings.currentPassword}
                      type="password"
                      placeholder={t.settings.currentPasswordPlaceholder}
                    />
                    <Input
                      label={t.settings.newPassword}
                      type="password"
                      placeholder={t.settings.newPasswordPlaceholder}
                    />
                    <Input
                      label={t.settings.confirmNewPassword}
                      type="password"
                      placeholder={t.settings.confirmNewPasswordPlaceholder}
                    />

                    <Button onClick={handleSave}>
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
                    {[
                      { label: t.settings.campaignCompleted, description: t.settings.campaignCompletedDesc },
                      { label: t.settings.newSubscriber, description: t.settings.newSubscriberDesc },
                      { label: t.settings.weeklyDigest, description: t.settings.weeklyDigestDesc },
                      { label: t.settings.productUpdates, description: t.settings.productUpdatesDesc },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                          <p className="font-medium text-text">{item.label}</p>
                          <p className="text-sm text-text-muted">{item.description}</p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input type="checkbox" defaultChecked className="peer sr-only" />
                          <div className="peer h-6 w-11 rounded-full bg-surface-light after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-text-muted after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:bg-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20"></div>
                        </label>
                      </div>
                    ))}

                    <Button onClick={handleSave}>
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
