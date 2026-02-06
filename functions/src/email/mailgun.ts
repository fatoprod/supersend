import Mailgun from "mailgun.js";
import FormData from "form-data";
import { defineString } from "firebase-functions/params";

// Define config parameters
const mailgunApiKey = defineString("MAILGUN_API_KEY");
const mailgunDomain = defineString("MAILGUN_DOMAIN");

// Initialize Mailgun client
const mailgun = new Mailgun(FormData);

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from: string;
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
