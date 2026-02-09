import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout";
import { Button, Input } from "../components/ui";
import {
  ArrowLeft, Eye, Loader2, Save, Palette, RotateCcw, X, AlertCircle, CheckCircle2, Upload, Image,
} from "lucide-react";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useToast } from "../hooks";
import { uploadLogo, LOGO_GUIDELINES } from "../lib/services/storage";
import { useAuth } from "../hooks";
import type { EmailTemplate, EmailTemplateFormData } from "../types";

// Variables that are required — must be filled before sending a campaign
const REQUIRED_VARIABLES = new Set([
  "company", "title", "content",
]);

// Variables to exclude from the form (they are set elsewhere)
const EXCLUDED_VARIABLES = new Set(["subject", "logo_width"]);

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

const DEFAULT_COLORS: Record<string, string> = {
  primary: "#6366f1",
  titleText: "#1e1b4b",
  bodyText: "#4b5563",
  background: "#f4f4f7",
};

const COLOR_CONFIG: Record<string, { label: string; description: string }> = {
  primary: { label: "Primária", description: "Header, botões e links" },
  titleText: { label: "Título", description: "Cor do texto do título" },
  bodyText: { label: "Corpo", description: "Cor do texto do corpo" },
  background: { label: "Fundo", description: "Fundo do email" },
};

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f7; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #6366f1; padding: 32px 40px; text-align: center;">
              <img src="{{logo_url}}" alt="{{company}}" width="{{logo_width}}" height="auto" style="display: block; margin: 0 auto; max-width: {{logo_width}}px; height: auto;" />
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #c7d2fe; letter-spacing: 0.5px;">{{company}}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #1e1b4b; line-height: 1.3;">{{title}}</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">{{content}}</p>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 8px 0 0 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{cta_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">{{cta_text}}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                Você recebeu este email porque está inscrito em {{company}}.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                <a href="{{unsubscribe_url}}" style="color: #6366f1; text-decoration: underline;">Descadastrar</a> · <a href="{{preferences_url}}" style="color: #6366f1; text-decoration: underline;">Preferências</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #d1d5db;">
                {{company_address}}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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

function applyColors(html: string, colorMap: Record<string, string>): string {
  let result = html;
  for (const [key, defaultVal] of Object.entries(DEFAULT_COLORS)) {
    const newVal = colorMap[key];
    if (newVal && newVal.toLowerCase() !== defaultVal.toLowerCase()) {
      result = result.replaceAll(defaultVal, newVal);
    }
  }
  return result;
}

