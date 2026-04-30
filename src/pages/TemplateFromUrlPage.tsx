import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/layout";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "../components/ui";
import {
  ArrowLeft,
  Wand2,
  Loader2,
  Globe,
  Save,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useCreateTemplate, useToast } from "../hooks";
import { generateTemplateFromUrl } from "../lib/services/templateGenerator";
import { replaceVariables, cleanUnfilledOptionalVars } from "../lib/templateUtils";
import type { ExtractedBrand } from "../types";

interface ColorOverrides {
  primary: string;
  titleText: string;
  bodyText: string;
  background: string;
}

const COLOR_LABELS: Record<keyof ColorOverrides, string> = {
  primary: "Primária",
  titleText: "Título",
  bodyText: "Corpo",
  background: "Fundo",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatContent(text: string): string {
  // Escape and convert newlines to <br>; preserve paragraph spacing
  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}

/** Re-bake colors: replace original extracted colors in html with current overrides */
function applyColorOverrides(
  html: string,
  original: ColorOverrides,
  current: ColorOverrides
): string {
  let result = html;
  for (const key of Object.keys(original) as (keyof ColorOverrides)[]) {
    const from = original[key];
    const to = current[key];
    if (from && to && from.toLowerCase() !== to.toLowerCase()) {
      // Replace case-insensitive while preserving the new value's case
      const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      result = result.replace(re, to);
    }
  }
  return result;
}

export function TemplateFromUrlPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createTemplate = useCreateTemplate();

  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [brand, setBrand] = useState<ExtractedBrand | null>(null);
  const [originalColors, setOriginalColors] = useState<ColorOverrides | null>(null);
  const [colors, setColors] = useState<ColorOverrides | null>(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ctaText, setCtaText] = useState("Saiba mais");
  const [ctaUrl, setCtaUrl] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [logoUrlOverride, setLogoUrlOverride] = useState("");

  const [saving, setSaving] = useState(false);

  const handleExtract = async () => {
    if (!url.trim()) {
      setExtractError("Cole uma URL válida.");
      return;
    }
    setExtracting(true);
    setExtractError(null);
    try {
      const result = await generateTemplateFromUrl(url.trim());
      setGeneratedHtml(result.html);
      setBrand(result.brand);
      const c: ColorOverrides = { ...result.brand.colors };
      setOriginalColors(c);
      setColors({ ...c });
      setName((prev) => prev || result.suggestedTemplateName);
      setSubject((prev) => prev || result.suggestedSubject);
      setLogoUrlOverride((prev) => prev || result.brand.logoUrl || "");
      toast.success("Marca extraída", "Preencha os campos e gere o template.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExtractError(msg);
      toast.error("Falha ao buscar URL", msg);
    } finally {
      setExtracting(false);
    }
  };

  const previewHtml = useMemo(() => {
    if (!generatedHtml || !originalColors || !colors || !brand) return "";
    let html = applyColorOverrides(generatedHtml, originalColors, colors);
    const vars: Record<string, string> = {
      title: title || "Seu título aqui",
      content: formatContent(content || "Seu conteúdo aqui."),
      subject: subject || brand.suggestedSubject,
      company: brand.brandName || "Sua empresa",
      logo_url: logoUrlOverride || brand.logoUrl || "",
      logo_width: "160",
      cta_text: ctaText,
      cta_url: ctaUrl || "#",
      company_address: companyAddress,
      unsubscribe_url: "#",
      preferences_url: "#",
    };
    html = replaceVariables(html, vars);
    html = cleanUnfilledOptionalVars(html);
    return html;
  }, [
    generatedHtml,
    originalColors,
    colors,
    brand,
    title,
    content,
    subject,
    logoUrlOverride,
    ctaText,
    ctaUrl,
    companyAddress,
  ]);

  const canSave =
    !!generatedHtml &&
    !!brand &&
    !!colors &&
    !!originalColors &&
    name.trim().length > 0 &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    subject.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || !generatedHtml || !brand || !originalColors || !colors) return;
    setSaving(true);
    try {
      // Bake user overrides into the HTML, but keep Mustache vars intact
      const finalHtml = applyColorOverrides(generatedHtml, originalColors, colors);

      const defaultVariables: Record<string, string> = {
        company: brand.brandName || "",
        title: title,
        content: content,
        subject: subject,
        cta_text: ctaText,
        cta_url: ctaUrl,
        logo_url: logoUrlOverride || brand.logoUrl || "",
        logo_width: "160",
        company_address: companyAddress,
        // Color metadata for TemplateEditorPage to reverse-bake on load
        _color_primary: colors.primary,
        _color_titleText: colors.titleText,
        _color_bodyText: colors.bodyText,
        _color_background: colors.background,
      };

      const id = await createTemplate.mutateAsync({
        name: name.trim(),
        subject: subject.trim(),
        html: finalHtml,
        defaultVariables,
      });
      toast.success("Template criado");
      navigate(`/templates/${id}/edit`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao salvar", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header
        title="Gerar template a partir de URL"
        subtitle="Cole a URL de um site e geramos um template usando a identidade da marca"
      />

      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/templates")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: Form */}
          <div className="space-y-6">
            {/* Step 1: URL */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  1. URL de referência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://exemplo.com.br"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !extracting) handleExtract();
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleExtract} disabled={extracting || !url.trim()}>
                    {extracting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Buscar marca
                      </>
                    )}
                  </Button>
                </div>
                {extractError && (
                  <div className="flex items-start gap-2 rounded border border-error/40 bg-error/10 p-2 text-sm text-error">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{extractError}</span>
                  </div>
                )}
                {brand && (
                  <div className="flex items-start gap-2 rounded border border-success/40 bg-success/10 p-2 text-sm text-success">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      Marca extraída de{" "}
                      <strong>{brand.brandName || new URL(brand.sourceUrl).hostname}</strong>.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Brand customization (only after extract) */}
            {brand && colors && (
              <Card>
                <CardHeader>
                  <CardTitle>2. Identidade visual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">Logo</label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-24 items-center justify-center rounded border border-border bg-surface-light">
                        {logoUrlOverride ? (
                          <img
                            src={logoUrlOverride}
                            alt="Logo"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-text-muted" />
                        )}
                      </div>
                      <Input
                        value={logoUrlOverride}
                        onChange={(e) => setLogoUrlOverride(e.target.value)}
                        placeholder="URL do logo"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(COLOR_LABELS) as (keyof ColorOverrides)[]).map((key) => (
                      <div key={key}>
                        <label className="mb-1 block text-sm font-medium text-text">
                          {COLOR_LABELS[key]}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors[key]}
                            onChange={(e) =>
                              setColors((prev) => prev && { ...prev, [key]: e.target.value })
                            }
                            className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                          />
                          <Input
                            value={colors[key]}
                            onChange={(e) =>
                              setColors((prev) => prev && { ...prev, [key]: e.target.value })
                            }
                            className="flex-1 font-mono text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Content */}
            {brand && (
              <Card>
                <CardHeader>
                  <CardTitle>3. Conteúdo do email</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">
                      Nome do template *
                    </label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">Assunto *</label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">Título *</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">Conteúdo *</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                      className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                      placeholder="Texto principal do email. Use Enter para quebrar linhas."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text">
                        Texto do botão
                      </label>
                      <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text">
                        URL do botão
                      </label>
                      <Input
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">
                      Endereço da empresa (rodapé)
                    </label>
                    <Input
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="Rua Exemplo, 123 — Cidade/UF"
                    />
                  </div>

                  <Button onClick={handleSave} disabled={!canSave || saving} className="w-full">
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar template
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Preview */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {previewHtml ? (
                  <iframe
                    title="Preview"
                    sandbox=""
                    srcDoc={previewHtml}
                    className="h-[80vh] w-full rounded border border-border bg-white"
                  />
                ) : (
                  <div className="flex h-[80vh] items-center justify-center rounded border border-dashed border-border text-text-muted">
                    {extracting
                      ? "Buscando marca..."
                      : "Cole uma URL e clique em Buscar marca para começar"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
