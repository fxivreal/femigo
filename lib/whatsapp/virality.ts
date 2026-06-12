import type { PlatformPrompt } from "../prompts/shared"
import { viralityAnalysisPrompt } from "../prompts/whatsapp/virality"
import { getAIProvider } from "../ai"

// ── Types ──

export interface ViralityScores {
  forwardability: number
  readability: number
  emotionalImpact: number
  curiosityLevel: number
  sharePotential: number
}

export interface ViralityResult {
  scores: ViralityScores
  overall: number
  suggestions: string[]
  source: "heuristic" | "ai"
}

// ── Heuristic Engine ──

/** Tokenize into words */
function words(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0)
}

/** Count sentences */
function sentences(text: string): number {
  return Math.max(text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length, 1)
}

/** Count chars excluding spaces */
function charsNoSpace(text: string): number {
  return text.replace(/\s/g, "").length
}

/** Forwardability heuristic */
function heuristicForwardability(text: string): number {
  const w = words(text)
  if (w.length === 0) return 50
  const lower = text.toLowerCase()
  let score = 60

  // Standalone value signals
  const shareTriggers = [
    "share", "forward", "send to", "tell", "pass it on",
    "someone needs", "everyone should", "don't keep",
  ]
  for (const t of shareTriggers) {
    if (lower.includes(t)) score += 8
  }

  // Universal appeal — avoids very specific references
  const specificWords = ["i ", "my ", "me ", "mine "]
  const specificCount = specificWords.filter((s) => lower.includes(s)).length
  if (specificCount === 0) score += 10
  if (specificCount > 2) score -= 10

  // Has a clear takeaway/value
  const valueSignals = [
    "tip", "trick", "how to", "guide", "learn", "try this",
    "free", "save", "get", "here's", "check this",
  ]
  for (const s of valueSignals) {
    if (lower.includes(s)) score += 5
  }

  // Length penalty — too long = less forwardable
  const charLen = text.length
  if (charLen > 200) score -= 10
  if (charLen > 300) score -= 15
  if (charLen < 30) score -= 5 // too short, lacks substance

  // Contains a call to action
  if (lower.includes("?") || lower.includes("share") || lower.includes("try") || lower.includes("reply")) {
    score += 5
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Readability heuristic (WhatsApp-optimized) */
function heuristicReadability(text: string): number {
  const w = words(text)
  if (w.length === 0) return 50
  const s = sentences(text)
  const avgWPS = w.length / s
  const avgCPW = charsNoSpace(text) / w.length

  // Ideal for WhatsApp: 8-15 words per sentence, 3-5 chars per word
  let score = 100
  score -= Math.abs(avgWPS - 10) * 4
  score -= Math.abs(avgCPW - 4.2) * 12

  // Penalize very long words
  const longWords = w.filter((word) => word.length > 8).length
  score -= longWords * 5

  // Penalize all-caps segments (feels like shouting)
  const upperRun = (text.match(/[A-Z]{3,}/g) || []).length
  score -= upperRun * 3

  // Bonus for short, scannable messages
  if (text.length >= 40 && text.length <= 160) score += 5
  if (text.length <= 200) score += 3

  // Bonus for bullet points or numbered lists
  if (text.includes("\n- ") || text.includes("\n• ") || /\d+\.\s/.test(text)) score += 5

  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Emotional Impact heuristic */
function heuristicEmotionalImpact(text: string): number {
  const lower = text.toLowerCase()
  let score = 40

  // Emotional trigger words
  const emotionalWords = [
    "love", "amazing", "incredible", "wonderful", "beautiful", "exciting",
    "happy", "glad", "thank", "sorry", "miss", "please",
    "urgent", "important", "exclusive", "limited", "special",
    "wow", "oh", "ah", "hey", "awesome", "fantastic",
    "struggle", "hard", "difficult", "easy", "simple",
    "trust", "believe", "hope", "wish", "care",
  ]
  for (const word of emotionalWords) {
    const regex = new RegExp(`\\b${word}\\b`, "i")
    if (regex.test(lower)) score += 3
  }

  // Personal pronouns
  const personal = ["you", "your", "we", "our", "i", "my"]
  for (const p of personal) {
    const regex = new RegExp(`\\b${p}\\b`, "i")
    if (regex.test(lower)) score += 4
  }

  // Exclamation points (sparingly — 1 is good, 3+ is spammy)
  const exclaims = (text.match(/!/g) || []).length
  if (exclaims === 1) score += 8
  if (exclaims === 2) score += 5
  if (exclaims >= 3) score -= 5

  // Emojis
  const emojiCount = (text.match(/[\p{Emoji}]/gu) || []).length
  score += emojiCount * 3
  if (emojiCount > 3) score -= 3 // too many emojis

  // Questions (show engagement)
  const questions = (text.match(/\?/g) || []).length
  score += questions * 3

  // Capitalized words (emphasis)
  const capsWords = (text.match(/\b[A-Z]{4,}\b/g) || []).length
  score += capsWords * 2

  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Curiosity Level heuristic */
function heuristicCuriosity(text: string): number {
  const lower = text.toLowerCase()
  let score = 40

  // Curiosity triggers
  const triggers = [
    "secret", "hidden", "nobody tells", "don't know", "wish i knew",
    "this one", "one thing", "the truth", "real reason",
    "what happens", "here's why", "here's how", "this is why",
    "wait", "hold on", "before you", "the problem",
    "most people", "few people", "never knew", "surprising",
    "revealed", "exposed", "inside", "what if",
  ]
  for (const t of triggers) {
    if (lower.includes(t)) score += 6
  }

  // Questions create curiosity gaps
  const questions = (text.match(/\?/g) || []).length
  score += questions * 8

  // Starting with a question is powerful
  if (text.trimStart().startsWith("?")) score += 5

  // Ellipsis or incomplete thought
  if (text.includes("...") || text.includes("…")) score += 10

  // Promise of value
  const valuePromises = ["here's", "check this", "you'll", "discover", "learn", "find out"]
  for (const v of valuePromises) {
    if (lower.includes(v)) score += 4
  }

  // Specificity creates curiosity
  const numbers = (text.match(/\b\d+\b/g) || []).length
  if (numbers >= 1) score += 3
  if (numbers >= 3) score += 3

  // Punctuation that builds suspense
  if (text.includes(":")) score += 3
  if (text.includes('"') || text.includes("「")) score += 2

  // Too long = curiosity killer
  if (text.length > 200) score -= 5
  if (text.length > 300) score -= 10

  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Share Potential heuristic — composite + specific triggers */
function heuristicSharePotential(
  text: string,
  fwd: number,
  read: number,
  emo: number,
  cur: number
): number {
  const lower = text.toLowerCase()
  const w = words(text)
  let score = 45

  // Weighted composite of other scores
  score += fwd * 0.25
  score += read * 0.15
  score += emo * 0.2
  score += cur * 0.2

  // Specific share triggers
  const shareWords = [
    "share", "forward", "send", "pass", "tell", "spread",
    "help", "useful", "valuable", "important", "must read",
  ]
  for (const sw of shareWords) {
    if (lower.includes(sw)) score += 4
  }

  // Universal applicability — no niche jargon
  const jargon = w.filter((word) => word.length > 10).length
  score -= jargon * 3

  // Emotional + Curiosity combo is powerful for sharing
  if (emo > 70 && cur > 70) score += 8

  // Length sweet spot for sharing
  if (text.length >= 50 && text.length <= 200) score += 5

  // Has a clear takeaway
  if (lower.includes("here") || lower.includes("this") || lower.includes("tip") || /\d+\./.test(text)) {
    score += 5
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ── Suggestion Engine ──

function generateSuggestions(
  scores: ViralityScores,
  text: string
): string[] {
  const lower = text.toLowerCase()
  const w = words(text)
  const suggestions: string[] = []

  // Readability
  const avgWPS = w.length / sentences(text)
  if (scores.readability < 60) {
    if (avgWPS > 15) {
      suggestions.push("Break long sentences into shorter ones. Aim for 8-12 words per sentence on WhatsApp.")
    } else {
      suggestions.push("Simplify word choice and avoid jargon. Short, common words are easier to scan on mobile.")
    }
    suggestions.push("Keep messages between 50-160 characters for best mobile readability.")
  } else if (scores.readability < 80) {
    suggestions.push("Consider adding line breaks or bullet points for easier scanning.")
  }

  // Forwardability
  if (scores.forwardability < 60) {
    if (!lower.includes("share") && !lower.includes("forward")) {
      suggestions.push("Add a light forward prompt like 'Someone might need this' or 'Share with a friend.'")
    }
    if (text.length > 200) {
      suggestions.push("Shorten the message — shorter content is forwarded 2x more on WhatsApp.")
    }
    if (w.filter((word) => ["i", "my", "me"].includes(word)).length > 2) {
      suggestions.push("Frame the message around 'you' (the reader) rather than 'I' or 'we' for broader appeal.")
    }
  } else if (scores.forwardability < 80) {
    if (!lower.includes("?") && !text.match(/!|\.\.\.|…/)) {
      suggestions.push("Add a question or call-to-action to encourage forwarding.")
    }
  }

  // Emotional Impact
  if (scores.emotionalImpact < 60) {
    if (!lower.includes("!") && !lower.includes("?")) {
      suggestions.push("Add a single exclamation or question to inject emotion without overdoing it.")
    }
    const hasPersonal = /\b(you|your|we|our)\b/i.test(lower)
    if (!hasPersonal) {
      suggestions.push("Use personal pronouns ('you', 'your') to create a direct connection with the reader.")
    }
    const hasEmoji = /[\p{Emoji}]/gu.test(text)
    if (!hasEmoji) {
      suggestions.push("A single well-placed emoji can boost emotional impact significantly on WhatsApp.")
    }
  } else if (scores.emotionalImpact < 80) {
    suggestions.push("Try starting with an emotional hook word like 'Love', 'Amazing', or 'Finally.'")
  }

  // Curiosity Level
  if (scores.curiosityLevel < 60) {
    if (!lower.includes("?") || !lower.includes("why") && !lower.includes("how")) {
      suggestions.push("Open with a question or curiosity gap: 'Here's why...' or 'Most people don't know this.'")
    }
    suggestions.push("Use specific numbers or surprising facts to trigger curiosity.")
  } else if (scores.curiosityLevel < 80) {
    suggestions.push("Add a 'what happens next' element or use '...' to create an open loop.")
  }

  // Share Potential
  if (scores.sharePotential < 60) {
    suggestions.push("Make the content universally applicable — remove overly specific references so anyone can share it.")
  } else if (scores.sharePotential < 80 && scores.forwardability < 80) {
    suggestions.push("Combine a curiosity hook with a clear takeaway for the highest share potential.")
  }

  // De-duplicate and limit
  return [...new Set(suggestions)].slice(0, 5)
}

// ── Public API ──

/**
 * Score a piece of WhatsApp content for virality potential.
 * Uses heuristic (fast, free) by default, or AI-enhanced if `useAI = true`.
 */
export async function analyzeVirality(
  text: string,
  useAI = false
): Promise<ViralityResult> {
  if (!text.trim()) {
    return {
      scores: { forwardability: 0, readability: 0, emotionalImpact: 0, curiosityLevel: 0, sharePotential: 0 },
      overall: 0,
      suggestions: ["No content to analyze."],
      source: "heuristic",
    }
  }

  if (useAI) {
    try {
      return await aiViralityScore(text)
    } catch {
      // Fall through to heuristic on AI failure
    }
  }

  const scores: ViralityScores = {
    forwardability: heuristicForwardability(text),
    readability: heuristicReadability(text),
    emotionalImpact: heuristicEmotionalImpact(text),
    curiosityLevel: heuristicCuriosity(text),
    sharePotential: heuristicSharePotential(
      text,
      heuristicForwardability(text),
      heuristicReadability(text),
      heuristicEmotionalImpact(text),
      heuristicCuriosity(text)
    ),
  }

  const overall = Math.round(
    scores.forwardability * 0.25 +
    scores.readability * 0.20 +
    scores.emotionalImpact * 0.20 +
    scores.curiosityLevel * 0.20 +
    scores.sharePotential * 0.15
  )

  const suggestions = generateSuggestions(scores, text)

  return { scores, overall, suggestions, source: "heuristic" }
}

// ── AI-Enhanced Scoring ──

async function aiViralityScore(text: string): Promise<ViralityResult> {
  const provider = getAIProvider()
  const result = await provider.generate({
    system: viralityAnalysisPrompt.system,
    user: viralityAnalysisPrompt.user(text),
  })

  // Parse JSON from the response
  const jsonMatch = result.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("No JSON found in AI response")

  const parsed = JSON.parse(jsonMatch[0])

  const scores: ViralityScores = parsed.scores
  const overall = parsed.overall
  const suggestions: string[] = parsed.suggestions || []

  return { scores, overall, suggestions, source: "ai" }
}

/**
 * Score multiple content items and return average scores.
 * Useful for campaign-level analysis.
 */
export async function analyzeBatchVirality(
  items: string[],
  useAI = false
): Promise<{
  items: ViralityResult[]
  average: ViralityScores
  averageOverall: number
  topScores: ViralityResult[]
  weakestScores: ViralityResult[]
}> {
  const results = await Promise.all(
    items.map((text) => analyzeVirality(text, useAI))
  )

  const avg = (key: keyof ViralityScores): number =>
    Math.round(results.reduce((sum, r) => sum + r.scores[key], 0) / results.length)

  const average: ViralityScores = {
    forwardability: avg("forwardability"),
    readability: avg("readability"),
    emotionalImpact: avg("emotionalImpact"),
    curiosityLevel: avg("curiosityLevel"),
    sharePotential: avg("sharePotential"),
  }

  const averageOverall = Math.round(
    results.reduce((sum, r) => sum + r.overall, 0) / results.length
  )

  const sorted = [...results].sort((a, b) => b.overall - a.overall)
  const topScores = sorted.slice(0, 3)
  const weakestScores = sorted.slice(-3).reverse()

  return { items: results, average, averageOverall, topScores, weakestScores }
}
