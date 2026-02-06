const https = require("https");
const fs = require("fs");
const path = require("path");

// Read Firebase CLI tokens
const configPath = path.join(
  process.env.USERPROFILE,
  ".config",
  "configstore",
  "firebase-tools.json"
);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

// First, exchange refresh token for access token using Google OAuth2
const refreshToken = config.tokens.refresh_token;
const clientId = "764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com";
const clientSecret = "d-FL95Q19q7MQmFpd7hHD0Ty";

const postData = `grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${encodeURIComponent(refreshToken)}`;

const tokenReq = https.request(
  {
    hostname: "oauth2.googleapis.com",
    path: "/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData),
    },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      const tokenResponse = JSON.parse(data);
      if (!tokenResponse.access_token) {
        console.error("Failed to get access token:", data);
        process.exit(1);
      }
      console.log("Got access token, updating user...");
      updateUser(tokenResponse.access_token);
    });
  }
);
tokenReq.write(postData);
tokenReq.end();

function updateUser(accessToken) {
  const uid = "4NE9dxv0xfWmLHzUlrolmTAVqiW2";
  const projectId = "studio-9597335049-1a59a";

  // Use Firebase Auth Admin REST API
  const body = JSON.stringify({
    localId: uid,
    password: "SuperSend@2026",
    emailVerified: true,
  });

  const req = https.request(
    {
      hostname: "identitytoolkit.googleapis.com",
      path: `/v1/projects/${projectId}/accounts:update`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": Buffer.byteLength(body),
      },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode === 200) {
          console.log("SUCCESS! User updated.");
          console.log("Login with:");
          console.log("  Email: social@fatosocial.com");
          console.log("  Password: SuperSend@2026");
        } else {
          console.error("Error:", res.statusCode, data);
        }
        process.exit(0);
      });
    }
  );
  req.write(body);
  req.end();
}
