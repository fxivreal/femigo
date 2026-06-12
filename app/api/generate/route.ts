import { NextResponse } from "next/server"
import { platformPrompts, getGoalInstruction, formatBrandVoice, formatAnalysisContext, nigerianStrategistPreamble, getAngleInstruction } from "@/lib/prompts"
import { whatsappPromptRegistry, quickReplyLiveAnswerPrompt } from "@/lib/prompts/whatsapp"
import { getAIProvider, AIError } from "@/lib/ai"
import { analyzeContent, generateMockAnalysis, clusterInsights, generateMockClusters, flattenInsightsForClustering } from "@/lib/analyze"
import { calculateCoverage } from "@/lib/coverage"
import { generationModes, expandMode } from "@/lib/generation-modes"
import type { ContentAnalysis, InsightCluster } from "@/lib/analysis-types"

export const runtime = "nodejs"
export const maxDuration = 120

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
    case "whatsapp_status":
      return (
        `Status 1: This one thing changed everything.\n\n` +
        `Status 2: Most people overlook it completely.\n\n` +
        `Status 3: ${preview.toLowerCase()}\n\n` +
        `Status 4: The difference is in the details.\n\n` +
        `Status 5: Pay attention. It matters.`
      )
    default:
      return `Mock content for ${platform}:\n\n${preview}\n\n(Platform-specific generation not available in mock mode.)`
  }
}

function generateMockWhatsAppContent(type: string, preview: string) {
  switch (type) {
    case "status":
      return (
        `Status 1: This one thing changed everything.\n\n` +
        `Status 2: Most people overlook it completely.\n\n` +
        `Status 3: ${preview.toLowerCase()}\n\n` +
        `Status 4: The difference is in the details.\n\n` +
        `Status 5: Pay attention. It matters.`
      )
    case "promotional":
      return (
        `🔥 New arrival! ${preview}\n\n` +
        `\u20a63,500 only — limited stock.\n` +
        `📍 Available at our store now.\n` +
        `DM to order or ask questions.`
      )
    case "quick-reply":
      return (
        `Q: How much?\nA: \u20a63,500 for standard size. Delivery \u20a6500 within Lagos. Order before 4pm for next-day delivery.\n\n` +
        `Q: Is it available?\nA: Yes, in stock. Come to our store or DM to place an order.\n\n` +
        `Q: Do you deliver?\nA: Yes — Lagos: \u20a6500, outside Lagos: \u20a62,000. 2-3 business days.`
      )
    case "broadcast":
      return (
        `Hey everyone 👋\n\n` +
        `We just got new stock! ${preview}\n\n` +
        `Swing by our store or DM to order. First 10 buyers get free delivery 🚚`
      )
    case "follow-up":
      return (
        `Hi there! I hope you're enjoying your purchase. Just checking in — let me know if you have any questions. We're here to help!`
      )
    default:
      return `Mock WhatsApp content for ${type}:\n\n${preview}`
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
  analysisContext: string,
  focus: string[],
  mock: boolean,
  goalInstruction?: string,
  brandVoiceInstruction?: string,
  usedContext?: string,
  audience?: string,
  angle?: string
) {
  const prompt = platformPrompts[platform]
  if (!prompt) {
    return { platform, content: null, error: `Unknown platform: ${platform}` }
  }

  const parts: string[] = []
  if (audience === "nigerian" && platform !== "whatsapp_status") {
    parts.push(nigerianStrategistPreamble)
  }
  parts.push(prompt.system)
  if (goalInstruction) parts.push("\n" + goalInstruction)
  if (brandVoiceInstruction) parts.push("\n" + brandVoiceInstruction)
  const systemPrompt = parts.join("\n\n")

  const focusInstruction = focus.length > 0
    ? `\n\nFOCUS AREAS — These specific insights are assigned to this asset. They MUST be your primary source. Do NOT drift to other topics:\n${focus.map((f) => `- ${f}`).join("\n")}`
    : ""

  const usedInstruction = usedContext
    ? `\n\n${usedContext}`
    : ""

  const angleInstruction = audience === "nigerian" ? "\n\n" + getAngleInstruction(angle || "") : ""

  const userMessage = prompt.user(analysisContext) + focusInstruction + angleInstruction + usedInstruction

  if (mock) {
    return { platform, content: generateMockContent(platform, analysisContext) }
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
        content: generateMockContent(platform, analysisContext),
        error: "Quota exhausted, using fallback.",
      }
    }
    return { platform, content: generateMockContent(platform, analysisContext) }
  }
}

