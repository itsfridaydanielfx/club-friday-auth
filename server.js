import "dotenv/config";
import express from "express";
import fetch from "node-fetch";

const app = express();

/* ===================== ENV ===================== */
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID;

// NIE hardcoduj domeny - trzymaj w Railway Variables
const REDIRECT_URI = process.env.REDIRECT_URI;

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
requireEnv("REDIRECT_URI", REDIRECT_URI);

/* ===================== HEALTHCHECK (MUSI BYĆ 200) ===================== */
app.get("/", (_req, res) => res.status(200).send("OK"));

/* ===================== OAUTH START ===================== */
app.get("/auth/discord", (_req, res) => {
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
      return res.status(500).send("❌ Błąd tokena (brak access_token)");
    }

    // 2) check membership + roles (na tokenie usera z TEGO logowania)
    const memberRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );

    if (!memberRes.ok) return res.status(403).send("❌ Nie jesteś na serwerze");

    const member = await memberRes.json();

    if (!member.roles?.includes(REQUIRED_ROLE_ID)) {
      return res.status(403).send("❌ Brak roli Club Friday Tools Access");
    }

    // 3) unlock electron + close
    return res.status(200).send(`
      <script>
        window.opener && window.opener.postMessage("DISCORD_OK", "*");
        window.close();
      </script>
    `);
  } catch (err) {
    console.error(err);
    return res.status(500).send("❌ Błąd autoryzacji");
  }
});

/* ===================== LISTEN ===================== */
const PORT = process.env.PORT || 3000;

// ważne dla Railway/proxy
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ SERVER LISTENING ON", PORT);
  console.log("✅ REDIRECT_URI =", REDIRECT_URI);
});

process.on("SIGTERM", () => {
  console.log("⚠️ Received SIGTERM (Railway stopping container)");
  process.exit(0);
});
