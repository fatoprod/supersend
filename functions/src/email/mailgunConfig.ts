import { defineString } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";

// Env-var fallback (legacy / bootstrap)
const envApiKey = defineString("MAILGUN_API_KEY");
const envDomain = defineString("MAILGUN_DOMAIN");
const envWebhookKey = defineString("MAILGUN_WEBHOOK_SIGNING_KEY");

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  webhookSigningKey: string;
  /** Where the active values came from. */
  source: "firestore" | "env" | "mixed" | "none";
}

let cache: { config: MailgunConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

/** Read Mailgun config from Firestore /system/mailgun, falling back to env vars.
 *  Cached in-memory for 30s to avoid hammering Firestore. */
export async function getMailgunConfig(): Promise<MailgunConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.config;

  let fsCfg:
    | { apiKey?: string; domain?: string; webhookSigningKey?: string }
    | null = null;
  try {
    const db = getFirestore("supersend-bd");
    const snap = await db.collection("system").doc("mailgun").get();
    if (snap.exists) {
      const data = snap.data();
      if (data) {
        fsCfg = {
          apiKey: typeof data.apiKey === "string" ? data.apiKey : undefined,
          domain: typeof data.domain === "string" ? data.domain : undefined,
          webhookSigningKey:
            typeof data.webhookSigningKey === "string" ? data.webhookSigningKey : undefined,
        };
      }
    }
  } catch (err) {
    console.warn("[mailgunConfig] Firestore read failed, using env fallback:", err);
  }

  const envA = safeEnv(envApiKey);
  const envD = safeEnv(envDomain);
  const envW = safeEnv(envWebhookKey);

  const apiKey = fsCfg?.apiKey || envA;
  const domain = fsCfg?.domain || envD;
  const webhookSigningKey = fsCfg?.webhookSigningKey || envW;

  const fromFs = !!(fsCfg?.apiKey || fsCfg?.domain || fsCfg?.webhookSigningKey);
  const fromEnv = !!(envA || envD || envW);
  let source: MailgunConfig["source"] = "none";
  if (fromFs && fromEnv) source = "mixed";
  else if (fromFs) source = "firestore";
  else if (fromEnv) source = "env";

  const config: MailgunConfig = { apiKey, domain, webhookSigningKey, source };
  cache = { config, expiresAt: now + CACHE_TTL_MS };
  return config;
}

export function invalidateMailgunConfigCache(): void {
  cache = null;
}

function safeEnv(p: { value: () => string }): string {
  try {
    return p.value() || "";
  } catch {
    return "";
  }
}

/** Mask a secret for display: show first 4 + last 4 chars. */
export function maskSecret(s: string): string {
  if (!s) return "";
  if (s.length <= 8) return "•".repeat(s.length);
  return s.slice(0, 4) + "•".repeat(Math.max(8, s.length - 8)) + s.slice(-4);
}
