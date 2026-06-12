import type { AIProvider } from "./ai"
import type { ContentAnalysis, InsightCluster } from "./analysis-types"
import { ANALYSIS_SYSTEM_PROMPT, getAnalysisUserPrompt } from "./prompts/analysis"
import { CLUSTER_SYSTEM_PROMPT, getClusterUserPrompt, parseClusters } from "./prompts/clustering"

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

export function flattenInsightsForClustering(analysis: ContentAnalysis): string[] {
  const items: string[] = []
  for (const t of analysis.keyTakeaways) items.push(t)
  for (const a of analysis.actionableAdvice) items.push(a)
  for (const s of analysis.statistics) items.push(`${s.value} — ${s.context}`)
  for (const q of analysis.quotes) items.push(q.text)
  for (const e of analysis.examples) items.push(e)
  for (const m of analysis.commonMistakes) items.push(m)
  for (const l of analysis.lessonsLearned) items.push(l)
  for (const h of analysis.contentHooks) items.push(h)
  for (const v of analysis.viralAngles) items.push(v)
  return items
}

export function generateMockClusters(analysis: ContentAnalysis): InsightCluster[] {
  const insights = flattenInsightsForClustering(analysis)
  if (insights.length === 0) {
    return [{ id: "cluster-0", title: "Main Topic", description: "Key insights from the content", insightIndices: [] }]
  }

  const mid = Math.ceil(insights.length / 2)
  return [
    { id: "cluster-0", title: "Key Takeaways", description: "Main insights and lessons from the content", insightIndices: insights.map((_, i) => i).filter((_, i) => i < mid) },
    { id: "cluster-1", title: "Supporting Details", description: "Examples, statistics, and supporting evidence", insightIndices: insights.map((_, i) => i).filter((_, i) => i >= mid) },
  ]
}

export async function clusterInsights(
  ai: AIProvider,
  analysis: ContentAnalysis
): Promise<InsightCluster[]> {
  const insights = flattenInsightsForClustering(analysis)
  if (insights.length === 0) return generateMockClusters(analysis)

  const raw = await ai.generate({
    system: CLUSTER_SYSTEM_PROMPT,
    user: getClusterUserPrompt(insights),
    temperature: 0.3,
  })

  const parsed = parseClusters(raw, insights.length)
  return parsed.length > 0 ? parsed : generateMockClusters(analysis)
}
