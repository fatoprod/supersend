import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { defineString } from "firebase-functions/params";
import * as dns from "dns/promises";
import { sendEmail } from "./email/mailgun";
import {
  getMailgunConfig,
  invalidateMailgunConfigCache,
  maskSecret,
} from "./email/mailgunConfig";
import { buildSentEmailRecord, executeCampaignSend } from "./email/campaignHelper";
import { verifyEmailCode, sendVerificationEmail } from "./auth/verification";
import { verifyWebhookSignature, processWebhookEvent } from "./email/webhooks";
import {
  importLeadsToList,
  SuperLeedLeadInput,
  ImportSource,
} from "./integrations/superleed";
import { fetchAndExtract } from "./templates/brandExtractor";
import { buildHtml } from "./templates/templateBuilder";
import {
  getGa4Config,
  invalidateGa4ConfigCache,
  fetchGa4CampaignStats,
  pingGa4,
} from "./analytics/ga4";

// Initialize Firebase Admin
admin.initializeApp();

// Export named Firestore database instance
export const db = getFirestore("supersend-bd");

// Mailgun webhook signing key (legacy env fallback — UI/Firestore is now primary)
const mailgunWebhookSigningKey = defineString("MAILGUN_WEBHOOK_SIGNING_KEY");
void mailgunWebhookSigningKey; // referenced by mailgunConfig fallback path

// ============ Auth Functions ============

/**
 * Send verification email when user signs up
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  if (user.email) {
    await sendVerificationEmail(user.uid, user.email);
  }
});

/**
 * Verify email code submitted by user
 */
export const verifyEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  
  const { code } = data;
  if (!code) {
    throw new functions.https.HttpsError("invalid-argument", "Code is required");
  }
  
  return verifyEmailCode(context.auth.uid, code);
});

/**
 * Resend verification email
 */
export const resendVerification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const userData = userDoc.data();
  
  if (!userData?.email) {
    throw new functions.https.HttpsError("not-found", "User email not found");
  }
  
  if (userData.emailVerified) {
    throw new functions.https.HttpsError("already-exists", "Email already verified");
  }
  
  await sendVerificationEmail(context.auth.uid, userData.email);
  return { success: true };
});

// ============ Email Campaign Functions ============

/**
 * Send a single email
 */
export const sendSingleEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  
  const { to, subject, html, text, from } = data;
  
  if (!to || !subject || (!html && !text)) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }
  
  const result = await sendEmail({
    to,
    subject,
    html,
    text,
    from: from || "noreply@supersend.app",
  });
  
  // Log sent email
  const sentData = buildSentEmailRecord("", subject, {
    to,
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  });

  await db.collection("users").doc(context.auth.uid).collection("sentEmails").add(sentData);
  
  return result;
});

/**
 * Process campaign and send bulk emails
 */
export const processCampaign = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  
  const { campaignId } = data;
  
  if (!campaignId) {
    throw new functions.https.HttpsError("invalid-argument", "Campaign ID required");
  }
  
  const campaignRef = db
    .collection("users")
    .doc(context.auth.uid)
    .collection("campaigns")
    .doc(campaignId);
  
  const campaign = await campaignRef.get();
  
  if (!campaign.exists) {
    throw new functions.https.HttpsError("not-found", "Campaign not found");
  }
  
  const campaignData = campaign.data()!;
  
  // Update campaign status
  await campaignRef.update({ status: "processing" });
  
  try {
    const sentEmailsRef = db.collection("users").doc(context.auth.uid).collection("sentEmails");
    const stats = await executeCampaignSend(db, campaignRef, campaignData, campaignId, sentEmailsRef);
    return { success: true, stats: stats.total };
  } catch (error) {
    await campaignRef.update({ status: "failed", error: String(error) });
    throw new functions.https.HttpsError("internal", "Failed to process campaign");
  }
});

/**
 * Scheduled function to process scheduled campaigns
 */