async function generateForWhatsAppType(
  type: string,
  analysisContext: string,
  sourceContent: string,
  mock: boolean,
  goalInstruction?: string,
  brandVoiceInstruction?: string,
  audience?: string,
  angle?: string,
  quickReplyQuestion?: string
) {
  // Handle quick-reply live question separately
  if (type === "quick-reply" && quickReplyQuestion) {
    if (mock) {
      return { platform: "whatsapp_quick-reply", content: `Q: ${quickReplyQuestion}\nA: We have it available. Please DM us for more details or visit our store.` }
    }
    try {
      const provider = getAIProvider()
      const result = await provider.generate({
        system: "You are a WhatsApp customer service assistant. Answer based ONLY on the provided source content.",
        user: quickReplyLiveAnswerPrompt(sourceContent, analysisContext, quickReplyQuestion),
      })
      return { platform: "whatsapp_quick-reply", content: result }
    } catch (err) {
      if (err instanceof AIError && err.code === "QUOTA_EXHAUSTED") {
        return { platform: "whatsapp_quick-reply", content: `Q: ${quickReplyQuestion}\nA: We have it available. Please DM us for more details.`, error: "Quota exhausted, using fallback." }
      }
      return { platform: "whatsapp_quick-reply", content: `Q: ${quickReplyQuestion}\nA: We have it available. Please DM us for more details.` }
    }
  }

  // Batch generation for all WhatsApp types
  const prompt = whatsappPromptRegistry[type]
  if (!prompt) {
    return { platform: `whatsapp_${type}`, content: null, error: `Unknown WhatsApp type: ${type}` }
  }

  const parts: string[] = []
  if (audience === "nigerian") {
    parts.push(nigerianStrategistPreamble)
  }
  parts.push(prompt.system)
  if (goalInstruction) parts.push("\n" + goalInstruction)
  if (brandVoiceInstruction) parts.push("\n" + brandVoiceInstruction)
  const systemPrompt = parts.join("\n\n")

  const angleInstruction = audience === "nigerian" ? "\n\n" + getAngleInstruction(angle || "") : ""
  const userMessage = prompt.user(analysisContext) + angleInstruction

  const preview = truncate(sourceContent, 120)

  if (mock) {
    return { platform: `whatsapp_${type}`, content: generateMockWhatsAppContent(type, preview) }
  }

  try {
    const provider = getAIProvider()
    const result = await provider.generate({
      system: systemPrompt,
      user: userMessage,
    })
    return { platform: `whatsapp_${type}`, content: result }
  } catch (err) {
    if (err instanceof AIError && err.code === "QUOTA_EXHAUSTED") {
      return { platform: `whatsapp_${type}`, content: generateMockWhatsAppContent(type, preview), error: "Quota exhausted, using fallback." }
    }
    return { platform: `whatsapp_${type}`, content: generateMockWhatsAppContent(type, preview) }
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", provider: process.env.AI_PROVIDER || "not-set" })
}

export async function POST(request: Request) {
  try {
    const body: {
      content?: string
      mode?: string
      goal?: string
      brandVoice?: Record<string, string>
      analysis?: ContentAnalysis
      clusterId?: string
      audience?: string
      angle?: string
      whatsappSuite?: boolean
      types?: string[]
      quickReplyQuestion?: string
    } = await request.json()

    let { mode, goal, brandVoice, analysis, clusterId, audience, angle, whatsappSuite, types, quickReplyQuestion } = body
    let content: string | undefined = body.content

    const isWhatsappSuite = whatsappSuite === true

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    if (isWhatsappSuite) {
      if (!types || !Array.isArray(types) || types.length === 0) {
        return NextResponse.json(
          { error: "At least one WhatsApp content type is required" },
          { status: 400 }
        )
      }
    } else if (!mode || !generationModes[mode]) {
      return NextResponse.json(
        { error: "Content and a valid mode (quick, standard, comprehensive) are required" },
        { status: 400 }
      )
    }

    let rawContent: string = content
    const mock = isMockMode()
    const goalInstruction = getGoalInstruction(goal)
    const brandVoiceInstruction = formatBrandVoice(brandVoice)
    let clusters: InsightCluster[] = []

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"))
        }

        try {
          // Analysis step — shared between platforms and WhatsApp Suite
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

          if (!isWhatsappSuite) {
            // Clustering step (only for platform generation — WhatsApp Suite uses analysis directly)
            if (mock) {
              clusters = generateMockClusters(analysis)
            } else {
              try {
                const ai = getAIProvider()
                clusters = await clusterInsights(ai, analysis)
              } catch {
                clusters = generateMockClusters(analysis)
              }
            }
            send({ type: "clusters", clusters })

            // Replace raw content with structured analysis context
            rawContent = formatAnalysisContext(analysis)

            // Filter insights by selected cluster
            let allInsights = flattenInsightsForClustering(analysis)
            if (clusterId) {
              const cluster = clusters.find((c) => c.id === clusterId)
              if (cluster) {
                allInsights = cluster.insightIndices
                  .map((i) => allInsights[i])
                  .filter(Boolean)
              }
            }

            const modeConfig = generationModes[mode!]

            // Expand mode into focused assets using filtered insights
            const assets = expandMode(modeConfig, allInsights)

            // Send start events grouped by platform
            for (const platform of modeConfig.platforms) {
              send({ type: "start", platform })
            }

            await new Promise((r) => setTimeout(r, 100))

            // Track used insights across the batch to avoid reuse
            const usedInsights = new Set<string>()
            const usedHookTypes = new Set<string>()

            // Generate each asset with different focus
            const promises = assets.map(async (asset, idx) => {
              const usedContextParts: string[] = []
              if (usedInsights.size > 0) {
                usedContextParts.push(
                  `ALREADY USED — These insights have already been covered by other assets in this batch. Do NOT reuse them:\n${Array.from(usedInsights).map((l) => `- ${l}`).join("\n")}`
                )
              }
              if (usedHookTypes.size > 0) {
                usedContextParts.push(
                  `HOOK VARIETY — These hook types have already been used. Use a DIFFERENT hook style:\n${Array.from(usedHookTypes).map((l) => `- ${l}`).join("\n")}`
                )
              }
              const usedContext = usedContextParts.length > 0 ? usedContextParts.join("\n\n") : undefined

              const result = await generateForPlatform(
                asset.platform,
                rawContent,
                asset.focus,
                mock,
                goalInstruction,
                brandVoiceInstruction,
                usedContext,
                audience,
                angle
              )

              // Track what was used
              if (result.content) {
                asset.focus.forEach((f) => usedInsights.add(f))
                const lower = result.content.toLowerCase()
                if (lower.includes("?") && !lower.startsWith("did you know")) {
                  usedHookTypes.add("question-hook")
                } else if (lower.startsWith("i") || lower.startsWith("my") || lower.startsWith("we")) {
                  usedHookTypes.add("personal-story-hook")
                } else if (lower.startsWith("**") || lower.startsWith('"')) {
                  usedHookTypes.add("bold-statement-hook")
                } else if (/\d/.test(lower.slice(0, 50))) {
                  usedHookTypes.add("statistic-hook")
                } else {
                  usedHookTypes.add("declarative-hook")
                }
              }

              send({
                type: "result",
                platform: result.platform,
                content: result.content,
                error: result.error,
                assetIndex: asset.assetIndex,
                focus: asset.focus,
              })
              return { ...result, assetIndex: asset.assetIndex, focus: asset.focus }
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
          } else {
            // WhatsApp Suite generation path
            const analysisCtx = formatAnalysisContext(analysis)

            // Send start for each type
            for (const t of types!) {
              send({ type: "start", platform: `whatsapp_${t}`, whatsappType: t })
            }

            await new Promise((r) => setTimeout(r, 100))

            const usedInsights = new Set<string>()

            // Generate each WhatsApp type sequentially (types matter for anti-repetition)
            for (const t of types!) {
              const totalInBatch = types!.length
              const focusInstruction =
                `\n\nFOCUS: This is type ${types!.indexOf(t) + 1} of ${totalInBatch} in a WhatsApp content batch. Cover insights NOT used by earlier types in this batch if possible.`

              const result = await generateForWhatsAppType(
                t,
                analysisCtx,
                rawContent,
                mock,
                goalInstruction,
                brandVoiceInstruction,
                audience,
                angle,
                // Only pass question for quick-reply type
                (t === "quick-reply" && quickReplyQuestion) ? quickReplyQuestion : undefined
              )

              // Track insights used
              if (result.content) {
                usedInsights.add(`${t}: ${result.content.slice(0, 50)}`)
              }

              send({
                type: "result",
                platform: result.platform,
                content: result.content,
                error: result.error,
                assetIndex: 0,
                whatsappType: t,
                focus: [],
              })
            }
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
