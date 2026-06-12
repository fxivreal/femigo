import type { ContentAnalysis } from "./analysis-types"

export interface CoverageResult {
  totalInsights: number
  usedInsights: number
  coverageScore: number
  perPlatform: Record<string, { used: number; score: number }>
}

function flattenInsights(analysis: ContentAnalysis): string[] {
  const items: string[] = []

  for (const t of analysis.keyTakeaways) items.push(t)
  for (const a of analysis.actionableAdvice) items.push(a)
  for (const s of analysis.statistics) items.push(`${s.value} ${s.context}`)
  for (const q of analysis.quotes) items.push(q.text)
  for (const e of analysis.examples) items.push(e)
  for (const m of analysis.commonMistakes) items.push(m)
  for (const l of analysis.lessonsLearned) items.push(l)
  for (const h of analysis.contentHooks) items.push(h)
  for (const v of analysis.viralAngles) items.push(v)

  return items
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").trim()
}

function isInsightUsed(insight: string, content: string): boolean {
  if (!insight.trim()) return false
  const norm = normalize(insight)
  const short = norm.length > 30 ? norm.slice(0, 30) : norm
  return normalize(content).includes(short)
}

function countUsedInsights(insights: string[], content: string): number {
  return insights.filter((i) => isInsightUsed(i, content)).length
}

export function calculateCoverage(
  analysis: ContentAnalysis,
  perPlatformContent: Record<string, string>
): CoverageResult {
  const insights = flattenInsights(analysis)
  const totalInsights = insights.length

  if (totalInsights === 0) {
    return { totalInsights: 0, usedInsights: 0, coverageScore: 100, perPlatform: {} }
  }

  let allUsed = 0
  const perPlatform: Record<string, { used: number; score: number }> = {}

  for (const [platform, content] of Object.entries(perPlatformContent)) {
    if (!content) {
      perPlatform[platform] = { used: 0, score: 0 }
      continue
    }
    const used = countUsedInsights(insights, content)
    perPlatform[platform] = { used, score: Math.round((used / totalInsights) * 100) }
  }

  // Aggregate: an insight is "used" if it appears in any platform's content
  const platformContents = Object.values(perPlatformContent).filter(Boolean)
  if (platformContents.length > 0) {
    const combined = platformContents.join(" ")
    allUsed = countUsedInsights(insights, combined)
  }

  const coverageScore = Math.round((allUsed / totalInsights) * 100)

  return { totalInsights, usedInsights: allUsed, coverageScore, perPlatform }
}
