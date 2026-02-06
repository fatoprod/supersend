import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import { Mail, Eye, MousePointer, UserMinus, AlertCircle, Loader2 } from "lucide-react";
import { useI18n } from "../i18n";
import { useAnalyticsData } from "../hooks";

export function AnalyticsPage() {
  const { t } = useI18n();
  const { data: analytics, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <>
        <Header title={t.analytics.title} subtitle={t.analytics.subtitle} />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  const data = analytics || {
    emailsSent: 0,
    emailsSentChange: 0,
    openRate: 0,
    openRateChange: 0,
    clickRate: 0,
    clickRateChange: 0,
    unsubscribeRate: 0,
    unsubscribeRateChange: 0,
    bounceRate: 0,
    bounceRateChange: 0,
    topCampaigns: [],
  };

  return (
    <>
      <Header
        title={t.analytics.title}
        subtitle={t.analytics.subtitle}
      />

      <div className="p-6">
        {/* Overview Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{t.dashboard.emailsSent}</p>
                  <p className="text-xl font-bold text-text">
                    {data.emailsSent.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-secondary/10 p-2">
                  <Eye className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{t.dashboard.openRate}</p>
                  <p className="text-xl font-bold text-text">
                    {data.openRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2">
                  <MousePointer className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{t.analytics.clickRate}</p>
                  <p className="text-xl font-bold text-text">
                    {data.clickRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-error/10 p-2">
                  <UserMinus className="h-5 w-5 text-error" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{t.analytics.unsubscribeRate}</p>
                  <p className="text-xl font-bold text-text">
                    {data.unsubscribeRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-surface-light p-2">
                  <AlertCircle className="h-5 w-5 text-text-muted" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{t.analytics.bounceRate}</p>
                  <p className="text-xl font-bold text-text">
                    {data.bounceRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Campaigns */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>{t.analytics.performanceOverTime}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center rounded-lg bg-surface-light/50">
                <p className="text-text-muted">{t.analytics.chartComingSoon}</p>
              </div>
            </CardContent>
          </Card>

          {/* Top Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t.analytics.topCampaigns}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topCampaigns.length === 0 ? (
                <p className="py-8 text-center text-text-muted">No completed campaigns yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-text-muted">
                        <th className="pb-3 font-medium">{t.dashboard.campaign}</th>
                        <th className="pb-3 font-medium text-right">{t.dashboard.sent}</th>
                        <th className="pb-3 font-medium text-right">{t.analytics.openPercent}</th>
                        <th className="pb-3 font-medium text-right">{t.analytics.clickPercent}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCampaigns.map((campaign, index) => (
                        <tr
                          key={index}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="py-3 font-medium text-text">
                            {campaign.name}
                          </td>
                          <td className="py-3 text-right text-text-muted">
                            {campaign.sent.toLocaleString()}
                          </td>
                          <td className="py-3 text-right text-text-muted">
                            {campaign.openRate}%
                          </td>
                          <td className="py-3 text-right text-text-muted">
                            {campaign.clickRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
