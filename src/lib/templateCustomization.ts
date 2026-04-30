/**
 * Template customization helpers.
 *
 * Pure functions to apply/extract layout customization on top of an
 * email-safe HTML template. All transformations are inline-CSS so the
 * resulting HTML stays compatible with Gmail, Outlook, Apple Mail, etc.
 *
 * The DEFAULT_HTML_TEMPLATE uses HTML comment markers like
 *   <!-- region:title --> ... <!-- /region:title -->
 * to identify regions for transformation. For HTML without markers
 * (legacy templates), best-effort regex fallbacks are applied.
 */

export type Alignment = "left" | "center" | "right";
export type Density = "compact" | "normal" | "spacious";
export type CtaStyle = "solid" | "outline" | "link";
export type FontScale = "sm" | "md" | "lg";

export interface TemplateCustomization {
  alignTitle: Alignment;
  alignBody: Alignment;
  alignCta: Alignment;
  showCompany: boolean;
  showHeader: boolean;
  showDivider: boolean;
  showFooter: boolean;
  density: Density;
  ctaStyle: CtaStyle;
  fontScale: FontScale;
  fontFamily: string;
  /** Google Fonts CSS2 link href (without leading <link>). Empty = system font. */
  googleFontHref?: string;
}

export const DEFAULT_CUSTOMIZATION: TemplateCustomization = {
  alignTitle: "left",
  alignBody: "left",
  alignCta: "left",
  showCompany: true,
  showHeader: true,
  showDivider: true,
  showFooter: true,
  density: "normal",
  ctaStyle: "solid",
  fontScale: "md",
  fontFamily:
    "'Helvetica Neue', Helvetica, Arial, sans-serif",
  googleFontHref: undefined,
};

export interface GoogleFontDef {
  id: string;
  label: string;
  family: string;
  /** Stack used when applying inline (Google name + safe fallbacks). */
  stack: string;
  /** Google Fonts CSS2 link query (e.g. 'Inter:wght@400;600;700'). */
  query?: string;
  category: "sans" | "serif" | "mono" | "system";
}

export const GOOGLE_FONTS: GoogleFontDef[] = [
  {
    id: "system",
    label: "Sistema (padrão)",
    family: "System",
    stack: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    category: "system",
  },
  {
    id: "inter",
    label: "Inter",
    family: "Inter",
    stack: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    query: "Inter:wght@400;600;700",
    category: "sans",
  },
  {
    id: "roboto",
    label: "Roboto",
    family: "Roboto",
    stack: "'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    query: "Roboto:wght@400;500;700",
    category: "sans",
  },
  {
    id: "open-sans",
    label: "Open Sans",
    family: "Open Sans",
    stack: "'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    query: "Open+Sans:wght@400;600;700",
    category: "sans",
  },
  {
    id: "lato",
    label: "Lato",
    family: "Lato",
    stack: "'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    query: "Lato:wght@400;700;900",
    category: "sans",
  },
  {
    id: "poppins",
    label: "Poppins",
    family: "Poppins",
    stack: "'Poppins', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    query: "Poppins:wght@400;500;600;700",
    category: "sans",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: "Montserrat",
    stack: "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    query: "Montserrat:wght@400;600;700",
    category: "sans",
  },
  {
    id: "nunito",
    label: "Nunito",
    family: "Nunito",
    stack: "'Nunito', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    query: "Nunito:wght@400;600;700",
    category: "sans",
  },
  {
    id: "source-sans-3",
    label: "Source Sans 3",
    family: "Source Sans 3",
    stack: "'Source Sans 3', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    query: "Source+Sans+3:wght@400;600;700",
    category: "sans",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    family: "Merriweather",
    stack: "'Merriweather', Georgia, 'Times New Roman', serif",
    query: "Merriweather:wght@400;700",
    category: "serif",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    family: "Playfair Display",
    stack: "'Playfair Display', Georgia, 'Times New Roman', serif",
    query: "Playfair+Display:wght@400;700",
    category: "serif",
  },
  {
    id: "lora",
    label: "Lora",
    family: "Lora",
    stack: "'Lora', Georgia, 'Times New Roman', serif",
    query: "Lora:wght@400;600;700",
    category: "serif",
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    family: "JetBrains Mono",
    stack: "'JetBrains Mono', Menlo, Consolas, 'Courier New', monospace",
    query: "JetBrains+Mono:wght@400;600",
    category: "mono",
  },
];

export function findFontById(id: string): GoogleFontDef | undefined {
  return GOOGLE_FONTS.find((f) => f.id === id);
}

/** Build the full Google Fonts CSS2 URL from a font definition. */
export function googleFontUrl(font: GoogleFontDef): string | undefined {
  if (!font.query) return undefined;
  return `https://fonts.googleapis.com/css2?family=${font.query}&display=swap`;
}

