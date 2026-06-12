import type { AIProvider } from "./ai"
import type { ContentAnalysis } from "./analysis-types"

const ANALYSIS_SYSTEM_PROMPT = `You are a content intelligence engine. Your job is to analyze source content and extract structured intelligence from it.

Return ONLY valid JSON matching this exact schema — no markdown, no code fences, no commentary:

{
  "mainTopic": "The primary subject of the content (1 sentence)",
  "subtopics": ["Array of 3-7 secondary themes or angles covered"],
  "keyTakeaways": ["Array of 3-7 most important points the reader should remember"],
  "actionableAdvice": ["Array of 2-5 concrete steps or recommendations someone can act on"],
  "statistics": [
    { "value": "The statistic as stated", "context": "Brief context about what it means" }
  ],
  "quotes": [
    { "text": "The quoted text", "attribution": "Who said it (omit if unknown)" }
  ],
  "examples": ["Array of 2-4 real-world examples or case studies mentioned"],
  "commonMistakes": ["Array of 2-4 common errors or pitfalls discussed"],
  "lessonsLearned": ["Array of 2-4 lessons the author or subject learned"],
  "frequentlyAskedQuestions": [
    { "question": "A question the content answers", "answer": "Brief answer" }
  ],
  "contentHooks": ["Array of 2-4 attention-grabbing opening hooks based on the content"],
  "viralAngles": ["Array of 2-4 angles that could make this content spread widely"]
}

Rules:
- Extract facts ONLY from the source content. Do not invent or infer.
- If a field has no relevant data in the source, use an empty array [] or empty string "".
- Statistics must include the exact number/value as stated in the source, plus context.
- Hooks and viral angles should be original and creative while staying true to the source material.
- Keep all text concise and substantive.`

export function getAnalysisUserPrompt(content: string): string {
  return `Analyze the following content and return the structured JSON:\n\n${content}`
}

export function generateMockAnalysis(content: string): ContentAnalysis {
  const preview = content.length > 100 ? content.slice(0, 100).trimEnd() + "..." : content
  return {
    mainTopic: preview,
    subtopics: ["Key themes and secondary topics"],
    keyTakeaways: ["Main insight from the content", "Second important point", "Third key takeaway"],
    actionableAdvice: ["Action step one based on the content", "Action step two"],
    statistics: [],
    quotes: [],
    examples: [],
    commonMistakes: [],
    lessonsLearned: ["Lesson derived from the source material"],
    frequentlyAskedQuestions: [],
    contentHooks: [
      `Start with a surprising angle from: ${preview}`,
      `Open with a question the content answers`,
    ],
    viralAngles: [
      `Frame as a contrarian take on ${preview}`,
      `Turn into a step-by-step guide format`,
    ],
  }
}

export function parseAnalysis(raw: string): ContentAnalysis {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
    const parsed = JSON.parse(cleaned)
    return {
      mainTopic: typeof parsed.mainTopic === "string" ? parsed.mainTopic : "",
      subtopics: Array.isArray(parsed.subtopics) ? parsed.subtopics : [],
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      actionableAdvice: Array.isArray(parsed.actionableAdvice) ? parsed.actionableAdvice : [],
      statistics: Array.isArray(parsed.statistics) ? parsed.statistics : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
      commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes : [],
      lessonsLearned: Array.isArray(parsed.lessonsLearned) ? parsed.lessonsLearned : [],
      frequentlyAskedQuestions: Array.isArray(parsed.frequentlyAskedQuestions)
        ? parsed.frequentlyAskedQuestions
        : [],
      contentHooks: Array.isArray(parsed.contentHooks) ? parsed.contentHooks : [],
      viralAngles: Array.isArray(parsed.viralAngles) ? parsed.viralAngles : [],
    }
  } catch {
    return generateMockAnalysis("")
  }
}

export async function analyzeContent(
  ai: AIProvider,
  content: string
): Promise<ContentAnalysis> {
  const raw = await ai.generate({
    system: ANALYSIS_SYSTEM_PROMPT,
    user: getAnalysisUserPrompt(content),
    temperature: 0.3,
  })

  return parseAnalysis(raw)
}
