import { NextResponse } from "next/server"
import { publishAll, DEFAULT_QUEUE_CONFIG } from "@/lib/publish/engine"
import type { PublishJob } from "@/lib/publish/types"

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, items, recipientPhone, interSendDelayMs } = body

    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "userId and items[] required" }, { status: 400 })
    }

    const config = interSendDelayMs
      ? { ...DEFAULT_QUEUE_CONFIG, interSendDelayMs }
      : DEFAULT_QUEUE_CONFIG

    const jobs: PublishJob[] = []

    await publishAll({
      userId,
      items,
      recipientPhone: recipientPhone || null,
      config,
      onProgress: (_completed, _total, job) => {
        jobs.push(job)
      },
    })

    return NextResponse.json({
      success: true,
      total: items.length,
      jobs: jobs.map((j) => ({
        id: j.id,
        status: j.status,
        error: j.error,
        messageId: j.messageId,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