// ---------- Density / scale tables ----------

const DENSITY_PADDING: Record<Density, { container: string; cta: string }> = {
  // container = "vertical horizontal" pairs used in <td style="padding:..."
  compact: { container: "28px 28px 24px 28px", cta: "10px 22px" },
  normal: { container: "44px 44px 36px 44px", cta: "14px 32px" },
  spacious: { container: "56px 56px 48px 56px", cta: "18px 40px" },
};

const FONT_SCALE: Record<FontScale, { title: number; body: number }> = {
  sm: { title: 22, body: 14 },
  md: { title: 26, body: 16 },
  lg: { title: 30, body: 18 },
};

// ---------- Apply ----------

/** Apply all customization options to an HTML template string. Pure. */
export function applyCustomization(
  html: string,
  c: TemplateCustomization
): string {
  let result = html;

  // 1. Font family — replace inline font-family declarations.
  result = applyFontFamily(result, c.fontFamily);

  // 2. Google Font <link> + @import in <head>.
  result = applyGoogleFontHead(result, c.googleFontHref);

  // 3. Font scale — title/body sizes.
  const scale = FONT_SCALE[c.fontScale];
  result = applyFontScale(result, scale);

  // 4. Density — container and CTA padding.
  const density = DENSITY_PADDING[c.density];
  result = applyDensity(result, density);

  // 5. Alignment — title, body, CTA wrapper.
  result = applyAlignment(result, "title", c.alignTitle);
  result = applyAlignment(result, "body", c.alignBody);
  result = applyCtaAlignment(result, c.alignCta);

  // 6. CTA style — solid / outline / link.
  result = applyCtaStyle(result, c.ctaStyle);

  // 7. Section visibility — header, divider, footer.
  if (!c.showHeader) result = removeRegion(result, "header");
  if (!c.showDivider) result = removeRegion(result, "divider");
  if (!c.showFooter) result = removeRegion(result, "footer");

  // 8. Show/hide company name in header.
  if (!c.showCompany) result = hideCompany(result);

  return result;
}

/** Read customization from saved defaultVariables._* metadata. Falls back to defaults. */
export function extractCustomization(
  defaultVars: Record<string, string> | undefined
): TemplateCustomization {
  const v = defaultVars || {};
  const align = (s: string | undefined, fallback: Alignment): Alignment =>
    s === "left" || s === "center" || s === "right" ? s : fallback;
  const bool = (s: string | undefined, fallback: boolean): boolean =>
    s === "true" ? true : s === "false" ? false : fallback;

  const density: Density =
    v._density === "compact" || v._density === "spacious"
      ? v._density
      : "normal";
  const ctaStyle: CtaStyle =
    v._cta_style === "outline" || v._cta_style === "link"
      ? v._cta_style
      : "solid";
  const fontScale: FontScale =
    v._font_scale === "sm" || v._font_scale === "lg" ? v._font_scale : "md";

  return {
    alignTitle: align(v._align_title, "left"),
    alignBody: align(v._align_body, "left"),
    alignCta: align(v._align_cta, "left"),
    showCompany: bool(v._show_company, true),
    showHeader: bool(v._show_header, true),
    showDivider: bool(v._show_divider, true),
    showFooter: bool(v._show_footer, true),
    density,
    ctaStyle,
    fontScale,
    fontFamily: v._font_family || DEFAULT_CUSTOMIZATION.fontFamily,
    googleFontHref: v._google_font_href || undefined,
  };
}

/** Serialize customization into the defaultVariables metadata shape. */
export function serializeCustomization(
  c: TemplateCustomization
): Record<string, string> {
  const out: Record<string, string> = {
    _align_title: c.alignTitle,
    _align_body: c.alignBody,
    _align_cta: c.alignCta,
    _show_company: String(c.showCompany),
    _show_header: String(c.showHeader),
    _show_divider: String(c.showDivider),
    _show_footer: String(c.showFooter),
    _density: c.density,
    _cta_style: c.ctaStyle,
    _font_scale: c.fontScale,
    _font_family: c.fontFamily,
  };
  if (c.googleFontHref) out._google_font_href = c.googleFontHref;
  return out;
}

// ---------- Internal transforms ----------

