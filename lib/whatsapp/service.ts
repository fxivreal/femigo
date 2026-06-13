import type {
  WhatsAppConfig,
  SendResult,
  MessageStatus,
  WACampaignInput,
  WAStatusInput,
  WABroadcastInput,
  WAFunnelInput,
  WAFollowUpInput,
} from "./types"
import * as db from "./db"

// ── Service Interface ──

export interface IWhatsAppService {
  /** Send a single status message */
  sendStatus(userId: string, data: WAStatusInput, recipientPhone?: string): Promise<SendResult>
  /** Send multiple statuses in batch */
  sendStatuses(userId: string, items: WAStatusInput[], recipientPhone?: string): Promise<SendResult[]>
  /** Send a broadcast message */
  sendBroadcast(userId: string, data: WABroadcastInput, recipientPhone?: string): Promise<SendResult>
  /** Send a funnel step */
  sendFunnelStep(userId: string, data: WAFunnelInput, recipientPhone?: string): Promise<SendResult>
  /** Send a follow-up message */
  sendFollowUp(userId: string, data: WAFollowUpInput, recipientPhone?: string): Promise<SendResult>
  /** Save a campaign and persist all its assets to the database */
  saveCampaign(
    userId: string,
    campaign: WACampaignInput,
    assets: {
      statuses?: WAStatusInput[]
      broadcasts?: WABroadcastInput[]
      funnels?: WAFunnelInput[]
      followups?: WAFollowUpInput[]
    }
  ): Promise<{ campaignId: string; assetIds: Record<string, string[]> }>
  /** Check the delivery status of a message */
  checkMessageStatus(messageId: string): Promise<MessageStatus>
}

// ── Mock Service (current — saves to Firestore only) ──

export class MockWhatsAppService implements IWhatsAppService {
  async sendStatus(userId: string, data: WAStatusInput, _recipientPhone?: string): Promise<SendResult> {
    const id = await db.createStatus(userId, data)
    return {
      messageId: `mock_status_${id}`,
      status: "draft",
      timestamp: new Date(),
    }
  }

  async sendStatuses(userId: string, items: WAStatusInput[], _recipientPhone?: string): Promise<SendResult[]> {
    const ids = await db.createStatuses(userId, items)
    return ids.map((id) => ({
      messageId: `mock_status_${id}`,
      status: "draft" as MessageStatus,
      timestamp: new Date(),
    }))
  }

  async sendBroadcast(userId: string, data: WABroadcastInput, _recipientPhone?: string): Promise<SendResult> {
    const id = await db.createBroadcast(userId, data)
    return {
      messageId: `mock_broadcast_${id}`,
      status: "draft",
      timestamp: new Date(),
    }
  }

  async sendFunnelStep(userId: string, data: WAFunnelInput, _recipientPhone?: string): Promise<SendResult> {
    const id = await db.createFunnelStep(userId, data)
    return {
      messageId: `mock_funnel_${id}`,
      status: "draft",
      timestamp: new Date(),
    }
  }

  async sendFollowUp(userId: string, data: WAFollowUpInput, _recipientPhone?: string): Promise<SendResult> {
    const id = await db.createFollowUp(userId, data)
    return {
      messageId: `mock_followup_${id}`,
      status: "draft",
      timestamp: new Date(),
    }
  }

  async saveCampaign(
    userId: string,
    campaign: WACampaignInput,
    assets: {
      statuses?: WAStatusInput[]
      broadcasts?: WABroadcastInput[]
      funnels?: WAFunnelInput[]
      followups?: WAFollowUpInput[]
    }
  ): Promise<{ campaignId: string; assetIds: Record<string, string[]> }> {
    const campaignId = await db.createCampaign(userId, campaign)
    const assetIds: Record<string, string[]> = {}

    if (assets.statuses?.length) {
      const results = await Promise.all(
        assets.statuses.map((s) => db.createStatus(userId, { ...s, campaignId }))
      )
      assetIds.statuses = results
    }

    if (assets.broadcasts?.length) {
      const results = await Promise.all(
        assets.broadcasts.map((b) => db.createBroadcast(userId, { ...b, campaignId }))
      )
      assetIds.broadcasts = results
    }

    if (assets.funnels?.length) {
      const results = await Promise.all(
        assets.funnels.map((f) => db.createFunnelStep(userId, { ...f, campaignId }))
      )
      assetIds.funnels = results
    }

    if (assets.followups?.length) {
      const results = await Promise.all(
        assets.followups.map((f) => db.createFollowUp(userId, { ...f, campaignId }))
      )
      assetIds.followups = results
    }

    return { campaignId, assetIds }
  }

