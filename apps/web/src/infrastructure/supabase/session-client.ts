import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { settings } from "../../config/env";
export async function userClient() {
  const cfg = settings(),
    jar = await cookies();
  return createServerClient(cfg.url, cfg.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: cfg.origin.startsWith("https:"),
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        for (const c of values) jar.set(c.name, c.value, c.options);
      },
    },
  });
}
