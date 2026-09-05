import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

interface DeviceRow {
  token: string;
  latitude: number | null;
  longitude: number | null;
  place_name: string | null;
  place_id: string | null;
}

/** Verifica se vai chover na próxima hora perto de uma coordenada. */
async function rainSoon(latitude: number, longitude: number): Promise<boolean> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&minutely_15=precipitation&forecast_hours=1&forecast_days=1`,
  );
  if (!response.ok) return false;
  const data = (await response.json()) as {
    minutely_15?: { precipitation?: (number | null)[] };
  };
  const slots = (data.minutely_15?.precipitation ?? []).slice(0, 4);
  return slots.some((value) => (value ?? 0) >= 0.3);
}

async function sendPush(
  token: string,
  title: string,
  body: string,
  path: string,
): Promise<number> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !connectionKey) return 503;

  const response = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: { token, notification: { title, body }, data: { path } },
    }),
  });
  if (!response.ok) {
    console.error(`FCM send failed [${response.status}]: ${await response.text()}`);
  }
  return response.status;
}

export const Route = createFileRoute("/api/public/alertas-clima")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: devices, error } = await supabaseAdmin
          .from("push_devices")
          .select("token, latitude, longitude, place_name, place_id")
          .gte("updated_at", since)
          .not("latitude", "is", null)
          .limit(500);
        if (error) return new Response(error.message, { status: 500 });

        const today = new Date().toISOString().slice(0, 13); // dedupe por hora
        let sent = 0;

        for (const device of (devices ?? []) as DeviceRow[]) {
          if (device.latitude == null || device.longitude == null) continue;
          const alertKey = `chuva-${today}`;
          const { error: dedupeError } = await supabaseAdmin
            .from("push_alerts_sent")
            .insert({ token: device.token, alert_key: alertKey });
          if (dedupeError) continue; // já enviado nesta hora

          if (!(await rainSoon(device.latitude, device.longitude))) continue;

          const local = device.place_name ? ` perto de ${device.place_name}` : " perto de você";
          const status = await sendPush(
            device.token,
            "Chuva a caminho ☔",
            `Chuva prevista para os próximos 20 minutos${local}. Talvez seja melhor adiar a saída.`,
            device.place_id ? `/local/${encodeURIComponent(device.place_id)}` : "/",
          );
          if (status === 404 || status === 400) {
            await supabaseAdmin.from("push_devices").delete().eq("token", device.token);
            continue;
          }
          if (status < 300) sent += 1;
        }

        return Response.json({ ok: true, devices: devices?.length ?? 0, sent });
      },
    },
  },
});
