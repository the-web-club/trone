import "server-only";

import { AppError } from "@/lib/errors";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new AppError(`Ontbrekende env-variabele: ${name}.`, "CONFIG");
  return value;
}

export async function sendMail(input: SendMailInput) {
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("RESEND_FROM_EMAIL");
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Resend-fout:", response.status, detail);
    throw new AppError("Versturen van de e-mail is mislukt.", "MAIL");
  }
}

export function invitationMail(input: {
  name: string;
  url: string;
}): Pick<SendMailInput, "subject" | "html" | "text"> {
  const subject = "Je bent uitgenodigd voor TRÔNE Seating";
  const text = [
    `Hallo ${input.name},`,
    "",
    "Je bent uitgenodigd voor de interne workspace van TRÔNE Seating.",
    "Stel via onderstaande link je wachtwoord in:",
    input.url,
    "",
    "De link is een uur geldig.",
  ].join("\n");

  const html = `
    <p>Hallo ${escapeHtml(input.name)},</p>
    <p>Je bent uitgenodigd voor de interne workspace van TRÔNE Seating.</p>
    <p><a href="${escapeHtml(input.url)}">Wachtwoord instellen</a></p>
    <p>De link is een uur geldig.</p>
  `;

  return { subject, html, text };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
