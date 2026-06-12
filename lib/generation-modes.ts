import type { ContentAnalysis } from "./analysis-types"

export interface ModeAsset {
  platform: string
  count: number
}

export interface GenerationMode {
  id: string
  label: string
  description: string
  totalAssets: number
  platforms: string[]
  assets: ModeAsset[]
}

export const generationModes: Record<string, GenerationMode> = {
  quick: {
    id: "quick",
    label: "Quick",
    description: "Essential posts to get started fast — 3 assets",
    totalAssets: 3,
    platforms: ["linkedin", "facebook", "x"],
    assets: [
      { platform: "linkedin", count: 1 },
      { platform: "facebook", count: 1 },
      { platform: "x", count: 1 },
    ],
  },
  standard: {
    id: "standard",
    label: "Standard",
    description: "Balanced coverage across key platforms — 10 assets",
    totalAssets: 10,
    platforms: ["linkedin", "facebook", "x", "instagram", "tiktok"],
    assets: [
      { platform: "linkedin", count: 3 },
      { platform: "facebook", count: 2 },
      { platform: "x", count: 2 },
      { platform: "instagram", count: 1 },
      { platform: "tiktok", count: 2 },
    ],
  },
  comprehensive: {
    id: "comprehensive",
    label: "Comprehensive",
    description: "Maximum reach across all platforms — 35 assets",
    totalAssets: 35,
    platforms: ["linkedin", "facebook", "x", "instagram", "tiktok", "youtube_shorts"],
    assets: [
      { platform: "linkedin", count: 10 },
      { platform: "facebook", count: 5 },
      { platform: "x", count: 5 },
      { platform: "instagram", count: 5 },
      { platform: "tiktok", count: 5 },
      { platform: "youtube_shorts", count: 5 },
    ],
  },
}

function flattenAllInsights(analysis: ContentAnalysis): string[] {
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

export interface FocusedAsset {
  platform: string
  assetIndex: number
  focus: string[]
}

export function distributeInsights(
  analysis: ContentAnalysis,
  totalAssets: number
): string[][] {
  const insights = flattenAllInsights(analysis)
  if (insights.length === 0) {
    return Array.from({ length: totalAssets }, () => [])
  }

  const perAsset = Math.max(Math.floor(insights.length / totalAssets), 1)
  const result: string[][] = []
  let idx = 0

  for (let i = 0; i < totalAssets; i++) {
    const remaining = totalAssets - i
    const remainingInsights = insights.length - idx
    const count = Math.min(perAsset, remainingInsights - (remaining - 1) * perAsset)
    const slice = insights.slice(idx, idx + Math.max(count, 0))
    result.push(slice)
    idx += count
  }

  return result
}

export function expandMode(
  mode: GenerationMode,
  analysis: ContentAnalysis
): FocusedAsset[] {
  const insightAssignments = distributeInsights(analysis, mode.totalAssets)
  const result: FocusedAsset[] = []
  let insightIdx = 0

  for (const asset of mode.assets) {
    for (let i = 0; i < asset.count; i++) {
      result.push({
        platform: asset.platform,
        assetIndex: i,
        focus: insightAssignments[insightIdx] || [],
      })
      insightIdx++
    }
  }

  return result
}
