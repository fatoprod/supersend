import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import { Users, Send, TrendingUp, MousePointer, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useI18n } from "../i18n";
import { useDashboardStats, useRecentCampaigns } from "../hooks";
import type { Timestamp } from "firebase/firestore";

function formatDate(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString();
}

export function DashboardPage() {
  const { t } = useI18n();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentCampaigns, isLoading: campaignsLoading } = useRecentCampaigns();

  const statCards = [
    {
      title: t.dashboard.totalContacts,
      value: stats?.totalContacts ?? 0,
      icon: Users,
    },
    {
      title: t.dashboard.emailsSent,
      value: stats?.emailsSent ?? 0,
      icon: Send,
    },
    {
      title: t.dashboard.deliveryRate,
      value: `${stats?.deliveryRate ?? 0}%`,
      icon: CheckCircle,
    },
    {
      title: t.dashboard.openRate,
      value: `${stats?.openRate ?? 0}%`,
      icon: TrendingUp,
    },
    {
      title: t.dashboard.clickRate,
      value: `${stats?.clickRate ?? 0}%`,
      icon: MousePointer,
    },
    {
      title: t.dashboard.bounceRate,
      value: `${stats?.bounceRate ?? 0}%`,
      icon: AlertCircle,
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
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-muted">{stat.title}</p>
                    {statsLoading ? (
                      <Loader2 className="mt-2 h-6 w-6 animate-spin text-text-muted" />
                    ) : (
                      <p className="mt-1 text-2xl font-bold text-text">
                        {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                      </p>
                    )}
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
            {campaignsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !recentCampaigns || recentCampaigns.length === 0 ? (
              <p className="py-8 text-center text-text-muted">{t.campaigns.noCampaigns}</p>
            ) : (
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
                        <td className="py-4 text-text-muted">{(campaign.stats?.sent ?? 0).toLocaleString()}</td>
                        <td className="py-4 text-text-muted">{(campaign.stats?.opened ?? 0).toLocaleString()}</td>
                        <td className="py-4 text-text-muted">{(campaign.stats?.clicked ?? 0).toLocaleString()}</td>
                        <td className="py-4 text-text-muted">{formatDate(campaign.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
