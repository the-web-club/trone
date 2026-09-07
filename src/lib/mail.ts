import "server-only";

import { AppError } from "@/lib/errors";
import { mailFromAddress } from "@/lib/mail-template";

export { invitationMail } from "@/lib/mail-template";

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
  const from = mailFromAddress(process.env.RESEND_FROM_EMAIL);
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
