import * as cheerio from "cheerio";
import * as dns from "dns/promises";
import * as net from "net";
// @ts-ignore - node-vibrant has loose typings on Node entry
import Vibrant from "node-vibrant";

export interface ExtractedBrand {
  sourceUrl: string;
  logoUrl?: string;
  brandName?: string;
  colors: {
    primary: string;
    titleText: string;
    bodyText: string;
    background: string;
  };
  fontFamily: string;
  suggestedSubject: string;
  suggestedTemplateName: string;
}

const DEFAULTS = {
  primary: "#6366f1",
  titleText: "#1e1b4b",
  bodyText: "#4b5563",
  background: "#f4f4f7",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB
const USER_AGENT = "SuperSendBrandBot/1.0 (+https://supersendapp.web.app)";

function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 0) return true;
    if (parts[0] >= 224) return true; // multicast / reserved
    return false;
  }
  // IPv6: block loopback / link-local / unique-local
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower === "::") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
  if (!hostname) throw new Error("Hostname inválido");
  if (hostname === "localhost") throw new Error("Hostname não permitido");
  // Reject literal IPs that are private right away
  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error("IP privado não permitido");
  }
  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const rec of records) {
      if (isPrivateIp(rec.address)) {
        throw new Error("Hostname resolve para IP privado");
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOTFOUND") {
      throw new Error("Hostname não encontrado");
    }
    throw err;
  }
}

function normalizeUrl(input: string): URL {
  let u = input.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  const parsed = new URL(u);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Apenas URLs http(s) são permitidas");
  }
  return parsed;
}

async function fetchHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "user-agent": USER_AGENT,
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`URL retornou status ${res.status}`);
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("html") && !ct.includes("xml") && ct !== "") {
      throw new Error(`Tipo de conteúdo não suportado: ${ct}`);
    }
    const reader = res.body?.getReader();
    if (!reader) {
      const txt = await res.text();
      return txt.slice(0, MAX_BODY_BYTES);
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        if (total > MAX_BODY_BYTES) {
          try { await reader.cancel(); } catch {/* ignore */}
          break;
        }
        chunks.push(value);
      }
    }
    return Buffer.concat(chunks.map(c => Buffer.from(c))).toString("utf-8");
  } finally {
    clearTimeout(timer);
  }
}

function absolutize(href: string | undefined, base: URL): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

function isHttpUrl(u: string | undefined): boolean {
  if (!u) return false;
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch {
    return false;
  }
}

