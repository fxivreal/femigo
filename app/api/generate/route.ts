import { NextResponse } from "next/server"
import { platformPrompts, platformStyles, getGoalInstruction, formatBrandVoice, formatAnalysisContext } from "@/lib/prompts"
import { getAIProvider, AIError } from "@/lib/ai"
import { analyzeContent, generateMockAnalysis } from "@/lib/analyze"
import { calculateCoverage } from "@/lib/coverage"
import type { ContentAnalysis } from "@/lib/analysis-types"

export const runtime = "nodejs"
export const maxDuration = 60

const PLACEHOLDER_KEY = "sk-your-key-here"

function truncate(content: string, max: number) {
  return content.length > max ? content.slice(0, max).trimEnd() + "..." : content
}

function getStyleInstruction(platform: string, style?: string): string {
  if (!style) return ""
  const options = platformStyles[platform]
  if (!options) return ""
  const match = options.find((s) => s.id === style)
  return match ? match.instruction : ""
}

function generateMockContent(platform: string, content: string) {
  const preview = truncate(content, 120)

  switch (platform) {
    case "linkedin":
      return (
        `**How ${preview.toLowerCase()} is Changing the Game**\n\n` +
        `I've been thinking a lot about this topic lately, and I wanted to share some insights.\n\n` +
        `The key takeaway? We need to adapt our approach to stay ahead of the curve. It's not just about keeping up — it's about leading the conversation.\n\n` +
        `Here are three things I've learned:\n` +
        `1. Start with the why\n` +
        `2. Focus on value creation\n` +
        `3. Iterate constantly\n\n` +
        `What has your experience been? Drop your thoughts in the comments 👇\n\n` +
        `#ProfessionalGrowth #IndustryInsights #Leadership`
      )
    case "x":
      return (
        `1/5 🧵 Let's talk about ${preview.toLowerCase()}\n\n` +
        `This is one of those topics that doesn't get enough attention. Let me break it down.\n\n` +
        `2/5 First, let's set the stage. The landscape has changed dramatically in the past year alone.\n\n` +
        `3/5 The biggest mistake people make? Overcomplicating it. The solution is simpler than you think.\n\n` +
        `4/5 Here's what actually works: focus on the fundamentals, ignore the noise, and execute consistently.\n\n` +
        `5/5 If you found this helpful, follow for more insights like this. What's your take?`
      )
    case "facebook":
      return (
        `I just came across this and had to share! 🤔\n\n` +
        `${preview}\n\n` +
        `Honestly, this really made me stop and think. So much of what we hear every day is noise, but this? This is different.\n\n` +
        `Would love to hear your thoughts — have you experienced something similar?\n\n` +
        `Drop a comment below! 👇`
      )
    case "instagram":
      return (
        `✨ This one hit different.\n\n` +
        `${preview.toLowerCase()} has been on my mind lately, and I had to share. Sometimes the best lessons come from the most unexpected places.\n\n` +
        `Save this for later 📌\n\n` +
        `#Mindset #Growth #DailyInspo #ContentCreator #Thoughts`
      )
    case "tiktok":
      return (
        `🎬 HOOK: "Wait, did you know this about ${preview.toLowerCase()}?"\n\n` +
        `VISUAL: Close-up, direct to camera, surprised expression\n\n` +
        `BODY: So here's the thing — most people get this completely wrong. Let me explain in 30 seconds.\n\n` +
        `VISUAL: Split screen — wrong way vs right way\n\n` +
        `CTA: Follow for more! Drop a comment if you learned something new.`
      )
    case "youtube_shorts":
      return (
        `🎬 HOOK: "Most people don't know this about ${preview.toLowerCase()}"\n\n` +
        `[Fast cuts, close-up, direct eye contact]\n\n` +
        `VALUE: The thing is — it's simpler than you think. Here's exactly what worked for me.\n\n` +
        `[Quick text overlay: "Here's the deal..."]\n\n` +
        `One thing changed everything. And it's not what you'd expect.\n\n` +
        `CTA: Subscribe for more — drop a comment and tell me if you agree.`
      )
    default:
      return `Mock content for ${platform}:\n\n${preview}\n\n(Platform-specific generation not available in mock mode.)`
  }
}