export const processScheduledCampaigns = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    
    // Find all users with scheduled campaigns
    const usersSnapshot = await db.collection("users").get();
    
    for (const userDoc of usersSnapshot.docs) {
      const campaignsSnapshot = await userDoc.ref
        .collection("campaigns")
        .where("status", "==", "scheduled")
        .where("scheduledAt", "<=", now)
        .get();
      
      for (const campaignDoc of campaignsSnapshot.docs) {
        // Process each campaign
        const campaignData = campaignDoc.data();
        
        await campaignDoc.ref.update({ status: "processing" });
        
        try {
          const sentEmailsRef = userDoc.ref.collection("sentEmails");
          await executeCampaignSend(db, campaignDoc.ref, campaignData, campaignDoc.id, sentEmailsRef);
        } catch (error) {
          await campaignDoc.ref.update({
            status: "failed",
            error: String(error),
          });
        }
      }
    }
    
    return null;
  });

// ============ SuperLeed Integration ============

const MAX_LEADS_PER_IMPORT = 5000;

interface ImportLeadsPayload {
  leads: SuperLeedLeadInput[];
  target:
    | { mode: "existing"; listId: string }
    | { mode: "new"; name: string; description?: string };
  source?: ImportSource;
}

/**
 * List the contact lists belonging to the authenticated user.
 * Used by external apps (e.g. SuperLeed) to render a list selector
 * without coupling to the supersend-bd Firestore schema/rules.
 */
export const listMyContactLists = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const snapshot = await db
    .collection("users")
    .doc(context.auth.uid)
    .collection("contactLists")
    .orderBy("createdAt", "desc")
    .get();

  const lists = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || "",
      description: data.description || "",
      contactCount: data.contactCount || 0,
    };
  });

  return { lists };
});

/**
 * Import leads from SuperLeed as contacts in a SuperSend list.
 *
 * Payload:
 * - leads: array of SuperLeed Lead objects (max 5000)
 * - target: { mode: "existing", listId } or { mode: "new", name, description? }
 * - source?: { searchId, query } — used for tags and customFields
 *
 * Returns: { imported, skipped, listId, listName, withoutEmail, duplicates }
 */
export const importLeadsFromSuperLeed = functions.https.onCall(
  async (data: ImportLeadsPayload, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }

    const uid = context.auth.uid;

    // ---- Validate payload ----
    if (!data || typeof data !== "object") {
      throw new functions.https.HttpsError("invalid-argument", "Invalid payload");
    }
    if (!Array.isArray(data.leads)) {
      throw new functions.https.HttpsError("invalid-argument", "leads must be an array");
    }
    if (data.leads.length === 0) {
      throw new functions.https.HttpsError("invalid-argument", "leads is empty");
    }
    if (data.leads.length > MAX_LEADS_PER_IMPORT) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Too many leads (max ${MAX_LEADS_PER_IMPORT})`
      );
    }
    if (!data.target || typeof data.target !== "object") {
      throw new functions.https.HttpsError("invalid-argument", "target is required");
    }

    // ---- Resolve target list ----
    let listId: string;
    let listName: string;

    const userRef = db.collection("users").doc(uid);

    if (data.target.mode === "existing") {
      if (!data.target.listId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "target.listId is required when mode is 'existing'"
        );
      }
      const listRef = userRef.collection("contactLists").doc(data.target.listId);
      const listSnap = await listRef.get();
      if (!listSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Target list not found");
      }
      listId = listRef.id;
      listName = (listSnap.get("name") as string) || "";
    } else if (data.target.mode === "new") {
      const name = (data.target.name || "").trim();
      if (!name) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "target.name is required when mode is 'new'"
        );
      }
      const newListRef = await userRef.collection("contactLists").add({
        name,
        description: data.target.description || "",
        contactCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      listId = newListRef.id;
      listName = name;
    } else {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "target.mode must be 'existing' or 'new'"
      );
    }

    // ---- Import ----
    try {
      const result = await importLeadsToList(db, uid, listId, data.leads, data.source);
      return {
        success: true,
        listId,
        listName,
        ...result,
      };
    } catch (error) {
      console.error("importLeadsFromSuperLeed error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to import leads",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
);

// ============ Template Generation ============

/**
 * Rate limit em memória (best-effort por instância). Para v1 é suficiente.
 */
const templateGenLastCall = new Map<string, number>();
const TEMPLATE_GEN_COOLDOWN_MS = 5000;

/**
 * Gera um template de email a partir de uma URL de referência.
 * Extrai logo, paleta e fonte do site, aplica a um layout email-safe e retorna
 * o HTML já com variáveis Mustache prontas para uso pelo processCampaign.
 */
export const generateTemplateFromUrl = functions
  .runWith({ timeoutSeconds: 30, memory: "512MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Login obrigatório");
    }
    const uid = context.auth.uid;

    const now = Date.now();
    const last = templateGenLastCall.get(uid) || 0;
    if (now - last < TEMPLATE_GEN_COOLDOWN_MS) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Aguarde ${Math.ceil((TEMPLATE_GEN_COOLDOWN_MS - (now - last)) / 1000)}s antes de gerar outro template.`
      );
    }
    templateGenLastCall.set(uid, now);

    const url = typeof data?.url === "string" ? data.url.trim() : "";
    if (!url) {
      throw new functions.https.HttpsError("invalid-argument", "URL é obrigatória");
    }
    if (url.length > 2048) {
      throw new functions.https.HttpsError("invalid-argument", "URL muito longa");
    }

    try {
      const brand = await fetchAndExtract(url);
      const html = buildHtml(brand);
      return {
        html,
        brand,
        suggestedSubject: brand.suggestedSubject,
        suggestedTemplateName: brand.suggestedTemplateName,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("generateTemplateFromUrl failed:", msg);
      // Treat known user errors as invalid-argument
      const userErrors = [
        "Hostname",
        "URL retornou status",
        "Apenas URLs http",
        "IP privado",
        "Tipo de conteúdo",
        "URL muito longa",
      ];
      if (userErrors.some((p) => msg.includes(p))) {
        throw new functions.https.HttpsError("invalid-argument", msg);
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new functions.https.HttpsError("deadline-exceeded", "Tempo de busca esgotado.");
      }
      throw new functions.https.HttpsError("internal", "Falha ao buscar a URL.", msg);
    }
  });

