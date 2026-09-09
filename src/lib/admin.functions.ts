import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type AdminSession = { admin?: boolean; at?: number };

function sessionConfig() {
  const password = process.env["ADMIN_SESSION_SECRET"];
  if (!password) throw new Error("ADMIN_SESSION_SECRET is not set");
  return {
    password,
    name: "godhelp-admin",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function requireAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.admin) throw new Error("Acesso restrito");
  return session;
}

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { admin: session.data.admin === true };
});

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => ({
    username: String(data.username ?? "").slice(0, 200),
    password: String(data.password ?? "").slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const user = process.env["ADMIN_USERNAME"];
    const pass = process.env["ADMIN_PASSWORD"];
    if (!user || !pass) return { ok: false as const };

    // Sempre compara os dois campos, para não vazar qual deles errou.
    const okUser = matches(data.username.trim().toLowerCase(), user.trim().toLowerCase());
    const okPass = matches(data.password, pass);
    if (!okUser || !okPass) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { ok: false as const };
    }

    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ admin: true, at: Date.now() });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const adminOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [pois, cache, devices] = await Promise.all([
    supabaseAdmin.from("pois").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("places_cache").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("push_devices").select("*", { count: "exact", head: true }),
  ]);

  return {
    pois: pois.count ?? 0,
    cache: cache.count ?? 0,
    devices: devices.count ?? 0,
  };
});
