import 'dotenv/config';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

const PUBLIC_DIR = path.join(__dirname, "..", "public");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

function required(value){ return typeof value === "string" && value.trim().length > 0; }

app.post("/api/reservation", async (req, res) => {
  try{
    const { name, phone, email, level, date, time, pack, message } = req.body || {};

    // Basic validation
    if(!required(name) || !required(phone) || !required(email) || !required(level) || !required(date) || !required(time) || !required(pack)){
      return res.status(400).json({ error: "Champs manquants. Merci de remplir le formulaire." });
    }

    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
    const SMTP_SECURE = String(process.env.SMTP_SECURE || "true") === "true";
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;

    const MAIL_TO = process.env.MAIL_TO || SMTP_USER;
    const MAIL_FROM = process.env.MAIL_FROM || `CSNM <${SMTP_USER}>`;
    const SEND_AUTOREPLY = String(process.env.SEND_AUTOREPLY || "true") === "true";

    if(!SMTP_HOST || !SMTP_USER || !SMTP_PASS){
      return res.status(500).json({ error: "SMTP non configuré. Ajoute les variables dans .env (SMTP_*)." });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const subject = `Nouvelle réservation — ${name} (${level})`;
    const text = [
      "Nouvelle demande de réservation (CSNM)",
      "-------------------------------------",
      `Nom: ${name}`,
      `Téléphone: ${phone}`,
      `Email: ${email}`,
      `Niveau: ${level}`,
      `Date: ${date}`,
      `Heure: ${time}`,
      `Formule: ${pack}`,
      "",
      "Message:",
      (message && String(message).trim()) ? String(message).trim() : "(Aucun)",
      "",
      "Astuce: Cliquez 'Répondre' dans Gmail, ça répondra au client (Reply-To).",
    ].join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#06121b">
        <h2 style="margin:0 0 10px">Nouvelle réservation — CSNM</h2>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          <tr><td style="padding:6px 10px;font-weight:700">Nom</td><td style="padding:6px 10px">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 10px;font-weight:700">Téléphone</td><td style="padding:6px 10px">${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:6px 10px;font-weight:700">Email</td><td style="padding:6px 10px">${escapeHtml(email)}</td></tr>
          <tr><td style="padding:6px 10px;font-weight:700">Niveau</td><td style="padding:6px 10px">${escapeHtml(level)}</td></tr>
          <tr><td style="padding:6px 10px;font-weight:700">Date</td><td style="padding:6px 10px">${escapeHtml(date)}</td></tr>
          <tr><td style="padding:6px 10px;font-weight:700">Heure</td><td style="padding:6px 10px">${escapeHtml(time)}</td></tr>
          <tr><td style="padding:6px 10px;font-weight:700">Formule</td><td style="padding:6px 10px">${escapeHtml(pack)}</td></tr>
        </table>
        <p style="margin:14px 0 6px;font-weight:700">Message</p>
        <div style="padding:12px;border:1px solid rgba(6,18,27,.15);border-radius:12px;background:#f7fbff">
          ${(message && String(message).trim()) ? escapeHtml(String(message).trim()).replace(/\n/g,"<br>") : "<em>(Aucun)</em>"}
        </div>
        <p style="margin-top:14px;opacity:.8">Répondre dans Gmail utilisera automatiquement l’adresse du client (Reply-To).</p>
      </div>
    `;

    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject,
      text,
      html,
      replyTo: email
    });

    if(SEND_AUTOREPLY){
      // small confirmation email to the client
      const clientSubject = "CSNM — Demande reçue ✅";
      const clientText = `Salut ${name},\n\nOn a bien reçu ta demande (niveau: ${level}, ${date} à ${time}).\nOn te confirme rapidement par email.\n\n— CSNM`;
      await transporter.sendMail({
        from: MAIL_FROM,
        to: email,
        subject: clientSubject,
        text: clientText
      });
    }

    return res.json({ ok: true });
  }catch(err){
    console.error("Reservation error:", err);
    return res.status(500).json({ error: "Erreur serveur. Vérifie la configuration SMTP." });
  }
});

// fallback (single-page)
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`CSNM site running on http://localhost:${PORT}`);
});

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
