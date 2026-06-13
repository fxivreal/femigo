export type PublishPlatform = "whatsapp" | "linkedin" | "facebook" | "x" | "instagram" | "tiktok"

export type PublishJobStatus = "queued" | "sending" | "sent" | "failed"

export interface PublishJob {
  id: string
  userId: string
  platform: PublishPlatform
  platformType?: string
  content: string
  label?: string
  recipientPhone?: string | null
  status: PublishJobStatus
  messageId?: string
  error?: string
  attempt: number
  scheduledAt: Date
  sentAt?: Date | null
  createdAt: Date
}

export interface PlatformConnection {
  id?: string
  userId: string
  platform: PublishPlatform
  label: string
  connected: boolean
  accessToken?: string
  expiresAt?: Date | null
  createdAt: Date
}

export interface PublishResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface PublishQueueConfig {
  interSendDelayMs: number
  maxBatchSize: number
}

export interface QueuedPublish {
  job: PublishJob
  status: PublishJobStatus
  scheduledTime: Date
  attempt: number
}

export interface Recipient {
  id?: string
  userId?: string
  phoneNumber: string
  label: string
  createdAt?: Date
}
