// ── WhatsApp Business API Config ──
export interface WhatsAppConfig {
  businessPhoneNumberId?: string
  accessToken?: string
  webhookVerifyToken?: string
  apiVersion?: string
}

// ── Message Status ──
export type MessageStatus = "draft" | "sent" | "delivered" | "read" | "failed"

// ── Send Result ──
export interface SendResult {
  messageId: string
  status: MessageStatus
  timestamp: Date
  error?: string
}

// ── Campaign ──
export interface WACampaignInput {
  name: string
  sourceContent: string
  goal?: string | null
  audience?: string | null
  statusCount?: number
  assetCount: number
}

export interface WACampaign extends WACampaignInput {
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface WACampaignDoc extends WACampaign {
  id: string
}

// ── Status ──
export interface WAStatusInput {
  campaignId?: string | null
  content: string
  order: number
}

export interface WAStatus extends WAStatusInput {
  userId: string
  status: MessageStatus
  messageId?: string
  sentAt?: Date | null
  createdAt: Date
}

export interface WAStatusDoc extends WAStatus {
  id: string
}

// ── Broadcast ──
export type BroadcastCategory = "EDUCATIONAL" | "PROMOTION" | "ANNOUNCEMENT" | "UPDATE"

export interface WABroadcastInput {
  campaignId?: string | null
  broadcastType: BroadcastCategory
  tone: string
  content: string
}

export interface WABroadcast extends WABroadcastInput {
  userId: string
  status: MessageStatus
  messageId?: string
  sentAt?: Date | null
  createdAt: Date
}

export interface WABroadcastDoc extends WABroadcast {
  id: string
}

// ── Funnel ──
export type FunnelStage = "AWARENESS" | "INTEREST" | "TRUST" | "OFFER" | "URGENCY" | "FOLLOWUP"

export interface WAFunnelInput {
  campaignId?: string | null
  stage: FunnelStage
  tone: string
  content: string
  order: number
}

export interface WAFunnel extends WAFunnelInput {
  userId: string
  status: MessageStatus
  messageId?: string
  sentAt?: Date | null
  createdAt: Date
}

export interface WAFunnelDoc extends WAFunnel {
  id: string
}

// ── Follow-up ──
export type FollowUpType =
  | "NEW_LEAD"
  | "QUOTE_FOLLOWUP"
  | "ABANDONED_PURCHASE"
  | "CUSTOMER_REENGAGEMENT"
  | "POST_PURCHASE"
  | "TESTIMONIAL_REQUEST"

export interface WAFollowUpInput {
  campaignId?: string | null
  followupType: FollowUpType
  tone: string
  variation: number
  content: string
}

export interface WAFollowUp extends WAFollowUpInput {
  userId: string
  status: MessageStatus
  messageId?: string
  sentAt?: Date | null
  createdAt: Date
}

export interface WAFollowUpDoc extends WAFollowUp {
  id: string
}
