import { NextResponse } from "next/server";
import { dbError } from "@/infrastructure/database/errors";
import type { ApiContext } from "@/infrastructure/http/context";
import { AppError } from "@/core/errors";
export async function readAccount(context: ApiContext) {
  const { db, user, parts } = context;
  if (parts[0] === "me") {
    const usage = await db.rpc("get_usage");
    dbError(usage.error);
    const now = new Date();
    return {
      user: { id: user.id, email: user.email },
      usage: {
        ...(usage.data ?? { runs: 0, limit: 30 }),
        resetsAt: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
        ).toISOString(),
        dailyResetsAt: new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
          ),
        ).toISOString(),
        shared: true,
      },
      capabilities: {
        live:
          process.env.LIVE_GENERATION_ENABLED === "true" &&
          process.env.FREE_TIERS_VERIFIED === "true",
        search: !!process.env.TAVILY_API_KEY,
        cloud: process.env.EXECUTION_MODE === "cloud",
        audio: !!process.env.GEMINI_API_KEY,
      },
    };
  }
  if (parts[0] === "export") {
    const tables = [
      "topics",
      "sources",
      "templates",
      "schedules",
      "runs",
      "briefs",
      "brief_items",
      "citations",
      "documents",
      "source_checks",
      "review_records",
    ];
    const data: Record<string, unknown> = {
      version: 1,
      exportedAt: new Date().toISOString(),
      owner: user.id,
      mediaInstructions:
        "Download selected narration from each brief. This JSON contains no credentials or playback tokens.",
    };
    for (const t of tables) {
      const result = await db
        .from(t)
        .select(
          t === "runs"
            ? "id,owner_id,topic_id,intent,trigger,snapshot,status,stage,error,created_at"
            : "*",
        )
        .eq("owner_id", user.id)
        .limit(1000);
      dbError(result.error);
      data[t] = result.data;
    }
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": 'attachment; filename="afield-export.json"',
        "Cache-Control": "no-store",
      },
    });
  }
  throw new AppError("validation_failed", "Unknown endpoint.", 404);
}
