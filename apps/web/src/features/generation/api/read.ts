import { dbError } from "@/infrastructure/database/errors";
import { AppError } from "@/core/errors";
import type { ApiContext } from "@/infrastructure/http/context";
import { uuid } from "@/infrastructure/http/context";
export async function readGeneration(context: ApiContext) {
  const { db, user, parts } = context;
  if (parts[0] === "runs") {
    const result = parts[1]
      ? await db
          .from("runs")
          .select(
            "id,intent,topic_id,trigger,status,stage,error,created_at,updated_at,attempts,snapshot,next_eligible_at",
          )
          .eq("id", uuid(parts[1]))
          .eq("owner_id", user.id)
          .maybeSingle()
      : await db
          .from("runs")
          .select(
            "id,intent,topic_id,status,stage,error,created_at,next_eligible_at,attempts,snapshot",
          )
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);
    dbError(result.error);
    if (parts[1] && !result.data)
      throw new AppError("not_authorized", "This run is unavailable.", 404);
    if (parts[1]) {
      const events = await db
        .from("run_events")
        .select("id,stage,status,created_at,error_code")
        .eq("run_id", parts[1])
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);
      dbError(events.error);
      const brief = await db
        .from("briefs")
        .select("id")
        .eq("run_id", parts[1])
        .eq("owner_id", user.id)
        .maybeSingle();
      return {
        ...result.data,
        brief_id: brief.data?.id ?? null,
        events: (events.data ?? []).reverse(),
      };
    }
    return result.data;
  }
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
