import { z } from "zod";
import { load } from "cheerio";
import { gemini, search } from "../../infrastructure/providers/providers";
import { safeFetch } from "../../infrastructure/network/safe-fetch";
import { subtopicInput } from "./subtopics";

const publisherKinds = [
  "independent_publication",
  "university",
  "public_institution",
  "research_nonprofit",
] as const;
const selectionSchema = z.object({
  sources: z
    .array(
      z.object({
        index: z.number().int().min(0),
        name: z.string().trim().min(1).max(100),
        kind: z.enum(publisherKinds),
        publisherEvidence: z.string().trim().min(30).max(350),
        reason: z.string().trim().min(1).max(240),
      }),
    )
    .max(5),
});
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const commercialPitch =
  /\b(?:book|request|schedule)\s+(?:a\s+)?(?:free\s+|personalized\s+|product\s+)?demo\b|\bstart\s+(?:your\s+|a\s+)?free trial\b/i;
const excludedHost =
  /(^|\.)(linkedin\.com|reddit\.com|youtube\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|tiktok\.com)$/;
type Candidate = {
  url: string;
  examples: { title: string; snippet: string }[];
  publisherText: string;
};

export async function recommendSources(input: unknown) {
  const request = subtopicInput.parse(input);
  // Keep long personal preferences from overwhelming the topic in search ranking.
  const topic = request.prompt.split("\nContext:")[0].slice(0, 1000);
  const suffix =
    '-site:linkedin.com -site:reddit.com -site:youtube.com -"book a demo" -"free trial"';
  const batches = await Promise.all([
    search(
      `${topic} university research institute public agency learning publications ${suffix}`,
    ),
    search(
      `${topic} independent journalism specialist publication analysis explainers ${suffix}`,
    ),
  ]);
  const byHost = new Map<string, Candidate>();
  // Interleave channels so one search cannot occupy all candidate slots.
  for (
    let index = 0;
    index < Math.max(...batches.map((batch) => batch.length));
    index++
  ) {
    for (const batch of batches) {
      const result = batch[index];
      if (!result) continue;
      try {
        const url = new URL(result.url);
        const host = url.hostname.toLowerCase().replace(/^www\./, "");
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          excludedHost.test(host)
        )
          continue;
        const evidence = {
          title: result.title.slice(0, 300),
          snippet: (result.content || "").slice(0, 1600),
        };
        if (commercialPitch.test(`${evidence.title} ${evidence.snippet}`))
          continue;
        if (byHost.has(host)) byHost.get(host)!.examples.push(evidence);
        else if (byHost.size < 10)
          byHost.set(host, {
            url: url.origin + "/",
            examples: [evidence],
            publisherText: "",
          });
      } catch {
        /* Ignore malformed search results. */
      }
    }
  }
  const checked: Candidate[] = [];
  const candidates = [...byHost.values()];
  // Read the publisher, not just a well-ranked article title. Bound concurrency.
  for (let offset = 0; offset < candidates.length; offset += 3) {
    const batch = await Promise.all(
      candidates.slice(offset, offset + 3).map(async (candidate) => {
        try {
          const page = await safeFetch(candidate.url);
          const final = new URL(page.url);
          if (
            final.hostname.replace(/^www\./, "") !==
            new URL(candidate.url).hostname.replace(/^www\./, "")
          )
            return null;
          const $ = load(page.text);
          $("script, style, noscript, svg").remove();
          const text = normalize($("body").text() || $.text());
          if (text.length < 120 || commercialPitch.test(text)) return null;
          return { ...candidate, publisherText: text.slice(0, 14000) };
        } catch {
          return null;
        }
      }),
    );
    checked.push(
      ...batch.filter(
        (candidate): candidate is Candidate => candidate !== null,
      ),
    );
  }
  if (!checked.length) return { sources: [] };
  const selected = await gemini(
    "Choose up to five RECURRING LEARNING/READING sources using only these checked publishers and search excerpts. The reader wants substantive explanations, research and thoughtful analysis, not products or vendor education funnels. Eligibility requires publisher evidence for one of: independent editorial publication (including paid journalism/newsletters), university, public institution/regulator, or research nonprofit. EXCLUDE software/product vendors, consultancies, agencies, training/course sellers, industry trade/marketing associations, sponsored-content farms, directories, generic SEO listicles and unknown publisher identities, even when their article matches perfectly. A vendor's research blog or a standards-sounding brand is still ineligible. Nonprofit status or an official-sounding title alone is not enough. Prefer readable topic-relevant analysis and original research over press releases or general homepages. Use the supplied publisher text to verify who publishes, and example titles/snippets to establish relevance to the learning goal. Never infer trust from search rank, domain suffix or polished titles. Return fewer or NONE if evidence is weak. For each selected candidate return its index, publication name, eligible kind, publisherEvidence copied verbatim (30–350 characters) from publisherText supporting its editorial/research/public role, and a specific short reason explaining what the reader can learn from its supplied coverage. Do not invent credentials or publication frequency. The app searches this domain again each brief; it does not repeatedly read the sample article.",
    selectionSchema,
    {
      topic: request.prompt,
      candidates: checked.map((candidate, index) => ({ index, ...candidate })),
    },
  );
  const used = new Set<number>();
  return {
    sources: selected.sources.flatMap((item) => {
      const candidate = checked[item.index];
      if (
        !candidate ||
        used.has(item.index) ||
        !publisherKinds.includes(item.kind) ||
        !normalize(item.publisherEvidence || "") ||
        !candidate.publisherText.includes(normalize(item.publisherEvidence))
      )
        return [];
      used.add(item.index);
      return [
        {
          url: candidate.url,
          name: item.name,
          scope: "search" as const,
          status: "recommended" as const,
          rationale: item.reason,
        },
      ];
    }),
  };
}
