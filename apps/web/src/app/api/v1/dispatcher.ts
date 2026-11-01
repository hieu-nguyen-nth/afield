import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/features/auth/session";
import { assertOrigin, readJson } from "@/infrastructure/http/request";
import { dbError } from "@/infrastructure/database/errors";
import { AppError, errorBody } from "@/core/errors";
import type { ApiContext } from "@/infrastructure/http/context";
import { readAccount } from "@/features/account/api/read";
import { readTopics } from "@/features/topics/api/read";
import { readGeneration } from "@/features/generation/api/read";
import { readBriefs } from "@/features/briefs/api/read";
import { mutateExplore } from "@/features/explore/api/mutate";
import { mutateTopics } from "@/features/topics/api/mutate";
import { mutateGeneration } from "@/features/generation/api/mutate";
import { mutateBriefs } from "@/features/briefs/api/mutate";
import { mutateResearch } from "@/features/research/api/mutate";
import { mutateAccount } from "@/features/account/api/mutate";
type Context = { params: Promise<{ path: string[] }> };

async function handle(req: Request, { params }: Context) {
  if (req.method !== "GET") assertOrigin(req);
  const { db, user } = await requireUser();
  const parts = (await params).path;
  const url = new URL(req.url);
  const body = req.method === "GET" ? {} : await readJson(req);
  const limited = await db.rpc("rate_limit", {
    p_kind:
      req.method === "GET" ? "read" : parts[0] === "assist" ? "setup" : "write",
  });
  if (limited.error?.message.includes("quota_exceeded"))
    throw new AppError(
      "rate_limited",
      "Afield received too many requests in a short time. Please wait a minute, then refresh. This is separate from your brief allowance.",
      429,
      true,
    );
  dbError(limited.error);

  const context: ApiContext = { req, db, user, parts, url, body };
  const routes: Record<string, (context: ApiContext) => Promise<unknown>> =
    req.method === "GET"
      ? {
          me: readAccount,
          topics: readTopics,
          runs: readGeneration,
          briefs: readBriefs,
          export: readAccount,
        }
      : {
          explorations: mutateExplore,
          topics: mutateTopics,
          runs: mutateGeneration,
          briefs: mutateBriefs,
          sources: mutateResearch,
          assist: mutateResearch,
          account: mutateAccount,
        };
  const handler = routes[parts[0]];
  if (!handler)
    throw new AppError("validation_failed", "Unknown endpoint.", 404);
  return handler(context);
}
async function response(req: Request, ctx: Context) {
  try {
    const result = await handle(req, ctx);
    return result instanceof Response
      ? result
      : NextResponse.json(result, {
          status:
            result && typeof result === "object" && "runId" in result
              ? 202
              : 200,
          headers: { "Cache-Control": "private, no-store" },
        });
  } catch (e) {
    return NextResponse.json(
      e instanceof z.ZodError
        ? {
            error: {
              code: "validation_failed",
              message: e.issues[0]?.message ?? "Review the inputs.",
              retryable: false,
            },
          }
        : errorBody(e),
      {
        status:
          e instanceof AppError
            ? e.status
            : e instanceof z.ZodError
              ? 400
              : 500,
      },
    );
  }
}
export {
  response as GET,
  response as POST,
  response as PATCH,
  response as DELETE,
};
