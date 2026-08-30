import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const PHOTO_NAME_PATTERN = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const ALLOWED_WIDTHS = [96, 160, 320, 480, 800, 1200];
const EDGE_CACHE = "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable";

/** Escolhe o melhor formato suportado pelo navegador: AVIF > WebP > original. */
function negotiateFormat(accept: string): "avif" | "webp" | undefined {
  if (accept.includes("image/avif")) return "avif";
  if (accept.includes("image/webp")) return "webp";
  return undefined;
}

function normalizeWidth(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 800;
  return ALLOWED_WIDTHS.reduce((best, w) =>
    Math.abs(w - parsed) < Math.abs(best - parsed) ? w : best,
  );
}

export const Route = createFileRoute("/api/place-photo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const name = url.searchParams.get("name") ?? "";
        if (!PHOTO_NAME_PATTERN.test(name)) {
          return new Response("Invalid photo name", { status: 400 });
        }
        const width = normalizeWidth(url.searchParams.get("w"));
        const format = negotiateFormat(request.headers.get("accept") ?? "");

        const lovableKey = process.env["LOVABLE_API_KEY"];
        const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
        if (!lovableKey || !mapsKey) {
          return new Response("Unavailable", { status: 503 });
        }

        // Cache na borda: a mesma foto/largura/formato é servida do CDN sem
        // tocar no upstream. `cf.image` faz a transcodificação em tempo real
        // (WebP/AVIF comprimido) quando disponível no runtime da borda.
        const upstream = await fetch(
          // `name` é validado pelo PHOTO_NAME_PATTERN acima, então é seguro interpolar.
          `${GATEWAY_URL}/places/v1/${name}/media?maxWidthPx=${width}`,
          {
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": mapsKey,
            },
            redirect: "follow",
            cf: {
              cacheEverything: true,
              cacheTtl: 86400,
              image: {
                width,
                fit: "scale-down",
                quality: 72,
                ...(format ? { format } : {}),
              },
            },
          } as RequestInit,
        );

        if (!upstream.ok || !upstream.body) {
          return new Response("Not found", { status: 404 });
        }

        const contentType =
          upstream.headers.get("Content-Type") ??
          (format ? `image/${format}` : "image/jpeg");

        return new Response(upstream.body, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": EDGE_CACHE,
            // varia por formato negociado para não servir AVIF a quem não suporta
            Vary: "Accept",
          },
        });
      },
    },
  },
});
