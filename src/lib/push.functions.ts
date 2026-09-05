import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().trim().min(20).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  placeId: z.string().trim().max(400).optional(),
  placeName: z.string().trim().max(200).optional(),
  userId: z.string().uuid().optional(),
});

/** Salva (ou atualiza) o aparelho que quer receber alertas contextuais. */
export const registerPushDevice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_devices").upsert(
      {
        token: data.token,
        user_id: data.userId ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        place_id: data.placeId ?? null,
        place_name: data.placeName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushDevice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(20).max(500) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_devices").delete().eq("token", data.token);
    return { ok: true };
  });
