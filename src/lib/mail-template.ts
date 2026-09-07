export const MAIL_SENDER_NAME = "TRÔNE Seating";
export const MAIL_SENDER_EMAIL = "mail@updates.troneseating.app";
export const MAIL_PRODUCTION_ORIGIN = "https://www.troneseating.app";

const LOGO_DISPLAY_WIDTH = 168;
const LOGO_DISPLAY_HEIGHT = 57;

export type BrandedMailAction = {
  label: string;
  url: string;
};

export type BrandedMailInput = {
  title: string;
  preheader?: string;
  greeting?: string;
  paragraphs: string[];
  action?: BrandedMailAction;
  signoff?: string;
  logoUrl?: string;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function senderFromOverride(override?: string | null) {
  const raw = override?.trim();
  if (!raw) return null;
  if (/<[^>]+>/.test(raw)) {
    return raw.toLowerCase().includes(MAIL_SENDER_EMAIL) ? raw : null;
  }
  if (raw.toLowerCase() === MAIL_SENDER_EMAIL) {
    return `${MAIL_SENDER_NAME} <${raw}>`;
  }
  return null;
}

export function mailFromAddress(override?: string | null) {
  return (
    senderFromOverride(override) ?? `${MAIL_SENDER_NAME} <${MAIL_SENDER_EMAIL}>`
  );
}

export function mailAssetOrigin(
  env: Record<string, string | undefined> = process.env,
) {
  const explicit = env.MAIL_ASSET_ORIGIN?.trim();
  if (explicit) return stripSlash(explicit);

  const auth = env.BETTER_AUTH_URL?.trim();
  if (auth && !/localhost|127\.0\.0\.1/i.test(auth)) {
    return stripSlash(auth);
  }

  return MAIL_PRODUCTION_ORIGIN;
}

export function mailLogoUrl(
  env: Record<string, string | undefined> = process.env,
) {
  return `${mailAssetOrigin(env)}/brand/trone-seating-logo.png`;
}

export function brandedMail(input: BrandedMailInput): {
  html: string;
  text: string;
} {
  const logoUrl = input.logoUrl ?? mailLogoUrl();
  return {
    html: brandedMailHtml({ ...input, logoUrl }),
    text: brandedMailText(input),
  };
}

export function invitationMail(input: {
  name: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const subject = "Je bent uitgenodigd voor TRÔNE Seating";
  return {
    subject,
    ...brandedMail({
      title: subject,
      preheader: "Stel je wachtwoord in. De link is een uur geldig.",
      greeting: `Hallo ${input.name},`,
      paragraphs: [
        "Je bent uitgenodigd voor de interne workspace van TRÔNE Seating.",
        "De link is een uur geldig.",
      ],
      action: { label: "Wachtwoord instellen", url: input.url },
    }),
  };
}

function brandedMailText(input: BrandedMailInput) {
  const lines = [
    input.greeting,
    "",
    ...input.paragraphs,
    "",
    input.action ? `${input.action.label}: ${input.action.url}` : null,
    input.signoff ? "" : null,
    input.signoff,
    "",
    "—",
    MAIL_SENDER_NAME,
    "troneseating.app",
  ];

  return lines
    .filter((line): line is string => line !== null && line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function brandedMailHtml(input: BrandedMailInput & { logoUrl: string }) {
  const title = escapeHtml(input.title);
  const preheader = escapeHtml(input.preheader ?? input.paragraphs[0] ?? "");
  const greeting = input.greeting
    ? paragraphHtml(input.greeting, "0 0 20px")
    : "";
  const paragraphs = input.paragraphs
    .map((paragraph, index) => {
      const isLast = index === input.paragraphs.length - 1 && !input.action;
      return paragraphHtml(paragraph, isLast ? "0" : "0 0 16px");
    })
    .join("");
  const action = input.action ? actionHtml(input.action) : "";
  const signoff = input.signoff
    ? paragraphHtml(input.signoff, "24px 0 0")
    : "";
  const logoSrc = escapeHtml(input.logoUrl);

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <!--[if mso]>
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td>
      <![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;">
        <tr>
          <td align="center" bgcolor="#35353c" style="background-color:#35353c;padding:32px 40px 28px;">
            <img src="${logoSrc}" alt="${escapeHtml(MAIL_SENDER_NAME)}" width="${LOGO_DISPLAY_WIDTH}" height="${LOGO_DISPLAY_HEIGHT}" style="display:block;border:0;margin:0 auto;width:${LOGO_DISPLAY_WIDTH}px;height:${LOGO_DISPLAY_HEIGHT}px;">
          </td>
        </tr>
        <tr>
          <td bgcolor="#ed7845" style="background-color:#ed7845;height:2px;line-height:2px;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td align="left" style="padding:40px 40px 36px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#171717;">
            ${greeting}${paragraphs}${action}${signoff}
          </td>
        </tr>
        <tr>
          <td align="left" style="padding:0 40px 32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#a3a3a3;">
            ${escapeHtml(MAIL_SENDER_NAME)}<br>
            <a href="${MAIL_PRODUCTION_ORIGIN}" style="color:#a3a3a3;text-decoration:none;">troneseating.app</a>
          </td>
        </tr>
      </table>
      <!--[if mso]>
      </td></tr></table>
      <![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

function paragraphHtml(text: string, margin: string) {
  return `<p style="margin:${margin};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#171717;">${escapeHtml(text)}</p>`;
}

function actionHtml(action: BrandedMailAction) {
  const href = escapeHtml(action.url);
  const label = escapeHtml(action.label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
  <tr>
    <td bgcolor="#35353c" style="background-color:#35353c;">
      <a href="${href}" style="display:inline-block;padding:13px 26px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.04em;color:#ffffff;text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>`;
}