// ============ Webhook Functions ============

/**
 * Mailgun webhook endpoint
 * Receives events: delivered, opened, clicked, bounced, failed, complained, unsubscribed
 * Configure in Mailgun Dashboard → Webhooks
 */
export const mailgunWebhook = functions.https.onRequest(async (req, res) => {
  // Only accept POST
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const payload = req.body;

    // Verify signature
    const { timestamp, token, signature } = payload.signature || {};
    if (!timestamp || !token || !signature) {
      console.warn("Webhook missing signature fields");
      res.status(400).send("Missing signature");
      return;
    }

    const cfg = await getMailgunConfig();
    const isValid = verifyWebhookSignature(
      cfg.webhookSigningKey,
      timestamp,
      token,
      signature
    );

    if (!isValid) {
      // Fingerprint the stored key (first 4 + last 4 chars) so the user can
      // compare with the key shown in the Mailgun panel — without exposing
      // the full secret.
      const keyFingerprint = fingerprintSecret(cfg.webhookSigningKey);
      const expected = computeSignature(cfg.webhookSigningKey, timestamp, token);
      console.warn(
        `Webhook signature verification failed. ` +
          `keyFingerprint=${keyFingerprint} ` +
          `keyLen=${(cfg.webhookSigningKey || "").length} ` +
          `keySource=${cfg.source} ` +
          `receivedSig=${signature.slice(0, 12)}... ` +
          `expectedSig=${expected.slice(0, 12)}...`
      );
      // Persist the last failure to Firestore so the Settings UI can show it.
      try {
        await db.collection("system").doc("mailgunDiagnostics").set(
          {
            lastWebhookFailureAt: admin.firestore.FieldValue.serverTimestamp(),
            lastWebhookFailure: {
              keyFingerprint,
              keyLen: (cfg.webhookSigningKey || "").length,
              keySource: cfg.source,
              receivedSignaturePrefix: String(signature).slice(0, 12),
              expectedSignaturePrefix: expected.slice(0, 12),
              timestamp: String(timestamp),
            },
          },
          { merge: true }
        );
      } catch (e) {
        console.warn("Failed to persist webhook diagnostics:", e);
      }
      res.status(403).send("Invalid signature");
      return;
    }

    // Process the event
    const result = await processWebhookEvent(payload);
    res.status(200).json(result);
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Internal error");
  }
});

