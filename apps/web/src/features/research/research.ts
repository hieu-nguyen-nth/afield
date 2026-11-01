import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "node:crypto";
import {
  safeFetch,
  inScope,
  publicUrl,
} from "../../infrastructure/network/safe-fetch";
import { search } from "../../infrastructure/providers/providers";
import type { Evidence, Run, SourceCheck } from "../../domain/contracts";
import { AppError } from "../../core/errors";
import { configuredSources, runSourceMode, usesWeb } from "./source-mode";
export function urlsIn(text: string) {
  return [...new Set(text.match(/https?:\/\/[^\s<>"')]+/g) ?? [])].slice(0, 5);
}
export function rankedSiteLinks(
  candidates: { url: string; text: string }[],
  question: string,
) {
  const tokens = [
    ...new Set(question.toLowerCase().match(/[a-z]{3,}|\bai\b/g) || []),
  ].filter(
    (word) =>
      ![
        "the",
        "and",
        "for",
        "with",
        "how",
        "should",
        "their",
        "what",
        "current",
        "context",
      ].includes(word),
  );
  return [
    ...new Map(
      candidates.map((candidate) => [candidate.url, candidate]),
    ).values(),
  ]
    .filter(
      ({ url }) =>
        !/\/(?:login|subscribe|account|privacy|terms|tag|category)(?:\/|\?|$)/i.test(
          url,
        ),
    )
    .map((candidate) => ({
      ...candidate,
      score:
        tokens.reduce(
          (score, token) =>
            score +
            ((candidate.text + " " + candidate.url)
              .toLowerCase()
              .includes(token)
              ? 3
              : 0),
          0,
        ) + (/\/20\d{2}\//.test(candidate.url) ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((candidate) => candidate.url);
}
export async function research(run: Run, heartbeat: () => Promise<void>) {
  const documents: Evidence[] = [],
    checks: SourceCheck[] = [];
  const mode = runSourceMode(run.snapshot);
  if (usesWeb(mode) && !process.env.TAVILY_API_KEY)
    throw new AppError(
      "configuration_invalid",
      "This source mode needs the Tavily connection. Choose My sources only to avoid web search.",
    );
  const selected = configuredSources(run);
  const scopes =
    mode === "web_only"
      ? []
      : selected.length
        ? selected
        : urlsIn(run.snapshot.prompt).map((url) => ({
            url,
            name: url,
            scope: "page" as const,
          }));
  if (
    scopes.some((source) => source.scope === "search") &&
    !process.env.TAVILY_API_KEY
  )
    throw new AppError(
      "configuration_invalid",
      "Site search is unavailable right now. Choose an exact page, feed, or linked pages instead.",
      503,
    );
  const read = async (
    url: string,
    origin: "followed" | "discovered",
    source?: { url: string; scope: string },
  ) => {
    const result = await safeFetch(url);
    if (source && source.scope !== "feed" && !inScope(result.url, source))
      throw new AppError(
        "retrieval_failed",
        "A redirect left the approved source scope.",
      );
    const $ = load(result.text);
    $("script,style,nav,footer,header,form,iframe,svg,noscript").remove();
    const title =
      $("title").text().trim().slice(0, 240) || new URL(result.url).hostname;
    const body =
      $("article").first().text() ||
      $("main").first().text() ||
      $("body").text();
    const text = body.replace(/\s+/g, " ").trim().slice(0, 18000);
    if (text.length < 100)
      throw new AppError(
        "insufficient_evidence",
        "This page has too little accessible text.",
      );
    const date =
      $('meta[property="article:published_time"]').attr("content") ||
      $("time[datetime]").first().attr("datetime");
    if (!documents.some((d) => d.url === result.url))
      documents.push({
        id: randomUUID(),
        url: result.url,
        title,
        publisher: new URL(result.url).hostname,
        text,
        publishedAt:
          date && !Number.isNaN(Date.parse(date))
            ? new Date(date).toISOString()
            : null,
        origin,
      });
    return { $, url: result.url };
  };
  for (const source of scopes) {
    let count = documents.length;
    let searchNote: string | undefined;
    try {
      publicUrl(source.url);
      if (source.scope === "search") {
        const site = publicUrl(source.url);
        const searchScope = { url: site.origin + "/", scope: "site" };
        const freshness =
          run.intent === "update"
            ? ` latest developments ${run.snapshot.coverageStart ? `from ${run.snapshot.coverageStart.slice(0, 10)}` : ""} through ${(run.snapshot.coverageEnd || run.snapshot.asOf).slice(0, 10)}`
            : "";
        const query = `${run.snapshot.prompt} ${String(run.snapshot.preferences || "").slice(0, 500)}${freshness} site:${site.hostname}`;
        const results = await search(query, [site.hostname]);
        const candidates = [...new Set(results.map((result) => result.url))]
          .filter(
            (url) =>
              inScope(url, searchScope) &&
              new URL(url).pathname !== "/" &&
              !/\/(?:login|subscribe|account|privacy|terms)(?:\/|\?|$)/i.test(
                new URL(url).pathname,
              ),
          )
          .slice(0, 5);
        searchNote = `Searched ${site.hostname}; ${candidates.length} matching result(s) checked. Search is limited to indexed public pages, not the entire archive.`;
        for (const url of candidates) {
          if (documents.length >= 20) break;
          try {
            await read(url, "followed", searchScope);
          } catch {
            checks.push({
              scope: url,
              outcome: "blocked",
              count: 0,
              reason:
                "A site-search result could not be read within the selected site or section. It may be restricted, redirected, or unavailable.",
            });
          }
          await heartbeat();
        }
      } else if (source.scope === "feed") {
        const feed = await safeFetch(source.url);
        if (/<!DOCTYPE|<!ENTITY/i.test(feed.text))
          throw new AppError(
            "retrieval_failed",
            "Feed entities are not supported.",
          );
        const data = new XMLParser({
          ignoreAttributes: false,
          processEntities: false,
        }).parse(feed.text);
        const raw = data.rss?.channel?.item ?? data.feed?.entry ?? [];
        const entries = Array.isArray(raw) ? raw : [raw];
        if (!entries.length) {
          documents.push({
            id: randomUUID(),
            url: feed.url,
            title: source.name + " — checked feed",
            publisher: new URL(feed.url).hostname,
            text:
              "The public feed was retrieved successfully at " +
              run.snapshot.asOf +
              ". Its returned content is: " +
              feed.text.slice(0, 12000),
            publishedAt: null,
            origin: "followed",
          });
        }
        for (const item of entries.slice(0, 4)) {
          const links = Array.isArray(item.link) ? item.link : [item.link];
          const link = links.find(
            (x: unknown) =>
              typeof x === "string" ||
              (x && typeof x === "object" && "@_href" in x),
          );
          const url = typeof link === "string" ? link : link?.["@_href"];
          if (url && documents.length < 20) {
            try {
              await read(new URL(url, feed.url).href, "followed", source);
            } catch {
              checks.push({
                scope: String(url),
                outcome: "blocked",
                count: 0,
                reason: "A feed article could not be checked.",
              });
            }
            await heartbeat();
          }
        }
      } else {
        const first = await read(source.url, "followed", source);
        await heartbeat();
        if (source.scope === "site") {
          const links = first
            .$("a[href]")
            .map((_, el) => {
              try {
                return {
                  url: new URL(first.$(el).attr("href")!, first.url).href,
                  text: first.$(el).text(),
                };
              } catch {
                return { url: "", text: "" };
              }
            })
            .get()
            .filter(({ url }) => inScope(url, source) && url !== first.url);
          for (const url of rankedSiteLinks(
            links,
            run.snapshot.prompt + " " + run.snapshot.preferences,
          ).slice(0, 3)) {
            if (documents.length >= 20) break;
            try {
              await read(url, "followed", source);
            } catch {
              checks.push({
                scope: url,
                outcome: "blocked",
                count: 0,
                reason: "A page within the approved site could not be checked.",
              });
            }
            await heartbeat();
          }
        }
      }
      count = documents.length - count;
      checks.push({
        scope: source.url,
        outcome: count ? "success" : "empty",
        count,
        ...(searchNote ? { reason: searchNote } : {}),
      });
    } catch (error) {
      if (error instanceof AppError && error.code === "quota_exceeded")
        throw error;
      checks.push({
        scope: source.url,
        outcome: "failed",
        count: 0,
        reason:
          source.scope === "search"
            ? "The selected site search could not complete. Its sources were not replaced by a broader web search."
            : "The source was unavailable, restricted, unsafe, or unsupported.",
      });
    }
    await heartbeat();
  }
  if (usesWeb(mode)) {
    try {
      const results = await search(run.snapshot.prompt);
      let count = 0;
      for (const candidate of results) {
        if (documents.length >= 20) break;
        try {
          await read(candidate.url, "discovered");
          count++;
        } catch {
          checks.push({
            scope: candidate.url,
            outcome: "blocked",
            count: 0,
            reason: "A discovered source could not be checked.",
          });
        }
        await heartbeat();
      }
      checks.push({
        scope: "Public web discovery",
        outcome: count ? "success" : "empty",
        count,
      });
    } catch (e) {
      if (e instanceof AppError && e.code === "quota_exceeded") throw e;
      checks.push({
        scope: "Public web discovery",
        outcome: "failed",
        count: 0,
        reason: "Optional discovery was unavailable.",
      });
    }
  }
  if (!checks.length)
    throw new AppError(
      "configuration_invalid",
      "Add a public source URL to your question, or connect optional Tavily web search.",
    );
  if (!checks.some((c) => ["success", "empty"].includes(c.outcome)))
    throw new AppError(
      "retrieval_failed",
      "None of the sources could be checked.",
      503,
      true,
    );
  if (!documents.length && run.intent === "explore")
    throw new AppError(
      "insufficient_evidence",
      "The accessible sources cannot answer this question. Add a more specific source.",
    );
  return {
    documents,
    checks,
    partial:
      checks.some((c) => ["failed", "blocked"].includes(c.outcome)) ||
      scopes.some((s) => ["site", "search"].includes(s.scope)),
  };
}
