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
exports.sendVerificationEmail = sendVerificationEmail;
exports.verifyEmailCode = verifyEmailCode;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const mailgun_1 = require("../email/mailgun");
function getDb() {
    return (0, firestore_1.getFirestore)("supersend");
}
/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
/**
 * Send verification email with code
 */
async function sendVerificationEmail(userId, email) {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    // Store verification code in Firestore
    await getDb().collection("users").doc(userId).set({
        email,
        emailVerified: false,
        verification: {
            code,
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            attempts: 0,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // Send email with verification code
    await (0, mailgun_1.sendEmail)({
        to: email,
        subject: "Verify your SuperSend account",
        from: "SuperSend <noreply@supersend.app>",
        html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px 20px; margin: 0;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 40px; text-align: center;">
            <h1 style="color: #3b82f6; margin-bottom: 24px; font-size: 28px;">Welcome to SuperSend!</h1>
            <p style="color: #94a3b8; margin-bottom: 32px; font-size: 16px; line-height: 1.6;">
              Enter the verification code below to confirm your email address.
            </p>
            <div style="background-color: #334155; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f8fafc;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
              This code expires in 30 minutes.
            </p>
          </div>
          <p style="text-align: center; color: #475569; font-size: 12px; margin-top: 24px;">
            If you didn't create a SuperSend account, you can safely ignore this email.
          </p>
        </body>
      </html>
    `,
        text: `Welcome to SuperSend!\n\nYour verification code is: ${code}\n\nThis code expires in 30 minutes.\n\nIf you didn't create a SuperSend account, you can safely ignore this email.`,
    });
}
/**
 * Verify the code submitted by user
 */
async function verifyEmailCode(userId, code) {
    const userRef = getDb().collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        return { success: false, error: "User not found" };
    }
    const userData = userDoc.data();
    const verification = userData.verification;
    if (!verification) {
        return { success: false, error: "No verification pending" };
    }
    if (userData.emailVerified) {
        return { success: false, error: "Email already verified" };
    }
    // Check expiration
    if (verification.expiresAt.toDate() < new Date()) {
        return { success: false, error: "Verification code expired" };
    }
    // Check attempts (max 5)
    if (verification.attempts >= 5) {
        return { success: false, error: "Too many attempts. Please request a new code." };
    }
    // Increment attempts
    await userRef.update({
        "verification.attempts": admin.firestore.FieldValue.increment(1),
    });
    // Check code
    if (verification.code !== code) {
        return { success: false, error: "Invalid verification code" };
    }
    // Mark email as verified
    await userRef.update({
        emailVerified: true,
        verification: admin.firestore.FieldValue.delete(),
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Also update Firebase Auth custom claims
    await admin.auth().setCustomUserClaims(userId, { emailVerified: true });
    return { success: true };
}
//# sourceMappingURL=verification.js.map