const FONT_MARKER = /font-family\s*:\s*[^;"]+/gi;

function applyFontFamily(html: string, family: string): string {
  // Replace every inline font-family declaration. Use only single quotes in the
  // replacement so we don't break the surrounding double-quoted style="" attribute.
  const safe = family.replace(/"/g, "'");
  return html.replace(FONT_MARKER, `font-family: ${safe}`);
}

function applyGoogleFontHead(html: string, href?: string): string {
  // Strip previously injected font block (idempotent).
  let result = html.replace(
    /<!-- supersend:google-font-start -->[\s\S]*?<!-- supersend:google-font-end -->\s*/g,
    ""
  );
  if (!href) return result;
  const block =
    `<!-- supersend:google-font-start -->\n` +
    `  <link href="${escapeAttr(href)}" rel="stylesheet">\n` +
    `  <style>@import url('${escapeAttr(href)}');</style>\n` +
    `  <!-- supersend:google-font-end -->\n`;
  // Inject right before </head> if present, else right after <head>.
  if (/<\/head>/i.test(result)) {
    result = result.replace(/<\/head>/i, `${block}</head>`);
  } else {
    result = block + result;
  }
  return result;
}

function applyFontScale(
  html: string,
  scale: { title: number; body: number }
): string {
  let result = html;
  // Title <h1>: replace its font-size declaration.
  result = result.replace(
    /(<h1\b[^>]*\bstyle\s*=\s*"[^"]*?font-size\s*:\s*)\d+(?:\.\d+)?px/i,
    (_m, prefix) => `${prefix}${scale.title}px`
  );
  // Body paragraph (first <p> with font-size: 16px style — generic enough). Also
  // hit the marker-tagged region:body when present.
  result = result.replace(
    /(<!-- region:body -->[\s\S]*?<p\b[^>]*\bstyle\s*=\s*"[^"]*?font-size\s*:\s*)\d+(?:\.\d+)?px/i,
    (_m, prefix) => `${prefix}${scale.body}px`
  );
  // Fallback when no markers: first <p> after first <h1>.
  if (!/region:body/.test(result)) {
    result = result.replace(
      /(<h1\b[\s\S]*?<\/h1>[\s\S]*?<p\b[^>]*\bstyle\s*=\s*"[^"]*?font-size\s*:\s*)\d+(?:\.\d+)?px/i,
      (_m, prefix) => `${prefix}${scale.body}px`
    );
  }
  return result;
}

function applyDensity(
  html: string,
  density: { container: string; cta: string }
): string {
  let result = html;
  // Content <td> padding — region:content marker preferred.
  result = result.replace(
    /(<!-- region:content -->\s*<td\b[^>]*\bstyle\s*=\s*"[^"]*?padding\s*:\s*)[^;"']+/i,
    (_m, prefix) => `${prefix}${density.container}`
  );
  // Fallback: any <td> with padding "44px 44px 36px 44px" (the original default).
  result = result.replace(
    /padding\s*:\s*44px\s+44px\s+36px\s+44px/g,
    `padding: ${density.container}`
  );
  // CTA button padding — match the <a> with display:inline-block.
  result = result.replace(
    /(<a\b[^>]*\bstyle\s*=\s*"[^"]*?display\s*:\s*inline-block\s*;\s*padding\s*:\s*)[^;"']+/i,
    (_m, prefix) => `${prefix}${density.cta}`
  );
  return result;
}

function applyAlignment(
  html: string,
  region: "title" | "body",
  align: Alignment
): string {
  // Update text-align inside the region's element <h1>/<p>.
  const tag = region === "title" ? "h1" : "p";
  const regionRe = new RegExp(
    `(<!-- region:${region} -->[\\s\\S]*?<${tag}\\b[^>]*\\bstyle\\s*=\\s*")([^"]*)(")`,
    "i"
  );
  if (regionRe.test(html)) {
    return html.replace(regionRe, (_m, p1, styleStr, p3) => {
      const updated = upsertStyle(styleStr, "text-align", align);
      return `${p1}${updated}${p3}`;
    });
  }
  // Fallback: first <h1> or <p> without region marker.
  const fallbackRe = new RegExp(
    `(<${tag}\\b[^>]*\\bstyle\\s*=\\s*")([^"]*)(")`,
    "i"
  );
  return html.replace(fallbackRe, (_m, p1, styleStr, p3) => {
    const updated = upsertStyle(styleStr, "text-align", align);
    return `${p1}${updated}${p3}`;
  });
}

