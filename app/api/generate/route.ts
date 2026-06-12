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

const statusTemplates = [
  "This one thing changed everything.",
  "Most people overlook it completely.",
  "The secret nobody tells you.",
  "Here's what actually works.",
  "Pay attention. It matters.",
  "Most people get this wrong.",
  "The difference is in the details.",
  "This is what success looks like.",
  "Don't make this mistake.",
  "Here's the truth.",
  "Start paying attention to this.",
  "It's simpler than you think.",
  "This changes everything.",
  "Most people don't know this.",
  "Here's what I wish I knew earlier.",
  "The one thing that matters most.",
  "Stop what you're doing and read this.",
  "This is the key insight.",
  "You've been doing it wrong.",
  "Here's the real deal.",
  "This applies to you.",
  "Don't overlook this.",
  "The sooner you learn this, the better.",
  "This is non-negotiable.",
  "Here's what separates the best.",
  "Most people ignore this.",
  "This is where it starts.",
  "The foundation of everything.",
  "Here's your next step.",
  "Remember this one thing.",
]

function generateMockWhatsAppContent(type: string, preview: string, statusCount?: number) {
  switch (type) {
    case "status":
      const count = statusCount || 5
      const lines: string[] = []
      for (let i = 0; i < count; i++) {
        const text = i === 2
          ? preview.toLowerCase()
          : statusTemplates[i % statusTemplates.length]
        lines.push(`Status ${i + 1}: ${text}`)
      }
      return lines.join("\n\n")
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
        `#EDUCATIONAL\n` +
        `Short: Did you know? ${preview}\n` +
        `Medium: Here's something valuable: ${preview} Understanding this can save you money and stress.\n` +
        `Long: We want to share something useful with you. ${preview} Most people don't know this, but once you do, it changes everything. Apply this today and see the difference. DM us if you have questions!\n\n` +
        `#PROMOTION\n` +
        `Short: New arrival! ${preview} — DM to order.\n` +
        `Medium: We just got new stock! ${preview} Available now at great prices. First 10 buyers get free delivery 🚚 DM to order.\n` +
        `Long: Exciting news! We've just restocked ${preview} and it's selling fast. Limited quantities available. Order now to avoid disappointment. Free delivery within Lagos for first 10 customers. DM to place your order!\n\n` +
        `#ANNOUNCEMENT\n` +
        `Short: Big news! ${preview} — details below 👇\n` +
        `Medium: We're excited to announce: ${preview} This is something we've been working on and we can't wait to share it with you. Check it out!\n` +
        `Long: We have an announcement to make! ${preview} This is a major step for us, and we wanted our community to hear it first. Stay tuned for more updates, and reach out if you have any questions. We're here for you!\n\n` +
        `#UPDATE\n` +
        `Short: Quick update: ${preview}\n` +
        `Medium: Here's what's happening: ${preview} We're making improvements based on your feedback. Thank you for your support!\n` +
        `Long: We want to keep you in the loop. ${preview} We've been working hard behind the scenes to bring you better service. Your feedback has been invaluable. If you have thoughts, we'd love to hear them. Reply to this message anytime!`
      )
    case "follow-up":
      return (
        `#NEW_LEAD\n` +
        `Friendly:\n` +
        `Var 1: Hey! Thanks for reaching out. I'd love to help you get started. What questions do you have?\n` +
        `Var 2: Hi there! Just checking in — is there anything I can help you with? No pressure at all.\n` +
        `Var 3: Hey! I know you were looking into this. Happy to answer any questions whenever you're ready.\n\n` +
        `Professional:\n` +
        `Var 1: Thank you for your interest. I'd be happy to provide additional information if needed.\n` +
        `Var 2: I wanted to follow up on your inquiry. Please let me know if you have any questions.\n` +
        `Var 3: Following up on our conversation. I'm available to discuss further at your convenience.\n\n` +
        `Sales-Oriented:\n` +
        `Var 1: I noticed you were interested. This offer has been helping others — don't miss out. Reply to learn more.\n` +
        `Var 2: Quick follow-up — we have limited availability right now. Let me know if you'd like to secure your spot.\n` +
        `Var 3: You expressed interest and I wanted to make sure you didn't miss this. We're offering a special incentive this week.\n\n` +
        `#QUOTE_FOLLOWUP\n` +
        `Friendly:\n` +
        `Var 1: Hey! Just checking in on the quote I sent. Happy to walk through anything or adjust if needed.\n` +
        `Var 2: Hi! Was the quote clear enough? I can break it down or explore options with you.\n` +
        `Var 3: Hope you're doing well! Any thoughts on the proposal? I'm here if you need tweaks.\n\n` +
        `Professional:\n` +
        `Var 1: I hope this message finds you well. I wanted to follow up regarding the proposal shared earlier.\n` +
        `Var 2: Following up on the quote sent on your request. Please let me know if you require any clarification.\n` +
        `Var 3: I trust you've had time to review the estimate. I remain available to discuss any aspect further.\n\n` +
        `Sales-Oriented:\n` +
        `Var 1: The quote I sent is valid for 3 more days. Lock in this rate before it expires.\n` +
        `Var 2: I know you're considering options. Here's why our solution delivers the best value — let me show you.\n` +
        `Var 3: We've had high demand and slots are filling. If you're ready to move forward, let's get started today.\n\n` +
        `#ABANDONED_PURCHASE\n` +
        `Friendly:\n` +
        `Var 1: Hey! Noticed you were checking something out. Need help with anything? I'm here.\n` +
        `Var 2: Hi! Just checking in — sometimes checkout can be tricky. Let me know if I can assist.\n` +
        `Var 3: Hey! Want me to save that item for you? Happy to help you complete your order.\n\n` +
        `Professional:\n` +
        `Var 1: I noticed your order was not completed. Please let me know if you encountered any issues.\n` +
        `Var 2: Your selected items are still available. I'm available to assist with the checkout process.\n` +
        `Var 3: This is a courteous reminder that your cart is still active. We're here to help if needed.\n\n` +
        `Sales-Oriented:\n` +
        `Var 1: Your cart is about to expire. Complete your order now to avoid missing out on this deal.\n` +
        `Var 2: We've reserved your items but they're in high demand. Checkout now to secure them.\n` +
        `Var 3: Don't let this opportunity slip! Complete your purchase today and enjoy free delivery.\n\n` +
        `#CUSTOMER_REENGAGEMENT\n` +
        `Friendly:\n` +
        `Var 1: Hey! It's been a while. We've added some exciting new things you might love. Come check us out!\n` +
        `Var 2: Hi there! Was just thinking of you. We have some fresh updates and would love to have you back.\n` +
        `Var 3: Long time no chat! Hope everything is great. We've missed you — here's something special.\n\n` +
        `Professional:\n` +
        `Var 1: I hope this message finds you well. We would value the opportunity to serve you again.\n` +
        `Var 2: It has been some time since your last visit. We have made several improvements since then.\n` +
        `Var 3: We appreciate your past patronage and would like to share what's new. Your satisfaction remains our priority.\n\n` +
        `Sales-Oriented:\n` +
        `Var 1: It's been a while! We're running a limited promotion for returning customers. Don't miss out.\n` +
        `Var 2: You've been missed! Here's an exclusive re-engagement offer — only available to past customers.\n` +
        `Var 3: We've improved our offering significantly since you last visited. See what's new and save on your return.\n\n` +
        `#POST_PURCHASE\n` +
        `Friendly:\n` +
        `Var 1: Thanks for your order! We're so excited for you. Reach out if you need anything at all.\n` +
        `Var 2: Hey! Just wanted to say thank you. Hope everything is perfect — we're here if you need support.\n` +
        `Var 3: You're awesome! Thanks for choosing us. Let us know how it goes — we'd love to hear.\n\n` +
        `Professional:\n` +
        `Var 1: Thank you for your purchase. We are committed to ensuring your satisfaction with the product.\n` +
        `Var 2: We appreciate your business. Our support team is available should you require any assistance.\n` +
        `Var 3: Your order has been confirmed. We will keep you updated on delivery and are here for any queries.\n\n` +
        `Sales-Oriented:\n` +
        `Var 1: Thanks for your purchase! As a valued customer, you have early access to our upcoming launch.\n` +
        `Var 2: Welcome to the family! Enjoy 10% off your next order — use code THANKYOU at checkout.\n` +
        `Var 3: Great choice! Customers who bought this also love our premium bundle. Check it out!\n\n` +
        `#TESTIMONIAL_REQUEST\n` +
        `Friendly:\n` +
        `Var 1: So glad you loved it! Would you mind sharing a quick review? Even one sentence helps us a ton.\n` +
        `Var 2: Hey! We'd be so grateful if you could leave a short testimonial. Your feedback means the world.\n` +
        `Var 3: Happy to hear you're enjoying it! Mind telling us what you think? Copy-paste friendly below.\n\n` +
        `Professional:\n` +
        `Var 1: We would greatly appreciate a brief testimonial based on your experience. Your feedback helps others.\n` +
        `Var 2: If you are satisfied with your purchase, we kindly request a review. It takes less than a minute.\n` +
        `Var 3: Your opinion matters to us. Please share your experience to help us serve you and others better.\n\n` +
        `Sales-Oriented:\n` +
        `Var 1: Loved our product? A quick testimonial helps others trust us — and helps you can refer friends for rewards!\n` +
        `Var 2: Your success story could inspire others. Share a quick review and get featured on our page.\n` +
        `Var 3: Help us grow! Leave a review and receive a discount on your next purchase as our thank you.\n`
      )
    case "sales-funnel":
      return (
        `#AWARENESS\n` +
        `Soft: Have you ever noticed how much time you spend on tasks that could be automated?\n` +
        `Balanced: Most small business owners waste 10+ hours a week on manual tasks. This adds up.\n` +
        `Aggressive: Are you still doing everything yourself? Let's fix that.\n\n` +
        `#INTEREST\n` +
        `Soft: Imagine what you could do with 10 extra hours per week — more clients, more revenue, more rest.\n` +
        `Balanced: Here's something interesting: businesses that automate save an average of 30% in operational costs.\n` +
        `Aggressive: You're losing money every week you delay automation. Here's why.\n\n` +
        `#TRUST\n` +
        `Soft: We've helped over 200 businesses like yours simplify their operations. Here's what one of them said...\n` +
        `Balanced: Since 2020, we've delivered measurable results for our clients — reduced overhead, increased output.\n` +
        `Aggressive: Our track record speaks for itself. 95% of clients see improvement in the first month.\n\n` +
        `#OFFER\n` +
        `Soft: We'd love to help you set up a simple automation system. Plans start at ₦25,000/month.\n` +
        `Balanced: Our starter package includes workflow setup, training, and support. ₦25,000/month — cancel anytime.\n` +
        `Aggressive: Get started today for ₦25,000/month. Limited slots available — don't wait.\n\n` +
        `#URGENCY\n` +
        `Soft: We have just 3 openings this month at the starter rate. Next batch opens in 6 weeks.\n` +
        `Balanced: Price increases to ₦35,000/month from next month. Lock in ₦25,000 if you sign up this week.\n` +
        `Aggressive: 2 spots left at this price. Once they're gone, you'll pay 40% more. Act now.\n\n` +
        `#FOLLOWUP\n` +
        `Soft: No pressure at all! If you ever want to chat about automation, I'm here. Just reply anytime.\n` +
        `Balanced: Still thinking about it? Happy to answer any questions. Here's a free resource to help you decide.\n` +
        `Aggressive: I don't want you to miss out. Let me know if you have concerns — I'm here to help.`
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
  quickReplyQuestion?: string,
  statusCount?: number
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
  const countInstruction = type === "status" && statusCount ? `\n\nGenerate exactly ${statusCount} statuses.` : ""
  const userMessage = prompt.user(analysisContext) + angleInstruction + countInstruction

  const preview = truncate(sourceContent, 120)

  if (mock) {
    return { platform: `whatsapp_${type}`, content: generateMockWhatsAppContent(type, preview, type === "status" ? statusCount : undefined) }
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
      statusCount?: number
    } = await request.json()

    let { mode, goal, brandVoice, analysis, clusterId, audience, angle, whatsappSuite, types, quickReplyQuestion, statusCount } = body
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
                (t === "quick-reply" && quickReplyQuestion) ? quickReplyQuestion : undefined,
                t === "status" ? statusCount : undefined
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
