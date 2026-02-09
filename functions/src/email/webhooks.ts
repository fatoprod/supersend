import * as crypto from "crypto";
import { db } from "../index";
import * as admin from "firebase-admin";

/**
 * Mailgun Webhook Event Types
 * https://documentation.mailgun.com/docs/mailgun/user-manual/tracking-messages/
 */
type MailgunEventType =
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed"
  | "failed"
  | "rejected";

interface MailgunWebhookPayload {
  signature: {
    timestamp: string;
    token: string;
    signature: string;
  };
  "event-data": {
    event: MailgunEventType;
    timestamp: number;
    id: string;
    message: {
      headers: {
        "message-id": string;
        to: string;
        from: string;
        subject: string;
      };
    };
    recipient: string;
    "delivery-status"?: {
      code: number;
      message: string;
      description: string;
    };
    url?: string; // For click events
    severity?: string; // For bounce/failure: "permanent" or "temporary"
    reason?: string; // For failure events
  };
}

/**
 * Verify Mailgun webhook signature using HMAC SHA256
 * Uses the Mailgun HTTP Webhook Signing Key (not the API key)
 */
export function verifyWebhookSignature(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const encodedToken = crypto
    .createHmac("sha256", signingKey)
    .update(timestamp.concat(token))
    .digest("hex");

  return encodedToken === signature;
}

/**
 * Process incoming Mailgun webhook event
 * Finds the sentEmail document by messageId and updates it
 */
export async function processWebhookEvent(
  payload: MailgunWebhookPayload
): Promise<{ processed: boolean; event: string; messageId: string }> {
  const eventData = payload["event-data"];
  const event = eventData.event;
  const messageId = eventData.message?.headers?.["message-id"];
  const recipient = eventData.recipient;

  if (!messageId) {
    console.warn("Webhook event missing message-id:", event);
    return { processed: false, event, messageId: "" };
  }

  // Clean messageId — Mailgun wraps it in angle brackets: <id@domain>
  const cleanMessageId = messageId.replace(/^<|>$/g, "");

  // Search across all users' sentEmails for matching messageId
  // Firestore stores messageIds WITH angle brackets, so try that format first
  const bracketedId = `<${cleanMessageId}>`;
  let sentEmailsQuery = await db
    .collectionGroup("sentEmails")
    .where("messageId", "==", bracketedId)
    .limit(1)
    .get();

  let sentEmailDoc = sentEmailsQuery.docs[0];

  // Fallback: try without angle brackets
  if (!sentEmailDoc) {
    const altQuery = await db
      .collectionGroup("sentEmails")
      .where("messageId", "==", cleanMessageId)
      .limit(1)
      .get();
    sentEmailDoc = altQuery.docs[0];
  }

  if (!sentEmailDoc) {
    console.warn(`No sentEmail found for messageId: ${cleanMessageId} (event: ${event})`);
    return { processed: false, event, messageId: cleanMessageId };
  }

  const eventTimestamp = admin.firestore.Timestamp.fromMillis(eventData.timestamp * 1000);

  // Build update based on event type
  const updateData: Record<string, unknown> = {};

  switch (event) {
    case "delivered":
      updateData.delivered = true;
      updateData.deliveredAt = eventTimestamp;
      break;

    case "opened":
      updateData.opened = true;
      // Only set openedAt on first open
      if (!sentEmailDoc.data().openedAt) {
        updateData.openedAt = eventTimestamp;
      }
      // Track open count
      updateData.openCount = admin.firestore.FieldValue.increment(1);
      break;

    case "clicked":
      updateData.clicked = true;
      if (!sentEmailDoc.data().clickedAt) {
        updateData.clickedAt = eventTimestamp;
      }
      updateData.clickCount = admin.firestore.FieldValue.increment(1);
      if (eventData.url) {
        updateData.lastClickedUrl = eventData.url;
      }
      break;

    case "bounced":
    case "failed":
      updateData.status = "bounced";
      updateData.bouncedAt = eventTimestamp;
      if (eventData.severity) {
        updateData.bounceSeverity = eventData.severity; // "permanent" or "temporary"
      }
      if (eventData["delivery-status"]?.message) {
        updateData.bounceMessage = eventData["delivery-status"].message;
      }
      if (eventData.reason) {
        updateData.bounceReason = eventData.reason;
      }

      // If permanent bounce, mark contact as bounced in their list
      if (eventData.severity === "permanent" && recipient) {
        await markContactBounced(recipient);
      }
      break;

    case "complained":
      updateData.complained = true;
      updateData.complainedAt = eventTimestamp;
      break;

    case "unsubscribed":
      updateData.unsubscribedViaMailgun = true;
      updateData.unsubscribedAt = eventTimestamp;

      // Mark contact as unsubscribed
      if (recipient) {
        await markContactUnsubscribed(recipient);
      }
      break;

    default:
      console.log(`Unhandled webhook event type: ${event}`);
      return { processed: false, event, messageId: cleanMessageId };
  }

  await sentEmailDoc.ref.update(updateData);

  console.log(`Processed ${event} event for messageId: ${cleanMessageId}`);
  return { processed: true, event, messageId: cleanMessageId };
}

/**
 * Mark a contact as bounced across all user lists
 */
async function markContactBounced(email: string): Promise<void> {
  try {
    const contactsQuery = await db
      .collectionGroup("contacts")
      .where("email", "==", email)
      .get();

    const batch = db.batch();
    contactsQuery.docs.forEach((doc) => {
      batch.update(doc.ref, { bounced: true });
    });

    if (contactsQuery.docs.length > 0) {
      await batch.commit();
      console.log(`Marked ${contactsQuery.docs.length} contact(s) as bounced: ${email}`);
    }
  } catch (error) {
    console.error(`Failed to mark contact bounced: ${email}`, error);
  }
}

/**
 * Mark a contact as unsubscribed across all user lists
 */
async function markContactUnsubscribed(email: string): Promise<void> {
  try {
    const contactsQuery = await db
      .collectionGroup("contacts")
      .where("email", "==", email)
      .get();

    const batch = db.batch();
    contactsQuery.docs.forEach((doc) => {
      batch.update(doc.ref, { unsubscribed: true });
    });

    if (contactsQuery.docs.length > 0) {
      await batch.commit();
      console.log(`Marked ${contactsQuery.docs.length} contact(s) as unsubscribed: ${email}`);
    }
  } catch (error) {
    console.error(`Failed to mark contact unsubscribed: ${email}`, error);
  }
}