export function TemplateEditorPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const { user } = useAuth();
  const isEditing = !!templateId;

  const { data: templates } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoWidth, setLogoWidth] = useState(160);

  // Form state - use default HTML template for new templates
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState(isEditing ? "" : DEFAULT_HTML_TEMPLATE);
  const [text, setText] = useState("");
  const [colors, setColors] = useState<Record<string, string>>({ ...DEFAULT_COLORS });
  const [previewVars, setPreviewVars] = useState<Record<string, string>>(() => {
    if (isEditing) return {};
    // Initialize preview vars for default template
    const vars = extractVariables(DEFAULT_HTML_TEMPLATE);
    const defaults: Record<string, string> = {};
    for (const v of vars) defaults[v] = "";
    return defaults;
  });
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing template data for editing
  useEffect(() => {
    if (isEditing && templates && !loaded) {
      const template = templates.find((t: EmailTemplate) => t.id === templateId);
      if (template) {
        setName(template.name);
        setSubject(template.subject);
        setText(template.text || "");

        // Detect and restore colors from saved defaultVariables
        let templateHtml = template.html;
        const savedColors = { ...DEFAULT_COLORS };
        if (template.defaultVariables?._color_primary) {
          savedColors.primary = template.defaultVariables._color_primary;
          savedColors.titleText = template.defaultVariables._color_titleText || DEFAULT_COLORS.titleText;
          savedColors.bodyText = template.defaultVariables._color_bodyText || DEFAULT_COLORS.bodyText;
          savedColors.background = template.defaultVariables._color_background || DEFAULT_COLORS.background;
          // Reverse baked colors back to defaults so applyColors works correctly
          for (const [key, savedColor] of Object.entries(savedColors)) {
            const defaultColor = DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS];
            if (savedColor && defaultColor && savedColor.toLowerCase() !== defaultColor.toLowerCase()) {
              templateHtml = templateHtml.replaceAll(savedColor, defaultColor);
            }
          }
        }
        setHtml(templateHtml);
        setColors(savedColors);

        // Initialize preview vars from saved defaults or empty
        const vars = extractVariables(templateHtml);
        const defaults: Record<string, string> = {};
        for (const v of vars) defaults[v] = template.defaultVariables?.[v] || "";
        setPreviewVars(defaults);
        // Load saved logo width
        if (template.defaultVariables?.logo_width) {
          setLogoWidth(parseInt(template.defaultVariables.logo_width, 10) || 160);
        }
        setLoaded(true);
      }
    }
  }, [isEditing, templates, templateId, loaded]);

  // Detected variables - exclude variables that are set elsewhere (like subject)
  const detectedVars = useMemo(() => 
    extractVariables(html).filter(v => !EXCLUDED_VARIABLES.has(v)), [html]);

  // Validation for preview vars
  const missingRequired = useMemo(() => {
    return detectedVars.filter(
      (v) => REQUIRED_VARIABLES.has(v) && !previewVars[v]?.trim()
    );
  }, [detectedVars, previewVars]);

  const allVariablesFilled = useMemo(() => {
    return detectedVars.every((v) => !!previewVars[v]?.trim());
  }, [detectedVars, previewVars]);

  const colorsChanged = useMemo(() => {
    return Object.entries(colors).some(([key, val]) => val.toLowerCase() !== DEFAULT_COLORS[key].toLowerCase());
  }, [colors]);

  // Compute preview HTML
  const getPreviewHtml = () => {
    let result = html;
    // Apply colors
    result = applyColors(result, colors);
    // Replace variables filled for preview
    result = replaceVariables(result, { ...previewVars, logo_width: String(logoWidth) });
    // Clean unfilled optional vars
    result = cleanUnfilledOptionalVars(result);
    // Force logo width on the first <img> tag (handles both {{logo_width}} and baked-in values)
    result = result.replace(/<img\b([^>]*)>/i, (_match, attrs) => {
      let newAttrs = attrs.replace(/\bwidth="[^"]*"/, `width="${logoWidth}"`);
      newAttrs = newAttrs.replace(/max-width:\s*\d+px/, `max-width: ${logoWidth}px`);
      return `<img${newAttrs}>`;
    });
    return result;
  };

  const handleColorChange = (key: string, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetColors = () => {
    setColors({ ...DEFAULT_COLORS });
  };

  const handlePreviewVarChange = (key: string, value: string) => {
    setPreviewVars((prev) => ({ ...prev, [key]: value }));
  };

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadingLogo(true);
    try {
      const result = await uploadLogo(user.uid, file);
      handlePreviewVarChange("logo_url", result.url);
      toast.success("Logo enviado com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar logo", String(error));
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // When saving, persist the HTML with colors baked in (variables remain as {{...}})
  const getSaveHtml = () => {
    return applyColors(html, colors);
  };

  // Generate plain text from HTML
  const generatePlainText = (htmlContent: string): string => {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Remove script and style tags
    tempDiv.querySelectorAll('script, style').forEach(el => el.remove());
    
    // Get text content
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single
      .replace(/\n\s*\n/g, '\n\n')    // Clean up multiple newlines
      .trim();
    
    return text;
  };

  // Auto-generate text when HTML changes
  const handleAutoGenerateText = () => {
    const plainText = generatePlainText(getPreviewHtml());
    setText(plainText);
    toast.success("Texto plano gerado automaticamente");
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!subject.trim()) { toast.error("Assunto é obrigatório"); return; }
    if (!html.trim()) { toast.error("Conteúdo HTML é obrigatório"); return; }

    setSaving(true);
    // Filter out empty values from previewVars
    const defaultVariables: Record<string, string> = {};
    for (const [key, value] of Object.entries(previewVars)) {
      if (value.trim()) defaultVariables[key] = value.trim();
    }
    // Always save logo width
    defaultVariables.logo_width = String(logoWidth);
    // Save colors so they can be restored when editing
    defaultVariables._color_primary = colors.primary;
    defaultVariables._color_titleText = colors.titleText;
    defaultVariables._color_bodyText = colors.bodyText;
    defaultVariables._color_background = colors.background;
    
    const data: EmailTemplateFormData = {
      name,
      subject,
      html: getSaveHtml(),
      text: text || "",
      defaultVariables: Object.keys(defaultVariables).length > 0 ? defaultVariables : {},
    };

    try {
      if (isEditing) {
        await updateTemplate.mutateAsync({ templateId: templateId!, data });
        toast.success("Template atualizado");
      } else {
        await createTemplate.mutateAsync(data);
        toast.success("Template criado");
      }
      navigate("/templates");
    } catch (error) {
      toast.error("Erro ao salvar template", String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header
        title={isEditing ? "Editar Template" : "Novo Template"}
        subtitle={isEditing ? `Editando: ${name}` : "Configure seu template de email"}
      />

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Left panel — Form */}
        <div className="w-1/2 overflow-y-auto p-6">
          <button
            onClick={() => navigate("/templates")}
            className="mb-6 flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para templates
          </button>

          <div className="space-y-8">
            {/* Section 1: Basic info */}
            <section>
              <h3 className="mb-4 text-base font-semibold text-text">1. Informações</h3>
              <div className="space-y-4">
                <Input
                  label="Nome do Template *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Newsletter Mensal"
                />
                <div>
                  <Input
                    label="Assunto *"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Use {{variavel}} para placeholders"
                  />
                  <div className="mt-2 rounded-lg bg-surface-light/50 p-3">
                    <p className="text-xs font-medium text-text-muted mb-2">Variáveis disponíveis:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(VARIABLE_LABELS).map(([key, label]) => (
                        <code
                          key={key}
                          className="rounded bg-surface px-2 py-0.5 text-[11px] text-text-muted cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => setSubject(subject + `{{${key}}}`)}
                          title={`Clique para inserir: ${label}`}
                        >
                          {`{{${key}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Colors */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-text flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  2. Cores
                </h3>
                {colorsChanged && (
                  <button
                    type="button"
                    onClick={handleResetColors}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Resetar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(COLOR_CONFIG).map(([key, config]) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
                  >
                    <input
                      type="color"
                      value={colors[key] || DEFAULT_COLORS[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{config.label}</p>
                      <p className="text-xs text-text-muted">{config.description}</p>
                    </div>
                    <code className="ml-auto hidden text-[10px] text-text-muted sm:block">
                      {(colors[key] || DEFAULT_COLORS[key]).toUpperCase()}
                    </code>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: HTML Content */}
            <section>
              <h3 className="mb-4 text-base font-semibold text-text">3. Conteúdo HTML</h3>
              <textarea
                value={html}
                onChange={(e) => {
                  setHtml(e.target.value);
                  // Update preview vars when html changes
                  const vars = extractVariables(e.target.value);
                  setPreviewVars((prev) => {
                    const next: Record<string, string> = {};
                    for (const v of vars) next[v] = prev[v] || "";
                    return next;
                  });
                }}
                placeholder="<html>...</html>"
                rows={12}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
              />
            </section>

            {/* Section 4: Plain text */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-text">4. Texto Plano (opcional)</h3>
                <button
                  type="button"
                  onClick={handleAutoGenerateText}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Gerar do HTML
                </button>
              </div>
              <p className="mb-3 text-xs text-text-muted">
                Versão em texto puro do email, exibida quando o cliente não suporta HTML. Clique em "Gerar do HTML" para criar automaticamente.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Versão em texto plano do email..."
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </section>

            {/* Section 5: Variables - Default values saved with template */}
            {detectedVars.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-text">5. Valores Padrão das Variáveis</h3>
                  {allVariablesFilled ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Todas preenchidas
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-text-muted">
                      {detectedVars.filter((v) => !!previewVars[v]?.trim()).length}/{detectedVars.length} preenchidas
                    </span>
                  )}
                </div>
                <p className="mb-3 text-xs text-text-muted">
                  Preencha os valores padrão das variáveis. Esses valores serão salvos com o template e pré-preenchidos ao criar campanhas.
                </p>

                <div className="space-y-3">
                  {detectedVars.map((key) => {
                    const isRequired = REQUIRED_VARIABLES.has(key);
                    const isFilled = !!previewVars[key]?.trim();
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
                            value={previewVars[key] || ""}
                            onChange={(e) => handlePreviewVarChange(key, e.target.value)}
                            placeholder={`Digite ${(VARIABLE_LABELS[key] || key).toLowerCase()}...`}
                            rows={3}
                            className={`w-full rounded-lg border px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                              isRequired && !isFilled
                                ? "border-error/50 bg-error/5 focus:border-error"
                                : "border-border bg-background focus:border-primary"
                            }`}
                          />
                        ) : key === "logo_url" ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={previewVars[key] || ""}
                                onChange={(e) => handlePreviewVarChange(key, e.target.value)}
                                placeholder="https://exemplo.com/logo.png"
                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingLogo}
                                className="shrink-0"
                              >
                                {uploadingLogo ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <div className="flex items-start gap-2 rounded-lg bg-surface-light/50 p-2">
                              <Image className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                              <p className="text-xs text-text-muted">
                                <strong>Formatos:</strong> {LOGO_GUIDELINES.formats.join(", ")} (máx. {LOGO_GUIDELINES.maxSize})<br />
                                <strong>Tamanho recomendado:</strong> {LOGO_GUIDELINES.recommendedWidth}×{LOGO_GUIDELINES.recommendedHeight}px ({LOGO_GUIDELINES.aspectRatio})<br />
                                {LOGO_GUIDELINES.notes}
                              </p>
                            </div>
                            {/* Logo Width Slider */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-text-muted">Largura do logo</label>
                                <span className="text-xs font-semibold text-text">{logoWidth}px</span>
                              </div>
                              <input
                                type="range"
                                min={40}
                                max={400}
                                step={10}
                                value={logoWidth}
                                onChange={(e) => setLogoWidth(Number(e.target.value))}
                                className="w-full accent-primary"
                              />
                              <div className="flex justify-between text-[10px] text-text-muted">
                                <span>40px</span>
                                <span>400px</span>
                              </div>
                            </div>
                            {previewVars[key] && (
                              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
                                <img src={previewVars[key]} alt="Logo preview" style={{ maxWidth: `${logoWidth}px` }} className="h-auto object-contain" />
                                <span className="text-xs text-text-muted truncate flex-1">{previewVars[key]}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type={key.includes("url") ? "url" : "text"}
                            value={previewVars[key] || ""}
                            onChange={(e) => handlePreviewVarChange(key, e.target.value)}
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

            {/* Action buttons */}
            <section className="flex flex-col gap-3 border-t border-border pt-6 pb-8 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => navigate("/templates")}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? "Salvar Alterações" : "Criar Template"}
              </Button>
            </section>
          </div>
        </div>

        {/* Right panel — Live Preview (sticky) */}
        <div className="hidden w-1/2 shrink-0 border-l border-border bg-surface-light/30 lg:flex lg:flex-col sticky top-0 h-full">
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
                Escreva o HTML para ver o preview
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