/** Returns first 4 + last 4 chars of a secret separated by `…`, or "(empty)". */
function fingerprintSecret(secret: string | undefined): string {
  if (!secret) return "(empty)";
  if (secret.length <= 8) return `***(len=${secret.length})`;
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}

/** Compute the expected Mailgun HMAC-SHA256 signature for a given key+timestamp+token. */
function computeSignature(key: string, timestamp: string, token: string): string {
  const crypto = require("crypto");
  return crypto
    .createHmac("sha256", key)
    .update(timestamp.concat(token))
    .digest("hex");
}

// ============ Mailgun Configuration ============

/** Get Mailgun config (masked secrets) for the Settings UI. */
export const getMailgunSettings = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const cfg = await getMailgunConfig();
  return {
    domain: cfg.domain || "",
    apiKeyMasked: maskSecret(cfg.apiKey),
    hasApiKey: !!cfg.apiKey,
    webhookSigningKeyMasked: maskSecret(cfg.webhookSigningKey),
    hasWebhookSigningKey: !!cfg.webhookSigningKey,
    source: cfg.source,
  };
});

/** Update Mailgun config in Firestore. Empty/undefined values clear that field. */
export const updateMailgunSettings = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const { apiKey, domain, webhookSigningKey } = (data || {}) as {
    apiKey?: string;
    domain?: string;
    webhookSigningKey?: string;
  };

  const ref = db.collection("system").doc("mailgun");
  const update: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: context.auth.uid,
  };
  if (typeof apiKey === "string" && apiKey.trim()) update.apiKey = apiKey.trim();
  if (typeof domain === "string" && domain.trim()) update.domain = domain.trim();
  if (typeof webhookSigningKey === "string" && webhookSigningKey.trim()) {
    update.webhookSigningKey = webhookSigningKey.trim();
  }
  await ref.set(update, { merge: true });
  invalidateMailgunConfigCache();
  return { success: true };
});

/** Returns the most recent webhook signature failure diagnostics so Settings can display them. */
export const getMailgunDiagnostics = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const cfg = await getMailgunConfig();
  const snap = await db.collection("system").doc("mailgunDiagnostics").get();
  const diag = (snap.exists ? snap.data() : null) || {};
  const lastFailureAt = diag.lastWebhookFailureAt;
  const lastFailureAtIso =
    lastFailureAt && typeof lastFailureAt.toDate === "function"
      ? lastFailureAt.toDate().toISOString()
      : null;
  return {
    storedKeyFingerprint: fingerprintSecret(cfg.webhookSigningKey),
    storedKeyLen: (cfg.webhookSigningKey || "").length,
    storedKeySource: cfg.source,
    lastWebhookFailure: diag.lastWebhookFailure || null,
    lastWebhookFailureAt: lastFailureAtIso,
  };
});

interface DnsCheck {
  name: string;
  expected: string;
  actual: string[];
  status: "ok" | "warn" | "missing";
  message?: string;
}

/** Run DNS health check for a Mailgun-managed domain (e.g. mg.supervideo.com.br).
 *  Also checks SPF and DMARC at the apex (organizational domain). */
