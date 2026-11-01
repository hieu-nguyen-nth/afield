import { describe, it, expect } from "vitest";
import {
  publicAddress,
  publicUrl,
  inScope,
} from "../src/infrastructure/network/safe-fetch";
import {
  nextOccurrence,
  dayRange,
  occurrenceKey,
} from "../src/features/scheduling/schedule";
import { exploreSchema, topicSchema } from "../src/domain/contracts";
import { conflictingLimit, verifyContent, hash } from "../src/core/limits";
import { modelEvidence } from "../src/features/research/evidence-budget";
it("bounds retained-source excerpts across review and repair passes", () => {
  const docs = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    url: "https://example.com",
    title: "Public source",
    publisher: "Example",
    publishedAt: null,
    origin: "followed" as const,
    text: "a".repeat(18000),
  }));
  const selected = modelEvidence(docs);
  expect(selected.excerpted).toBe(true);
  expect(
    selected.evidence.reduce((n, d) => n + d.text.length, 0),
  ).toBeLessThanOrEqual(24000);
  expect(docs[0].text).toHaveLength(18000);
});
const schedule = {
  cadence: "daily" as const,
  weekday: 1,
  time: "02:30",
  timezone: "America/Los_Angeles",
};
describe("untrusted source boundaries", () => {
  it("blocks loopback, private, mapped IPv4, multicast, metadata, reserved and IPv6 local addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.4",
      "172.16.1.2",
      "192.168.0.1",
      "169.254.169.254",
      "0.0.0.0",
      "224.0.0.1",
      "::1",
      "fc00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ])
      expect(publicAddress(ip), ip).toBe(false);
    expect(publicAddress("1.1.1.1")).toBe(true);
  });
  it("rejects credentials, nonweb protocols, private hostnames and arbitrary ports", () => {
    for (const url of [
      "file:///etc/passwd",
      "https://user:pass@example.com",
      "http://localhost/a",
      "http://box.local/",
      "https://example.com:8443",
    ])
      expect(() => publicUrl(url)).toThrow();
  });
  it("enforces exact page and path-prefix site scopes without sibling-prefix escape", () => {
    expect(
      inScope("https://example.com/news/a", {
        url: "https://example.com/news",
        scope: "site",
      }),
    ).toBe(true);
    expect(
      inScope("https://example.com/newsroom/a", {
        url: "https://example.com/news",
        scope: "site",
      }),
    ).toBe(false);
    expect(
      inScope("https://evil.example.com/news/a", {
        url: "https://example.com/news",
        scope: "site",
      }),
    ).toBe(false);
    expect(
      inScope("https://example.com/a?x=2", {
        url: "https://example.com/a?x=1",
        scope: "page",
      }),
    ).toBe(false);
  });
});
describe("named timezones and scheduling", () => {
  it("uses the next valid local minute, not an hour-shifted time, during spring DST", () => {
    expect(nextOccurrence(schedule, new Date("2027-03-14T08:00:00Z"))).toBe(
      "2027-03-14T10:00:00Z",
    );
  });
  it("does not execute the repeated fall slot twice", () => {
    const s = { ...schedule, time: "01:30" };
    expect(nextOccurrence(s, new Date("2026-11-01T07:00:00Z"))).toBe(
      "2026-11-01T08:30:00Z",
    );
    expect(nextOccurrence(s, new Date("2026-11-01T08:31:00Z"))).toBe(
      "2026-11-02T09:30:00Z",
    );
    expect(occurrenceKey("topic", "2026-11-01T08:30:00Z", s.timezone)).toBe(
      occurrenceKey("topic", "2026-11-01T09:30:00Z", s.timezone),
    );
  });
  it("groups display dates using 23/25-hour UTC intervals", () => {
    const spring = dayRange("2027-03-14", schedule.timezone),
      fall = dayRange("2026-11-01", schedule.timezone);
    expect((Date.parse(spring.end) - Date.parse(spring.start)) / 3600000).toBe(
      23,
    );
    expect((Date.parse(fall.end) - Date.parse(fall.start)) / 3600000).toBe(25);
  });
});
describe("request and publication invariants", () => {
  it("requires a single positive supported output limit and refuses injected ownership", () => {
    expect(
      exploreSchema.safeParse({
        prompt: "Test",
        limit: { type: "duration", value: 0 },
      }).success,
    ).toBe(false);
    expect(
      exploreSchema.safeParse({
        prompt: "Test",
        limit: { type: "words", value: 800 },
        owner_id: "other-user",
      }).success,
    ).toBe(false);
  });
  it("flags conflicting explicit length/time instructions", () => {
    expect(
      conflictingLimit("Explain this in 10 minutes", {
        type: "words",
        value: 800,
      }),
    ).toBe(true);
    expect(
      conflictingLimit("Explain this in 10 minutes", {
        type: "duration",
        value: 600,
      }),
    ).toBe(false);
  });
  it("rejects missing evidence, fabricated citations, and news-only Explore results", () => {
    const c = {
      title: "Test",
      noNews: false,
      limitations: [],
      blocks: [
        {
          heading: "Answer",
          items: [{ text: "A claim.", citationIds: ["fabricated"] }],
        },
      ],
    };
    expect(() =>
      verifyContent(c, [], { type: "words", value: 800 }, "explore"),
    ).toThrow();
    expect(() =>
      verifyContent(
        { ...c, noNews: true },
        [],
        { type: "words", value: 800 },
        "explore",
      ),
    ).toThrow();
    expect(hash("frozen")).not.toBe(hash("changed"));
  });
  it("requires a real content block in a template", () => {
    expect(topicSchema.safeParse({}).success).toBe(false);
  });
});
