import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import { Users, Mail, Send, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

const stats = [
  {
    title: "Total Contacts",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Campaigns Sent",
    value: "24",
    change: "+4.3%",
    trend: "up",
    icon: Mail,
  },
  {
    title: "Emails Sent",
    value: "45,234",
    change: "+18.2%",
    trend: "up",
    icon: Send,
  },
  {
    title: "Open Rate",
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
    status: "completed",
    sent: 1250,
    opened: 423,
    clicked: 89,
    date: "2024-01-15",
  },
  {
    id: "2",
    name: "Product Launch",
    status: "completed",
    sent: 3400,
    opened: 1156,
    clicked: 234,
    date: "2024-01-12",
  },
  {
    id: "3",
    name: "Newsletter #24",
    status: "scheduled",
    sent: 0,
    opened: 0,
    clicked: 0,
    date: "2024-01-20",
  },
];

export function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="Welcome back! Here's what's happening." />
      
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
                      <span className="text-sm text-text-muted">vs last month</span>
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
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-text-muted">
                    <th className="pb-3 font-medium">Campaign</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Sent</th>
                    <th className="pb-3 font-medium">Opened</th>
                    <th className="pb-3 font-medium">Clicked</th>
                    <th className="pb-3 font-medium">Date</th>
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
                          {campaign.status}
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
