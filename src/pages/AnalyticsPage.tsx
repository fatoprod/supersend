import { useState } from "react";
import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import { Mail, Eye, MousePointer, UserMinus, AlertCircle, CheckCircle, ShieldAlert, Loader2, Filter } from "lucide-react";
import { useI18n } from "../i18n";
import { useAnalyticsData, useCampaigns } from "../hooks";

export function AnalyticsPage() {
  const { t } = useI18n();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const { data: campaigns } = useCampaigns();
  const { data: analytics, isLoading } = useAnalyticsData(selectedCampaign || undefined);

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
    delivered: 0,
    deliveryRate: 0,
    deliveryRateChange: 0,
    openRate: 0,
    openRateChange: 0,
    clickRate: 0,
    clickRateChange: 0,
    unsubscribeRate: 0,
    unsubscribeRateChange: 0,
    bounceRate: 0,
    bounceRateChange: 0,
    complainedRate: 0,
    complainedRateChange: 0,
    topCampaigns: [],
    recipients: [],
  };

  return (
    <>
      <Header
        title={t.analytics.title}
        subtitle={t.analytics.subtitle}
      />

      <div className="p-6">
        {/* Campaign Filter */}
        <div className="mb-6 flex items-center gap-3">
          <Filter className="h-5 w-5 text-text-muted" />
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">{t.analytics.allCampaigns}</option>
            {(campaigns || []).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          {selectedCampaign && (
            <button
              onClick={() => setSelectedCampaign("")}
              className="text-sm text-primary hover:underline"
            >
              {t.analytics.clearFilter}
            </button>
          )}
        </div>
        {/* Overview Stats - Row 1 */}
        <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <div className="rounded-lg bg-success/10 p-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{t.analytics.deliveryRate}</p>
                  <p className="text-xl font-bold text-text">
                    {data.deliveryRate}%
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
        </div>

        {/* Overview Stats - Row 2 */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-error/10 p-2">
                  <AlertCircle className="h-5 w-5 text-error" />
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

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-2">
                  <ShieldAlert className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{t.analytics.complainedRate}</p>
                  <p className="text-xl font-bold text-text">
                    {data.complainedRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-surface-light p-2">
                  <UserMinus className="h-5 w-5 text-text-muted" />
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
        </div>

        {/* Recipients Detail (when campaign is filtered) */}
        {selectedCampaign && data.recipients && data.recipients.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t.analytics.recipientDetails}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-text-muted">
                      <th className="pb-3 font-medium">{t.analytics.recipient}</th>
                      <th className="pb-3 font-medium text-center">{t.analytics.statusLabel}</th>
                      <th className="pb-3 font-medium text-center">{t.analytics.deliveredLabel}</th>
                      <th className="pb-3 font-medium text-center">{t.analytics.openedLabel}</th>
                      <th className="pb-3 font-medium text-center">{t.analytics.clickedLabel}</th>
                      <th className="pb-3 font-medium text-center">{t.analytics.complainedLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recipients.map((r, index) => (
                      <tr
                        key={index}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-3 font-medium text-text">
                          {r.to}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.status === "bounced"
                                ? "bg-error/10 text-error"
                                : r.delivered
                                ? "bg-success/10 text-success"
                                : "bg-surface-light text-text-muted"
                            }`}
                          >
                            {r.status === "bounced"
                              ? (r.bounceSeverity === "permanent" ? "Bounce (perm)" : "Bounce (temp)")
                              : r.delivered
                              ? t.analytics.deliveredStatus
                              : t.analytics.sentStatus}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          {r.delivered ? (
                            <CheckCircle className="mx-auto h-4 w-4 text-success" />
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {r.opened ? (
                            <span className="text-sm font-medium text-secondary">{r.openCount}x</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {r.clicked ? (
                            <span className="text-sm font-medium text-accent">{r.clickCount}x</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {r.complained ? (
                            <ShieldAlert className="mx-auto h-4 w-4 text-warning" />
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
                        <th className="pb-3 font-medium text-right">{t.analytics.bouncePercent}</th>
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
                          <td className="py-3 text-right text-text-muted">
                            {campaign.bounceRate}%
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