export const checkMailgunDns = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const domain = String((data || {}).domain || "").trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid domain");
  }
  // Derive apex (last 2 labels for .com / 3 for .com.br style)
  const apex = deriveApex(domain);

  const checks: DnsCheck[] = [];

  // 1. MX
  try {
    const mx = await dns.resolveMx(domain);
    const hosts = mx.map((m) => m.exchange.toLowerCase());
    const hasA = hosts.some((h) => h.includes("mxa.mailgun.org"));
    const hasB = hosts.some((h) => h.includes("mxb.mailgun.org"));
    checks.push({
      name: "MX",
      expected: "mxa.mailgun.org, mxb.mailgun.org",
      actual: hosts,
      status: hasA && hasB ? "ok" : "warn",
      message: hasA && hasB ? undefined : "Esperado mxa.mailgun.org E mxb.mailgun.org",
    });
  } catch {
    checks.push({ name: "MX", expected: "mxa.mailgun.org, mxb.mailgun.org", actual: [], status: "missing" });
  }

  // 2. SPF on subdomain
  const subSpf = await getTxt(domain);
  const subSpfLine = subSpf.find((s) => /v=spf1/i.test(s)) || "";
  checks.push({
    name: `SPF (${domain})`,
    expected: "v=spf1 include:mailgun.org ~all",
    actual: subSpfLine ? [subSpfLine] : [],
    status: /include:mailgun\.org/i.test(subSpfLine) ? "ok" : subSpfLine ? "warn" : "missing",
  });

  // 3. DKIM — try common Mailgun selectors
  const dkimSelectors = ["krs", "k1", "mailo", "pic", "smtp", "mta", "mx", "mg", "s1", "s2"];
  let dkimFound: { selector: string; value: string } | null = null;
  for (const s of dkimSelectors) {
    const r = await getTxt(`${s}._domainkey.${domain}`);
    const line = r.find((x) => /k=rsa/i.test(x) || /p=[A-Za-z0-9+/=]/.test(x));
    if (line) {
      dkimFound = { selector: s, value: line };
      break;
    }
  }
  checks.push({
    name: "DKIM",
    expected: "TXT em <selector>._domainkey." + domain,
    actual: dkimFound ? [`selector=${dkimFound.selector}`] : [],
    status: dkimFound ? "ok" : "missing",
    message: dkimFound ? `Selector ativo: ${dkimFound.selector}` : "Nenhum selector Mailgun encontrado",
  });

  // 4. Tracking CNAME
  try {
    const cname = await dns.resolveCname(`email.${domain}`);
    const ok = cname.some((c) => c.toLowerCase().includes("mailgun.org"));
    checks.push({
      name: `CNAME (email.${domain})`,
      expected: "mailgun.org",
      actual: cname,
      status: ok ? "ok" : "warn",
    });
  } catch {
    checks.push({
      name: `CNAME (email.${domain})`,
      expected: "mailgun.org",
      actual: [],
      status: "missing",
      message: "Tracking de cliques/aberturas não funcionará sem este CNAME",
    });
  }

  // 5. SPF apex
  const apexSpf = await getTxt(apex);
  const apexSpfLine = apexSpf.find((s) => /v=spf1/i.test(s)) || "";
  checks.push({
    name: `SPF apex (${apex})`,
    expected: "v=spf1 include:mailgun.org ~all (ou mesclado com outros)",
    actual: apexSpfLine ? [apexSpfLine] : [],
    status: /include:mailgun\.org/i.test(apexSpfLine)
      ? "ok"
      : apexSpfLine
      ? "warn"
      : "missing",
    message:
      !apexSpfLine
        ? `CRÍTICO se From=...@${apex}: adicione SPF no apex`
        : !/include:mailgun\.org/i.test(apexSpfLine)
        ? `SPF apex existe mas sem include:mailgun.org`
        : undefined,
  });

  // 6. DMARC apex
  const dmarcApex = await getTxt(`_dmarc.${apex}`);
  const dmarcLine = dmarcApex.find((s) => /v=DMARC1/i.test(s)) || "";
  checks.push({
    name: `DMARC apex (_dmarc.${apex})`,
    expected: "v=DMARC1; p=none; rua=mailto:...",
    actual: dmarcLine ? [dmarcLine] : [],
    status: dmarcLine ? "ok" : "missing",
    message: !dmarcLine ? "Adicione DMARC no apex para alinhamento e relatórios" : undefined,
  });

  // 7. DMARC subdomain (informativo)
  const dmarcSub = await getTxt(`_dmarc.${domain}`);
  const dmarcSubLine = dmarcSub.find((s) => /v=DMARC1/i.test(s)) || "";
  if (dmarcSubLine) {
    checks.push({
      name: `DMARC sub (_dmarc.${domain})`,
      expected: "(opcional, herda do apex se ausente)",
      actual: [dmarcSubLine],
      status: "ok",
    });
  }

  return { domain, apex, checks };
});

