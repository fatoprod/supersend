import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import { TrendingUp, TrendingDown, Mail, Eye, MousePointer, UserMinus, AlertCircle } from "lucide-react";

const analyticsData = {
  overview: {
    emailsSent: 45234,
    emailsSentChange: 18.2,
    openRate: 32.4,
    openRateChange: -2.1,
    clickRate: 8.7,
    clickRateChange: 1.3,
    unsubscribeRate: 0.8,
    unsubscribeRateChange: -0.2,
    bounceRate: 1.2,
    bounceRateChange: 0.1,
  },
  topCampaigns: [
    { name: "Product Launch", sent: 3400, openRate: 34.0, clickRate: 6.9 },
    { name: "Welcome Series", sent: 1250, openRate: 33.8, clickRate: 7.1 },
    { name: "Newsletter #23", sent: 5100, openRate: 28.5, clickRate: 5.2 },
    { name: "Flash Sale", sent: 4200, openRate: 42.1, clickRate: 12.3 },
    { name: "Re-engagement", sent: 890, openRate: 18.9, clickRate: 3.1 },
  ],
};

export function AnalyticsPage() {
  return (
    <>
      <Header
        title="Analytics"
        subtitle="Track your email performance"
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
                  <p className="text-sm text-text-muted">Emails Sent</p>
                  <p className="text-xl font-bold text-text">
                    {analyticsData.overview.emailsSent.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-xs text-success">
                      +{analyticsData.overview.emailsSentChange}%
                    </span>
                  </div>
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
                  <p className="text-sm text-text-muted">Open Rate</p>
                  <p className="text-xl font-bold text-text">
                    {analyticsData.overview.openRate}%
                  </p>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-error" />
                    <span className="text-xs text-error">
                      {analyticsData.overview.openRateChange}%
                    </span>
                  </div>
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
                  <p className="text-sm text-text-muted">Click Rate</p>
                  <p className="text-xl font-bold text-text">
                    {analyticsData.overview.clickRate}%
                  </p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-xs text-success">
                      +{analyticsData.overview.clickRateChange}%
                    </span>
                  </div>
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
                  <p className="text-sm text-text-muted">Unsubscribe Rate</p>
                  <p className="text-xl font-bold text-text">
                    {analyticsData.overview.unsubscribeRate}%
                  </p>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-success" />
                    <span className="text-xs text-success">
                      {analyticsData.overview.unsubscribeRateChange}%
                    </span>
                  </div>
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
                  <p className="text-sm text-text-muted">Bounce Rate</p>
                  <p className="text-xl font-bold text-text">
                    {analyticsData.overview.bounceRate}%
                  </p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-error" />
                    <span className="text-xs text-error">
                      +{analyticsData.overview.bounceRateChange}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart and Top Campaigns */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Email Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center rounded-lg bg-surface-light/50">
                <p className="text-text-muted">Chart visualization coming soon</p>
              </div>
            </CardContent>
          </Card>

          {/* Top Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-text-muted">
                      <th className="pb-3 font-medium">Campaign</th>
                      <th className="pb-3 font-medium text-right">Sent</th>
                      <th className="pb-3 font-medium text-right">Open %</th>
                      <th className="pb-3 font-medium text-right">Click %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topCampaigns.map((campaign, index) => (
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
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
