import type { AIProvider } from "./ai"
import type { ContentAnalysis, InsightCluster } from "./analysis-types"

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

const CLUSTER_SYSTEM_PROMPT = `You are an insight clustering engine. Group the following numbered insights into 3-6 logical clusters.

Each cluster should represent a coherent theme or topic. Every insight must appear in exactly one cluster.

Return ONLY a valid JSON array — no markdown, no code fences, no commentary:

[
  {
    "title": "Short cluster title (2-4 words)",
    "description": "One-sentence description of what this cluster covers",
    "insightIndices": [0, 3, 5]
  }
]

Rules:
- 3-6 clusters depending on insight variety
- Each insight assigned to exactly one cluster
- Clusters must be thematically coherent
- insightIndices are 0-based positions from the numbered list below
- Return ONLY the JSON array`

export function getClusterUserPrompt(insights: string[]): string {
  const numbered = insights.map((i, idx) => `${idx}. ${i}`).join("\n")
  return `Group these insights into logical clusters:\n\n${numbered}`
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

function sanitizeId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function parseClusters(raw: string, totalInsights: number): InsightCluster[] {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []

    const validClusters: InsightCluster[] = []
    const assigned = new Set<number>()

    for (let i = 0; i < parsed.length; i++) {
      const c = parsed[i]
      const title = typeof c.title === "string" ? c.title : `Cluster ${i + 1}`
      const description = typeof c.description === "string" ? c.description : ""
      const indices = Array.isArray(c.insightIndices)
        ? c.insightIndices.filter((idx: unknown) => typeof idx === "number" && idx >= 0 && idx < totalInsights && !assigned.has(idx))
        : []
      indices.forEach((idx: number) => assigned.add(idx))
      validClusters.push({
        id: sanitizeId(title) || `cluster-${i}`,
        title,
        description,
        insightIndices: indices,
      })
    }

    // Assign any unassigned insights to the last cluster
    const allAssigned = new Set(assigned)
    if (allAssigned.size < totalInsights && validClusters.length > 0) {
      const unassigned: number[] = []
      for (let i = 0; i < totalInsights; i++) {
        if (!allAssigned.has(i)) unassigned.push(i)
      }
      validClusters[validClusters.length - 1].insightIndices.push(...unassigned)
    }

    return validClusters
  } catch {
    return []
  }
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
