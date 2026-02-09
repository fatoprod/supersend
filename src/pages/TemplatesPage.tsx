import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, ConfirmModal, EmailPreviewModal } from "../components/ui";
import { Button } from "../components/ui";
import { Plus, FileText, Copy, Trash2, Edit, Loader2, Eye } from "lucide-react";
import { useI18n } from "../i18n";
import { useTemplates, useDeleteTemplate, useDuplicateTemplate, useToast } from "../hooks";
import type { EmailTemplate } from "../types";
import { formatDate } from "../lib/utils";

export function TemplatesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; templateId: string; templateName: string }>({
    isOpen: false,
    templateId: "",
    templateName: "",
  });

  const openPreview = (html: string) => {
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const openDeleteConfirm = (templateId: string, templateName: string) => {
    setDeleteConfirm({ isOpen: true, templateId, templateName });
  };

  const handleDelete = async () => {
    try {
      await deleteTemplate.mutateAsync(deleteConfirm.templateId);
      toast.success("Template excluído");
      setDeleteConfirm({ isOpen: false, templateId: "", templateName: "" });
    } catch (error) {
      toast.error("Erro", String(error));
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      await duplicateTemplate.mutateAsync(templateId);
      toast.success("Template duplicado");
    } catch (error) {
      toast.error("Erro", String(error));
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
          <Button onClick={() => navigate("/templates/new")}>
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
                    <Button size="sm" variant="secondary" onClick={() => openPreview(template.html)} title="Preview">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => navigate(`/templates/${template.id}/edit`)}>
                      <Edit className="mr-1 h-3 w-3" />
                      {t.common.edit}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleDuplicate(template.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openDeleteConfirm(template.id, template.name)}>
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Template Card */}
            <Card
              className="flex cursor-pointer flex-col items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-surface-light/50"
              onClick={() => navigate("/templates/new")}
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

      {/* Preview Modal */}
      <EmailPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        html={previewHtml}
        height="80vh"
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, templateId: "", templateName: "" })}
        onConfirm={handleDelete}
        title="Excluir Template"
        message={`Tem certeza que deseja excluir o template "${deleteConfirm.templateName}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={deleteTemplate.isPending}
        variant="danger"
      />
    </>
  );
}
