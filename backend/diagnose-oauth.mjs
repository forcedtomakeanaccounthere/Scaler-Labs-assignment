/**
 * OAuth Configuration Diagnostic Script
 * Run this to check if Google OAuth is configured correctly
 */

import dotenv from "dotenv";
dotenv.config();

console.log("=".repeat(80));
console.log("GOOGLE OAUTH CONFIGURATION DIAGNOSTIC");
console.log("=".repeat(80));

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
const REDIRECT_URI = `${BACKEND_URL}/api/auth/google/callback`;

console.log("\n📋 Environment Variables:\n");

console.log("✓ GOOGLE_CLIENT_ID:");
if (GOOGLE_CLIENT_ID) {
  console.log(`  Value: ${GOOGLE_CLIENT_ID.slice(0, 30)}...`);
  console.log(`  Length: ${GOOGLE_CLIENT_ID.length} characters`);
  console.log(`  Format: ${GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com') ? '✓ Valid format' : '⚠ Unexpected format'}`);
} else {
  console.log("  ❌ NOT SET");
}

console.log("\n✓ GOOGLE_CLIENT_SECRET:");
if (GOOGLE_CLIENT_SECRET) {
  console.log(`  Value: ${GOOGLE_CLIENT_SECRET.slice(0, 15)}...`);
  console.log(`  Length: ${GOOGLE_CLIENT_SECRET.length} characters`);
  console.log(`  Format: ${GOOGLE_CLIENT_SECRET.startsWith('GOCSPX-') ? '✓ Valid format' : '⚠ Unexpected format'}`);
} else {
  console.log("  ❌ NOT SET");
}

console.log("\n✓ REDIRECT_URI:");
console.log(`  ${REDIRECT_URI}`);

console.log("\n" + "=".repeat(80));
console.log("CONFIGURATION STATUS");
console.log("=".repeat(80));

const allSet = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET;

if (allSet) {
  console.log("\n✅ All OAuth credentials are set!\n");
  
  console.log("Next steps:");
  console.log("1. Verify in Google Cloud Console:");
  console.log("   → Go to: https://console.cloud.google.com/apis/credentials");
  console.log(`   → Find OAuth 2.0 Client ID: ${GOOGLE_CLIENT_ID.slice(0, 30)}...`);
  console.log("   → Check 'Authorized redirect URIs' section");
  console.log(`   → Must include: ${REDIRECT_URI}`);
  console.log("");
  console.log("2. If redirect URI is missing, add it:");
  console.log("   → Click on your OAuth client ID");
  console.log("   → Under 'Authorized redirect URIs', click 'ADD URI'");
  console.log(`   → Add: ${REDIRECT_URI}`);
  console.log("   → Click 'SAVE'");
  console.log("");
  console.log("3. Restart your backend server:");
  console.log("   → Press Ctrl+C to stop");
  console.log("   → Run: npm start");
  console.log("");
} else {
  console.log("\n❌ OAuth credentials are missing!\n");
  
  console.log("To fix this:");
  console.log("1. Go to Google Cloud Console:");
  console.log("   → https://console.cloud.google.com/apis/credentials");
  console.log("");
  console.log("2. Create OAuth 2.0 Client ID (if not already created):");
  console.log("   → Click 'CREATE CREDENTIALS' → 'OAuth client ID'");
  console.log("   → Application type: 'Web application'");
  console.log("   → Name: 'RedactIQ Local Development'");
  console.log(`   → Authorized redirect URIs: ${REDIRECT_URI}`);
  console.log("   → Click 'CREATE'");
  console.log("");
  console.log("3. Copy the credentials:");
  console.log("   → Copy 'Your Client ID'");
  console.log("   → Copy 'Your Client Secret'");
  console.log("");
  console.log("4. Update backend/.env file:");
  console.log("   → GOOGLE_CLIENT_ID=<paste your client ID>");
  console.log("   → GOOGLE_CLIENT_SECRET=<paste your client secret>");
  console.log("");
  console.log("5. Restart your backend server");
  console.log("");
}

console.log("=".repeat(80));
console.log("");

// Test OAuth2Client initialization
console.log("Testing OAuth2Client initialization...\n");

try {
  const { OAuth2Client } = await import("google-auth-library");
  const client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
  
  console.log("✅ OAuth2Client created successfully");
  console.log(`   Redirect URI: ${client.redirectUri || 'not set'}`);
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.log("\n⚠ Warning: Client credentials are missing.");
    console.log("   OAuth will fail during token exchange.");
  }
  
} catch (error) {
  console.log("❌ Failed to create OAuth2Client:");
  console.log(`   ${error.message}`);
}

console.log("\n" + "=".repeat(80));
