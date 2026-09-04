import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPrismaClient } from "@/lib/db";
import { createId } from "@/lib/id";
import {
  PLACEHOLDER_DIR,
  placeholderComboPath,
  placeholderProductPath,
  placeholderSwatchPath,
  placeholderValuePath,
} from "@/lib/placeholder-visuals";

const prisma = getPrismaClient();

const BG = "#171717";
const FG = "#F5F5F5";
const MUTED = "#A3A3A3";
const LINE = "#404040";
const SWATCH_FALLBACK = "#737373";
const BRAND = "TRÔNE";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function titleSize(value: string): number {
  if (value.length > 28) return 28;
  if (value.length > 18) return 34;
  return 40;
}

function sceneRectSvg(input: {
  title: string;
  subtitle: string;
  context?: string;
}): string {
  const title = escapeXml(input.title);
  const subtitle = escapeXml(input.subtitle);
  const context = escapeXml(input.context ?? BRAND);
  const size = titleSize(input.title);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none">
  <rect width="800" height="600" fill="${BG}"/>
  <rect x="32" y="32" width="736" height="536" rx="10" stroke="${LINE}" stroke-width="1"/>
  <text x="400" y="268" text-anchor="middle" fill="${FG}" font-family="Inter Tight, system-ui, sans-serif" font-size="${size}" font-weight="500">${title}</text>
  <text x="400" y="312" text-anchor="middle" fill="${MUTED}" font-family="Inter Tight, system-ui, sans-serif" font-size="16">${subtitle}</text>
  <text x="400" y="536" text-anchor="middle" fill="${MUTED}" font-family="Inter Tight, system-ui, sans-serif" font-size="12" letter-spacing="2">${context}</text>
</svg>
`;
}

function swatchSvg(hex: string): string {
  const color = /^#([0-9A-Fa-f]{6})$/.test(hex) ? hex : SWATCH_FALLBACK;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none">
  <circle cx="128" cy="128" r="128" fill="${color}"/>
</svg>
`;
}

function fileFromPublicPath(publicPath: string): string {
  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

async function emptyPlaceholderDir(dir: string) {
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir).catch(() => []);
  for (const entry of entries) {
    if (entry.endsWith(".svg")) {
      await unlink(path.join(dir, entry));
    }
  }
}

async function main() {
  const outDir = path.join(process.cwd(), "public", PLACEHOLDER_DIR);
  await emptyPlaceholderDir(outDir);

  const [options, products] = await Promise.all([
    prisma.productOption.findMany({
      orderBy: { sortOrder: "asc" },
      include: { values: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (options.length === 0 || products.length === 0) {
    throw new Error("Catalogus is leeg: geen opties of producten.");
  }

  let written = 0;

  for (const option of options) {
    for (const value of option.values) {
      const file = fileFromPublicPath(placeholderValuePath(option.code, value.value));
      await writeFile(
        file,
        sceneRectSvg({
          title: value.value,
          subtitle: option.name,
        }),
        "utf8",
      );
      written += 1;

      if (option.code === "fabric") {
        const swatchFile = fileFromPublicPath(
          placeholderSwatchPath(option.code, value.value),
        );
        await writeFile(
          swatchFile,
          swatchSvg(value.swatchHex ?? SWATCH_FALLBACK),
          "utf8",
        );
        written += 1;
      }
    }
  }

  const generic = fileFromPublicPath(`/${PLACEHOLDER_DIR}/placeholder-product.svg`);
  await writeFile(
    generic,
    sceneRectSvg({ title: "Productbeeld", subtitle: "Placeholder", context: BRAND }),
    "utf8",
  );
  written += 1;

  for (const product of products) {
    const file = fileFromPublicPath(placeholderProductPath(product.sku));
    await writeFile(
      file,
      sceneRectSvg({
        title: product.name,
        subtitle: product.sku,
        context: BRAND,
      }),
      "utf8",
    );
    written += 1;
  }

  const back = options.find((option) => option.code === "back_height");
  const fabric = options.find((option) => option.code === "fabric");
  if (!back || !fabric) {
    throw new Error("Sleutelopties back_height of fabric ontbreken.");
  }

  for (const product of products) {
    for (const backValue of back.values) {
      for (const fabricValue of fabric.values) {
        const file = fileFromPublicPath(
          placeholderComboPath(product.sku, backValue.value, fabricValue.value),
        );
        await writeFile(
          file,
          sceneRectSvg({
            title: `${backValue.value} · ${fabricValue.value}`,
            subtitle: product.name,
            context: BRAND,
          }),
          "utf8",
        );
        written += 1;
      }
    }
  }

  const remote = await prisma.productImage.findMany({
    include: { selections: true },
  });
  for (const image of remote) {
    const isRemote = image.imageUrl.startsWith("http://") || image.imageUrl.startsWith("https://");
    if (!isRemote) continue;
    if (image.selections.length > 1) continue;
    await prisma.productImage.delete({ where: { id: image.id } });
  }

  for (const product of products) {
    const url = placeholderProductPath(product.sku);
    const hasRealDefault = await prisma.productImage.findFirst({
      where: {
        productId: product.id,
        isDefault: true,
        NOT: { imageUrl: { startsWith: `/${PLACEHOLDER_DIR}/` } },
      },
    });
    const existing = await prisma.productImage.findFirst({
      where: { productId: product.id, imageUrl: url },
    });
    if (existing) {
      if (!hasRealDefault && !existing.isDefault) {
        await prisma.productImage.updateMany({
          where: { productId: product.id, isDefault: true },
          data: { isDefault: false },
        });
        await prisma.productImage.update({
          where: { id: existing.id },
          data: { isDefault: true },
        });
      }
      continue;
    }

    if (!hasRealDefault) {
      await prisma.productImage.updateMany({
        where: { productId: product.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    await prisma.productImage.create({
      data: {
        id: createId(),
        productId: product.id,
        imageUrl: url,
        isDefault: !hasRealDefault,
      },
    });
  }

  for (const product of products) {
    for (const backValue of back.values) {
      for (const fabricValue of fabric.values) {
        const url = placeholderComboPath(product.sku, backValue.value, fabricValue.value);
        const existing = await prisma.productImage.findFirst({
          where: { productId: product.id, imageUrl: url },
        });
        if (existing) continue;

        const sameKeys = await prisma.productImage.findMany({
          where: { productId: product.id },
          include: { selections: true },
        });
        const hasRealCombo = sameKeys.some((image) => {
          if (image.imageUrl.startsWith(`/${PLACEHOLDER_DIR}/`)) return false;
          const pairs = new Set(
            image.selections.map((row) => `${row.optionId}:${row.optionValueId}`),
          );
          return (
            pairs.has(`${back.id}:${backValue.id}`) &&
            pairs.has(`${fabric.id}:${fabricValue.id}`)
          );
        });
        if (hasRealCombo) continue;

        await prisma.productImage.create({
          data: {
            id: createId(),
            productId: product.id,
            imageUrl: url,
            isDefault: false,
            selections: {
              create: [
                {
                  id: createId(),
                  optionId: back.id,
                  optionValueId: backValue.id,
                },
                {
                  id: createId(),
                  optionId: fabric.id,
                  optionValueId: fabricValue.id,
                },
              ],
            },
          },
        });
      }
    }
  }

  console.log(`Placeholders geschreven: ${written} SVG-bestanden in public/${PLACEHOLDER_DIR}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