async function getTxt(host: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(host);
    return records.map((r) => r.join(""));
  } catch {
    return [];
  }
}

/** Derive the organizational domain (eTLD+1).
 *  Handles common multi-label TLDs like .com.br, .co.uk, .com.au. */
function deriveApex(host: string): string {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const twoLabel = parts.slice(-2).join(".");
  const threeLabel = parts.slice(-3).join(".");
  const multiTlds = [
    "com.br", "net.br", "org.br", "gov.br", "edu.br",
    "co.uk", "ac.uk", "gov.uk", "org.uk",
    "com.au", "net.au", "org.au",
    "co.jp", "ne.jp", "or.jp",
    "com.mx", "com.ar", "com.co",
  ];
  if (multiTlds.includes(twoLabel)) return threeLabel;
  return twoLabel;
}


// ============ Google Analytics (GA4) Configuration & Stats ============

/** Get GA4 config (sensitive fields masked) for the Settings UI. */
export const getGa4Settings = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const cfg = await getGa4Config();
  let saEmail = "";
  if (cfg.serviceAccountJson) {
    try {
      const parsed = JSON.parse(cfg.serviceAccountJson);
      saEmail = parsed.client_email || "";
    } catch {
      saEmail = "(JSON inválido)";
    }
  }
  return {
    measurementId: cfg.measurementId || "",
    propertyId: cfg.propertyId || "",
    hasServiceAccount: !!cfg.serviceAccountJson,
    serviceAccountEmail: saEmail,
    enabled: cfg.enabled,
  };
});

/** Update GA4 config in Firestore. Empty/undefined values clear that field. */
export const updateGa4Settings = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const { measurementId, propertyId, serviceAccountJson, enabled } = (data || {}) as {
    measurementId?: string;
    propertyId?: string;
    serviceAccountJson?: string;
    enabled?: boolean;
  };

  const ref = db.collection("system").doc("ga4");
  const update: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: context.auth.uid,
  };
  if (typeof measurementId === "string") update.measurementId = measurementId.trim();
  if (typeof propertyId === "string") update.propertyId = propertyId.trim();
  if (typeof serviceAccountJson === "string" && serviceAccountJson.trim()) {
    // Validate JSON before persisting
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (!parsed.client_email || !parsed.private_key) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Service Account JSON faltando client_email ou private_key.",
        );
      }
    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Service Account JSON inválido. Cole o conteúdo completo do arquivo .json.",
      );
    }
    update.serviceAccountJson = serviceAccountJson.trim();
  }
  if (typeof enabled === "boolean") update.enabled = enabled;

  await ref.set(update, { merge: true });
  invalidateGa4ConfigCache();
  return { success: true };
});

/** Test GA4 connectivity. Returns sample sessions count or throws with the API error. */
export const testGa4Connection = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  try {
    const result = await pingGa4();
    return { success: true, ...result };
  } catch (err) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      err instanceof Error ? err.message : "GA4 ping failed",
    );
  }
});

/** Fetch GA4 stats for a given campaign (filters by sessionCampaignName). */
export const getGa4CampaignStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Auth required");
  }
  const { campaignId, startDate, endDate } = (data || {}) as {
    campaignId?: string;
    startDate?: string;
    endDate?: string;
  };
  if (!campaignId || typeof campaignId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "campaignId é obrigatório");
  }
  // Verify the campaign belongs to the caller before querying GA4.
  const campaignSnap = await db
    .collection("users")
    .doc(context.auth.uid)
    .collection("campaigns")
    .doc(campaignId)
    .get();
  if (!campaignSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Campanha não encontrada");
  }
  try {
    const stats = await fetchGa4CampaignStats(campaignId, {
      startDate: startDate || "30daysAgo",
      endDate: endDate || "today",
    });
    return stats;
  } catch (err) {
    throw new functions.https.HttpsError(
      "internal",
      err instanceof Error ? err.message : "GA4 query failed",
    );
  }
});