  async checkMessageStatus(_messageId: string): Promise<MessageStatus> {
    return "draft"
  }
}

// ── WhatsApp Business API Service ──

export class WhatsAppBusinessApiService implements IWhatsAppService {
  private config: WhatsAppConfig

  constructor(config: WhatsAppConfig) {
    this.config = config
  }

  private genId(): string {
    return `wamid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  private async postToApi(text: string, recipientPhone?: string): Promise<{ messageId?: string; error?: string }> {
    const phoneNumberId = this.config.businessPhoneNumberId
    const accessToken = this.config.accessToken
    const apiVersion = this.config.apiVersion || "v21.0"

    if (!phoneNumberId || !accessToken) {
      return { error: "WhatsApp Business API not configured. Set WABA_PHONE_NUMBER_ID and WABA_ACCESS_TOKEN." }
    }

    if (!recipientPhone) {
      return { error: "No recipient phone number provided." }
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipientPhone,
            type: "text",
            text: { body: text },
          }),
        }
      )

      const json = await res.json()

      if (!res.ok || json.error) {
        return { error: json.error?.message || `HTTP ${res.status}: ${res.statusText}` }
      }

      const messageId: string = json.messages?.[0]?.id || this.genId()
      return { messageId }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error"
      return { error: message }
    }
  }

  async sendStatus(userId: string, data: WAStatusInput, recipientPhone?: string): Promise<SendResult> {
    const dbId = await db.createStatus(userId, data)

    if (recipientPhone) {
      const apiResult = await this.postToApi(data.content, recipientPhone)
      if (apiResult.error) {
        await db.updateStatus(dbId, { status: "failed" })
        return { messageId: this.genId(), status: "failed", timestamp: new Date(), error: apiResult.error }
      }
      const messageId = apiResult.messageId || this.genId()
      await db.updateStatus(dbId, { status: "sent", messageId })
      return { messageId, status: "sent", timestamp: new Date() }
    }

    return { messageId: this.genId(), status: "draft", timestamp: new Date() }
  }

  async sendStatuses(userId: string, items: WAStatusInput[], recipientPhone?: string): Promise<SendResult[]> {
    return Promise.all(items.map((item) => this.sendStatus(userId, item, recipientPhone)))
  }

  async sendBroadcast(userId: string, data: WABroadcastInput, recipientPhone?: string): Promise<SendResult> {
    const dbId = await db.createBroadcast(userId, data)

    if (recipientPhone) {
      const apiResult = await this.postToApi(data.content, recipientPhone)
      if (apiResult.error) {
        await db.updateBroadcast(dbId, { status: "failed" })
        return { messageId: this.genId(), status: "failed", timestamp: new Date(), error: apiResult.error }
      }
      const messageId = apiResult.messageId || this.genId()
      await db.updateBroadcast(dbId, { status: "sent", messageId })
      return { messageId, status: "sent", timestamp: new Date() }
    }

    return { messageId: this.genId(), status: "draft", timestamp: new Date() }
  }

  async sendFunnelStep(userId: string, data: WAFunnelInput, recipientPhone?: string): Promise<SendResult> {
    const dbId = await db.createFunnelStep(userId, data)

    if (recipientPhone) {
      const apiResult = await this.postToApi(data.content, recipientPhone)
      if (apiResult.error) {
        await db.updateFunnelStep(dbId, { status: "failed" })
        return { messageId: this.genId(), status: "failed", timestamp: new Date(), error: apiResult.error }
      }
      const messageId = apiResult.messageId || this.genId()
      await db.updateFunnelStep(dbId, { status: "sent", messageId })
      return { messageId, status: "sent", timestamp: new Date() }
    }

    return { messageId: this.genId(), status: "draft", timestamp: new Date() }
  }

  async sendFollowUp(userId: string, data: WAFollowUpInput, recipientPhone?: string): Promise<SendResult> {
    const dbId = await db.createFollowUp(userId, data)

    if (recipientPhone) {
      const apiResult = await this.postToApi(data.content, recipientPhone)
      if (apiResult.error) {
        await db.updateFollowUp(dbId, { status: "failed" })
        return { messageId: this.genId(), status: "failed", timestamp: new Date(), error: apiResult.error }
      }
      const messageId = apiResult.messageId || this.genId()
      await db.updateFollowUp(dbId, { status: "sent", messageId })
      return { messageId, status: "sent", timestamp: new Date() }
    }

    return { messageId: this.genId(), status: "draft", timestamp: new Date() }
  }

  async saveCampaign(
    userId: string,
    campaign: WACampaignInput,
    assets: {
      statuses?: WAStatusInput[]
      broadcasts?: WABroadcastInput[]
      funnels?: WAFunnelInput[]
      followups?: WAFollowUpInput[]
    }
  ): Promise<{ campaignId: string; assetIds: Record<string, string[]> }> {
    const campaignId = await db.createCampaign(userId, campaign)
    const assetIds: Record<string, string[]> = {}

    if (assets.statuses?.length) {
      const ids: string[] = []
      for (const s of assets.statuses) {
        const dbId = await db.createStatus(userId, { ...s, campaignId })
        await db.updateStatus(dbId, { status: "sent", messageId: this.genId() })
        ids.push(dbId)
      }
      assetIds.statuses = ids
    }

    if (assets.broadcasts?.length) {
      const ids = await Promise.all(
        assets.broadcasts.map(async (b) => {
          const dbId = await db.createBroadcast(userId, { ...b, campaignId })
          await db.updateBroadcast(dbId, { status: "sent", messageId: this.genId() })
          return dbId
        })
      )
      assetIds.broadcasts = ids
    }

    if (assets.funnels?.length) {
      const ids = await Promise.all(
        assets.funnels.map(async (f) => {
          const dbId = await db.createFunnelStep(userId, { ...f, campaignId })
          await db.updateFunnelStep(dbId, { status: "sent", messageId: this.genId() })
          return dbId
        })
      )
      assetIds.funnels = ids
    }

    if (assets.followups?.length) {
      const ids = await Promise.all(
        assets.followups.map(async (f) => {
          const dbId = await db.createFollowUp(userId, { ...f, campaignId })
          await db.updateFollowUp(dbId, { status: "sent", messageId: this.genId() })
          return dbId
        })
      )
      assetIds.followups = ids
    }

    return { campaignId, assetIds }
  }

  async checkMessageStatus(_messageId: string): Promise<MessageStatus> {
    // TODO: GET from WhatsApp API webhook data
    return "sent"
  }
}

// ── Factory ──

let cachedService: IWhatsAppService | null = null

export function getWhatsAppService(): IWhatsAppService {
  if (cachedService) return cachedService

  const provider = (process.env.NEXT_PUBLIC_WHATSAPP_PROVIDER || "mock").toLowerCase()

  switch (provider) {
    case "waba":
    case "whatsapp_business_api": {
      const config: WhatsAppConfig = {
        businessPhoneNumberId: process.env.WABA_PHONE_NUMBER_ID,
        accessToken: process.env.WABA_ACCESS_TOKEN,
        webhookVerifyToken: process.env.WABA_WEBHOOK_VERIFY_TOKEN,
        apiVersion: process.env.WABA_API_VERSION || "v21.0",
      }
      cachedService = new WhatsAppBusinessApiService(config)
      break
    }
    default: {
      cachedService = new MockWhatsAppService()
      break
    }
  }

  return cachedService
}

/** Force-reset the cached service (for testing or config changes) */
export function resetWhatsAppService(): void {
  cachedService = null
}
