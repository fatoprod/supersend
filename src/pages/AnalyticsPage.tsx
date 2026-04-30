import { useState } from "react";
import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import { Mail, Eye, MousePointer, UserMinus, AlertCircle, CheckCircle, ShieldAlert, Loader2, Filter, RefreshCw, BarChart3 } from "lucide-react";
import { useI18n } from "../i18n";
import { useAnalyticsData, useCampaigns } from "../hooks";
import { getGa4CampaignStats, type Ga4CampaignStats } from "../lib/services/ga4Settings";

export function AnalyticsPage() {
  const { t } = useI18n();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const { data: campaigns } = useCampaigns();
  const { data: analytics, isLoading, refetch, isFetching } = useAnalyticsData(selectedCampaign || undefined);
  const [ga4Stats, setGa4Stats] = useState<Ga4CampaignStats | null>(null);
  const [ga4Loading, setGa4Loading] = useState(false);
  const [ga4Error, setGa4Error] = useState<string | null>(null);

  const loadGa4 = async (campaignId: string) => {
    setGa4Loading(true);
    setGa4Error(null);
    setGa4Stats(null);
    try {
      const s = await getGa4CampaignStats(campaignId);
      setGa4Stats(s);
    } catch (err) {
      setGa4Error(String((err as Error)?.message || err));
    } finally {
      setGa4Loading(false);
    }
  };

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
          <div className="ml-auto">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-muted hover:bg-surface-hover hover:text-text transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {t.analytics.refresh}
            </button>
          </div>
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

        {/* GA4 Click Stats (when campaign is filtered) */}
        {selectedCampaign && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Cliques no site (Google Analytics)
                </CardTitle>
                <button
                  onClick={() => loadGa4(selectedCampaign)}
                  disabled={ga4Loading}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text transition-colors disabled:opacity-50"
                >
                  {ga4Loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {ga4Stats ? "Atualizar" : "Carregar GA4"}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {ga4Error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-medium">Não foi possível carregar do GA4</p>
                  <p className="mt-1 text-xs break-words">{ga4Error}</p>
                  <p className="mt-2 text-xs">
                    Configure em <strong>Settings → Google Analytics</strong>.
                  </p>
                </div>
              )}
              {!ga4Stats && !ga4Error && !ga4Loading && (
                <p className="py-4 text-sm text-text-muted">
                  Clique em "Carregar GA4" para buscar dados de cliques nesta campanha (filtrado por{" "}
                  <code className="font-mono text-xs">utm_campaign={selectedCampaign}</code>).
                </p>
              )}
              {ga4Stats && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted">Sessões</p>
                      <p className="text-2xl font-bold text-text">{ga4Stats.sessions.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted">Usuários</p>
                      <p className="text-2xl font-bold text-text">{ga4Stats.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted">Sessões engajadas</p>
                      <p className="text-2xl font-bold text-text">{ga4Stats.engagedSessions.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted">Conversões</p>
                      <p className="text-2xl font-bold text-text">{ga4Stats.conversions.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted">Bounce rate</p>
                      <p className="text-2xl font-bold text-text">
                        {(ga4Stats.bounceRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted">Duração média</p>
                      <p className="text-2xl font-bold text-text">
                        {ga4Stats.averageSessionDuration.toFixed(0)}s
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted">Eventos</p>
                      <p className="text-2xl font-bold text-text">{ga4Stats.eventCount.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-text-muted">Novos usuários</p>
                      <p className="text-2xl font-bold text-text">{ga4Stats.newUsers.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-text">Páginas mais visitadas</h4>
                      {ga4Stats.topPages.length === 0 ? (
                        <p className="text-sm text-text-muted">Sem dados</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {ga4Stats.topPages.map((p, i) => (
                            <li key={i} className="flex justify-between gap-2 border-b border-border/50 py-1">
                              <span className="truncate font-mono text-xs text-text-muted">{p.path}</span>
                              <span className="font-medium text-text">{p.sessions}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-text">Dispositivos</h4>
                      {ga4Stats.byDevice.length === 0 ? (
                        <p className="text-sm text-text-muted">Sem dados</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {ga4Stats.byDevice.map((d, i) => (
                            <li key={i} className="flex justify-between gap-2 border-b border-border/50 py-1">
                              <span className="capitalize text-text-muted">{d.category || "(desconhecido)"}</span>
                              <span className="font-medium text-text">{d.sessions}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}
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