function pickLargestSize(sizes: string | undefined): number {
  if (!sizes) return 0;
  // sizes like "180x180" or "32x32 64x64"
  let max = 0;
  for (const tok of sizes.split(/\s+/)) {
    const m = tok.match(/^(\d+)x(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

function extractLogo($: cheerio.CheerioAPI, base: URL): string | undefined {
  const candidates: { url: string; score: number }[] = [];

  $('meta[property="og:logo"], meta[name="og:logo"]').each((_, el) => {
    const u = absolutize($(el).attr("content"), base);
    if (u) candidates.push({ url: u, score: 100 });
  });

  $('link[rel*="apple-touch-icon" i]').each((_, el) => {
    const $el = $(el);
    const u = absolutize($el.attr("href"), base);
    if (u) {
      const sz = pickLargestSize($el.attr("sizes"));
      candidates.push({ url: u, score: 80 + sz });
    }
  });

  $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) => {
    const u = absolutize($(el).attr("content"), base);
    if (u) candidates.push({ url: u, score: 70 });
  });

  $('link[rel="icon"], link[rel="shortcut icon"], link[rel="mask-icon"]').each((_, el) => {
    const $el = $(el);
    const u = absolutize($el.attr("href"), base);
    if (u) {
      const sz = pickLargestSize($el.attr("sizes"));
      candidates.push({ url: u, score: 50 + sz });
    }
  });

  // First img inside header (often the logo)
  const headerImg = $("header img").first().attr("src");
  const headerImgAbs = absolutize(headerImg, base);
  if (headerImgAbs) candidates.push({ url: headerImgAbs, score: 60 });

  // First img with class/id mentioning "logo"
  $('img[class*="logo" i], img[id*="logo" i], img[alt*="logo" i]').each((_, el) => {
    const u = absolutize($(el).attr("src"), base);
    if (u) candidates.push({ url: u, score: 75 });
  });

  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates) {
    if (isHttpUrl(c.url)) return c.url;
  }
  // Fallback: /favicon.ico
  return new URL("/favicon.ico", base).toString();
}

function extractBrandName($: cheerio.CheerioAPI, base: URL): string | undefined {
  const og = $('meta[property="og:site_name"]').attr("content")?.trim();
  if (og) return og;
  const title = $("title").first().text().trim();
  if (title) {
    // Split on common separators and take first part
    const parts = title.split(/\s+[\-–—|·»:]\s+/);
    const first = parts[0]?.trim();
    if (first && first.length <= 80) return first;
    if (title.length <= 80) return title;
  }
  // Fallback: domain
  return base.hostname.replace(/^www\./, "");
}

function extractDescription($: cheerio.CheerioAPI): string | undefined {
  const og = $('meta[property="og:description"]').attr("content")?.trim();
  if (og) return og;
  const desc = $('meta[name="description"]').attr("content")?.trim();
  if (desc) return desc;
  return undefined;
}

const HEX_COLOR_RE = /#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
const NAMED_NEUTRAL = new Set([
  "#fff", "#ffffff", "#000", "#000000", "#fafafa", "#f4f4f7", "#f5f5f5",
  "#eee", "#eeeeee", "#ddd", "#dddddd", "#ccc", "#cccccc", "#bbb", "#bbbbbb",
  "#999", "#999999", "#888", "#888888", "#666", "#666666", "#444", "#444444",
  "#333", "#333333", "#222", "#222222", "#111", "#111111",
]);

function normHex(c: string): string {
  let h = c.toLowerCase().trim();
  if (h.length === 4) {
    // #abc -> #aabbcc
    h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (h.length === 9) h = h.slice(0, 7); // strip alpha
  return h;
}

function isNeutral(c: string): boolean {
  const h = normHex(c);
  if (NAMED_NEUTRAL.has(h)) return true;
  // grayscale: r==g==b within 10
  if (h.length !== 7) return false;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10;
}

function rgbToHex(rgb: string): string | undefined {
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return undefined;
  const r = parseInt(m[1], 10);
  const g = parseInt(m[2], 10);
  const b = parseInt(m[3], 10);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function findColorInBlock(
  block: string,
  prop: "color" | "background-color" | "background",
  cssVars?: Record<string, string>,
): string | undefined {
  // Match `prop: <value>;`
  const re = new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([^;}\\n]+)`, "i");
  const m = block.match(re);
  if (!m) return undefined;
  let val = m[1].trim();
  if (cssVars && /var\(/.test(val)) {
    val = resolveCssVarValue(val, cssVars);
  }
  const hex = val.match(HEX_COLOR_RE);
  if (hex && hex[0]) return normHex(hex[0]);
  const rgb = rgbToHex(val);
  if (rgb) return normHex(rgb);
  return undefined;
}

function findCssBlocks(css: string, selectors: RegExp[]): string[] {
  const blocks: string[] = [];
  // Naive: find selector { ... } pairs
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const sel = m[1].trim();
    const body = m[2];
    for (const s of selectors) {
      if (s.test(sel)) {
        blocks.push(body);
        break;
      }
    }
  }
  return blocks;
}

function extractColors(
  $: cheerio.CheerioAPI,
  cssText: string,
): {
  primary: string; titleText: string; bodyText: string; background: string;
} {
  const themeColor = $('meta[name="theme-color"]').attr("content")?.trim();
  let primary: string | undefined;
  if (themeColor) {
    const hex = themeColor.match(HEX_COLOR_RE);
    if (hex && hex[0]) primary = normHex(hex[0]);
    else {
      const rgb = rgbToHex(themeColor);
      if (rgb) primary = normHex(rgb);
    }
  }

  const allCss = cssText;

  let titleText: string | undefined;
  let bodyText: string | undefined;
  let background: string | undefined;

  // CSS custom properties from :root
  const rootVars = extractCssVars(allCss);

  // h1/h2 color
  const headingBlocks = findCssBlocks(allCss, [/(^|[ ,>])h1(\s|$|[.:#,])/, /(^|[ ,>])h2(\s|$|[.:#,])/]);
  for (const b of headingBlocks) {
    const c = findColorInBlock(b, "color", rootVars);
    if (c && !isNeutral(c)) { titleText = c; break; }
    if (c && !titleText) titleText = c;
  }

  // body / p color & background
  const bodyBlocks = findCssBlocks(allCss, [/(^|[ ,>])body(\s|$|[.:#,])/, /(^|[ ,>])html(\s|$|[.:#,])/]);
  for (const b of bodyBlocks) {
    if (!bodyText) {
      const c = findColorInBlock(b, "color", rootVars);
      if (c) bodyText = c;
    }
    if (!background) {
      const bg = findColorInBlock(b, "background-color", rootVars) || findColorInBlock(b, "background", rootVars);
      if (bg) background = bg;
    }
  }

  // Inline style on <body> as another fallback
  if (!background) {
    const bodyStyle = $("body").attr("style") || "";
    const bg = findColorInBlock(bodyStyle, "background-color", rootVars) || findColorInBlock(bodyStyle, "background", rootVars);
    if (bg) background = bg;
  }
  if (!bodyText) {
    const bodyStyle = $("body").attr("style") || "";
    const c = findColorInBlock(bodyStyle, "color", rootVars);
    if (c) bodyText = c;
  }

  // Primary from CSS custom properties hinting "primary/brand/accent/main"
  if (!primary) {
    for (const [name, val] of Object.entries(rootVars)) {
      if (/primary|brand|accent|main|theme/i.test(name)) {
        if (!isNeutral(val)) { primary = val; break; }
      }
    }
  }

  // Primary fallback: button / a background
  if (!primary) {
    const btnBlocks = findCssBlocks(allCss, [/(^|[ ,>])button(\s|$|[.:#,])/, /\.btn\b/, /\.button\b/, /\.cta\b/, /\bprimary\b/]);
    for (const b of btnBlocks) {
      const bg = findColorInBlock(b, "background-color", rootVars) || findColorInBlock(b, "background", rootVars);
      if (bg && !isNeutral(bg)) { primary = bg; break; }
    }
  }

  // Last fallback: most frequent non-neutral hex in inline style attributes
  if (!primary) {
    const counts = new Map<string, number>();
    $("[style]").each((_, el) => {
      const s = $(el).attr("style") || "";
      const matches = s.match(HEX_COLOR_RE);
      if (matches) {
        for (const c of matches) {
          const h = normHex(c);
          if (!isNeutral(h)) counts.set(h, (counts.get(h) || 0) + 1);
        }
      }
    });
    let best: string | undefined;
    let bestN = 0;
    for (const [h, n] of counts) {
      if (n > bestN) { best = h; bestN = n; }
    }
    if (best) primary = best;
  }

  return {
    primary: primary || DEFAULTS.primary,
    titleText: titleText || DEFAULTS.titleText,
    bodyText: bodyText || DEFAULTS.bodyText,
    background: background || DEFAULTS.background,
  };
}

function extractFontFamily($: cheerio.CheerioAPI, cssText: string): string {
  const allCss = cssText;
  const bodyBlocks = findCssBlocks(allCss, [/(^|[ ,>])body(\s|$|[.:#,])/, /(^|[ ,>])html(\s|$|[.:#,])/]);
  for (const b of bodyBlocks) {
    const m = b.match(/font-family\s*:\s*([^;}\n]+)/i);
    if (m) {
      const ff = sanitizeFontFamily(m[1]);
      if (ff) return ff;
    }
  }
  // CSS variables --font-* / --font-family-*
  const rootVars = extractCssVars(allCss);
  for (const [name, val] of Object.entries(rootVars)) {
    if (/font[-_]?(family|sans|main|primary|body)/i.test(name) && /[a-z]/i.test(val)) {
      const ff = sanitizeFontFamily(val);
      if (ff) return ff;
    }
  }
  // Inline body style
  const bodyStyle = $("body").attr("style") || "";
  const m = bodyStyle.match(/font-family\s*:\s*([^;]+)/i);
  if (m) {
    const ff = sanitizeFontFamily(m[1]);
    if (ff) return ff;
  }
  return DEFAULTS.fontFamily;
}

function sanitizeFontFamily(raw: string): string | undefined {
  let ff = raw.trim().replace(/!important/i, "").trim();
  if (!ff) return undefined;
  // Strip CSS var() wrappers
  ff = ff.replace(/var\([^)]+\)\s*,?\s*/g, "").trim().replace(/^,|,$/g, "");
  if (!ff || ff.length > 200) return undefined;
  if (!/sans-serif|serif|monospace/i.test(ff)) {
    return `${ff}, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  }
  return ff;
}

const CSS_VAR_RE = /--([a-z0-9_-]+)\s*:\s*([^;}\n]+)/gi;

