import { z } from "zod";
import type { requireUser } from "@/features/auth/session";
import type { readJson } from "./request";
export type ApiContext = {
  req: Request;
  db: Awaited<ReturnType<typeof requireUser>>["db"];
  user: Awaited<ReturnType<typeof requireUser>>["user"];
  parts: string[];
  url: URL;
  body: Awaited<ReturnType<typeof readJson>>;
};
export const uuid = (value: string) => z.uuid().parse(value);
