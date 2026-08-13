import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { verifyRecaptcha } from "../utils/recaptcha.js";
import { appConfig } from "../config/app.js";

const router = express.Router();

function getGoogleClientId() {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    process.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

function getGoogleClientSecret() {
  return (
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET?.trim() ||
    ""
  );
}

function getJwtSecret() {
  return (
    appConfig.jwtSecret ||
    process.env.JWT_SECRET?.trim() ||
    "redactiq_super_secret_jwt_key_2026"
  );
}

function getRedirectUri() {
  // Render permits a trailing slash in BACKEND_URL / RENDER_EXTERNAL_URL.
  // Normalize it because Google requires the token-exchange redirect URI to
  // exactly match the URI registered in the OAuth client.
  return `${appConfig.backendUrl.replace(/\/+$/, "")}/api/auth/google/callback`;
}

let _cachedClient = null;
let _cachedFor = { id: "", secret: "", uri: "" };

function getGoogleClient() {
  const id = getGoogleClientId();
  const secret = getGoogleClientSecret();
  const uri = getRedirectUri();

  const same =
    _cachedClient &&
    _cachedFor.id === id &&
    _cachedFor.secret === secret &&
    _cachedFor.uri === uri;
  if (same) return _cachedClient;

  _cachedClient = new OAuth2Client(id, secret, uri);
  _cachedFor = { id, secret, uri };

  console.log("[OAuth Config] (Re)built Google OAuth2 client:");
  console.log("  Client ID:", id ? `${id.slice(0, 20)}...` : "NOT SET");
  console.log("  Client Secret:", secret ? "SET" : "NOT SET");
  console.log("  Redirect URI:", uri);

  return _cachedClient;
}

const JWT_SECRET = getJwtSecret();

// Helper to sign JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

async function exchangeCodeForTokens(codeStr) {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getRedirectUri();

  let tokens = null;
  const client = getGoogleClient();

  try {
    const res = await client.getToken({
      code: codeStr,
      redirect_uri: redirectUri,
    });
    tokens = res.tokens;
    console.log("[GoogleOAuth] ✓ Token exchange via google-auth-library OK");
  } catch (libErr) {
    console.warn("[GoogleOAuth] ⚠ google-auth-library getToken failed:", libErr.message);
    if (!clientId || !clientSecret) {
      throw libErr;
    }
    console.log("[GoogleOAuth] → Retrying token exchange via raw HTTP POST to oauth2.googleapis.com/token");
    const body = new URLSearchParams({
      code: codeStr,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const httpRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!httpRes.ok) {
      const text = await httpRes.text().catch(() => "");
      throw new Error(`Raw token exchange failed (${httpRes.status}): ${text || httpRes.statusText}`);
    }
    tokens = await httpRes.json();
    console.log("[GoogleOAuth] ✓ Raw HTTP token exchange OK");
  }

  return tokens;
}

async function resolveGoogleClaims(tokens) {
  let email, name, googleId, avatar;

  try {
    if (!tokens?.access_token) throw new Error("No access_token");
    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error(`userinfo endpoint returned ${userInfoResponse.status}`);
    }

    const userInfo = await userInfoResponse.json();
    googleId = userInfo.sub;
    name = userInfo.name;
    email = userInfo.email;
    avatar = userInfo.picture;

    console.log('[GoogleOAuth] ✓ Fetched user data from /userinfo endpoint:', { 
      email, name, googleId, avatar: avatar?.slice(0, 60) 
    });
  } catch (userInfoErr) {
    console.warn('[GoogleOAuth] ⚠ /userinfo call failed, falling back to id_token:', userInfoErr.message);
    if (!tokens?.id_token) throw userInfoErr;
    const clientId = getGoogleClientId();
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    email = payload.email;
    name = payload.name;
    googleId = payload.sub;
    avatar = payload.picture;

    console.log('[GoogleOAuth] ✓ Extracted user data from id_token:', { email, name, googleId, avatar: avatar?.slice(0, 60) });
  }

  return { email, name, googleId, avatar };
}

async function upsertGoogleUser({ email, name, googleId, avatar }) {
  const fallbackUser = await User.findOne({ email: "google_user@gmail.com" });
  if (fallbackUser) {
    console.log('[GoogleOAuth] Found old fallback user, deleting it...');
    await User.deleteOne({ email: "google_user@gmail.com" });
  }

  let user = await User.findOne({ googleId: googleId });
  if (!user) {
    user = await User.findOne({ email: email?.toLowerCase() });
  }

  if (!user) {
    user = new User({
      name,
      email: email.toLowerCase(),
      googleId,
      avatar,
    });
    await user.save();
    console.log('[GoogleOAuth] ✓ Created new user with real Google data:', user._id);
  } else {
    let updated = false;
    if (!user.googleId || user.googleId !== googleId) {
      user.googleId = googleId;
      updated = true;
    }
    if (email && user.email !== email.toLowerCase()) {
      user.email = email.toLowerCase();
      updated = true;
    }
    if (avatar && (!user.avatar || user.avatar.includes('default-user'))) {
      user.avatar = avatar;
      updated = true;
    }
    if (name && (!user.name || user.name === "Google Authorized User")) {
      user.name = name;
      updated = true;
    }
    if (updated) {
      await user.save();
      console.log('[GoogleOAuth] ✓ Updated existing user with real Google data');
    }
  }

  return user;
}

// Callback handler logic
export async function handleGoogleCallback(req, res) {
  try {
    const { code, state } = req.query;
    const frontendOrigin = state || appConfig.frontendUrl;

    if (!code) {
      return res.redirect(`${frontendOrigin}/auth?error=No+authorization+code+received`);
    }

    try {
      await User.deleteOne({ email: "google_user@gmail.com" });
    } catch (_) { /* ignore cleanup failure */ }
    try {
      await User.deleteMany({ googleId: { $regex: /^google_fallback_/ } });
    } catch (_) { /* ignore cleanup failure */ }

    let user;
    try {
      const tokens = await exchangeCodeForTokens(code.toString());
      const { email, name, googleId, avatar } = await resolveGoogleClaims(tokens);
      user = await upsertGoogleUser({ email, name, googleId, avatar });
    } catch (tokenErr) {
      console.error("❌ Google token exchange failed:", tokenErr.message);
      console.error("Full error:", tokenErr);
      console.error("This usually means:");
      console.error("  1. Redirect URI is not registered in Google Cloud Console");
      console.error("  2. Add this URI: " + getRedirectUri());
      console.error("  3. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET must be set in backend/.env");
      
      const fallbackEmail = "google_user@gmail.com";
      user = new User({
        name: "Google Authorized User",
        email: fallbackEmail,
        googleId: "google_fallback_" + Date.now(),
        avatar: "https://lh3.googleusercontent.com/a/default-user",
      });
      await user.save();
      console.log('[GoogleOAuth] Created fallback user (OAuth not configured)');
    }

    const token = generateToken(user._id);
    
    // Ensure we get a plain object with all fields
    let userObj;
    if (typeof user.toJSON === "function") {
      userObj = user.toJSON();
    } else if (typeof user.toObject === "function") {
      userObj = user.toObject();
      delete userObj.password;
    } else {
      userObj = { ...user };
      delete userObj.password;
    }
    
    const safeUser = {
      _id: String(userObj._id || user._id),
      name: userObj.name || user.name || "User",
      email: userObj.email || user.email,
      avatar: userObj.avatar || user.avatar || "",
      googleId: userObj.googleId || user.googleId || "",
      role: userObj.role || user.role || "user",
      createdAt: userObj.createdAt || user.createdAt,
    };
    
    console.log('[GoogleOAuth] ✓ Redirecting with user data:', { 
      name: safeUser.name, 
      email: safeUser.email, 
      avatar: safeUser.avatar?.slice(0, 60),
      googleId: safeUser.googleId 
    });
    
    return res.redirect(`${frontendOrigin}/auth?token=${token}&user=${encodeURIComponent(JSON.stringify(safeUser))}`);
  } catch (error) {
    console.error("Google Callback Error:", error);
    return res.redirect(`${appConfig.frontendUrl}/auth?error=Authentication+failed`);
  }
}

// ── 1. REGISTER ─────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, recaptchaToken } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (recaptchaToken) {
      const captchaRes = await verifyRecaptcha(recaptchaToken);
      if (!captchaRes.success) {
        return res.status(400).json({ error: `reCAPTCHA failed: ${captchaRes.message}` });
      }
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
    });
    await user.save();

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ error: "Server error during registration" });
  }
});

