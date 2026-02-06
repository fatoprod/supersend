import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { sendEmail, sendBulkEmails } from "./email/mailgun";
import { verifyEmailCode, sendVerificationEmail } from "./auth/verification";

// Initialize Firebase Admin
admin.initializeApp();

// Export named Firestore database instance
export const db = getFirestore("supersend-bd");

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
  await db.collection("users").doc(context.auth.uid).collection("sentEmails").add({
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
    const result = await sendBulkEmails({
      recipients: campaignData.recipients,
      subject: campaignData.subject,
      html: campaignData.html,
      text: campaignData.text,
      from: campaignData.from || "noreply@supersend.app",
    });
    
    // Log results
    for (const emailResult of result.results) {
      await db
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
          const result = await sendBulkEmails({
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
