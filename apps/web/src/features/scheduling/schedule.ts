import { Temporal } from "@js-temporal/polyfill";
import type { TopicConfig } from "@/features/topics/models";
export function nextOccurrence(
  config: TopicConfig["schedule"],
  after = new Date(),
): string {
  const instant = Temporal.Instant.from(after.toISOString());
  const local = instant.toZonedDateTimeISO(config.timezone);
  for (let day = 0; day < 9; day++) {
    const date = local.toPlainDate().add({ days: day });
    if (config.cadence === "weekly" && date.dayOfWeek !== config.weekday)
      continue;
    let plain = date.toPlainDateTime(config.time);
    for (let minute = 0; minute < 180; minute++) {
      const candidate = plain.toZonedDateTime(config.timezone, {
        disambiguation: "earlier",
      });
      if (candidate.toPlainDateTime().equals(plain)) {
        if (Temporal.Instant.compare(candidate.toInstant(), instant) > 0)
          return candidate.toInstant().toString();
        break;
      }
      plain = plain.add({ minutes: 1 });
    }
  }
  throw new Error("Cannot resolve the next local occurrence");
}
export function occurrenceKey(topic: string, date: string, zone: string) {
  return `${topic}:${Temporal.Instant.from(date).toZonedDateTimeISO(zone).toPlainDateTime().toString({ smallestUnit: "minute" })}`;
}
export function dayRange(date: string, zone: string) {
  const d = Temporal.PlainDate.from(date);
  return {
    start: d.toZonedDateTime(zone).toInstant().toString(),
    end: d.add({ days: 1 }).toZonedDateTime(zone).toInstant().toString(),
  };
}