function isMockMode() {
  const providerType = (process.env.AI_PROVIDER || "gemini").toLowerCase()

  switch (providerType) {
    case "gemini":
      return (
        !process.env.GEMINI_API_KEY ||
        process.env.GEMINI_API_KEY === "your-gemini-api-key"
      )
    case "openai": {
      const keys = (process.env.OPENAI_API_KEYS || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
      return keys.length === 0 || keys[0] === PLACEHOLDER_KEY
    }
    case "openrouter":
      return (
        !process.env.OPENROUTER_API_KEY ||
        process.env.OPENROUTER_API_KEY.startsWith("sk-or-v1-placeholder")
      )
    case "deepseek":
      return (
        !process.env.DEEPSEEK_API_KEY ||
        process.env.DEEPSEEK_API_KEY.startsWith("sk-placeholder")
      )
    case "groq":
      return (
        !process.env.GROQ_API_KEY ||
        process.env.GROQ_API_KEY.startsWith("gsk_placeholder")
      )
    default:
      return true
  }
}

async function generateForPlatform(
  platform: string,
  content: string,
  prompts: Record<string, string> | undefined,
  mock: boolean,
  styles?: Record<string, string>,
  goalInstruction?: string,
  brandVoiceInstruction?: string
) {
  const prompt = platformPrompts[platform]
  if (!prompt) {
    return { platform, content: null, error: `Unknown platform: ${platform}` }
  }

  const styleInstruction = getStyleInstruction(platform, styles?.[platform])
  const parts = [prompt.system]
  if (goalInstruction) parts.push("\n" + goalInstruction)
  if (brandVoiceInstruction) parts.push("\n" + brandVoiceInstruction)
  if (styleInstruction) parts.push("\nStyle: " + styleInstruction)
  const systemPrompt = parts.join("\n\n")

  const userMessage = (prompts && prompts[platform]) || prompt.user(content)

  if (mock) {
    return { platform, content: generateMockContent(platform, content) }
  }

  try {
    const provider = getAIProvider()
    const result = await provider.generate({
      system: systemPrompt,
      user: userMessage,
    })
    return { platform, content: result }
  } catch (err) {
    if (err instanceof AIError && err.code === "QUOTA_EXHAUSTED") {
      return {
        platform,
        content: generateMockContent(platform, content),
        error: "Quota exhausted, using fallback.",
      }
    }
    return { platform, content: generateMockContent(platform, content) }
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", provider: process.env.AI_PROVIDER || "not-set" })
}

export async function POST(request: Request) {
  try {
    const body: {
      content?: string
      platforms?: string[]
      prompts?: Record<string, string>
      styles?: Record<string, string>
      goal?: string
      brandVoice?: Record<string, string>
      variations?: number
      analysis?: ContentAnalysis
    } = await request.json()

    let { platforms, prompts, styles, goal, brandVoice, variations, analysis } = body
    let content: string | undefined = body.content

    if (!content || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "Content and platforms are required" },
        { status: 400 }
      )
    }

    // Guaranteed string after validation above; reassignable for analysis context swap
    let rawContent: string = content

    const mock = isMockMode()
    const goalInstruction = getGoalInstruction(goal)
    const brandVoiceInstruction = formatBrandVoice(brandVoice)
    const variationCount = Math.min(Math.max(variations || 1, 1), 3)

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"))
        }

        try {
          // Analysis step
          send({ type: "start", step: "analyzing" })

          if (!analysis) {
            if (mock) {
              analysis = generateMockAnalysis(rawContent)
            } else {
              try {
                const ai = getAIProvider()
                analysis = await analyzeContent(ai, rawContent)
              } catch {
                analysis = generateMockAnalysis(rawContent)
              }
            }
            send({ type: "analysis_complete", analysis })
          }

          // Replace raw content with structured analysis for platform generation
          rawContent = formatAnalysisContext(analysis)

          if (variationCount > 1) {
            for (const platform of platforms) {
              for (let v = 1; v <= variationCount; v++) {
                send({ type: "start", platform, variation: v })
              }
            }
          } else {
            for (const platform of platforms) {
              send({ type: "start", platform })
            }
          }

          await new Promise((r) => setTimeout(r, 100))

          const promises = platforms.flatMap((platform) => {
            const runs = Array.from({ length: variationCount }, (_, i) => i + 1)
            return runs.map(async (variation) => {
              const result = await generateForPlatform(
                platform,
                rawContent,
                prompts,
                mock,
                styles,
                goalInstruction,
                brandVoiceInstruction
              )
              send({
                type: "result",
                platform: result.platform,
                content: result.content,
                error: result.error,
                variation,
              })
              return { ...result, variation }
            })
          })

          const settled = await Promise.allSettled(promises)

          // Coverage calculation
          if (analysis) {
            const perPlatformContent: Record<string, string> = {}
            for (const s of settled) {
              if (s.status === "fulfilled") {
                const r = s.value
                if (r.content && !r.error) {
                  perPlatformContent[r.platform] = (perPlatformContent[r.platform] || "") + "\n" + r.content
                }
              }
            }
            const coverage = calculateCoverage(analysis, perPlatformContent)
            send({ type: "coverage", ...coverage })
          }

          send({ type: "complete" })
        } catch (err) {
          send({ type: "error", message: err instanceof Error ? err.message : "Generation failed" })
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Generate route error:", message)
    return NextResponse.json(
      { error: "Failed to generate content", detail: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    )
  }
}
