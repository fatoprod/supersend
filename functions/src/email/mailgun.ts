import Mailgun from "mailgun.js";
import FormData from "form-data";
import { defineString } from "firebase-functions/params";
import * as https from "https";
import * as http from "http";

// Define config parameters
const mailgunApiKey = defineString("MAILGUN_API_KEY");
const mailgunDomain = defineString("MAILGUN_DOMAIN");

// Initialize Mailgun client
const mailgun = new Mailgun(FormData);

export interface AttachmentData {
  filename: string;
  data: Buffer;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from: string;
  replyTo?: string;
  attachments?: AttachmentData[];
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface BulkEmailOptions {
  recipients: string[];
  subject: string;
  html?: string;
  text?: string;
  from: string;
  replyTo?: string;
  attachments?: AttachmentData[];
}

interface BulkEmailResult {
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

/**
 * Send a single email via Mailgun
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const mg = mailgun.client({
      username: "api",
      key: mailgunApiKey.value(),
    });

    const result = await mg.messages.create(mailgunDomain.value(), {
      from: options.from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
      template: "",
      ...(options.replyTo ? { "h:Reply-To": options.replyTo } : {}),
      ...(options.attachments && options.attachments.length > 0
        ? { attachment: options.attachments.map((a) => ({ filename: a.filename, data: a.data })) }
        : {}),
    });

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    console.error("Mailgun send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send bulk emails via Mailgun
 * Processes emails in batches to avoid rate limits
 */
export async function sendBulkEmails(options: BulkEmailOptions): Promise<BulkEmailResult> {
  const results: BulkEmailResult["results"] = [];
  const batchSize = 50; // Mailgun recommends max 1000 per batch
  
  const mg = mailgun.client({
    username: "api",
    key: mailgunApiKey.value(),
  });

  // Process in batches
  for (let i = 0; i < options.recipients.length; i += batchSize) {
    const batch = options.recipients.slice(i, i + batchSize);
    
    // Send emails in parallel within batch
    const batchResults = await Promise.all(
      batch.map(async (recipient) => {
        try {
          const result = await mg.messages.create(mailgunDomain.value(), {
            from: options.from,
            to: [recipient],
            subject: options.subject,
            text: options.text,
            html: options.html,
            template: "",
            ...(options.replyTo ? { "h:Reply-To": options.replyTo } : {}),
            ...(options.attachments && options.attachments.length > 0
              ? { attachment: options.attachments.map((a) => ({ filename: a.filename, data: a.data })) }
              : {}),
          });

          return {
            to: recipient,
            success: true,
            messageId: result.id,
          };
        } catch (error) {
          console.error(`Failed to send to ${recipient}:`, error);
          return {
            to: recipient,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < options.recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { results };
}

/**
 * Generate email HTML from template with variables
 */
export function generateEmailHtml(
  template: string,
  variables: Record<string, string>
): string {
  let html = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    html = html.replace(regex, value);
  }
  
  return html;
}

/**
 * Download a file from a URL and return as Buffer
 * Used to download attachments from Firebase Storage before sending via Mailgun
 */
export function downloadFileAsBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          downloadFileAsBuffer(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download file: HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}
