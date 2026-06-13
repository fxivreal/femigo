import type { PublishJob, PublishQueueConfig, PublishResult, QueuedPublish } from "./types"
import { getConnector, registerConnector } from "./connectors/index"
import { WhatsAppConnector } from "./connectors/whatsapp"
import { incrementMetric } from "./metrics"
import * as db from "./db"

registerConnector(WhatsAppConnector)

export const DEFAULT_QUEUE_CONFIG: PublishQueueConfig = {
  interSendDelayMs: 3000,
  maxBatchSize: 50,
}

export interface PublishAllOptions {
  userId: string
  items: { content: string; label?: string; platformType?: string }[]
  recipientPhone?: string | null
  config?: Partial<PublishQueueConfig>
  onProgress?: (completed: number, total: number, current: PublishJob) => void
  onError?: (job: PublishJob) => void
}

export async function publishSingle(
  userId: string,
  content: string,
  platform: "whatsapp"
): Promise<PublishResult> {
  const connector = getConnector(platform)
  if (!connector) {
    return { success: false, error: `No connector for platform: ${platform}` }
  }

  return connector.publish(userId, content)
}

export async function publishAll(options: PublishAllOptions): Promise<PublishJob[]> {
  const { userId, items, recipientPhone, config, onProgress, onError } = options
  const queueConfig = { ...DEFAULT_QUEUE_CONFIG, ...config }

  const jobs: PublishJob[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const jobId = await db.createPublishJob({
      userId,
      platform: "whatsapp",
      content: item.content,
      label: item.label,
      platformType: item.platformType,
      recipientPhone: recipientPhone || null,
      status: "queued",
      attempt: 0,
      scheduledAt: new Date(Date.now() + i * queueConfig.interSendDelayMs),
    })
    jobs.push({
      id: jobId,
      userId,
      platform: "whatsapp",
      content: item.content,
      label: item.label,
      platformType: item.platformType,
      recipientPhone: recipientPhone || null,
      status: "queued",
      attempt: 0,
      scheduledAt: new Date(Date.now() + i * queueConfig.interSendDelayMs),
      createdAt: new Date(),
    })
  }

  processQueue(jobs, queueConfig, onProgress, onError).catch(() => {})

  return jobs
}

async function processQueue(
  jobs: PublishJob[],
  config: PublishQueueConfig,
  onProgress?: (completed: number, total: number, current: PublishJob) => void,
  onError?: (job: PublishJob) => void
): Promise<void> {
  const connector = getConnector("whatsapp")
  if (!connector) return

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]

    const now = Date.now()
    const scheduled = job.scheduledAt.getTime()
    if (scheduled > now) {
      await sleep(scheduled - now)
    }

    const queuedJob: QueuedPublish = {
      job,
      status: "queued",
      scheduledTime: job.scheduledAt,
      attempt: 0,
    }

    queuedJob.status = "sending"
    await db.updatePublishJob(job.id, { status: "sending" })

    try {
      const result = await connector.publish(job.userId, job.content, job.recipientPhone)

      if (result.success) {
        queuedJob.status = "sent"
        await db.updatePublishJob(job.id, {
          status: "sent",
          messageId: result.messageId,
          sentAt: new Date(),
        })
        job.status = "sent"
        job.messageId = result.messageId
        job.sentAt = new Date()
        await incrementMetric(job.userId, "publish_sent")
      } else {
        queuedJob.status = "failed"
        await db.updatePublishJob(job.id, {
          status: "failed",
          error: result.error || "Unknown error",
          attempt: 1,
        })
        job.status = "failed"
        job.error = result.error || "Unknown error"
        onError?.(job)
        await incrementMetric(job.userId, "publish_failed")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      queuedJob.status = "failed"
      await db.updatePublishJob(job.id, {
        status: "failed",
        error: message,
        attempt: 1,
      })
      job.status = "failed"
      job.error = message
      onError?.(job)
      await incrementMetric(job.userId, "publish_failed")
    }

    onProgress?.(i + 1, jobs.length, job)

    if (i < jobs.length - 1 && config.interSendDelayMs > 0) {
      await sleep(config.interSendDelayMs)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
