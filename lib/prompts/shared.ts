import type { ContentAnalysis } from "../analysis-types"

export const sourceFidelityRule =
  "CRITICAL: Stick to facts present in the source content. Do not add ingredients, statistics, claims, or anecdotes not found in the source. If a detail isn't in the source, don't invent it. Accuracy over creativity."

export const hashtagRule =
  "MANDATORY: End with exactly 3\u20135 relevant hashtags on their own line at the bottom."

export const valuePropInstruction =
  "Identify the key facts, benefits, and differentiators in the source. Preserve those specifics in your output \u2014 do not trade substance for fluff."

export const antiRepetitionRule =
  "ANTI-REPETITION: Each generated asset must cover DIFFERENT insights from the analysis. Do not reuse the same hook, statistic, quote, or angle across multiple assets. If you reference a statistic in one asset, avoid it in the next. Vary the focus deliberately."

export const sourceCoverageRule =
  "COVERAGE: Distribute insights evenly across all assets. Avoid clustering all the best insights into one asset. Ensure every key takeaway, statistic, and quote is represented in at least one asset."

export const diversityRule =
  "DIVERSITY: Vary the structure, hook style, and emotional tone across assets. Mix educational, storytelling, contrarian, and practical formats. Avoid formatting every asset identically."

export const goalInstructions = {
  educate:
    "GOAL: Educate your audience. Break down the topic clearly. Explain how it works, why it matters, and what to do with the information. Use examples. End with a key takeaway.",
  engage:
    "GOAL: Drive conversation. Ask a specific question. Share a relatable observation. Make the audience want to reply, comment, or tag someone. Prioritize discussion over information density.",
  sell: "GOAL: Drive interest in a product or service. Highlight features and benefits. Include social proof or results where available. End with a clear next step (visit, buy, try, sign up). Be persuasive without being pushy.",
  authority:
    "GOAL: Build thought leadership. Take a stance. Challenge conventional thinking. Back your position with reasoning. End with a memorable insight that positions you as an expert.",
} as const

export type ContentGoal = keyof typeof goalInstructions

export function getGoalInstruction(goal?: string): string {
  return goal && goal in goalInstructions
    ? goalInstructions[goal as ContentGoal]
    : ""
}

export function formatBrandVoice(
  bv?: {
    tone?: string
    audience?: string
    keywords?: string
    avoidKeywords?: string
  } | null
): string {
  if (!bv) return ""
  const parts: string[] = []
  if (bv.tone) parts.push(`Tone: ${bv.tone}`)
  if (bv.audience) parts.push(`Target audience: ${bv.audience}`)
  if (bv.keywords)
    parts.push(`Always include these keywords naturally: ${bv.keywords}`)
  if (bv.avoidKeywords)
    parts.push(`Never use these words: ${bv.avoidKeywords}`)
  return parts.length
    ? `BRAND VOICE:\n${parts.join("\n")}`
    : ""
}

export function formatAnalysisContext(a: ContentAnalysis): string {
  const lines: string[] = []

  lines.push(`MAIN TOPIC: ${a.mainTopic}`)

  if (a.subtopics.length) {
    lines.push(`\nSUBTOPICS:\n- ${a.subtopics.join("\n- ")}`)
  }

  if (a.keyTakeaways.length) {
    lines.push(`\nKEY TAKEAWAYS:\n- ${a.keyTakeaways.join("\n- ")}`)
  }

  if (a.actionableAdvice.length) {
    lines.push(`\nACTIONABLE ADVICE:\n- ${a.actionableAdvice.join("\n- ")}`)
  }

  if (a.statistics.length) {
    lines.push(`\nSTATISTICS:\n${a.statistics.map((s) => `- ${s.value} \u2014 ${s.context}`).join("\n")}`)
  }

  if (a.quotes.length) {
    lines.push(`\nQUOTES:\n${a.quotes.map((q) => `- "${q.text}"${q.attribution ? ` \u2014 ${q.attribution}` : ""}`).join("\n")}`)
  }

  if (a.examples.length) {
    lines.push(`\nEXAMPLES:\n- ${a.examples.join("\n- ")}`)
  }

  if (a.commonMistakes.length) {
    lines.push(`\nCOMMON MISTAKES:\n- ${a.commonMistakes.join("\n- ")}`)
  }

  if (a.lessonsLearned.length) {
    lines.push(`\nLESSONS LEARNED:\n- ${a.lessonsLearned.join("\n- ")}`)
  }

  if (a.contentHooks.length) {
    lines.push(`\nCONTENT HOOKS:\n- ${a.contentHooks.join("\n- ")}`)
  }

  if (a.viralAngles.length) {
    lines.push(`\nVIRAL ANGLES:\n- ${a.viralAngles.join("\n- ")}`)
  }

  return lines.join("\n")
}

export const audienceModes = [
  { id: "default", label: "General" },
  { id: "nigerian", label: "Nigerian Audience" },
] as const

export type AudienceMode = (typeof audienceModes)[number]["id"]

export type PlatformPrompt = {
  system: string
  user: (content: string) => string
}
