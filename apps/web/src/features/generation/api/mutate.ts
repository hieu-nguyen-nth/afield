import { dbError } from "@/infrastructure/database/errors";
import { requireLive } from "@/config/env";
import type { ApiContext } from "@/infrastructure/http/context";
import { uuid } from "@/infrastructure/http/context";
import { AppError } from "@/core/errors";
export async function mutateGeneration(context: ApiContext) {
  const { db, parts } = context;
  if (parts[0] === "runs" && parts[2] === "retry") {
    requireLive();
    const r = await db.rpc("retry_run", { p_id: uuid(parts[1]) });
    dbError(r.error);
    return { runId: parts[1] };
  }
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
