import type { PlatformPrompt } from "../shared"
import { whatsappStatusPrompt } from "../whatsapp-status"
import { promotionalPrompt } from "./promotional"
import { quickReplyPrompt } from "./quick-reply"
import { broadcastV2Prompt } from "./broadcast-v2"
import { followUpV2Prompt } from "./follow-up-v2"
import { salesFunnelPrompt } from "./sales-funnel"

export type WhatsAppType = "status" | "promotional" | "quick-reply" | "broadcast" | "follow-up" | "sales-funnel"

export interface WhatsAppContentType {
  id: WhatsAppType
  label: string
  description: string
  icon: string
  count: number
}

export const whatsappContentTypes: WhatsAppContentType[] = [
  { id: "status", label: "Status", description: "Story progression for ephemeral WhatsApp posts", icon: "📱", count: 5 },
  { id: "promotional", label: "Promotional", description: "Single product/offer announcement message", icon: "🏷️", count: 1 },
  { id: "quick-reply", label: "Quick Reply Templates", description: "3-5 Q&A pairs for common customer DMs", icon: "💬", count: 1 },
  { id: "broadcast", label: "Broadcast", description: "Warm broadcast with 4 types × 3 versions", icon: "📢", count: 1 },
  { id: "follow-up", label: "Follow-up", description: "6 types × 3 tones × 3 variations each", icon: "🤝", count: 1 },
  { id: "sales-funnel", label: "Sales Funnel", description: "6-stage funnel with 3 tone versions", icon: "🔄", count: 1 },
]

export const whatsappPromptRegistry: Record<string, PlatformPrompt> = {
  status: whatsappStatusPrompt,
  promotional: promotionalPrompt,
  "quick-reply": quickReplyPrompt,
  broadcast: broadcastV2Prompt,
  "follow-up": followUpV2Prompt,
  "sales-funnel": salesFunnelPrompt,
}
