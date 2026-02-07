import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout";
import { Button, Input } from "../components/ui";
import { ArrowLeft, Eye, Loader2, Save, Send, FileText, Plus, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useI18n } from "../i18n";
import { useCampaigns, useCreateCampaign, useUpdateCampaign, useSendCampaign, useContacts, useTemplates, useToast } from "../hooks";
import type { Campaign, CampaignFormData, EmailTemplate } from "../types";

// Variables that are required — must be filled before sending
const REQUIRED_VARIABLES = new Set([
  "company", "title", "content", "cta_text", "cta_url", "subject",
]);

const VARIABLE_LABELS: Record<string, string> = {
  company: "Nome da Empresa",
  title: "Título do Email",
  content: "Conteúdo",
  cta_text: "Texto do Botão",
  cta_url: "URL do Botão",
  subject: "Assunto",
  logo_url: "URL do Logo",
  unsubscribe_url: "URL de Descadastro",
  preferences_url: "URL de Preferências",
  company_address: "Endereço da Empresa",
};

function extractVariables(html: string): string[] {
  const matches = html.match(/\{\{\s*([\w]+)\s*\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[\{\}\s]/g, "")))];
}

function replaceVariables(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    if (value) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      result = result.replace(regex, value);
    }
  }
  return result;
}

function cleanUnfilledOptionalVars(html: string): string {
  let result = html;
  result = result.replace(/<img[^>]*src="[^"]*\{\{[^}]+\}\}[^"]*"[^>]*\/?>/gi, "");
  result = result.replace(/<a[^>]*href="[^"]*\{\{[^}]+\}\}[^"]*"[^>]*>.*?<\/a>/gi, "");
  result = result.replace(/\{\{\s*\w+\s*\}\}/g, "");
  result = result.replace(/<p[^>]*>\s*([·\s]|&middot;)*\s*<\/p>/gi, "");
  return result;
}