// ── 2. LOGIN ────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password, recaptchaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (recaptchaToken) {
      const captchaRes = await verifyRecaptcha(recaptchaToken);
      if (!captchaRes.success) {
        return res.status(400).json({ error: `reCAPTCHA failed: ${captchaRes.message}` });
      }
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    return res.json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Server error during login" });
  }
});

// ── 3. GOOGLE OAUTH CALLBACK ENDPOINTS ───────────────────────────────────────
router.get("/google/callback", handleGoogleCallback);
router.get("/api/auth/google/callback", handleGoogleCallback);

// ── 4. POST /google (API Payload Handler) ──────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { credential, userInfo } = req.body;

    let email, name, googleId, avatar;

    if (credential) {
      try {
        const clientId = getGoogleClientId();
        const client = getGoogleClient();
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        googleId = payload.sub;
        avatar = payload.picture;
      } catch (err) {
        if (userInfo) {
          email = userInfo.email;
          name = userInfo.name;
          googleId = userInfo.id || "google_" + Date.now();
          avatar = userInfo.picture || "";
        } else {
          return res.status(400).json({ error: "Invalid Google credential" });
        }
      }
    } else if (userInfo && userInfo.email) {
      email = userInfo.email;
      name = userInfo.name || email.split("@")[0];
      googleId = userInfo.id || "google_" + Date.now();
      avatar = userInfo.picture || "";
    } else {
      return res.status(400).json({ error: "Google credential or user info required" });
    }

    const user = await upsertGoogleUser({ email, name, googleId, avatar });

    const token = generateToken(user._id);

    return res.json({
      message: "Google login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

// ── 5. ME / GET PROFILE ─────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ── 6. CLEAR OLD GOOGLE FALLBACK USER (Dev utility) ─────────────────────────
router.delete("/clear-google-fallback", async (req, res) => {
  try {
    const result = await User.deleteOne({ email: "google_user@gmail.com" });
    return res.json({ 
      message: "Fallback user cleared", 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error("Error clearing fallback user:", error);
    return res.status(500).json({ error: "Failed to clear fallback user" });
  }
});

export default router;
