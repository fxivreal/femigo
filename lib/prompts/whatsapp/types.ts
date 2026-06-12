import type { PlatformPrompt } from "../shared"
import { whatsappStatusPrompt } from "../whatsapp-status"
import { promotionalPrompt } from "./promotional"
import { quickReplyPrompt } from "./quick-reply"
import { broadcastPrompt } from "./broadcast"
import { followUpPrompt } from "./follow-up"

export type WhatsAppType = "status" | "promotional" | "quick-reply" | "broadcast" | "follow-up"

export interface WhatsAppContentType {
  id: WhatsAppType
  label: string
  description: string
  icon: string
  count: number
}

export const whatsappContentTypes: WhatsAppContentType[] = [
  { id: "status", label: "Status", description: "5-frame story progression for ephemeral posts", icon: "📱", count: 5 },
  { id: "promotional", label: "Promotional", description: "Single product/offer announcement message", icon: "🏷️", count: 1 },
  { id: "quick-reply", label: "Quick Reply Templates", description: "3-5 Q&A pairs for common customer DMs", icon: "💬", count: 1 },
  { id: "broadcast", label: "Broadcast", description: "Single warm broadcast message for groups", icon: "📢", count: 1 },
  { id: "follow-up", label: "Follow-up", description: "Friendly customer check-in message", icon: "🤝", count: 1 },
]

export const whatsappPromptRegistry: Record<string, PlatformPrompt> = {
  status: whatsappStatusPrompt,
  promotional: promotionalPrompt,
  "quick-reply": quickReplyPrompt,
  broadcast: broadcastPrompt,
  "follow-up": followUpPrompt,
}