/** Extract CSS custom properties from `:root { --x: val; }` blocks. Resolves to hex when value is a color. */
function extractCssVars(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Find :root or html { } blocks
  const re = /(?::root|html|\[data-theme[^\]]*\])\s*\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const body = m[1];
    let v: RegExpExecArray | null;
    CSS_VAR_RE.lastIndex = 0;
    while ((v = CSS_VAR_RE.exec(body)) !== null) {
      const name = v[1];
      const val = v[2].trim();
      const hex = val.match(HEX_COLOR_RE);
      if (hex && hex[0]) {
        out[name] = normHex(hex[0]);
      } else {
        const rgb = rgbToHex(val);
        if (rgb) out[name] = normHex(rgb);
        else out[name] = val;
      }
    }
  }
  return out;
}

/** Recursive resolve of var(--x, fallback) using a cssVars map. */
function resolveCssVarValue(value: string, vars: Record<string, string>, depth = 0): string {
  if (depth > 4) return value;
  return value.replace(/var\(\s*--([a-z0-9_-]+)\s*(?:,\s*([^)]*))?\)/gi, (_m, name, fallback) => {
    const v = vars[name];
    if (v) return resolveCssVarValue(v, vars, depth + 1);
    if (fallback) return resolveCssVarValue(fallback.trim(), vars, depth + 1);
    return "";
  });
}

