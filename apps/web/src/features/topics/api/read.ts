import { dbError } from "@/infrastructure/database/errors";
import { AppError } from "@/core/errors";
import type { ApiContext } from "@/infrastructure/http/context";
import { uuid } from "@/infrastructure/http/context";
export async function readTopics(context: ApiContext) {
  const { db, user, parts } = context;
  if (parts[0] === "topics") {
    const q = db.from("topics").select("*").eq("owner_id", user.id);
    const result = parts[1]
      ? await q.eq("id", uuid(parts[1])).maybeSingle()
      : await q.order("created_at", { ascending: false });
    dbError(result.error);
    if (parts[1] && !result.data)
      throw new AppError("not_authorized", "This topic is unavailable.", 404);
    return result.data;
  }
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
