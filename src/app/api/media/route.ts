import { get } from "@vercel/blob";
import { requireSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireSession();
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return new Response("Ontbrekende url.", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new Response("Ongeldige url.", { status: 400 });
  }
  if (!parsed.hostname.endsWith(".blob.vercel-storage.com")) {
    return new Response("Niet toegestaan.", { status: 403 });
  }

  const result = await get(raw, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return new Response("Afbeelding niet gevonden.", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
