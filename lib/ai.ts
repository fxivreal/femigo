export class AIError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = "AIError"
  }
}

export interface GenerateOptions {
  system: string
  user: string
  temperature?: number
}

export interface AIProvider {
  readonly name: string
  generate(options: GenerateOptions): Promise<string>
}

class GeminiProvider implements AIProvider {
  readonly name = "gemini"
  private model: string

  constructor(
    private apiKey: string,
    model?: string
  ) {
    this.model = model || "gemini-2.0-flash"
  }

  async generate(options: GenerateOptions): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: options.system }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: options.user }],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      if (
        res.status === 429 ||
        errText.includes("quota") ||
        errText.includes("RATE_LIMIT")
      ) {
        throw new AIError("Quota exhausted", "QUOTA_EXHAUSTED")
      }
      throw new AIError(`Gemini error ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    if (!text && data.promptFeedback?.blockReason) {
      throw new AIError(
        `Content blocked: ${data.promptFeedback.blockReason}`,
        "BLOCKED"
      )
    }

    return text
  }
}

class OpenAIProvider implements AIProvider {
  readonly name: string
  private keys: string[]
  private model: string
  private baseUrl: string
  private extraHeaders: Record<string, string>

  constructor(
    keys: string[],
    model?: string,
    baseUrl?: string,
    extraHeaders?: Record<string, string>,
    name?: string
  ) {
    this.keys = keys
    this.model = model || "gpt-4o-mini"
    this.baseUrl = baseUrl || "https://api.openai.com/v1"
    this.extraHeaders = extraHeaders || {}
    this.name = name || "openai"
  }

  async generate(options: GenerateOptions): Promise<string> {
    let lastErr: Error | null = null

    for (const key of this.keys) {
      try {
        const res = await fetch(
          `${this.baseUrl}/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
              ...this.extraHeaders,
            },
            body: JSON.stringify({
              model: this.model,
              messages: [
                { role: "system", content: options.system },
                { role: "user", content: options.user },
              ],
              temperature: options.temperature ?? 0.7,
            }),
          }
        )

        if (res.ok) {
          const data = await res.json()
          return data.choices?.[0]?.message?.content || ""
        }

        const errText = await res.text()

        if (
          res.status === 429 ||
          errText.includes("insufficient_quota") ||
          errText.includes("quota") ||
          errText.includes("rate_limit")
        ) {
          lastErr = new AIError("Quota exhausted", "QUOTA_EXHAUSTED")
          continue
        }

        lastErr = new Error(`${this.name} error ${res.status}: ${errText}`)
        continue
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err))
        continue
      }
    }

    throw lastErr || new AIError("All API keys exhausted", "QUOTA_EXHAUSTED")
  }
}

let provider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (provider) return provider

  const type = (process.env.AI_PROVIDER || "gemini").toLowerCase()

  switch (type) {
    case "gemini": {
      const key = process.env.GEMINI_API_KEY
      if (!key) throw new AIError("GEMINI_API_KEY not configured")
      provider = new GeminiProvider(key, process.env.GEMINI_MODEL)
      break
    }

    case "openai": {
      const keys = (process.env.OPENAI_API_KEYS || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
      if (keys.length === 0)
        throw new AIError("OPENAI_API_KEYS not configured")
      provider = new OpenAIProvider(
        keys,
        process.env.OPENAI_MODEL,
        process.env.OPENAI_BASE_URL
      )
      break
    }

    case "openrouter": {
      const keys = (process.env.OPENROUTER_API_KEY || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
      if (keys.length === 0)
        throw new AIError("OPENROUTER_API_KEY not configured")
      provider = new OpenAIProvider(
        keys,
        process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash",
        process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        {
          "HTTP-Referer":
            process.env.OPENROUTER_REFERER || "https://femigo.app",
          "X-Title": process.env.OPENROUTER_APP_NAME || "Femigo",
        },
        "openrouter"
      )
      break
    }

    case "deepseek": {
      const keys = (process.env.DEEPSEEK_API_KEY || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
      if (keys.length === 0)
        throw new AIError("DEEPSEEK_API_KEY not configured")
      provider = new OpenAIProvider(
        keys,
        process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
        undefined,
        "deepseek"
      )
      break
    }

    case "groq": {
      const keys = (process.env.GROQ_API_KEY || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
      if (keys.length === 0)
        throw new AIError("GROQ_API_KEY not configured")
      provider = new OpenAIProvider(
        keys,
        process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
        undefined,
        "groq"
      )
      break
    }

    default:
      throw new AIError(`Unknown AI provider: ${type}`)
  }

  return provider
}

export function resetAIProvider(): void {
  provider = null
}
