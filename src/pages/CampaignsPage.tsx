import { useState } from "react";
import { Header } from "../components/layout";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui";
import { Plus, Search, Filter, MoreHorizontal, Play, Pause, Eye, Copy, Trash2 } from "lucide-react";
import type { CampaignStatus } from "../types";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  recipientCount: number;
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
  };
  createdAt: string;
  scheduledAt?: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Welcome Series - Day 1",
    subject: "Welcome to SuperSend! Let's get started",
    status: "completed",
    recipientCount: 1250,
    stats: { sent: 1250, opened: 423, clicked: 89 },
    createdAt: "2024-01-10",
  },
  {
    id: "2",
    name: "Product Launch Announcement",
    subject: "Introducing our new feature",
    status: "completed",
    recipientCount: 3400,
    stats: { sent: 3400, opened: 1156, clicked: 234 },
    createdAt: "2024-01-12",
  },
  {
    id: "3",
    name: "Newsletter #24",
    subject: "Your weekly update",
    status: "scheduled",
    recipientCount: 5200,
    createdAt: "2024-01-14",
    scheduledAt: "2024-01-20T10:00:00",
  },
  {
    id: "4",
    name: "Re-engagement Campaign",
    subject: "We miss you!",
    status: "draft",
    recipientCount: 890,
    createdAt: "2024-01-15",
  },
];

const statusColors: Record<CampaignStatus, string> = {
  draft: "bg-surface-light text-text-muted",
  scheduled: "bg-accent/10 text-accent",
  processing: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
  paused: "bg-surface-light text-text-muted",
};

export function CampaignsPage() {
  const [filter, setFilter] = useState<CampaignStatus | "all">("all");

  const filteredCampaigns =
    filter === "all"
      ? mockCampaigns
      : mockCampaigns.filter((c) => c.status === filter);

  return (
    <>
      <Header
        title="Campaigns"
        subtitle="Create and manage your email campaigns"
      />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {(["all", "draft", "scheduled", "completed"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === status
                    ? "bg-primary text-white"
                    : "bg-surface-light text-text-muted hover:text-text"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>

        {/* Campaigns Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="group relative overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[campaign.status]}`}>
                    {campaign.status}
                  </span>
                  <button className="rounded-lg p-1 text-text-muted opacity-0 transition-opacity hover:bg-surface-light hover:text-text group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                <CardTitle className="mt-3 line-clamp-1">{campaign.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {campaign.subject}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4 text-sm text-text-muted">
                  <span>{campaign.recipientCount.toLocaleString()} recipients</span>
                  {campaign.scheduledAt && (
                    <span>
                      Scheduled: {new Date(campaign.scheduledAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {campaign.stats && (
                  <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg bg-surface-light/50 p-3">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-text">
                        {campaign.stats.sent.toLocaleString()}
                      </p>
                      <p className="text-xs text-text-muted">Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-text">
                        {((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-text-muted">Opened</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-text">
                        {((campaign.stats.clicked / campaign.stats.sent) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-text-muted">Clicked</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {campaign.status === "draft" && (
                    <>
                      <Button size="sm" className="flex-1">
                        <Play className="mr-1 h-3 w-3" />
                        Send
                      </Button>
                      <Button size="sm" variant="secondary">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {campaign.status === "scheduled" && (
                    <>
                      <Button size="sm" variant="secondary" className="flex-1">
                        <Pause className="mr-1 h-3 w-3" />
                        Pause
                      </Button>
                      <Button size="sm" variant="secondary">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {campaign.status === "completed" && (
                    <>
                      <Button size="sm" variant="secondary" className="flex-1">
                        <Eye className="mr-1 h-3 w-3" />
                        View Report
                      </Button>
                      <Button size="sm" variant="secondary">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-surface-light p-6">
              <Search className="h-8 w-8 text-text-muted" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-text">No campaigns found</h3>
            <p className="mb-6 text-text-muted">
              Create your first campaign to get started
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
