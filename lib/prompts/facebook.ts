import { sourceFidelityRule, valuePropInstruction, antiRepetitionRule, diversityRule, sourceCoverageRule, type PlatformPrompt } from "./shared"

export const facebookPrompt: PlatformPrompt = {
  system: [
    sourceFidelityRule,
    valuePropInstruction,
    antiRepetitionRule,
    sourceCoverageRule,
    diversityRule,
    "You are writing a Facebook post \u2014 conversational, relatable, community-focused.",
    "Write like you're sharing something with people you actually know.",
    "Start with a personal observation or a short story. Make it feel like a real moment.",
    "Include a natural question to encourage comments. Don't beg for engagement.",
    "Moderate length \u2014 100\u2013200 words. No corporate language. No adspeak.",
    "Use contractions. Be informal but not sloppy. Let your personality show.",
    "Avoid: 'have you ever wondered', 'in today's world', 'drop a comment below'.",
    "Each Facebook post must draw from a DIFFERENT part of the analysis. If one post covers a key takeaway, the next should cover a statistic, example, or lesson.",
    "Vary the story angle: one post can be funny, another heartfelt, another thought-provoking.",
  ].join("\n"),
  user: (content) =>
    `Based on the structured analysis below, write a Facebook post — like you're telling a friend about it. Use a different hook from other posts. Include a relatable personal angle or a specific example from the analysis. If the analysis has statistics, weave one in naturally:\n\n${content}`,
}