async function fetchExternalCss($: cheerio.CheerioAPI, base: URL): Promise<string> {
  const links: string[] = [];
  $('link[rel="stylesheet"][href], link[rel*="preload" i][as="style"][href]').each((_, el) => {
    const href = $(el).attr("href");
    const abs = absolutize(href, base);
    if (abs && isHttpUrl(abs)) links.push(abs);
  });
  // Dedupe and cap
  const unique = [...new Set(links)].slice(0, 5);

  const MAX_CSS_BYTES = 600 * 1024;
  const CSS_TIMEOUT_MS = 5000;

  const fetchOne = async (cssUrl: string): Promise<string> => {
    try {
      const u = new URL(cssUrl);
      // SSRF check on external CSS host too
      try { await assertPublicHost(u.hostname); } catch { return ""; }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), CSS_TIMEOUT_MS);
      try {
        const res = await fetch(cssUrl, {
          headers: {
            "user-agent": USER_AGENT,
            "accept": "text/css,*/*;q=0.1",
          },
          signal: ctrl.signal,
          redirect: "follow",
        });
        if (!res.ok) return "";
        const ct = res.headers.get("content-type") || "";
        if (ct && !/css|text|javascript/i.test(ct)) return "";
        const reader = res.body?.getReader();
        if (!reader) {
          const txt = await res.text();
          return txt.slice(0, MAX_CSS_BYTES);
        }
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            total += value.length;
            if (total > MAX_CSS_BYTES) {
              try { await reader.cancel(); } catch {/* ignore */}
              break;
            }
            chunks.push(value);
          }
        }
        return Buffer.concat(chunks.map(c => Buffer.from(c))).toString("utf-8");
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return "";
    }
  };

  const results = await Promise.all(unique.map(fetchOne));
  return results.join("\n");
}

function buildSuggestedSubject($: cheerio.CheerioAPI, brandName?: string): string {
  const desc = extractDescription($);
  if (desc) return desc.length > 78 ? desc.slice(0, 75) + "..." : desc;
  const title = $("title").first().text().trim();
  if (title) return title.length > 78 ? title.slice(0, 75) + "..." : title;
  return brandName ? `Novidades de ${brandName}` : "Novidades";
}

/* ---------- Color helpers (luminance & palette merging) ---------- */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