export function CampaignEditorPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const isEditing = !!campaignId;

  const { data: campaigns } = useCampaigns();
  const { data: contacts } = useContacts();
  const { data: templates } = useTemplates();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const sendCampaignMutation = useSendCampaign();

  // Form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [selectAllContacts, setSelectAllContacts] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | "custom">("");
  const [rawTemplateHtml, setRawTemplateHtml] = useState("");
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing campaign data for editing
  useEffect(() => {
    if (isEditing && campaigns && !loaded) {
      const campaign = campaigns.find((c: Campaign) => c.id === campaignId);
      if (campaign) {
        setName(campaign.name);
        setSubject(campaign.subject);
        setHtml(campaign.html);
        setSelectedTemplateId("custom");
        setLoaded(true);
      }
    }
  }, [isEditing, campaigns, campaignId, loaded]);

  // Detected variables in raw template
  const detectedVars = useMemo(() => {
    if (!rawTemplateHtml) return [];
    return extractVariables(rawTemplateHtml);
  }, [rawTemplateHtml]);

  // Validation
  const missingRequired = useMemo(() => {
    if (selectedTemplateId === "custom" || !selectedTemplateId) return [];
    return detectedVars.filter(
      (v) => REQUIRED_VARIABLES.has(v) && !templateVariables[v]?.trim()
    );
  }, [detectedVars, templateVariables, selectedTemplateId]);

  const allVariablesFilled = useMemo(() => {
    return detectedVars.every((v) => !!templateVariables[v]?.trim());
  }, [detectedVars, templateVariables]);

  const activeContacts = useMemo(() => {
    return (contacts || []).filter((c) => !c.unsubscribed);
  }, [contacts]);

  // Compute final HTML
  const computeHtml = (raw: string, vars: Record<string, string>) => {
    return cleanUnfilledOptionalVars(replaceVariables(raw, vars));
  };

  // Handlers
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "custom") {
      setHtml("");
      setSubject("");
      setRawTemplateHtml("");
      setTemplateVariables({});
      return;
    }
    const template = (templates || []).find((t: EmailTemplate) => t.id === templateId);
    if (template) {
      setRawTemplateHtml(template.html);
      const vars = extractVariables(template.html);
      const defaults: Record<string, string> = {};
      for (const v of vars) defaults[v] = templateVariables[v] || "";
      setTemplateVariables(defaults);
      setHtml(template.html);
      setSubject(template.subject);
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    const updated = { ...templateVariables, [key]: value };
    setTemplateVariables(updated);
    setHtml(computeHtml(rawTemplateHtml, updated));
    if (selectedTemplateId && selectedTemplateId !== "custom") {
      const template = (templates || []).find((t: EmailTemplate) => t.id === selectedTemplateId);
      if (template) {
        setSubject(replaceVariables(template.subject, updated));
      }
    }
  };

  const getPreviewHtml = () => {
    if (rawTemplateHtml) {
      return computeHtml(rawTemplateHtml, templateVariables);
    }
    return html;
  };

  const validate = (action: "save" | "send"): boolean => {
    if (!name.trim()) { toast.error("Nome da campanha é obrigatório"); return false; }
    if (!subject.trim()) { toast.error("Assunto é obrigatório"); return false; }
    if (!html.trim()) { toast.error("Conteúdo HTML é obrigatório"); return false; }
    if (missingRequired.length > 0) {
      toast.error(
        "Variáveis obrigatórias faltando",
        `Preencha: ${missingRequired.map((v) => VARIABLE_LABELS[v] || v).join(", ")}`
      );
      return false;
    }
    if (action === "send" && activeContacts.length === 0) {
      toast.error("Nenhum contato ativo para enviar");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate("save")) return;
    setSaving(true);
    const recipients = selectAllContacts ? activeContacts.map((c) => c.email) : [];
    const data: CampaignFormData = { name, subject, html, recipients };

    try {
      if (isEditing) {
        await updateCampaign.mutateAsync({ campaignId: campaignId!, data });
        toast.success("Campanha atualizada");
      } else {
        await createCampaign.mutateAsync(data);
        toast.success("Campanha criada");
      }
      navigate("/campaigns");
    } catch (error) {
      toast.error("Erro ao salvar", String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSend = async () => {
    if (!validate("send")) return;
    setSaving(true);
    const recipients = selectAllContacts ? activeContacts.map((c) => c.email) : [];
    if (recipients.length === 0) { toast.error("Selecione ao menos um destinatário"); setSaving(false); return; }

    const data: CampaignFormData = { name, subject, html, recipients };

    try {
      let id = campaignId;
      if (isEditing) {
        await updateCampaign.mutateAsync({ campaignId: campaignId!, data });
      } else {
        id = await createCampaign.mutateAsync(data);
      }
      await sendCampaignMutation.mutateAsync(id!);
      toast.success("Campanha enviada com sucesso!");
      navigate("/campaigns");
    } catch (error) {
      toast.error("Erro ao enviar", String(error));
    } finally {
      setSaving(false);
    }
  };

  // Section numbering
  const hasVariables = !!selectedTemplateId && selectedTemplateId !== "custom" && detectedVars.length > 0;
  const varsSection = hasVariables ? 3 : 0;
  const subjectSection = hasVariables ? 4 : 3;
  const recipientsSection = subjectSection + 1;

  return (
    <>
      <Header
        title={isEditing ? "Editar Campanha" : t.campaigns.newCampaign}
        subtitle={isEditing ? `Editando: ${name}` : "Configure sua campanha passo a passo"}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Form */}
        <div className="w-1/2 overflow-y-auto p-6">
          <button
            onClick={() => navigate("/campaigns")}
            className="mb-6 flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para campanhas
          </button>

          <div className="space-y-8">
            {/* Section 1: Campaign info */}
            <section>
              <h3 className="mb-4 text-base font-semibold text-text">1. Informações</h3>
              <Input
                label="Nome da Campanha *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Newsletter Fevereiro 2026"
              />
            </section>

            {/* Section 2: Template selection */}
            <section>
              <h3 className="mb-4 text-base font-semibold text-text">2. Escolher Template</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(templates || []).map((template: EmailTemplate) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template.id)}
                    className={`group relative flex flex-col items-start rounded-lg border-2 p-3 text-left transition-all ${
                      selectedTemplateId === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <FileText className={`mb-2 h-5 w-5 ${selectedTemplateId === template.id ? "text-primary" : "text-text-muted"}`} />
                    <p className="text-sm font-medium text-text line-clamp-1">{template.name}</p>
                    <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{template.subject}</p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSelectTemplate("custom")}
                  className={`flex flex-col items-start rounded-lg border-2 border-dashed p-3 text-left transition-all ${
                    selectedTemplateId === "custom"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Plus className={`mb-2 h-5 w-5 ${selectedTemplateId === "custom" ? "text-primary" : "text-text-muted"}`} />
                  <p className="text-sm font-medium text-text">HTML Customizado</p>
                  <p className="mt-0.5 text-xs text-text-muted">Escreva o seu</p>
                </button>
              </div>
            </section>

            {/* Section: Variables */}
            {hasVariables && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-text">{varsSection}. Variáveis do Template</h3>
                  {allVariablesFilled ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Todas preenchidas
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-text-muted">
                      {detectedVars.filter((v) => !!templateVariables[v]?.trim()).length}/{detectedVars.length} preenchidas
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {detectedVars.map((key) => {
                    const isRequired = REQUIRED_VARIABLES.has(key);
                    const isFilled = !!templateVariables[key]?.trim();
                    const isLongField = key === "content";

                    return (
                      <div key={key} className="rounded-lg border border-border bg-surface p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm font-medium text-text">
                            {VARIABLE_LABELS[key] || key}
                            {isRequired ? (
                              <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-error">
                                Obrigatória
                              </span>
                            ) : (
                              <span className="rounded-full bg-surface-light px-2 py-0.5 text-[10px] font-semibold uppercase text-text-muted">
                                Opcional
                              </span>
                            )}
                          </label>
                          <code className="rounded bg-surface-light px-2 py-0.5 text-xs text-text-muted">
                            {`{{${key}}}`}
                          </code>
                        </div>
                        {isLongField ? (
                          <textarea
                            value={templateVariables[key] || ""}
                            onChange={(e) => handleVariableChange(key, e.target.value)}
                            placeholder={`Digite ${(VARIABLE_LABELS[key] || key).toLowerCase()}...`}
                            rows={3}
                            className={`w-full rounded-lg border px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                              isRequired && !isFilled
                                ? "border-error/50 bg-error/5 focus:border-error"
                                : "border-border bg-background focus:border-primary"
                            }`}
                          />
                        ) : (
                          <input
                            type={key.includes("url") ? "url" : "text"}
                            value={templateVariables[key] || ""}
                            onChange={(e) => handleVariableChange(key, e.target.value)}
                            placeholder={`Digite ${(VARIABLE_LABELS[key] || key).toLowerCase()}...`}
                            className={`w-full rounded-lg border px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                              isRequired && !isFilled
                                ? "border-error/50 bg-error/5 focus:border-error"
                                : "border-border bg-background focus:border-primary"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {missingRequired.length > 0 && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-error/5 border border-error/20 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                    <p className="text-sm text-error">
                      Campos obrigatórios: {missingRequired.map((v) => VARIABLE_LABELS[v] || v).join(", ")}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Section: Subject & Content */}
            <section>
              <h3 className="mb-4 text-base font-semibold text-text">{subjectSection}. Assunto & Conteúdo</h3>
              <div className="space-y-4">
                <Input
                  label="Linha de Assunto *"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Assunto do email"
                />
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-sm font-medium text-text">
                      Conteúdo HTML {selectedTemplateId !== "custom" && selectedTemplateId ? "(gerado do template)" : "*"}
                    </label>
                    {html && (
                      <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                    )}
                  </div>
                  <textarea
                    value={html}
                    onChange={(e) => {
                      setHtml(e.target.value);
                      if (selectedTemplateId === "custom") setRawTemplateHtml("");
                    }}
                    placeholder="<html>...</html>"
                    rows={selectedTemplateId === "custom" ? 12 : 4}
                    readOnly={!!selectedTemplateId && selectedTemplateId !== "custom"}
                    className={`w-full rounded-lg border border-border px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono ${
                      selectedTemplateId && selectedTemplateId !== "custom" ? "bg-surface-light/50 cursor-not-allowed" : "bg-background"
                    }`}
                  />
                </div>
              </div>
            </section>

            {/* Section: Recipients */}
            <section>
              <h3 className="mb-4 text-base font-semibold text-text">{recipientsSection}. Destinatários</h3>
              <div className="rounded-lg border border-border bg-surface p-4">
                <label className="flex items-center gap-3 text-sm font-medium text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAllContacts}
                    onChange={(e) => setSelectAllContacts(e.target.checked)}
                    className="rounded border-border h-4 w-4"
                  />
                  <span>
                    Enviar para todos os contatos ativos
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {activeContacts.length} contatos
                    </span>
                  </span>
                </label>
              </div>
            </section>

            {/* Action buttons */}
            <section className="flex flex-col gap-3 border-t border-border pt-6 pb-8 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => navigate("/campaigns")}>
                Cancelar
              </Button>
              <Button variant="secondary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? "Atualizar Rascunho" : "Salvar Rascunho"}
              </Button>
              <Button onClick={handleSaveAndSend} disabled={saving || missingRequired.length > 0}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isEditing ? "Atualizar & Enviar" : "Salvar & Enviar"}
              </Button>
            </section>
          </div>
        </div>

        {/* Right panel — Live Preview */}
        <div className="hidden w-1/2 shrink-0 border-l border-border bg-surface-light/30 lg:flex lg:flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text">Preview ao Vivo</h3>
            {html && (
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Eye className="h-3.5 w-3.5" />
                Tela cheia
              </button>
            )}
          </div>
          <div className="flex-1 overflow-hidden bg-white">
            {html ? (
              <iframe
                title="Live Preview"
                srcDoc={getPreviewHtml()}
                className="h-full w-full border-0"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">
                Selecione um template ou escreva HTML para ver o preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-3xl rounded-xl bg-surface shadow-2xl" style={{ height: "85vh" }}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-text">Preview do Email</h3>
              <button onClick={() => setShowPreview(false)} className="rounded-lg p-2 text-text-muted hover:bg-surface-light hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-64px)] overflow-hidden rounded-b-xl bg-white">
              <iframe
                title="Email Preview"
                srcDoc={getPreviewHtml()}
                className="h-full w-full border-0"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
