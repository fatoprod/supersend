import { useState } from "react";
import { Header } from "../components/layout";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input } from "../components/ui";
import { Plus, Search, Play, Pause, Eye, Copy, Loader2, X, Trash2 } from "lucide-react";
import type { CampaignStatus } from "../types";
import { useI18n } from "../i18n";
import { useCampaigns, useCreateCampaign, useDeleteCampaign, useSendCampaign, usePauseCampaign, useDuplicateCampaign, useContacts, useToast } from "../hooks";
import type { Campaign, CampaignFormData } from "../types";
import type { Timestamp } from "firebase/firestore";

function formatDate(ts: Timestamp | undefined | null): string {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleDateString();
  } catch {
    return String(ts);
  }
}

const statusColors: Record<CampaignStatus, string> = {
  draft: "bg-surface-light text-text-muted",
  scheduled: "bg-accent/10 text-accent",
  processing: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  failed: "bg-error/10 text-error",
  paused: "bg-surface-light text-text-muted",
};

export function CampaignsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data: campaigns, isLoading } = useCampaigns();
  const { data: contacts } = useContacts();
  const createCampaign = useCreateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const sendCampaign = useSendCampaign();
  const pauseCampaign = usePauseCampaign();
  const duplicateCampaign = useDuplicateCampaign();

  const [filter, setFilter] = useState<CampaignStatus | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState<CampaignFormData>({
    name: "",
    subject: "",
    html: "",
    recipients: [],
  });
  const [selectAllContacts, setSelectAllContacts] = useState(false);

  const filteredCampaigns =
    filter === "all"
      ? (campaigns || [])
      : (campaigns || []).filter((c: Campaign) => c.status === filter);

  const handleCreate = async () => {
    if (!newCampaign.name || !newCampaign.subject || !newCampaign.html) {
      toast.error("Please fill in name, subject, and HTML content");
      return;
    }

    const recipients = selectAllContacts
      ? (contacts || []).filter((c) => !c.unsubscribed).map((c) => c.email)
      : newCampaign.recipients;

    if (recipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    try {
      await createCampaign.mutateAsync({ ...newCampaign, recipients });
      toast.success("Campaign created");
      setShowCreateModal(false);
      setNewCampaign({ name: "", subject: "", html: "", recipients: [] });
      setSelectAllContacts(false);
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleSend = async (campaignId: string) => {
    try {
      await sendCampaign.mutateAsync(campaignId);
      toast.success("Campaign sent successfully");
    } catch (error) {
      toast.error("Error sending campaign", String(error));
    }
  };

  const handlePause = async (campaignId: string) => {
    try {
      await pauseCampaign.mutateAsync(campaignId);
      toast.success("Campaign paused");
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleDuplicate = async (campaignId: string) => {
    try {
      await duplicateCampaign.mutateAsync(campaignId);
      toast.success("Campaign duplicated");
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleDelete = async (campaignId: string) => {
    try {
      await deleteCampaign.mutateAsync(campaignId);
      toast.success("Campaign deleted");
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const statusLabels: Record<string, string> = {
    all: t.campaigns.all,
    draft: t.dashboard.draft,
    scheduled: t.dashboard.scheduled,
    completed: t.dashboard.completed,
    processing: t.dashboard.processing,
    failed: t.dashboard.failed,
    paused: t.dashboard.paused,
  };

  return (
    <>
      <Header
        title={t.campaigns.title}
        subtitle={t.campaigns.subtitle}
      />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {(["all", "draft", "scheduled", "processing", "completed"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === status
                    ? "bg-primary text-white"
                    : "bg-surface-light text-text-muted hover:text-text"
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t.campaigns.newCampaign}
          </Button>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-surface-light p-6">
              <Search className="h-8 w-8 text-text-muted" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-text">{t.campaigns.noCampaigns}</h3>
            <p className="mb-6 text-text-muted">
              {t.campaigns.createFirstCampaign}
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t.campaigns.newCampaign}
            </Button>
          </div>
        ) : (
          /* Campaigns Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCampaigns.map((campaign: Campaign) => (
              <Card key={campaign.id} className="group relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[campaign.status]}`}>
                      {statusLabels[campaign.status] || campaign.status}
                    </span>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="rounded-lg p-1 text-text-muted opacity-0 transition-opacity hover:bg-error/10 hover:text-error group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <CardTitle className="mt-3 line-clamp-1">{campaign.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {campaign.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-4 text-sm text-text-muted">
                    <span>{campaign.recipientCount.toLocaleString()} {t.campaigns.recipients}</span>
                    {campaign.scheduledAt && (
                      <span>
                        {t.dashboard.scheduled}: {formatDate(campaign.scheduledAt)}
                      </span>
                    )}
                  </div>

                  {campaign.stats && (
                    <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg bg-surface-light/50 p-3">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-text">
                          {(campaign.stats.sent || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-text-muted">{t.dashboard.sent}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-text">
                          {campaign.stats.sent > 0
                            ? ((((campaign.stats.opened || 0) / campaign.stats.sent) * 100).toFixed(1)) + "%"
                            : "0%"}
                        </p>
                        <p className="text-xs text-text-muted">{t.dashboard.opened}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-text">
                          {campaign.stats.sent > 0
                            ? ((((campaign.stats.clicked || 0) / campaign.stats.sent) * 100).toFixed(1)) + "%"
                            : "0%"}
                        </p>
                        <p className="text-xs text-text-muted">{t.dashboard.clicked}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {campaign.status === "draft" && (
                      <>
                        <Button size="sm" className="flex-1" onClick={() => handleSend(campaign.id)} disabled={sendCampaign.isPending}>
                          <Play className="mr-1 h-3 w-3" />
                          {t.campaigns.send}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleDuplicate(campaign.id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {campaign.status === "scheduled" && (
                      <>
                        <Button size="sm" variant="secondary" className="flex-1" onClick={() => handlePause(campaign.id)}>
                          <Pause className="mr-1 h-3 w-3" />
                          {t.campaigns.pause}
                        </Button>
                      </>
                    )}
                    {campaign.status === "completed" && (
                      <>
                        <Button size="sm" variant="secondary" className="flex-1">
                          <Eye className="mr-1 h-3 w-3" />
                          {t.campaigns.viewReport}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleDuplicate(campaign.id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {campaign.status === "processing" && (
                      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-primary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.dashboard.processing}...
                      </div>
                    )}
                    {campaign.status === "failed" && (
                      <>
                        <Button size="sm" className="flex-1" onClick={() => handleSend(campaign.id)}>
                          <Play className="mr-1 h-3 w-3" />
                          Retry
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleDuplicate(campaign.id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-text-muted">
                    {t.dashboard.date}: {formatDate(campaign.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">{t.campaigns.newCampaign}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label={t.dashboard.campaign}
                value={newCampaign.name}
                onChange={(e) => setNewCampaign((p) => ({ ...p, name: e.target.value }))}
                placeholder="Campaign name"
              />
              <Input
                label="Subject"
                value={newCampaign.subject}
                onChange={(e) => setNewCampaign((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Email subject line"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-text">HTML Content</label>
                <textarea
                  value={newCampaign.html}
                  onChange={(e) => setNewCampaign((p) => ({ ...p, html: e.target.value }))}
                  placeholder="<html>...</html>"
                  rows={6}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
                  <input
                    type="checkbox"
                    checked={selectAllContacts}
                    onChange={(e) => setSelectAllContacts(e.target.checked)}
                    className="rounded border-border"
                  />
                  Send to all active contacts ({(contacts || []).filter((c) => !c.unsubscribed).length})
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  {t.common.cancel || "Cancel"}
                </Button>
                <Button onClick={handleCreate} disabled={createCampaign.isPending}>
                  {createCampaign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.campaigns.newCampaign}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
