import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import fetch from "node-fetch";

const app = express();

console.log("🔥 BUILD MARKER 2026-01-13");

/* ===== request logger (ważne) ===== */
app.use((req, _res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

/* ===================== ENV ===================== */
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID;
const REDIRECT_URI = process.env.REDIRECT_URI;

function requireEnv(name, val) {
  if (!val) {
    console.error(`❌ Missing ENV: ${name}`);
    process.exit(1);
  }
}

requireEnv("CLIENT_ID", CLIENT_ID);
requireEnv("CLIENT_SECRET", CLIENT_SECRET);
requireEnv("GUILD_ID", GUILD_ID);
requireEnv("REQUIRED_ROLE_ID", REQUIRED_ROLE_ID);
requireEnv("REDIRECT_URI", REDIRECT_URI);

/* ===================== CONSTANTS / LINKS ===================== */
const JOIN_SERVER_URL = "https://dsc.gg/clubfriday";
const STRIPE_URL = "https://buy.stripe.com/9B63cv6Bo5078SK3kc7IY03";
const IG_URL = "https://instagram.com/itsfridaydaniel";
const CONTACT_TAG = "@itsfridaydaniel";

/* ===================== PATHS ===================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/public", express.static(path.join(__dirname, "public"), { maxAge: "1h" }));

/* ===================== TEMPLATE CACHE ===================== */
let CALLBACK_TPL = null;

async function loadTemplatesOnce() {
  try {
    if (!CALLBACK_TPL) {
      CALLBACK_TPL = await readFile(path.join(__dirname, "public", "callback.html"), "utf8");
      console.log("✅ Loaded callback.html template");
    }
  } catch (e) {
    console.error("❌ Failed to load callback.html:", e);
    process.exit(1);
  }
}

/* ===================== HELPERS ===================== */
function oauthUrl() {
  const scope = "identify guilds.members.read";
  return (
    "https://discord.com/oauth2/authorize" +
    `?client_id=${CLIENT_ID}` +
    "&response_type=code" +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scope)}`
  );
}

function htmlEscape(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sendAuthPage(res) {
  res.sendFile(path.join(__dirname, "public", "auth.html"));
}

function sendCallbackPage(res, payload) {
  // payload: { status, title, message, code, ctaPrimaryText, ctaPrimaryHref, ctaSecondaryText, ctaSecondaryHref }
  const {
    status = "error",
    title = "Wystąpił problem",
    message = "Spróbuj ponownie.",
    code = "",
    ctaPrimaryText = "",
    ctaPrimaryHref = "",
    ctaSecondaryText = "",
    ctaSecondaryHref = ""
  } = payload || {};

  const out = CALLBACK_TPL
    .replaceAll("{{STATUS}}", htmlEscape(status))
    .replaceAll("{{TITLE}}", htmlEscape(title))
    .replaceAll("{{MESSAGE}}", htmlEscape(message))
    .replaceAll("{{CODE}}", htmlEscape(code || ""))
    .replaceAll("{{CTA_PRIMARY_TEXT}}", htmlEscape(ctaPrimaryText))
    .replaceAll("{{CTA_PRIMARY_HREF}}", htmlEscape(ctaPrimaryHref))
    .replaceAll("{{CTA_SECONDARY_TEXT}}", htmlEscape(ctaSecondaryText))
    .replaceAll("{{CTA_SECONDARY_HREF}}", htmlEscape(ctaSecondaryHref))
    .replaceAll("{{JOIN_SERVER_URL}}", htmlEscape(JOIN_SERVER_URL))
    .replaceAll("{{STRIPE_URL}}", htmlEscape(STRIPE_URL))
    .replaceAll("{{IG_URL}}", htmlEscape(IG_URL))
    .replaceAll("{{CONTACT_TAG}}", htmlEscape(CONTACT_TAG));

  res.status(status === "ok" ? 200 : 403).type("html").send(out);
}

/* ===================== HEALTH ===================== */
app.get("/", (_req, res) => res.status(200).send("OK"));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

/* ===================== CONFIG FOR FRONTEND ===================== */
app.get("/config", (_req, res) => {
  res.json({
    oauthUrl: oauthUrl(),
    joinServerUrl: JOIN_SERVER_URL,
    stripeUrl: STRIPE_URL,
    igUrl: IG_URL,
    contactTag: CONTACT_TAG
  });
});

/* ===================== AUTH UI START ===================== */
app.get("/auth/discord", (_req, res) => {
  sendAuthPage(res);
});

/* ===================== OAUTH CALLBACK ===================== */
app.get("/auth/discord/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return sendCallbackPage(res, {
        status: "error",
        title: "Brak kodu autoryzacji",
        message: "Zamknij to okno i spróbuj ponownie w aplikacji.",
        code: "NO_CODE"
      });
    }

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    const token = await tokenRes.json();
    if (!token?.access_token) {
      console.error("❌ Token response:", token);
      return sendCallbackPage(res, {
        status: "error",
        title: "Nie udało się zalogować",
        message: "Discord nie zwrócił tokena dostępu. Spróbuj ponownie za chwilę.",
        code: "NO_ACCESS_TOKEN"
      });
    }

    const memberRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );

    if (!memberRes.ok) {
      return sendCallbackPage(res, {
        status: "error",
        title: "Nie jesteś na serwerze",
        message: "Dołącz na Club Friday i zaloguj się ponownie w aplikacji.",
        code: "NOT_IN_GUILD"
      });
    }

    const member = await memberRes.json();
    if (!member.roles?.includes(REQUIRED_ROLE_ID)) {
      return sendCallbackPage(res, {
        status: "error",
        title: "Brak roli dostępu",
        message:
          "Kup dostęp przez Stripe (BLIK), potem napisz do mnie na IG lub Discordzie, żebym nadał rolę.",
        code: "MISSING_ROLE"
      });
    }

    // ✅ SUCCESS
    return sendCallbackPage(res, {
      status: "ok",
      title: "Połączono z Discordem",
      message: "Rola potwierdzona. Możesz wrócić do aplikacji — okno zamknie się automatycznie.",
      code: "OK"
    });
  } catch (err) {
    console.error(err);
    return sendCallbackPage(res, {
      status: "error",
      title: "Błąd autoryzacji",
      message: "Spróbuj ponownie za chwilę.",
      code: "SERVER_ERROR"
    });
  }
});

/* ===================== START SERVER ===================== */
const PORT = process.env.PORT || 3000;

(async () => {
  await loadTemplatesOnce();

  app.listen(PORT, "0.0.0.0", () => {
    console.log("✅ SERVER LISTENING ON", PORT);
    console.log("✅ REDIRECT_URI =", REDIRECT_URI);
  });
})();

process.on("SIGTERM", () => {
  console.log("⚠️ Received SIGTERM (Railway stopping container)");
  process.exit(0);
});
