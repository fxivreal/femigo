import { NextResponse } from "next/server"
import { platformPrompts } from "@/lib/prompts"

const apiKeys = (process.env.OPENAI_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean)

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
    default:
      return `Mock content for ${platform}:\n\n${preview}\n\n(Platform-specific generation not available in mock mode.)`
  }
}

async function tryFetchWithFallback(
  platform: string,
  system: string,
  userContent: string
): Promise<{ platform: string; content: string | null; error?: string }> {
  for (const key of apiKeys) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          temperature: 0.7,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        return {
          platform,
          content: data.choices?.[0]?.message?.content || "",
        }
      }

      const errText = await res.text()

      if (errText.includes("insufficient_quota")) {
        continue
      }

      // Non-quota error: fall through to next key or mock
      continue
    } catch {
      continue
    }
  }

  return {
    platform,
    content: null,
    error: "All API keys exhausted or out of quota.",
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

    if (apiKeys.length === 0 || apiKeys[0] === PLACEHOLDER_KEY) {
      const results = platforms.map((platform: string) => ({
        platform,
        content: generateMockContent(platform, content),
      }))
      return NextResponse.json({ results })
    }

    const results = await Promise.all(
      platforms.map(async (platform: string) => {
        const prompt = platformPrompts[platform]
        if (!prompt) {
          return { platform, content: null, error: `Unknown platform: ${platform}` }
        }

        const userMessage = (prompts && prompts[platform]) || prompt.user(content)
        const result = await tryFetchWithFallback(platform, prompt.system, userMessage)

        if (result.content) return result

        return { platform, content: generateMockContent(platform, content) }
      })
    )

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    )
  }
}
