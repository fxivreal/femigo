import { NextResponse } from "next/server"
import { platformPrompts } from "@/lib/prompts"
import { getAIProvider, AIError } from "@/lib/ai"

const PLACEHOLDER_KEY = "sk-your-key-here"

function truncate(content: string, max: number) {
  return content.length > max ? content.slice(0, max).trimEnd() + "..." : content
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
  const geminiKey = process.env.GEMINI_API_KEY || ""
  const openaiKeys = (process.env.OPENAI_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)

  return (
    (providerType === "openai" &&
      (openaiKeys.length === 0 || openaiKeys[0] === PLACEHOLDER_KEY)) ||
    (providerType === "gemini" &&
      (!geminiKey || geminiKey === "your-gemini-api-key"))
  )
}

async function generateForPlatform(
  platform: string,
  content: string,
  prompts: Record<string, string> | undefined,
  mock: boolean
) {
  const prompt = platformPrompts[platform]
  if (!prompt) {
    return { platform, content: null, error: `Unknown platform: ${platform}` }
  }

  const userMessage = (prompts && prompts[platform]) || prompt.user(content)

  if (mock) {
    return { platform, content: generateMockContent(platform, content) }
  }

  try {
    const provider = getAIProvider()
    const result = await provider.generate({
      system: prompt.system,
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

export async function POST(request: Request) {
  try {
    const { content, platforms, prompts } = await request.json()

    if (!content || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: "Content and platforms are required" },
        { status: 400 }
      )
    }

    const mock = isMockMode()

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"))
        }

        try {
          send({ type: "start", step: "analyzing" })

          for (const platform of platforms) {
            send({ type: "start", platform })
          }

          await new Promise((r) => setTimeout(r, 100))

          const promises = platforms.map(async (platform) => {
            const result = await generateForPlatform(platform, content, prompts, mock)
            send({ type: "result", platform: result.platform, content: result.content, error: result.error })
            return result
          })

          await Promise.allSettled(promises)
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
  } catch {
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    )
  }
}
