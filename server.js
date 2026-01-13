import "dotenv/config";
import express from "express";
import fetch from "node-fetch";

const app = express();

console.log("🔥 BUILD MARKER 2026-01-12-2355");

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

/* ===================== LINKS / COPY ===================== */
const JOIN_SERVER_URL = "https://dsc.gg/clubfriday";
const STRIPE_URL = "https://buy.stripe.com/9B63cv6Bo5078SK3kc7IY03";
const IG_URL = "https://instagram.com/itsfridaydaniel";
const CONTACT_TAG = "@itsfridaydaniel";

/* ===================== UI TEMPLATE ===================== */
function renderPage({
  title = "Club Friday Auth",
  subtitle = "@itsfridaydaniel · Club Friday Tools",
  lead = "",
  blocks = "",
  footer = "",
  autoAction = null // { label, href, ms }
} = {}) {
  const autoHead = autoAction?.href
    ? `<meta http-equiv="refresh" content="${Math.max(0, Math.floor((autoAction.ms ?? 900) / 1000))};url=${autoAction.href}">`
    : "";

  const autoNote = autoAction?.href
    ? `<div class="hint">⏳ Za chwilę przekieruję Cię dalej… jeśli nie zadziała, kliknij przycisk poniżej.</div>`
    : "";

  const autoBtn = autoAction?.href
    ? `<a class="btn primary" href="${autoAction.href}">${autoAction.label ?? "Kontynuuj"}</a>`
    : "";

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  ${autoHead}
  <title>${escapeHtml(title)}</title>
  <style>
    :root{
      --bg: #0b1220;
      --panel: rgba(255,255,255,0.04);
      --stroke: rgba(148,163,184,0.14);
      --text: rgba(226,232,240,0.92);
      --text2: rgba(203,213,225,0.88);
      --white: #f9fafb;
      --blue: #5865F2;
      --blue2:#4752C4;
      --gold1:#f7d67a;
      --gold2:#f2b84b;
      --shadow: 0 24px 70px rgba(0,0,0,.60);
      --r: 18px;
    }
    *{ box-sizing:border-box; }
    body{
      margin:0;
      min-height:100vh;
      display:grid;
      place-items:center;
      padding:18px;
      font-family: system-ui, Segoe UI, Roboto, Arial, sans-serif;
      background:
        radial-gradient(1200px 500px at 20% 0%, rgba(88,101,242,0.25), transparent 55%),
        radial-gradient(900px 500px at 100% 40%, rgba(56,189,248,0.12), transparent 55%),
        var(--bg);
      color: var(--text);
    }
    .box{
      width:100%;
      max-width:520px;
      border-radius: var(--r);
      padding:22px;
      background: rgba(11,18,32,0.88);
      border: 1px solid var(--stroke);
      box-shadow: var(--shadow);
    }
    .top{
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:14px;
    }
    .badge{
      width:40px;height:40px;
      border-radius:12px;
      display:grid;place-items:center;
      background: rgba(148,163,184,0.12);
      border: 1px solid rgba(148,163,184,0.16);
      font-size:18px;
      flex:0 0 auto;
    }
    .logo{
      width:40px;height:40px;
      border-radius:12px;
      display:grid;place-items:center;
      background: rgba(88,101,242,0.14);
      border: 1px solid rgba(88,101,242,0.22);
      color: var(--white);
      flex:0 0 auto;
      font-weight:900;
    }
    .t{ line-height:1.1; }
    .title{ font-size:16px; font-weight:900; color: var(--white); }
    .sub{ font-size:12px; color: var(--text2); margin-top:4px; }

    .lead{
      margin: 10px 0 12px;
      font-size:13px;
      line-height:1.5;
      color: var(--text);
    }

    .grid{
      display:grid;
      gap:10px;
      margin-top: 10px;
    }
    .card{
      padding:12px;
      border-radius:14px;
      background: rgba(148,163,184,0.08);
      border: 1px solid rgba(148,163,184,0.12);
      font-size:13px;
      line-height:1.45;
      color: var(--text);
    }
    .muted{ color: var(--text2); }

    .actions{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:10px;
      margin-top: 14px;
    }
    .btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      padding: 12px 14px;
      border-radius:14px;
      text-decoration:none;
      cursor:pointer;
      border:0;
      user-select:none;
      font-weight:800;
      font-size:14px;
      line-height:1;
      white-space:nowrap;
    }
    .primary{
      color:#fff;
      background: linear-gradient(180deg, var(--blue), var(--blue2));
      box-shadow: 0 10px 22px rgba(88,101,242,.28);
    }
    .primary:hover{ filter: brightness(1.05); }

    .gold{
      color:#1f2937;
      background: linear-gradient(120deg, var(--gold1), var(--gold2), var(--gold1));
      border: 1px solid rgba(255,255,255,0.35);
      box-shadow: 0 10px 22px rgba(245,158,11,0.22);
      position:relative;
      overflow:hidden;
    }
    .gold::after{
      content:"";
      position:absolute;
      top:-60%;
      left:-160%;
      width:120%;
      height:220%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent);
      transform: rotate(20deg);
      animation: shimmer 3.2s linear infinite;
      pointer-events:none;
      will-change: transform;
    }
    @keyframes shimmer{
      0%{ transform: translateX(0) rotate(20deg); }
      100%{ transform: translateX(320%) rotate(20deg); }
    }
    .gold:hover{ filter: brightness(1.03); }

    .hint{
      margin-top:12px;
      font-size:12px;
      color: var(--text2);
      text-align:center;
    }

    .smallrow{
      margin-top: 12px;
      text-align:center;
      font-size:12px;
      color: var(--text2);
    }
    .smallrow a{ color:#93c5fd; text-decoration:none; font-weight:800; }
    .smallrow a:hover{ text-decoration:underline; }

    .footer{
      margin-top: 14px;
      text-align:center;
      font-size:12px;
      color: rgba(148,163,184,0.9);
    }

    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .ok{ color:#86efac; font-weight:900; }
    .bad{ color:#fca5a5; font-weight:900; }
  </style>
</head>
<body>
  <div class="box">
    <div class="top">
      <div class="badge">🔐</div>
      <div class="logo" title="Discord">Discord</div>
      <div class="t">
        <div class="title">${escapeHtml(title)}</div>
        <div class="sub">${escapeHtml(subtitle)}</div>
      </div>
    </div>

    ${lead ? `<div class="lead">${lead}</div>` : ""}

    ${blocks ? `<div class="grid">${blocks}</div>` : ""}

    ${autoNote}
    ${autoBtn ? `<div class="actions" style="grid-template-columns: 1fr;">${autoBtn}</div>` : ""}

    ${footer ? `<div class="footer">${footer}</div>` : ""}
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===================== HEALTH ===================== */
// Prosty healthcheck dla Railway / uptime
app.get("/", (_req, res) => res.status(200).send("OK"));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// Opcjonalny podgląd “ładnej” strony
app.get("/ui", (_req, res) => {
  const html = renderPage({
    title: "Club Friday Auth",
    lead: `Serwer działa. Endpoint logowania: <span class="mono">/auth/discord</span>.`,
    blocks: `
      <div class="card">✅ Status: <span class="ok">OK</span></div>
      <div class="card muted">To jest tylko podgląd UI. Logowanie zaczyna się w <span class="mono">/auth/discord</span>.</div>
    `,
    footer: `@itsfridaydaniel · Club Friday Tools`
  });
  res.status(200).type("html").send(html);
});

/* ===================== OAUTH START ===================== */
app.get("/auth/discord", (_req, res) => {
  const scope = "identify guilds.members.read";

  const url =
    "https://discord.com/oauth2/authorize" +
    `?client_id=${CLIENT_ID}` +
    "&response_type=code" +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scope)}`;

  const html = renderPage({
    title: "Dostęp przez Discord",
    lead:
      `Logowanie służy jedynie do sprawdzenia Twojej roli na serwerze <strong>Club Friday</strong>.`,
    blocks: `
      <div class="card">👤 Uprawnienie: <strong>identify</strong> (identyfikacja konta)</div>
      <div class="card">🛡️ Uprawnienie: <strong>guilds.members.read</strong> (odczyt ról na serwerze)</div>
      <div class="card muted">💥 Aplikacja może się wysypać, jeśli strony źródłowe zmienią algorytmy działania.</div>
    `,
    autoAction: { label: "Kontynuuj do Discord", href: url, ms: 900 },
    footer: `Jeśli nie jesteś na serwerze: <a href="${JOIN_SERVER_URL}" target="_blank" rel="noreferrer">Dołącz tutaj</a>.`
  });

  res.status(200).type("html").send(html);
});

/* ===================== OAUTH CALLBACK ===================== */
app.get("/auth/discord/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      const html = renderPage({
        title: "Błąd logowania",
        lead: `<span class="bad">Brak kodu autoryzacji</span> — wróć i spróbuj ponownie.`,
        blocks: `
          <div class="card muted">Jeśli okno się zamknęło lub zostało przerwane, uruchom logowanie jeszcze raz.</div>
        `,
        footer: `Możesz zamknąć to okno.`
      });
      return res.status(400).type("html").send(html);
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
      const html = renderPage({
        title: "Błąd logowania",
        lead: `<span class="bad">Nie udało się pobrać tokena</span>. Spróbuj ponownie za chwilę.`,
        blocks: `
          <div class="card muted">Jeśli problem wraca, to zwykle kwestia ustawień OAuth (Redirect URI / ENV).</div>
        `,
        footer: `Możesz zamknąć to okno.`
      });
      return res.status(500).type("html").send(html);
    }

    const memberRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );

    if (!memberRes.ok) {
      const html = renderPage({
        title: "Brak serwera",
        lead: `<span class="bad">Nie jesteś na serwerze Club Friday</span>. Dołącz i spróbuj ponownie.`,
        blocks: `
          <div class="card">👉 Dołącz: <a href="${JOIN_SERVER_URL}" target="_blank" rel="noreferrer">${JOIN_SERVER_URL}</a></div>
          <div class="card muted">Po dołączeniu wróć do aplikacji i kliknij „Zaloguj przez Discord”.</div>
        `,
        footer: `Możesz zamknąć to okno.`
      });
      return res.status(403).type("html").send(html);
    }

    const member = await memberRes.json();
    if (!member.roles?.includes(REQUIRED_ROLE_ID)) {
      const html = renderPage({
        title: "Brak roli",
        lead: `<span class="bad">Nie wykryliśmy wymaganej roli</span> dla dostępu do narzędzi.`,
        blocks: `
          <div class="card">🎁 Kup dostęp: <a href="${STRIPE_URL}" target="_blank" rel="noreferrer">Stripe (BLIK)</a> — <strong>24,99 zł / 30 dni</strong></div>
          <div class="card">✉️ Po zakupie napisz do mnie na IG: <a href="${IG_URL}" target="_blank" rel="noreferrer">${CONTACT_TAG}</a> lub na Discordzie <strong>${CONTACT_TAG}</strong> — nadam rolę.</div>
          <div class="card muted">Następnie wróć do aplikacji i kliknij „Zaloguj przez Discord”.</div>
        `,
        footer: `Możesz zamknąć to okno.`
      });
      return res.status(403).type("html").send(html);
    }

    // ✅ SUCCESS: postMessage + close (jak było), ale z ładnym fallback UI
    return res.status(200).type("html").send(`
      <!doctype html>
      <html lang="pl">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Połączono</title>
        <style>
          body{ margin:0; min-height:100vh; display:grid; place-items:center; padding:18px;
            font-family: system-ui, Segoe UI, Roboto, Arial, sans-serif;
            background: radial-gradient(1200px 500px at 20% 0%, rgba(88,101,242,0.25), transparent 55%),
                        radial-gradient(900px 500px at 100% 40%, rgba(56,189,248,0.12), transparent 55%),
                        #0b1220;
            color: rgba(226,232,240,0.92);
          }
          .box{ width:100%; max-width:520px; padding:22px; border-radius:18px;
            background: rgba(11,18,32,0.88);
            border: 1px solid rgba(148,163,184,0.14);
            box-shadow: 0 24px 70px rgba(0,0,0,.60);
            text-align:center;
          }
          .ok{ font-weight:900; color:#86efac; font-size:16px; }
          .muted{ margin-top:10px; font-size:12px; color: rgba(203,213,225,0.88); line-height:1.5; }
          .btn{ margin-top:14px; display:inline-flex; align-items:center; justify-content:center;
            padding:12px 14px; border-radius:14px; border:0; cursor:pointer;
            font-weight:800; color:#fff;
            background: linear-gradient(180deg, #5865F2, #4752C4);
            box-shadow: 0 10px 22px rgba(88,101,242,.28);
          }
          .btn:hover{ filter: brightness(1.05); }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="ok">✅ Połączono z Discordem — dostęp odblokowany</div>
          <div class="muted">To okno zamknie się automatycznie. Jeśli nie — kliknij poniżej.</div>
          <button class="btn" onclick="window.close()">Zamknij okno</button>
        </div>

        <script>
          try { window.opener && window.opener.postMessage("DISCORD_OK", "*"); } catch(e) {}
          setTimeout(() => { try { window.close(); } catch(e) {} }, 350);
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    const html = renderPage({
      title: "Błąd autoryzacji",
      lead: `<span class="bad">Coś poszło nie tak</span> — spróbuj ponownie za chwilę.`,
      blocks: `
        <div class="card muted">Jeśli problem wraca, sprawdź ENV oraz Redirect URI w ustawieniach aplikacji Discord.</div>
      `,
      footer: `Możesz zamknąć to okno.`
    });
    return res.status(500).type("html").send(html);
  }
});

/* ===================== LISTEN ===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ SERVER LISTENING ON", PORT);
  console.log("✅ REDIRECT_URI =", REDIRECT_URI);
});

process.on("SIGTERM", () => {
  console.log("⚠️ Received SIGTERM (Railway stopping container)");
  process.exit(0);
});
