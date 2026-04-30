import * as admin from "firebase-admin";
import { sendBulkEmails, downloadFileAsBuffer, AttachmentData } from "./mailgun";
import { appendUtmsToHtml } from "./utmRewriter";

interface EmailResult {
  to: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Build a sentEmail record from an email send result.
 */
export function buildSentEmailRecord(
  campaignId: string,
  subject: string,
  emailResult: EmailResult
): Record<string, unknown> {
  const sentEmailData: Record<string, unknown> = {
    campaignId,
    to: emailResult.to,
    subject,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    status: emailResult.success ? "sent" : "failed",
  };
  if (emailResult.messageId) sentEmailData.messageId = emailResult.messageId;
  if (emailResult.error) sentEmailData.error = emailResult.error;
  return sentEmailData;
}

/**
 * Download campaign attachments from Firebase Storage.
 */
export async function downloadAttachments(
  attachmentsList: Array<{ name: string; url: string }>
): Promise<AttachmentData[]> {
  const attachments: AttachmentData[] = [];
  for (const att of attachmentsList) {
    const buffer = await downloadFileAsBuffer(att.url);
    attachments.push({ filename: att.name, data: buffer });
  }
  return attachments;
}

/**
 * Execute campaign send: download attachments, send emails, log results, update status.
 */
export async function executeCampaignSend(
  db: FirebaseFirestore.Firestore,
  campaignRef: FirebaseFirestore.DocumentReference,
  campaignData: FirebaseFirestore.DocumentData,
  campaignId: string,
  sentEmailsRef: FirebaseFirestore.CollectionReference
): Promise<{ total: number; sent: number; failed: number }> {
  // Download attachments if present
  let attachments: AttachmentData[] | undefined;
  if (campaignData.attachments && campaignData.attachments.length > 0) {
    attachments = await downloadAttachments(campaignData.attachments);
  }

  // Rewrite all links in the HTML body to add UTM parameters so clicks can be
  // tracked via Google Analytics on the destination site.
  // Allows per-campaign overrides via campaignData.utm.{source,medium,campaign,content,term}.
  const utmCfg = (campaignData.utm || {}) as {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    enabled?: boolean;
  };
  const utmEnabled = utmCfg.enabled !== false; // default ON
  const html: string | undefined =
    utmEnabled && campaignData.html
      ? appendUtmsToHtml(campaignData.html, {
          source: utmCfg.source || "supersend",
          medium: utmCfg.medium || "email",
          campaign: utmCfg.campaign || campaignId,
          content: utmCfg.content || (campaignData.name ? slug(String(campaignData.name)) : undefined),
          term: utmCfg.term,
        })
      : campaignData.html;

  const result = await sendBulkEmails({
    recipients: campaignData.recipients,
    subject: campaignData.subject,
    html,
    text: campaignData.text,
    from: campaignData.from || "noreply@supersend.app",
    replyTo: campaignData.replyTo || undefined,
    attachments,
  });

  // Log results
  for (const emailResult of result.results) {
    const sentEmailData = buildSentEmailRecord(
      campaignId,
      campaignData.subject,
      emailResult
    );
    await sentEmailsRef.add(sentEmailData);
  }

  const stats = {
    total: result.results.length,
    sent: result.results.filter((r: EmailResult) => r.success).length,
    failed: result.results.filter((r: EmailResult) => !r.success).length,
    opened: 0,
    clicked: 0,
    bounced: 0,
  };

  await campaignRef.update({
    status: "completed",
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    stats,
  });

  return stats;
}
