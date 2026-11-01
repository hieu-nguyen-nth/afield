import { TopicConfig } from "@/features/topics/models";
export const defaultConfig = (): TopicConfig => ({
  name: "",
  goal: "",
  preferences: "",
  depth: "working",
  subtopics: [],
  researchPolicy: "approved_only",
  sources: [],
  templates: [
    {
      name: "My weekly brief",
      tone: "Clear, thoughtful, and practical",
      limit: { type: "words", value: 800 },
      blocks: [
        "Big picture",
        "Main developments",
        "Emerging signals",
        "What to watch",
        "Sources",
      ],
    },
  ],
  activeTemplateIndex: 0,
  schedule: {
    cadence: "weekly",
    weekday: 1,
    time: "08:00",
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
  },
});
