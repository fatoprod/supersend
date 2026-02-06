import { useState } from "react";
import { Header } from "../components/layout";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input } from "../components/ui";
import { useAuth, useToast } from "../hooks";
import { Save, User, Mail, Key, Bell, Shield } from "lucide-react";

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "email", label: "Email Settings", icon: Mail },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "api", label: "API Keys", icon: Key },
  ];

  const handleSave = () => {
    toast.success("Settings saved", "Your changes have been saved successfully");
  };

  return (
    <>
      <Header title="Settings" subtitle="Manage your account settings" />

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
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your account profile information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 overflow-hidden rounded-full bg-primary/20">
                        {user?.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || "User"}
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
                          Change Photo
                        </Button>
                        <p className="mt-2 text-xs text-text-muted">
                          JPG, GIF or PNG. Max 2MB.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Display Name"
                        defaultValue={user?.displayName || ""}
                        placeholder="Your name"
                      />
                      <Input
                        label="Email"
                        type="email"
                        defaultValue={user?.email || ""}
                        disabled
                        helperText="Email cannot be changed"
                      />
                    </div>

                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === "email" && (
              <Card>
                <CardHeader>
                  <CardTitle>Email Settings</CardTitle>
                  <CardDescription>
                    Configure your email sending preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <Input
                      label="Default From Name"
                      placeholder="Your Company"
                      defaultValue="SuperSend"
                    />
                    <Input
                      label="Default From Email"
                      type="email"
                      placeholder="noreply@example.com"
                      defaultValue="noreply@supersend.app"
                    />
                    <Input
                      label="Reply-To Email"
                      type="email"
                      placeholder="support@example.com"
                    />
                    <Input
                      label="Unsubscribe Link Text"
                      placeholder="Unsubscribe from emails"
                      defaultValue="Unsubscribe"
                    />

                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === "security" && (
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>
                    Manage your account security settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <Input
                      label="Current Password"
                      type="password"
                      placeholder="Enter current password"
                    />
                    <Input
                      label="New Password"
                      type="password"
                      placeholder="Enter new password"
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      placeholder="Confirm new password"
                    />

                    <Button onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" />
                      Update Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you receive
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Campaign completed", description: "Get notified when a campaign finishes sending" },
                      { label: "New subscriber", description: "Get notified when someone subscribes" },
                      { label: "Weekly digest", description: "Receive a weekly summary of your email performance" },
                      { label: "Product updates", description: "Get notified about new features and updates" },
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
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "api" && (
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text">Production API Key</p>
                          <p className="mt-1 font-mono text-sm text-text-muted">
                            sk_live_••••••••••••••••
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm">
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm">
                            Regenerate
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text">Test API Key</p>
                          <p className="mt-1 font-mono text-sm text-text-muted">
                            sk_test_••••••••••••••••
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm">
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm">
                            Regenerate
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button>
                      Generate New API Key
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
