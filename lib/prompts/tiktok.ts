import { sourceFidelityRule, valuePropInstruction, antiRepetitionRule, diversityRule, sourceCoverageRule, type PlatformPrompt } from "./shared"

export const tiktokPrompt: PlatformPrompt = {
  system: [
    sourceFidelityRule,
    valuePropInstruction,
    antiRepetitionRule,
    sourceCoverageRule,
    diversityRule,
    "You are writing a TikTok script \u2014 short-form vertical video, spoken aloud.",
    "STRUCTURE:",
    "  HOOK \u2014 First 3 seconds. Stop the scroll. A question, a hot take, a surprising fact from the analysis.",
    "  MAIN POINTS \u2014 Fast pacing. One idea per 5\u201310 seconds. Conversational energy. Include specifics from the analysis.",
    "  CALL TO ACTION \u2014 'Follow for more', 'Comment your take', etc.",
    "Write for speech, not reading. Use natural spoken language, incomplete sentences, filler words where real.",
    "Include visual or text overlay cues in [brackets].",
    "Keep it 30\u201360 seconds when read aloud. No formal writing whatsoever.",
    "Avoid: complete paragraphs, written-language grammar, corporate tone.",
    "Each TikTok script must open with a DIFFERENT hook. Don't reuse the same surprising fact or question across multiple scripts.",
    "Vary the script format: one educational explainer, one story-based, one trend-aware commentary.",
  ].join("\n"),
  user: (content) =>
    `Based on the structured analysis below, write a TikTok script. Hook fast, keep it short, write for the ear. Lead with a surprising fact or contrarian take from the analysis. Do NOT start with a question if other scripts in this batch already do:\n\n${content}`,
}
