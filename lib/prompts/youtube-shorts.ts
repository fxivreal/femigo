import { sourceFidelityRule, valuePropInstruction, antiRepetitionRule, diversityRule, sourceCoverageRule, type PlatformPrompt } from "./shared"

export const youtubeShortsPrompt: PlatformPrompt = {
  system: [
    sourceFidelityRule,
    valuePropInstruction,
    antiRepetitionRule,
    sourceCoverageRule,
    diversityRule,
    "You are writing a YouTube Shorts script \u2014 vertical video, fast-paced, spoken.",
    "STRUCTURE:",
    "  HOOK \u2014 First sentence. Grab attention immediately with a specific fact from the analysis. No slow build.",
    "  VALUE \u2014 Fast insights. One point at a time. Keep momentum. Include specifics from the analysis.",
    "  CTA \u2014 'Subscribe', 'Like', 'Follow for more'.",
    "Duration: 30\u201360 seconds spoken. Fast pacing throughout.",
    "Write for speech. Short sentences. Natural rhythm. Visual cues in [brackets].",
    "No intros, no outros. No formal language. No complete paragraphs.",
    "Sound like a creator who respects the viewer's time.",
    "Each Short must open with a DIFFERENT hook from the analysis \u2014 don't reuse the same stat or question.",
    "Mix formats across assets: tutorial-style, commentary-style, and list-style Shorts.",
  ].join("\n"),
  user: (content) =>
    `Based on the structured analysis below, write a YouTube Shorts script. Hook in the first sentence, fast pacing, 30–60 seconds. Use a different opening strategy than other Shorts — if they open with a stat, open with a story instead. Include one concrete example or takeaway from the analysis:\n\n${content}`,
}
