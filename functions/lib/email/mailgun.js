"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendBulkEmails = sendBulkEmails;
exports.generateEmailHtml = generateEmailHtml;
const mailgun_js_1 = __importDefault(require("mailgun.js"));
const form_data_1 = __importDefault(require("form-data"));
const params_1 = require("firebase-functions/params");
// Define config parameters
const mailgunApiKey = (0, params_1.defineString)("MAILGUN_API_KEY");
const mailgunDomain = (0, params_1.defineString)("MAILGUN_DOMAIN");
// Initialize Mailgun client
const mailgun = new mailgun_js_1.default(form_data_1.default);
/**
 * Send a single email via Mailgun
 */
async function sendEmail(options) {
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
    }
    catch (error) {
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
async function sendBulkEmails(options) {
    const results = [];
    const batchSize = 50; // Mailgun recommends max 1000 per batch
    const mg = mailgun.client({
        username: "api",
        key: mailgunApiKey.value(),
    });
    // Process in batches
    for (let i = 0; i < options.recipients.length; i += batchSize) {
        const batch = options.recipients.slice(i, i + batchSize);
        // Send emails in parallel within batch
        const batchResults = await Promise.all(batch.map(async (recipient) => {
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
            }
            catch (error) {
                console.error(`Failed to send to ${recipient}:`, error);
                return {
                    to: recipient,
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                };
            }
        }));
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
function generateEmailHtml(template, variables) {
    let html = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        html = html.replace(regex, value);
    }
    return html;
}
//# sourceMappingURL=mailgun.js.map