function applyCtaAlignment(html: string, align: Alignment): string {
  let result = html;

  // 1) Set the deprecated `align` attribute on the wrapper <table> (Outlook & some clients).
  const tableTagRe =
    /(<!-- region:cta -->\s*<table\b)([^>]*?)(>)/i;
  result = result.replace(tableTagRe, (_m, open, attrs, close) => {
    let next = attrs;
    if (/\salign\s*=\s*"[^"]*"/i.test(next)) {
      next = next.replace(/\salign\s*=\s*"[^"]*"/i, ` align="${align}"`);
    } else {
      next = ` align="${align}"` + next;
    }
    return `${open}${next}${close}`;
  });

  // 2) Update the wrapper <table>'s inline margin so it actually centers/right-aligns
  // in clients that ignore the `align` attribute (Gmail web, Apple Mail, browsers).
  const margin =
    align === "center"
      ? "8px auto 0 auto"
      : align === "right"
      ? "8px 0 0 auto"
      : "8px 0 0 0";
  const styleRe =
    /(<!-- region:cta -->\s*<table\b[^>]*\bstyle\s*=\s*")([^"]*)(")/i;
  if (styleRe.test(result)) {
    result = result.replace(styleRe, (_m, p1, styleStr, p3) => {
      const updated = upsertStyle(styleStr, "margin", margin);
      return `${p1}${updated}${p3}`;
    });
  }

  // 3) Also align the parent <td> via text-align — safer fallback for some clients.
  // The CTA lives inside the content <td>; we want the CTA aligned but title/body keep
  // their own text-align (set inline on <h1>/<p>). text-align on the parent affects
  // inline/inline-block content (the CTA `<a>` is inline-block), which gives consistent
  // behavior across clients that strip the table align attribute.
  // We update text-align of the content <td> only when the CTA region is present.
  if (/<!-- region:cta -->/i.test(result)) {
    result = result.replace(
      /(<!-- region:content -->\s*<tr>\s*<td\b[^>]*\bstyle\s*=\s*")([^"]*)(")/i,
      (_m, p1, styleStr, p3) => {
        const updated = upsertStyle(styleStr, "text-align", align);
        return `${p1}${updated}${p3}`;
      }
    );
  }

  return result;
}

function applyCtaStyle(html: string, style: CtaStyle): string {
  // Match the visible <a> element (not the VML mso fallback).
  const aRe = /(<a\b[^>]*\bstyle\s*=\s*")([^"]*display\s*:\s*inline-block[^"]*)(")/i;
  return html.replace(aRe, (_m, p1, styleStr, p3) => {
    let s = styleStr;
    // Read primary color from existing background-color OR color.
    const bgMatch = s.match(/background-color\s*:\s*([#\w(),.\s%]+?)(?=;|$)/i);
    const primary = (bgMatch && bgMatch[1].trim()) || "#6366f1";

    if (style === "solid") {
      s = upsertStyle(s, "background-color", primary);
      s = upsertStyle(s, "color", "#ffffff");
      s = upsertStyle(s, "border", "none");
      s = upsertStyle(s, "text-decoration", "none");
    } else if (style === "outline") {
      s = upsertStyle(s, "background-color", "transparent");
      s = upsertStyle(s, "color", primary);
      s = upsertStyle(s, "border", `2px solid ${primary}`);
      s = upsertStyle(s, "text-decoration", "none");
    } else {
      // link
      s = upsertStyle(s, "background-color", "transparent");
      s = upsertStyle(s, "color", primary);
      s = upsertStyle(s, "border", "none");
      s = upsertStyle(s, "text-decoration", "underline");
      s = upsertStyle(s, "padding", "0");
    }
    return `${p1}${s}${p3}`;
  });
}

function removeRegion(html: string, region: string): string {
  // Remove from <!-- region:NAME --> up to <!-- /region:NAME -->.
  // Markers wrap a complete <tr>...</tr> so removing them keeps the table valid.
  const re = new RegExp(
    `<!-- region:${region} -->[\\s\\S]*?<!-- /region:${region} -->`,
    "g"
  );
  if (re.test(html)) return html.replace(re, "");
  // Legacy fallback: try to remove a <tr> containing the marker keyword.
  // (No-op when not found.)
  return html;
}

function hideCompany(html: string): string {
  // Replace the <p>{{company}}</p> in header with empty (keep parent intact).
  // Marker: <!-- region:company-name --> ... <!-- /region:company-name -->
  const re =
    /<!-- region:company-name -->[\s\S]*?<!-- \/region:company-name -->/;
  if (re.test(html)) return html.replace(re, "");
  // Legacy fallback: remove the specific <p> with {{company}} only.
  return html.replace(
    /<p\b[^>]*>\s*\{\{\s*company\s*\}\}\s*<\/p>\s*/i,
    ""
  );
}

// ---------- helpers ----------

function upsertStyle(styleStr: string, prop: string, value: string): string {
  const re = new RegExp(`(^|;)\\s*${escapeReg(prop)}\\s*:\\s*[^;]*`, "i");
  if (re.test(styleStr)) {
    return styleStr.replace(re, (_m, sep) => `${sep}${prop}: ${value}`);
  }
  const trimmed = styleStr.trim().replace(/;+$/, "");
  return trimmed ? `${trimmed}; ${prop}: ${value}` : `${prop}: ${value}`;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}
