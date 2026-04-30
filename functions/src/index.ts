import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { defineString } from "firebase-functions/params";
import { sendEmail } from "./email/mailgun";
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

// Initialize Firebase Admin
admin.initializeApp();

// Export named Firestore database instance
export const db = getFirestore("supersend-bd");

// Mailgun webhook signing key
const mailgunWebhookSigningKey = defineString("MAILGUN_WEBHOOK_SIGNING_KEY");

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

    const isValid = verifyWebhookSignature(
      mailgunWebhookSigningKey.value(),
      timestamp,
      token,
      signature
    );

    if (!isValid) {
      console.warn("Webhook signature verification failed");
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
