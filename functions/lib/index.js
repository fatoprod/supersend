"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScheduledCampaigns = exports.processCampaign = exports.sendSingleEmail = exports.resendVerification = exports.verifyEmail = exports.onUserCreated = exports.db = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const mailgun_1 = require("./email/mailgun");
const verification_1 = require("./auth/verification");
// Initialize Firebase Admin
admin.initializeApp();
// Export Firestore instance
exports.db = admin.firestore();
// ============ Auth Functions ============
/**
 * Send verification email when user signs up
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    if (user.email) {
        await (0, verification_1.sendVerificationEmail)(user.uid, user.email);
    }
});
/**
 * Verify email code submitted by user
 */
exports.verifyEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { code } = data;
    if (!code) {
        throw new functions.https.HttpsError("invalid-argument", "Code is required");
    }
    return (0, verification_1.verifyEmailCode)(context.auth.uid, code);
});
/**
 * Resend verification email
 */
exports.resendVerification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const userDoc = await exports.db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (!userData?.email) {
        throw new functions.https.HttpsError("not-found", "User email not found");
    }
    if (userData.emailVerified) {
        throw new functions.https.HttpsError("already-exists", "Email already verified");
    }
    await (0, verification_1.sendVerificationEmail)(context.auth.uid, userData.email);
    return { success: true };
});
// ============ Email Campaign Functions ============
/**
 * Send a single email
 */
exports.sendSingleEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { to, subject, html, text, from } = data;
    if (!to || !subject || (!html && !text)) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    const result = await (0, mailgun_1.sendEmail)({
        to,
        subject,
        html,
        text,
        from: from || "noreply@supersend.app",
    });
    // Log sent email
    await exports.db.collection("users").doc(context.auth.uid).collection("sentEmails").add({
        to,
        subject,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: result.success ? "sent" : "failed",
        messageId: result.messageId,
    });
    return result;
});
/**
 * Process campaign and send bulk emails
 */
exports.processCampaign = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
    }
    const { campaignId } = data;
    if (!campaignId) {
        throw new functions.https.HttpsError("invalid-argument", "Campaign ID required");
    }
    const campaignRef = exports.db
        .collection("users")
        .doc(context.auth.uid)
        .collection("campaigns")
        .doc(campaignId);
    const campaign = await campaignRef.get();
    if (!campaign.exists) {
        throw new functions.https.HttpsError("not-found", "Campaign not found");
    }
    const campaignData = campaign.data();
    // Update campaign status
    await campaignRef.update({ status: "processing" });
    try {
        const result = await (0, mailgun_1.sendBulkEmails)({
            recipients: campaignData.recipients,
            subject: campaignData.subject,
            html: campaignData.html,
            text: campaignData.text,
            from: campaignData.from || "noreply@supersend.app",
        });
        // Log results
        for (const emailResult of result.results) {
            await exports.db
                .collection("users")
                .doc(context.auth.uid)
                .collection("sentEmails")
                .add({
                campaignId,
                to: emailResult.to,
                subject: campaignData.subject,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                status: emailResult.success ? "sent" : "failed",
                messageId: emailResult.messageId,
                error: emailResult.error,
            });
        }
        await campaignRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            stats: {
                total: result.results.length,
                sent: result.results.filter((r) => r.success).length,
                failed: result.results.filter((r) => !r.success).length,
            },
        });
        return { success: true, stats: result.results.length };
    }
    catch (error) {
        await campaignRef.update({ status: "failed", error: String(error) });
        throw new functions.https.HttpsError("internal", "Failed to process campaign");
    }
});
/**
 * Scheduled function to process scheduled campaigns
 */
exports.processScheduledCampaigns = functions.pubsub
    .schedule("every 5 minutes")
    .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    // Find all users with scheduled campaigns
    const usersSnapshot = await exports.db.collection("users").get();
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
                const result = await (0, mailgun_1.sendBulkEmails)({
                    recipients: campaignData.recipients,
                    subject: campaignData.subject,
                    html: campaignData.html,
                    text: campaignData.text,
                    from: campaignData.from || "noreply@supersend.app",
                });
                // Log results
                for (const emailResult of result.results) {
                    await userDoc.ref.collection("sentEmails").add({
                        campaignId: campaignDoc.id,
                        to: emailResult.to,
                        subject: campaignData.subject,
                        sentAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: emailResult.success ? "sent" : "failed",
                        messageId: emailResult.messageId,
                        error: emailResult.error,
                    });
                }
                await campaignDoc.ref.update({
                    status: "completed",
                    completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    stats: {
                        total: result.results.length,
                        sent: result.results.filter((r) => r.success).length,
                        failed: result.results.filter((r) => !r.success).length,
                    },
                });
            }
            catch (error) {
                await campaignDoc.ref.update({
                    status: "failed",
                    error: String(error),
                });
            }
        }
    }
    return null;
});
//# sourceMappingURL=index.js.map