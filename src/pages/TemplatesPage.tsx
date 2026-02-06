import { useState } from "react";
import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input } from "../components/ui";
import { Button } from "../components/ui";
import { Plus, FileText, Copy, Trash2, Edit, Loader2, X } from "lucide-react";
import { useI18n } from "../i18n";
import { useTemplates, useCreateTemplate, useDeleteTemplate, useDuplicateTemplate, useUpdateTemplate, useToast } from "../hooks";
import type { EmailTemplate, EmailTemplateFormData } from "../types";
import type { Timestamp } from "firebase/firestore";

function formatDate(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleDateString();
  } catch {
    return String(ts);
  }
}

export function TemplatesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();
  const updateTemplate = useUpdateTemplate();

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<EmailTemplateFormData>({
    name: "",
    subject: "",
    html: "",
    text: "",
  });

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({ name: "", subject: "", html: "", text: "" });
    setShowModal(true);
  };

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      html: template.html,
      text: template.text || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.html) {
      toast.error("Please fill in name, subject, and HTML content");
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          templateId: editingTemplate.id,
          data: formData,
        });
        toast.success("Template updated");
      } else {
        await createTemplate.mutateAsync(formData);
        toast.success("Template created");
      }
      setShowModal(false);
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate.mutateAsync(templateId);
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      await duplicateTemplate.mutateAsync(templateId);
      toast.success("Template duplicated");
    } catch (error) {
      toast.error("Error", String(error));
    }
  };

  return (
    <>
      <Header
        title={t.templates.title}
        subtitle={t.templates.subtitle}
      />

      <div className="p-6">
        {/* Actions */}
        <div className="mb-6 flex justify-end">
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            {t.templates.newTemplate}
          </Button>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          /* Templates Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(templates || []).map((template: EmailTemplate) => (
              <Card key={template.id} className="group relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="mt-3">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {template.variables && template.variables.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {template.variables.map((v) => (
                        <span key={v} className="rounded bg-accent/10 px-1.5 py-0.5 text-xs text-accent font-mono">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mb-4 text-xs text-text-muted">
                    {t.templates.lastUpdated} {formatDate(template.updatedAt)}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEditModal(template)}>
                      <Edit className="mr-1 h-3 w-3" />
                      {t.common.edit}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleDuplicate(template.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Template Card */}
            <Card
              className="flex cursor-pointer flex-col items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-surface-light/50"
              onClick={openCreateModal}
            >
              <CardContent className="text-center">
                <div className="mb-4 rounded-full bg-surface-light p-4">
                  <Plus className="h-8 w-8 text-text-muted" />
                </div>
                <p className="font-medium text-text">{t.templates.createNewTemplate}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {t.templates.startFromScratch}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create/Edit Template Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">
                {editingTemplate ? "Edit Template" : t.templates.newTemplate}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Template name"
              />
              <Input
                label={t.templates.subject}
                value={formData.subject}
                onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Email subject (use {{variable}} for placeholders)"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-text">HTML Content</label>
                <textarea
                  value={formData.html}
                  onChange={(e) => setFormData((p) => ({ ...p, html: e.target.value }))}
                  placeholder="<html>...</html>"
                  rows={8}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">Plain Text (optional)</label>
                <textarea
                  value={formData.text || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, text: e.target.value }))}
                  placeholder="Plain text fallback..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  {t.common.cancel || "Cancel"}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createTemplate.isPending || updateTemplate.isPending}
                >
                  {(createTemplate.isPending || updateTemplate.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingTemplate ? t.settings.saveChanges || "Save" : t.templates.newTemplate}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