function colorSaturation(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/** Fetch the logo image and extract its dominant vibrant color via node-vibrant.
 *  Returns hex strings or null if extraction fails. */
async function extractLogoPalette(
  logoUrl: string
): Promise<{ vibrant?: string; darkVibrant?: string; lightVibrant?: string } | null> {
  try {
    const u = new URL(logoUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    await assertPublicHost(u.hostname);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(logoUrl, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; SuperSendBot/1.0; +https://supersendapp.web.app)",
        },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    // node-vibrant doesn't handle SVG/ICO well — only proceed for raster formats
    if (!ct.startsWith("image/") || /svg|x-icon|vnd\.microsoft\.icon/.test(ct)) {
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 4 * 1024 * 1024) return null;

    const palette = await Vibrant.from(buf).getPalette();
    const out: { vibrant?: string; darkVibrant?: string; lightVibrant?: string } = {};
    if (palette?.Vibrant?.hex) out.vibrant = palette.Vibrant.hex;
    if (palette?.DarkVibrant?.hex) out.darkVibrant = palette.DarkVibrant.hex;
    if (palette?.LightVibrant?.hex) out.lightVibrant = palette.LightVibrant.hex;
    // fallback ordering: Muted swatches as last resort
    if (!out.vibrant && palette?.Muted?.hex) out.vibrant = palette.Muted.hex;
    if (!out.darkVibrant && palette?.DarkMuted?.hex) out.darkVibrant = palette.DarkMuted.hex;
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** Pick the most "brand-like" primary: high saturation + readable on white. */
function pickPrimary(candidates: (string | undefined)[]): string | undefined {
  let best: string | undefined;
  let bestScore = -1;
  for (const c of candidates) {
    if (!c) continue;
    const sat = colorSaturation(c);
    const lum = relativeLuminance(c);
    // Prefer saturated colors that aren't too light (button bg with white text)
    if (sat < 0.25) continue;
    if (lum > 0.78) continue;
    const score = sat * 1.5 - Math.abs(lum - 0.4); // sweet spot ~0.4 luminance
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export async function fetchAndExtract(rawUrl: string): Promise<ExtractedBrand> {
  const url = normalizeUrl(rawUrl);
  await assertPublicHost(url.hostname);

  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // Aggregate inline <style> + external stylesheets for richer extraction
  let inlineCss = "";
  $("style").each((_, el) => { inlineCss += "\n" + $(el).text(); });
  const externalCss = await fetchExternalCss($, url);
  const cssText = inlineCss + "\n" + externalCss;

  const brandName = extractBrandName($, url);
  const logoUrl = extractLogo($, url);
  const colors = extractColors($, cssText);
  const fontFamily = extractFontFamily($, cssText);

  // Extract dominant color from logo image (gives the *real* brand color)
  if (logoUrl && isHttpUrl(logoUrl)) {
    const palette = await extractLogoPalette(logoUrl);
    if (palette) {
      // Prefer logo Vibrant > current CSS primary > theme-color (already in colors.primary)
      const primary = pickPrimary([
        palette.vibrant,
        palette.darkVibrant,
        colors.primary,
      ]);
      if (primary) colors.primary = primary;
    }
  }

  // Email-readability gating: enforce light background and dark title text
  // (extracted dark site bg breaks email clients; default to clean light bg)
  const bgLum = relativeLuminance(colors.background);
  if (bgLum < 0.85) {
    colors.background = "#f4f4f7";
  }
  const titleLum = relativeLuminance(colors.titleText);
  if (titleLum > 0.5) {
    colors.titleText = "#1e1b4b";
  }
  // Body should be a readable medium gray — if too light, reset
  const bodyLum = relativeLuminance(colors.bodyText);
  if (bodyLum > 0.6 || bodyLum < 0.05) {
    colors.bodyText = "#4b5563";
  }

  const suggestedSubject = buildSuggestedSubject($, brandName);
  const suggestedTemplateName = brandName
    ? `Template ${brandName}`
    : `Template ${url.hostname}`;

  return {
    sourceUrl: url.toString(),
    brandName,
    logoUrl: isHttpUrl(logoUrl) ? logoUrl : undefined,
    colors,
    fontFamily,
    suggestedSubject,
    suggestedTemplateName,
  };
}
