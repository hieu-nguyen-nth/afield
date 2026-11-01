import { z } from "zod";
import { dbError } from "@/infrastructure/database/errors";
import type { ApiContext } from "@/infrastructure/http/context";
import { AppError } from "@/core/errors";
export async function mutateAccount(context: ApiContext) {
  const { db, parts, body } = context;
  if (parts[0] === "account" && parts[1] === "delete") {
    z.object({ confirmation: z.literal("DELETE MY ACCOUNT") })
      .strict()
      .parse(body);
    const r = await db.rpc("request_deletion");
    dbError(r.error);
    await db.auth.signOut({ scope: "global" });
    return { requested: true };
  }
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
