import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import { Users, Mail, Send, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { useI18n } from "../i18n";

export function DashboardPage() {
  const { t } = useI18n();

  const stats = [
    {
      title: t.dashboard.totalContacts,
      value: "2,847",
      change: "+12.5%",
      trend: "up",
      icon: Users,
    },
    {
      title: t.dashboard.campaignsSent,
      value: "24",
      change: "+4.3%",
      trend: "up",
      icon: Mail,
    },
    {
      title: t.dashboard.emailsSent,
      value: "45,234",
      change: "+18.2%",
      trend: "up",
      icon: Send,
    },
    {
      title: t.dashboard.openRate,
      value: "32.4%",
      change: "-2.1%",
      trend: "down",
      icon: TrendingUp,
    },
  ];

  const recentCampaigns = [
    {
      id: "1",
      name: "Welcome Series",
      status: "completed" as const,
      sent: 1250,
      opened: 423,
      clicked: 89,
      date: "2024-01-15",
    },
    {
      id: "2",
      name: "Product Launch",
      status: "completed" as const,
      sent: 3400,
      opened: 1156,
      clicked: 234,
      date: "2024-01-12",
    },
    {
      id: "3",
      name: "Newsletter #24",
      status: "scheduled" as const,
      sent: 0,
      opened: 0,
      clicked: 0,
      date: "2024-01-20",
    },
  ];

  const statusLabels: Record<string, string> = {
    completed: t.dashboard.completed,
    scheduled: t.dashboard.scheduled,
    draft: t.dashboard.draft,
    processing: t.dashboard.processing,
    failed: t.dashboard.failed,
    paused: t.dashboard.paused,
  };

  return (
    <>
      <Header title={t.dashboard.title} subtitle={t.dashboard.subtitle} />
      
      <div className="p-6">
        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-muted">{stat.title}</p>
                    <p className="mt-1 text-2xl font-bold text-text">{stat.value}</p>
                    <div className="mt-2 flex items-center gap-1">
                      {stat.trend === "up" ? (
                        <ArrowUp className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-error" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          stat.trend === "up" ? "text-success" : "text-error"
                        }`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-sm text-text-muted">{t.common.vsLastMonth}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recentCampaigns}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-text-muted">
                    <th className="pb-3 font-medium">{t.dashboard.campaign}</th>
                    <th className="pb-3 font-medium">{t.dashboard.status}</th>
                    <th className="pb-3 font-medium">{t.dashboard.sent}</th>
                    <th className="pb-3 font-medium">{t.dashboard.opened}</th>
                    <th className="pb-3 font-medium">{t.dashboard.clicked}</th>
                    <th className="pb-3 font-medium">{t.dashboard.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCampaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-4 font-medium text-text">
                        {campaign.name}
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            campaign.status === "completed"
                              ? "bg-success/10 text-success"
                              : campaign.status === "scheduled"
                              ? "bg-accent/10 text-accent"
                              : "bg-surface-light text-text-muted"
                          }`}
                        >
                          {statusLabels[campaign.status] || campaign.status}
                        </span>
                      </td>
                      <td className="py-4 text-text-muted">{campaign.sent.toLocaleString()}</td>
                      <td className="py-4 text-text-muted">{campaign.opened.toLocaleString()}</td>
                      <td className="py-4 text-text-muted">{campaign.clicked.toLocaleString()}</td>
                      <td className="py-4 text-text-muted">{campaign.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
