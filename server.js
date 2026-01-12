import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";

const app = express();

/* ===================== ENV ===================== */
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID;

// możesz dać w Railway Variables, ale jest fallback:
const REDIRECT_URI =
  process.env.REDIRECT_URI ||
  "https://club-friday-auth.up.railway.app/auth/discord/callback";

// JWT do sesji (MUSI być ustawione w Railway Variables)
const JWT_SECRET = process.env.JWT_SECRET;

// opcjonalnie: bot do “natychmiastowej” weryfikacji roli przy /session/verify
const BOT_TOKEN = process.env.BOT_TOKEN;

/* ===================== HARD FAILS ===================== */
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
requireEnv("JWT_SECRET", JWT_SECRET);

/* ===================== CORS ===================== */
// Electron (file://) ma origin "null", więc najprościej dać * dla tego backendu
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ===================== HEALTH ===================== */
app.get("/", (_req, res) => res.send("OK"));

/* ===================== OAUTH START ===================== */
app.get("/auth/discord", (_req, res) => {
  // wymagane scope do pobrania usera + membera w guild
  const scope = "identify guilds.members.read";

  const url =
    "https://discord.com/oauth2/authorize" +
    `?client_id=${CLIENT_ID}` +
    "&response_type=code" +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scope)}`;

  res.redirect(url);
});

/* ===================== OAUTH CALLBACK ===================== */
app.get("/auth/discord/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("❌ Brak code");

    // 1) exchange code -> access token
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
      return res.send("❌ Błąd tokena (brak access_token)");
    }

    // 2) get user id
    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });

    const me = await meRes.json();
    if (!me?.id) {
      console.error("❌ /users/@me:", me);
      return res.send("❌ Nie udało się pobrać usera");
    }

    // 3) check membership + roles using user OAuth token
    const memberRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );

    if (!memberRes.ok) {
      return res.send("❌ Nie jesteś na serwerze");
    }

    const member = await memberRes.json();

    if (!member.roles?.includes(REQUIRED_ROLE_ID)) {
      return res.send("❌ Brak roli Club Friday Tools Access");
    }

    // 4) issue session JWT (Twoja sesja, nie Discord token)
    const sessionToken = jwt.sign(
      { uid: me.id },
      JWT_SECRET,
      { expiresIn: "7d" } // ustaw jak chcesz
    );

    // 5) send token back to Electron via postMessage
    res.send(`
      <script>
        const payload = { type: "DISCORD_OK", token: ${JSON.stringify(sessionToken)} };
        if (window.opener) window.opener.postMessage(payload, "*");
        window.close();
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.send("❌ Błąd autoryzacji");
  }
});

/* ===================== SESSION VERIFY ===================== */
// Frontend odpytuje to przy starcie i cyklicznie.
// - Bez BOT_TOKEN: sprawdza tylko ważność JWT
// - Z BOT_TOKEN: sprawdza też czy user nadal ma rolę
app.get("/session/verify", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, reason: "NO_TOKEN" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const uid = decoded?.uid;
    if (!uid) return res.status(401).json({ ok: false, reason: "BAD_TOKEN" });

    // natychmiastowa weryfikacja roli (opcjonalnie)
    if (BOT_TOKEN) {
      const r = await fetch(
        `https://discord.com/api/guilds/${GUILD_ID}/members/${uid}`,
        { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
      );

      if (!r.ok) return res.status(403).json({ ok: false, reason: "NO_MEMBER" });

      const m = await r.json();
      const hasRole = m.roles?.includes(REQUIRED_ROLE_ID);

      if (!hasRole) return res.status(403).json({ ok: false, reason: "NO_ROLE" });
    }

    return res.json({ ok: true });
  } catch {
    return res.status(401).json({ ok: false, reason: "EXPIRED_OR_INVALID" });
  }
});

/* ===================== LISTEN ===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ SERVER LISTENING ON", PORT);
  console.log("✅ REDIRECT_URI =", REDIRECT_URI);
  console.log("✅ BOT_ROLE_CHECK =", !!BOT_TOKEN);
});
