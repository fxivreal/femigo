import type { InsightCluster } from "../analysis-types"

export const CLUSTER_SYSTEM_PROMPT = `You are an insight clustering engine. Group the following numbered insights into 3-6 logical clusters.

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
