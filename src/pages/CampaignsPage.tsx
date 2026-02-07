import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/layout";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, ConfirmModal } from "../components/ui";
import { Plus, Search, Play, Pause, Eye, Copy, Loader2, Trash2, Edit } from "lucide-react";
import type { CampaignStatus } from "../types";
import { useI18n } from "../i18n";
import { useCampaigns, useDeleteCampaign, useSendCampaign, usePauseCampaign, useDuplicateCampaign, useToast } from "../hooks";
import type { Campaign } from "../types";
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
  const navigate = useNavigate();
  const { data: campaigns, isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const sendCampaign = useSendCampaign();
  const pauseCampaign = usePauseCampaign();
  const duplicateCampaign = useDuplicateCampaign();

  const [filter, setFilter] = useState<CampaignStatus | "all">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; campaignId: string; campaignName: string }>({
    isOpen: false,
    campaignId: "",
    campaignName: "",
  });

  const filteredCampaigns =
    filter === "all"
      ? (campaigns || [])
      : (campaigns || []).filter((c: Campaign) => c.status === filter);

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

  const openDeleteConfirm = (campaignId: string, campaignName: string) => {
    setDeleteConfirm({ isOpen: true, campaignId, campaignName });
  };

  const handleDelete = async () => {
    try {
      await deleteCampaign.mutateAsync(deleteConfirm.campaignId);
      toast.success("Campaign deleted");
      setDeleteConfirm({ isOpen: false, campaignId: "", campaignName: "" });
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
          <Button onClick={() => navigate("/campaigns/new")}>
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
            <Button onClick={() => navigate("/campaigns/new")}>
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
                      onClick={() => openDeleteConfirm(campaign.id, campaign.name)}
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
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}>
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
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
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => handlePause(campaign.id)}>
                        <Pause className="mr-1 h-3 w-3" />
                        {t.campaigns.pause}
                      </Button>
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

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, campaignId: "", campaignName: "" })}
        onConfirm={handleDelete}
        title="Excluir Campanha"
        message={`Tem certeza que deseja excluir a campanha "${deleteConfirm.campaignName}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={deleteCampaign.isPending}
        variant="danger"
      />
    </>
  );
}
