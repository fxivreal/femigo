import type { IPlatformConnector } from "./index"
import type { PublishResult } from "../types"
import { getWhatsAppService } from "@/lib/whatsapp/service"

export const WhatsAppConnector: IPlatformConnector = {
  id: "whatsapp",
  label: "WhatsApp",
  icon: "message-circle",

  async publish(
    userId: string,
    content: string,
    recipientPhone?: string | null
  ): Promise<PublishResult> {
    try {
      const service = getWhatsAppService()

      const result = await service.sendStatus(userId, {
        content,
        order: 0,
      }, recipientPhone ?? undefined)

      if (result.status === "failed") {
        return { success: false, error: result.error || "Send failed" }
      }

      return { success: true, messageId: result.messageId }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      return { success: false, error: message }
    }
  },
}
