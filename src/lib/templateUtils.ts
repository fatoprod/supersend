/**
 * Shared constants and utilities for email template variable handling.
 * Used by CampaignEditorPage, TemplateEditorPage, and template services.
 */

/** Variables that are required — must be filled before sending */
export const REQUIRED_VARIABLES = new Set([
  "company",
  "title",
  "content",
  "subject",
]);

/** Human-readable labels for template variables */
export const VARIABLE_LABELS: Record<string, string> = {
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

/**
 * Extract all {{variable}} names from an HTML template string.
 * Returns a deduplicated array of variable names (without braces).
 */
export function extractVariables(html: string): string[] {
  const matches = html.match(/\{\{\s*([\w]+)\s*\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[\{\}\s]/g, "")))];
}

/**
 * Replace {{variable}} placeholders in HTML with provided values.
 * Only replaces variables that have a non-empty value.
 */
export function replaceVariables(
  html: string,
  vars: Record<string, string>
): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    if (value) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      result = result.replace(regex, value);
    }
  }
  return result;
}

/**
 * Remove unfilled optional variable placeholders from HTML.
 * - Removes <img> tags whose src contains {{variables}}
 * - Removes <a> tags whose href contains {{variables}}
 * - Removes remaining {{variable}} text
 * - Removes empty <p> tags left behind
 */
export function cleanUnfilledOptionalVars(html: string): string {
  let result = html;
  result = result.replace(
    /<img[^>]*src="[^"]*\{\{[^}]+\}\}[^"]*"[^>]*\/?>/gi,
    ""
  );
  result = result.replace(
    /<a[^>]*href="[^"]*\{\{[^}]+\}\}[^"]*"[^>]*>.*?<\/a>/gi,
    ""
  );
  result = result.replace(/\{\{\s*\w+\s*\}\}/g, "");
  result = result.replace(/<p[^>]*>\s*([·\s]|&middot;)*\s*<\/p>/gi, "");
  return result;
}
