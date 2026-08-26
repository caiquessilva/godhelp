import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const PHOTO_NAME_PATTERN = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

export const Route = createFileRoute("/api/place-photo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const name = new URL(request.url).searchParams.get("name") ?? "";
        if (!PHOTO_NAME_PATTERN.test(name)) {
          return new Response("Invalid photo name", { status: 400 });
        }
        const lovableKey = process.env["LOVABLE_API_KEY"];
        const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
        if (!lovableKey || !mapsKey) {
          return new Response("Unavailable", { status: 503 });
        }
        const upstream = await fetch(
          // `name` is validated against PHOTO_NAME_PATTERN above, so it is safe to inline.
          `${GATEWAY_URL}/places/v1/${name}/media?maxWidthPx=800`,
          {
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": mapsKey,
            },
            redirect: "follow",
          },
        );
        if (!upstream.ok || !upstream.body) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      },
    },
  },
});
