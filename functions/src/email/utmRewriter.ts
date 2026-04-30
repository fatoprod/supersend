/**
 * UTM rewriter — appends UTM parameters to all trackable links in an email HTML body.
 *
 * Used to track clicks via Google Analytics (instead of relying on Mailgun click
 * tracking, which requires SSL on a custom subdomain).
 */

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

const SKIP_PROTOCOLS = ["mailto:", "tel:", "sms:", "javascript:", "data:"];

/** Hosts that already track on their own — don't double-tag. */
const SKIP_HOST_SUFFIXES = [
  "mailgun.org",
  "mg.supervideo.com.br", // user's tracking subdomain
  "list-manage.com",
];

/**
 * Append UTM query parameters to all `href` URLs in HTML body.
 * Existing UTM params on the URL are preserved (we don't overwrite).
 * Returns the modified HTML.
 */
export function appendUtmsToHtml(html: string, params: UtmParams): string {
  if (!html) return html;

  const utmEntries: Array<[string, string]> = [];
  if (params.source) utmEntries.push(["utm_source", params.source]);
  if (params.medium) utmEntries.push(["utm_medium", params.medium]);
  if (params.campaign) utmEntries.push(["utm_campaign", params.campaign]);
  if (params.content) utmEntries.push(["utm_content", params.content]);
  if (params.term) utmEntries.push(["utm_term", params.term]);
  if (utmEntries.length === 0) return html;

  // Match href="..." or href='...' (case-insensitive). Captures the quote and value separately.
  const hrefRe = /\bhref\s*=\s*(["'])([^"']+)\1/gi;
  return html.replace(hrefRe, (full, quote, url) => {
    const newUrl = appendUtmsToUrl(url, utmEntries);
    return `href=${quote}${newUrl}${quote}`;
  });
}

/**
 * Append UTM params to a single URL string, preserving fragment and pre-existing params.
 * Skips non-http(s) URLs and known unsubscribe/tracking domains.
 */
export function appendUtmsToUrl(url: string, utmEntries: Array<[string, string]>): string {
  const trimmed = url.trim();
  if (!trimmed) return url;

  // Skip template tokens like {{unsubscribe}}
  if (trimmed.startsWith("{{") || trimmed.startsWith("%recipient")) return url;

  // Skip non-http(s)
  const lower = trimmed.toLowerCase();
  for (const proto of SKIP_PROTOCOLS) {
    if (lower.startsWith(proto)) return url;
  }
  // Skip pure anchors
  if (trimmed.startsWith("#")) return url;

  // Only rewrite absolute http(s) URLs.
  if (!/^https?:\/\//i.test(trimmed)) return url;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return url;
  }

  // Skip known third-party tracking hosts.
  const host = parsed.hostname.toLowerCase();
  for (const suffix of SKIP_HOST_SUFFIXES) {
    if (host === suffix || host.endsWith("." + suffix)) return url;
  }

  for (const [key, value] of utmEntries) {
    if (!parsed.searchParams.has(key)) {
      parsed.searchParams.set(key, value);
    }
  }

  return parsed.toString();
}
