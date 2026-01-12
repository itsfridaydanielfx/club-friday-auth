import express from "express";
import fetch from "node-fetch";

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = process.env.REQUIRED_ROLE_ID;

const REDIRECT_URI =
  "https://club-friday-auth-production.up.railway.app/auth/discord/callback";

app.get("/auth/discord", (req, res) => {
  const url =
    "https://discord.com/oauth2/authorize" +
    `?client_id=${CLIENT_ID}` +
    "&response_type=code" +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    "&scope=identify%20guilds%20guilds.members.read";

  res.redirect(url);
});

app.get("/auth/discord/callback", async (req, res) => {
  try {
    const code = req.query.code;

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

    const memberRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );

    if (!memberRes.ok) {
      return res.send("❌ Nie jesteś na serwerze");
    }

    const member = await memberRes.json();

    if (!member.roles.includes(REQUIRED_ROLE_ID)) {
      return res.send("❌ Brak roli Club Friday Tools Access");
    }

    res.send(`
      <script>
        window.opener.postMessage("DISCORD_OK", "*");
        window.close();
      </script>
    `);

  } catch {
    res.send("❌ Błąd autoryzacji");
  }
});

app.listen(process.env.PORT || 3000);

