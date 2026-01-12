import "dotenv/config";
import express from "express";
import fetch from "node-fetch";

const app = express();

/* ===================== ENV ===================== */
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID;

const REDIRECT_URI =
  process.env.REDIRECT_URI ||
  "https://club-friday-auth.up.railway.app/auth/discord/callback";

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

/* ===================== HEALTH ===================== */
app.get("/", (_req, res) => res.send("OK"));

/* ===================== OAUTH START ===================== */
app.get("/auth/discord", (_req, res) => {
  // wymagane: identify + guilds.members.read
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

    // 2) sprawdź członkostwo + role w guild, na tokenie użytkownika (z tego logowania)
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

    // 3) Sukces: powiadom Electron i zamknij okno
    res.send(`
      <script>
        window.opener && window.opener.postMessage("DISCORD_OK", "*");
        window.close();
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.send("❌ Błąd autoryzacji");
  }
});

/* ===================== LISTEN ===================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ SERVER LISTENING ON", PORT);
  console.log("✅ REDIRECT_URI =", REDIRECT_URI);
});
