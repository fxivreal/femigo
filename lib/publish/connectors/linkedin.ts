import type { IPlatformConnector } from "./index"
import type { PublishResult } from "../types"
import { getLinkedInService, getLinkedInAuth } from "@/lib/linkedin"

export const LinkedInConnector: IPlatformConnector = {
  id: "linkedin",
  label: "LinkedIn",
  icon: "linkedin",

  async publish(userId: string, content: string): Promise<PublishResult> {
    try {
      const auth = await getLinkedInAuth(userId)
      if (!auth) {
        return { success: false, error: "LinkedIn not connected. Connect in Settings > Connections." }
      }

      if (auth.expiresAt < new Date()) {
        return { success: false, error: "LinkedIn access token expired. Reconnect in Settings > Connections." }
      }

      const service = getLinkedInService()
      const result = await service.post(userId, { text: content }, auth.accessToken)

      if (!result.success) {
        return { success: false, error: result.error || "LinkedIn post failed" }
      }

      return { success: true, messageId: result.postId }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      return { success: false, error: message }
    }
  },
}
