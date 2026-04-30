/**
 * Google Analytics 4 (GA4) Data API integration.
 *
 * Used by SuperSend to fetch click/session stats for emails that were tagged with
 * UTM parameters (utm_source=supersend, utm_campaign=<campaignId>, ...).
 *
 * Configuration is stored in Firestore at /system/ga4:
 *   {
 *     measurementId: "G-XXXXXXXX",       // for display only
 *     propertyId:    "123456789",        // numeric, used by Data API
 *     serviceAccountJson: "{...}",       // full SA JSON as string
 *     enabled: true
 *   }
 */

import { getFirestore } from "firebase-admin/firestore";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

export interface Ga4Config {
  measurementId: string;
  propertyId: string;
  serviceAccountJson: string;
  enabled: boolean;
}

export interface Ga4CampaignStats {
  sessions: number;
  totalUsers: number;
  newUsers: number;
  engagedSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversions: number;
  eventCount: number;
  topPages: Array<{ path: string; sessions: number }>;
  topSources: Array<{ source: string; medium: string; sessions: number }>;
  byDevice: Array<{ category: string; sessions: number }>;
}

let cache: { config: Ga4Config; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getGa4Config(): Promise<Ga4Config> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.config;

  let cfg: Ga4Config = {
    measurementId: "",
    propertyId: "",
    serviceAccountJson: "",
    enabled: false,
  };

  try {
    const db = getFirestore("supersend-bd");
    const snap = await db.collection("system").doc("ga4").get();
    if (snap.exists) {
      const data = snap.data() || {};
      cfg = {
        measurementId: typeof data.measurementId === "string" ? data.measurementId : "",
        propertyId: typeof data.propertyId === "string" ? data.propertyId : "",
        serviceAccountJson:
          typeof data.serviceAccountJson === "string" ? data.serviceAccountJson : "",
        enabled: !!data.enabled,
      };
    }
  } catch (err) {
    console.warn("[ga4Config] Firestore read failed:", err);
  }

  cache = { config: cfg, expiresAt: now + CACHE_TTL_MS };
  return cfg;
}

export function invalidateGa4ConfigCache(): void {
  cache = null;
}

let clientCache: { propertyId: string; client: BetaAnalyticsDataClient } | null = null;

function buildClient(cfg: Ga4Config): BetaAnalyticsDataClient {
  if (clientCache && clientCache.propertyId === cfg.propertyId) {
    return clientCache.client;
  }
  let credentials: { client_email: string; private_key: string };
  try {
    const parsed = JSON.parse(cfg.serviceAccountJson);
    credentials = {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  } catch {
    throw new Error(
      "GA4 Service Account JSON é inválido. Cole o JSON completo da chave da service account.",
    );
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("GA4 Service Account JSON faltando client_email/private_key.");
  }
  const client = new BetaAnalyticsDataClient({ credentials });
  clientCache = { propertyId: cfg.propertyId, client };
  return client;
}

/**
 * Fetch campaign stats from GA4 Data API.
 *
 * Filters by `sessionCampaignName` matching the campaignId. We use sessionCampaignName
 * (Session campaign) because UTM-tagged links create a new session; this gives us
 * sessions started from the email click.
 */
export async function fetchGa4CampaignStats(
  campaignId: string,
  dateRange: { startDate: string; endDate: string } = {
    startDate: "30daysAgo",
    endDate: "today",
  },
): Promise<Ga4CampaignStats> {
  const cfg = await getGa4Config();
  if (!cfg.enabled || !cfg.propertyId || !cfg.serviceAccountJson) {
    throw new Error("GA4 não configurado. Vá em Settings → Google Analytics.");
  }

  const client = buildClient(cfg);
  const property = `properties/${cfg.propertyId}`;
  const dimensionFilter = {
    filter: {
      fieldName: "sessionCampaignName",
      stringFilter: { matchType: "EXACT" as const, value: campaignId },
    },
  };

  const dateRanges = [{ startDate: dateRange.startDate, endDate: dateRange.endDate }];

  const [overviewRes, pagesRes, sourcesRes, devicesRes] = await Promise.all([
    client.runReport({
      property,
      dateRanges,
      dimensionFilter,
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "newUsers" },
        { name: "engagedSessions" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
        { name: "conversions" },
        { name: "eventCount" },
      ],
    }),
    client.runReport({
      property,
      dateRanges,
      dimensionFilter,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property,
      dateRanges,
      dimensionFilter,
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property,
      dateRanges,
      dimensionFilter,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    }),
  ]);

  const overviewRow = overviewRes[0]?.rows?.[0]?.metricValues || [];
  const num = (i: number) => Number(overviewRow[i]?.value || 0);

  const topPages = (pagesRes[0]?.rows || []).map((r) => ({
    path: String(r.dimensionValues?.[0]?.value || ""),
    sessions: Number(r.metricValues?.[0]?.value || 0),
  }));

  const topSources = (sourcesRes[0]?.rows || []).map((r) => ({
    source: String(r.dimensionValues?.[0]?.value || ""),
    medium: String(r.dimensionValues?.[1]?.value || ""),
    sessions: Number(r.metricValues?.[0]?.value || 0),
  }));

  const byDevice = (devicesRes[0]?.rows || []).map((r) => ({
    category: String(r.dimensionValues?.[0]?.value || ""),
    sessions: Number(r.metricValues?.[0]?.value || 0),
  }));

  return {
    sessions: num(0),
    totalUsers: num(1),
    newUsers: num(2),
    engagedSessions: num(3),
    averageSessionDuration: num(4),
    bounceRate: num(5),
    conversions: num(6),
    eventCount: num(7),
    topPages,
    topSources,
    byDevice,
  };
}

/** Minimal connectivity test: surface auth/property errors fast. */
export async function pingGa4(): Promise<{ ok: true; sampleSessions: number }> {
  const cfg = await getGa4Config();
  if (!cfg.propertyId || !cfg.serviceAccountJson) {
    throw new Error("GA4 propertyId ou serviceAccountJson ausente.");
  }
  const client = buildClient(cfg);
  const [res] = await client.runReport({
    property: `properties/${cfg.propertyId}`,
    dateRanges: [{ startDate: "1daysAgo", endDate: "today" }],
    metrics: [{ name: "sessions" }],
  });
  const sessions = Number(res.rows?.[0]?.metricValues?.[0]?.value || 0);
  return { ok: true, sampleSessions: sessions };
}
