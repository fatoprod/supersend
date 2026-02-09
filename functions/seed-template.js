/**
 * Seed script: Add default email template to Firestore
 * Run: node functions/seed-template.js <USER_UID>
 */
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
db.settings({ databaseId: "supersend-bd" });

const defaultTemplate = {
  name: "Default Template",
  subject: "{{subject}}",
  html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f7; padding: 0 24px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); margin: 50px auto;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #6366f1; padding: 32px 40px; text-align: center;">
              <img src="{{logo_url}}" alt="{{company}}" width="160" height="auto" style="display: block; margin: 0 auto; max-width: 160px; height: auto;" />
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #c7d2fe; letter-spacing: 0.5px;">{{company}}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #1e1b4b; line-height: 1.3;">{{title}}</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">{{content}}</p>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 8px 0 0 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #6366f1;">
                    <a href="{{cta_url}}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">{{cta_text}}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                Você recebeu este email porque está inscrito em {{company}}.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                <a href="{{unsubscribe_url}}" style="color: #6366f1; text-decoration: underline;">Unsubscribe</a> · <a href="{{preferences_url}}" style="color: #6366f1; text-decoration: underline;">Manage preferences</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #d1d5db;">
                {{company_address}}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  text: "{{title}}\n\n{{content}}\n\n{{cta_text}}: {{cta_url}}\n\n---\nUnsubscribe: {{unsubscribe_url}}",
  variables: ["subject", "logo_url", "company", "title", "content", "cta_url", "cta_text", "unsubscribe_url", "preferences_url", "company_address"],
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

async function seed() {
  const userId = process.argv[2];
  
  if (!userId) {
    // List all users to help find the UID
    const usersSnapshot = await db.collection("users").get();
    console.log("\nUsers in database:");
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`  UID: ${doc.id} | Email: ${data.email || "N/A"}`);
    });
    console.log("\nUsage: node seed-template.js <USER_UID>");
    process.exit(1);
  }

  console.log(`Adding default template for user: ${userId}`);
  
  const ref = await db
    .collection("users")
    .doc(userId)
    .collection("templates")
    .add(defaultTemplate);
  
  console.log(`Template created with ID: ${ref.id}`);
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
