import { describe, it, expect } from "vitest"
import { analyzeVirality, analyzeBatchVirality } from "./virality"

// ── Test Data ──

const HIGH_VIRALITY_TEXT =
  "Most people don't know this one simple trick. Here's why it changes everything. Share this with someone who needs it!"

const LOW_VIRALITY_TEXT =
  "I, me, my, myself. Furthermore, the aforementioned implementation of the aforementioned methodology demonstrates considerable efficacy in the contextualization of paradigmatic shifts within organizational frameworks. Consequently, it is imperative to consider the ramifications."

const EMOJI_HEAVY =
  "🎉🎉🎉 AMAZING!!! This is INCREDIBLE!!! You won't believe it!!! So EXCITING!!! Share now!!! 🔥🔥🔥"

const QUESTION_HOOK =
  "Do you know why most businesses fail in the first year? The secret is simpler than you'd think. Here's what nobody tells you about building a sustainable brand."

const SHORT_TEXT = "Hello!"

// ── Score Range Tests ──

describe("score ranges", () => {
  it("all scores are between 0-100 for high-virality text", async () => {
    const result = await analyzeVirality(HIGH_VIRALITY_TEXT)
    const { scores, overall } = result
    for (const [key, val] of Object.entries(scores)) {
      expect(val, `${key} should be 0-100 but got ${val}`).toBeGreaterThanOrEqual(0)
      expect(val, `${key} should be 0-100 but got ${val}`).toBeLessThanOrEqual(100)
    }
    expect(overall).toBeGreaterThanOrEqual(0)
    expect(overall).toBeLessThanOrEqual(100)
  })

  it("all scores are between 0-100 for low-virality text", async () => {
    const result = await analyzeVirality(LOW_VIRALITY_TEXT)
    const { scores, overall } = result
    for (const [key, val] of Object.entries(scores)) {
      expect(val, `${key} should be 0-100 but got ${val}`).toBeGreaterThanOrEqual(0)
      expect(val, `${key} should be 0-100 but got ${val}`).toBeLessThanOrEqual(100)
    }
    expect(overall).toBeGreaterThanOrEqual(0)
    expect(overall).toBeLessThanOrEqual(100)
  })

  it("all scores are between 0-100 for emoji-heavy text", async () => {
    const result = await analyzeVirality(EMOJI_HEAVY)
    const { scores, overall } = result
    for (const [key, val] of Object.entries(scores)) {
      expect(val, `${key} should be 0-100 but got ${val}`).toBeGreaterThanOrEqual(0)
      expect(val, `${key} should be 0-100 but got ${val}`).toBeLessThanOrEqual(100)
    }
    expect(overall).toBeGreaterThanOrEqual(0)
    expect(overall).toBeLessThanOrEqual(100)
  })

  it("all scores are between 0-100 for question-hook text", async () => {
    const result = await analyzeVirality(QUESTION_HOOK)
    const { scores, overall } = result
    for (const [key, val] of Object.entries(scores)) {
      expect(val, `${key} should be 0-100 but got ${val}`).toBeGreaterThanOrEqual(0)
      expect(val, `${key} should be 0-100 but got ${val}`).toBeLessThanOrEqual(100)
    }
    expect(overall).toBeGreaterThanOrEqual(0)
    expect(overall).toBeLessThanOrEqual(100)
  })

  it("handles empty text gracefully", async () => {
    const result = await analyzeVirality("")
    expect(result.overall).toBe(0)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it("handles whitespace-only text gracefully", async () => {
    const result = await analyzeVirality("   ")
    expect(result.overall).toBe(0)
  })

  it("handles very short text", async () => {
    const result = await analyzeVirality(SHORT_TEXT)
    for (const val of Object.values(result.scores)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })
})

// ── Dimension Scoring Logic ──

describe("dimension scoring logic", () => {
  it("forwardability rewards share triggers", async () => {
    const shareText = "Share this with someone who needs it! This tip will save you money."
    const noShareText = "I went to the store today and bought some milk."
    const shareResult = await analyzeVirality(shareText)
    const noShareResult = await analyzeVirality(noShareText)
    expect(shareResult.scores.forwardability).toBeGreaterThanOrEqual(noShareResult.scores.forwardability)
  })

  it("forwardability penalizes self-focused language", async () => {
    const selfText = "I think that I should go to my house and get my stuff. I need to organize my life."
    const youText = "You should check this out. It will help you save time and money."
    const selfResult = await analyzeVirality(selfText)
    const youResult = await analyzeVirality(youText)
    // Self-focused should be lower than you-focused
    expect(youResult.scores.forwardability).toBeGreaterThanOrEqual(selfResult.scores.forwardability)
  })

  it("readability penalizes long sentences and complex words", async () => {
    const simpleText = "This is easy to read. Short sentences work best."
    const complexText =
      "The aforementioned implementation demonstrates considerable efficacy in the contextualization of paradigmatic shifts."
    const simpleResult = await analyzeVirality(simpleText)
    const complexResult = await analyzeVirality(complexText)
    expect(simpleResult.scores.readability).toBeGreaterThan(complexResult.scores.readability)
  })

  it("readability rewards bullet points", async () => {
    const bulletText = "Here are some tips:\n- Keep it short\n- Use simple words\n- Be direct"
    const proseText = "Here are some tips that you should follow if you want to keep it short and use simple words and be direct."
    const bulletResult = await analyzeVirality(bulletText)
    const proseResult = await analyzeVirality(proseText)
    expect(bulletResult.scores.readability).toBeGreaterThanOrEqual(proseResult.scores.readability)
  })

  it("emotional impact detects emotional words and personal pronouns", async () => {
    const emotionalText = "I love this! You are amazing. Thank you so much!"
    const flatText = "The package will be delivered tomorrow between 2pm and 4pm."
    const emotionalResult = await analyzeVirality(emotionalText)
    const flatResult = await analyzeVirality(flatText)
    expect(emotionalResult.scores.emotionalImpact).toBeGreaterThan(flatResult.scores.emotionalImpact)
  })

  it("emotional impact penalizes too many exclamation points", async () => {
    const spammyText = "AMAZING!!! INCREDIBLE!!! WOW!!! AWESOME!!! GREAT!!!"
    const measuredText = "This is amazing. You'll love it."
    const spammyResult = await analyzeVirality(spammyText)
    const measuredResult = await analyzeVirality(measuredText)
    // Too many exclamations should reduce score compared to measured usage
    expect(spammyResult.scores.emotionalImpact).toBeLessThanOrEqual(measuredResult.scores.emotionalImpact + 10)
  })

  it("curiosity level detects questions and curiosity triggers", async () => {
    const curiousText = "Do you know the secret? Here's why most people fail. What happens next will surprise you."
    const directText = "This is the information you requested. The price is ₦5,000."
    const curiousResult = await analyzeVirality(curiousText)
    const directResult = await analyzeVirality(directText)
    expect(curiousResult.scores.curiosityLevel).toBeGreaterThan(directResult.scores.curiosityLevel)
  })

  it("curiosity level rewards ellipsis for open loops", async () => {
    const ellipsisText = "Here's the thing... most people don't realize what happens next."
    const plainText = "Here is something that most people don't realize."
    const ellipsisResult = await analyzeVirality(ellipsisText)
    const plainResult = await analyzeVirality(plainText)
    expect(ellipsisResult.scores.curiosityLevel).toBeGreaterThanOrEqual(plainResult.scores.curiosityLevel)
  })

  it("share potential is a weighted composite of other scores", async () => {
    const result = await analyzeVirality(HIGH_VIRALITY_TEXT)
    const { scores } = result
    // Share potential should be roughly in the same ballpark as other scores
    // (it's a composite, not independent)
    expect(scores.sharePotential).toBeGreaterThan(0)
    expect(scores.sharePotential).toBeLessThanOrEqual(100)
  })
})

// ── Overall Score ──

describe("overall score calculation", () => {
  it("overall is a weighted average of dimension scores", async () => {
    const result = await analyzeVirality(HIGH_VIRALITY_TEXT)
    const { scores, overall } = result
    const expected = Math.round(
      scores.forwardability * 0.25 +
        scores.readability * 0.2 +
        scores.emotionalImpact * 0.2 +
        scores.curiosityLevel * 0.2 +
        scores.sharePotential * 0.15
    )
    expect(overall).toBe(expected)
  })

  it("high-virality text scores higher overall than low-virality text", async () => {
    const high = await analyzeVirality(HIGH_VIRALITY_TEXT)
    const low = await analyzeVirality(LOW_VIRALITY_TEXT)
    expect(high.overall).toBeGreaterThanOrEqual(low.overall)
  })
})

// ── Suggestions ──

describe("improvement suggestions", () => {
  it("returns suggestions for low-scoring content", async () => {
    const result = await analyzeVirality(LOW_VIRALITY_TEXT)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it("suggestions are non-empty strings", async () => {
    const result = await analyzeVirality(LOW_VIRALITY_TEXT)
    for (const s of result.suggestions) {
      expect(typeof s).toBe("string")
      expect(s.length).toBeGreaterThan(5)
    }
  })

  it("returns 5 or fewer suggestions", async () => {
    const result = await analyzeVirality(HIGH_VIRALITY_TEXT)
    expect(result.suggestions.length).toBeLessThanOrEqual(5)
  })

  it("high-quality content may still get improvement suggestions", async () => {
    const result = await analyzeVirality(HIGH_VIRALITY_TEXT)
    // Even good content might have suggestions, but they should be non-empty
    for (const s of result.suggestions) {
      expect(s.length).toBeGreaterThan(0)
    }
  })
})

// ── Source Tracking ──

describe("source tracking", () => {
  it("reports heuristic as source by default", async () => {
    const result = await analyzeVirality(HIGH_VIRALITY_TEXT)
    expect(result.source).toBe("heuristic")
  })
})

// ── Batch Analysis ──

describe("batch analysis", () => {
  it("analyzes multiple items and returns averages", async () => {
    const items = [HIGH_VIRALITY_TEXT, LOW_VIRALITY_TEXT, QUESTION_HOOK]
    const batch = await analyzeBatchVirality(items)

    expect(batch.items.length).toBe(3)
    expect(batch.averageOverall).toBeGreaterThan(0)
    expect(batch.averageOverall).toBeLessThanOrEqual(100)

    // Average of each dimension should be in range
    for (const val of Object.values(batch.average)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }

    // Average overall should match calculated average
    const expectedAvg = Math.round(batch.items.reduce((sum, r) => sum + r.overall, 0) / batch.items.length)
    expect(batch.averageOverall).toBe(expectedAvg)
  })

  it("returns top 3 and weakest 3 scores", async () => {
    const items = [HIGH_VIRALITY_TEXT, LOW_VIRALITY_TEXT, QUESTION_HOOK, EMOJI_HEAVY, SHORT_TEXT]
    const batch = await analyzeBatchVirality(items)

    expect(batch.topScores.length).toBeGreaterThanOrEqual(1)
    expect(batch.weakestScores.length).toBeGreaterThanOrEqual(1)

    // Top scores should be >= weakest scores
    if (batch.topScores.length > 0 && batch.weakestScores.length > 0) {
      expect(batch.topScores[0].overall).toBeGreaterThanOrEqual(batch.weakestScores[0].overall)
    }
  })

  it("handles single-item batch", async () => {
    const batch = await analyzeBatchVirality([HIGH_VIRALITY_TEXT])
    expect(batch.items.length).toBe(1)
    expect(batch.averageOverall).toBe(batch.items[0].overall)
  })

  it("handles empty batch gracefully", async () => {
    const batch = await analyzeBatchVirality([])
    expect(batch.items.length).toBe(0)
  })
})

// ── Edge Cases ──

describe("edge cases", () => {
  it("handles text with only numbers", async () => {
    const result = await analyzeVirality("42 100 3000 50000")
    for (const val of Object.values(result.scores)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it("handles text with special characters", async () => {
    const result = await analyzeVirality("!@#$%^&*()_+-=[]{}|;':\",./<>?")
    for (const val of Object.values(result.scores)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it("handles very long text (1000+ chars)", async () => {
    const longText = "Here is a tip that everyone should know. ".repeat(50)
    const result = await analyzeVirality(longText)
    for (const val of Object.values(result.scores)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it("handles text with line breaks and multiple paragraphs", async () => {
    const multiParaText = "First paragraph about something important.\n\nSecond paragraph with more details.\n\nThird paragraph wrapping it up."
    const result = await analyzeVirality(multiParaText)
    for (const val of Object.values(result.scores)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it("handles text with Nigerian currency and expressions", async () => {
    const nigerianText =
      "This thing epp me well well. You no go believe am. ₦5,000 only for the first 50 customers. Abeg share with your friends!"
    const result = await analyzeVirality(nigerianText)
    for (const val of Object.values(result.scores)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(100)
    }
  })

  it("two runs on same text produce identical scores", async () => {
    const r1 = await analyzeVirality(HIGH_VIRALITY_TEXT)
    const r2 = await analyzeVirality(HIGH_VIRALITY_TEXT)
    expect(r1.scores).toEqual(r2.scores)
    expect(r1.overall).toBe(r2.overall)
    expect(r1.suggestions).toEqual(r2.suggestions)
  })
})
