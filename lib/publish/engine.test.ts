import { describe, it, expect, vi, beforeEach } from "vitest"
import type { IPlatformConnector } from "./connectors/index"

const { mockConnector } = vi.hoisted(() => {
  const mc: IPlatformConnector = {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "message-circle",
    publish: vi.fn(),
  }
  return { mockConnector: mc }
})

const { mockCreateJob, mockUpdateJob } = vi.hoisted(() => ({
  mockCreateJob: vi.fn(),
  mockUpdateJob: vi.fn(),
}))

vi.mock("./connectors/index", () => ({
  getConnector: vi.fn(() => mockConnector),
  registerConnector: vi.fn(),
}))

vi.mock("./db", () => ({
  createPublishJob: mockCreateJob,
  updatePublishJob: mockUpdateJob,
}))

vi.mock("./metrics", () => ({
  incrementMetric: vi.fn(),
}))

import { publishSingle, publishAll } from "./engine"

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateJob.mockImplementation(async () => crypto.randomUUID())
})

describe("publishSingle", () => {
  it("returns success when connector publishes successfully", async () => {
    mockConnector.publish.mockResolvedValue({ success: true, messageId: "msg_1" })

    const result = await publishSingle("user1", "Hello", "whatsapp")

    expect(result.success).toBe(true)
    expect(result.messageId).toBe("msg_1")
    expect(mockConnector.publish).toHaveBeenCalledWith("user1", "Hello")
  })

  it("returns error when connector returns failure", async () => {
    mockConnector.publish.mockResolvedValue({ success: false, error: "API error" })

    const result = await publishSingle("user1", "Hello", "whatsapp")

    expect(result.success).toBe(false)
    expect(result.error).toBe("API error")
  })

  it("propagates error when connector throws", async () => {
    mockConnector.publish.mockRejectedValue(new Error("Network error"))

    await expect(publishSingle("user1", "Hello", "whatsapp")).rejects.toThrow("Network error")
  })

  it("returns success for known platform", async () => {
    mockConnector.publish.mockResolvedValue({ success: true, messageId: "msg_1" })
    const result = await publishSingle("user1", "Hello", "whatsapp")
    expect(result.success).toBe(true)
  })
})

describe("publishAll", () => {
  it("creates jobs and processes them", async () => {
    const items = [
      { content: "Message 1" },
      { content: "Message 2" },
    ]
    mockCreateJob
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce("job_2")
    mockConnector.publish.mockResolvedValue({ success: true, messageId: "msg_ok" })

    const jobs = await publishAll({ userId: "user1", items, config: { interSendDelayMs: 0 } })

    expect(jobs).toHaveLength(2)
    expect(jobs[0].status).toBe("sent")
    expect(jobs[1].status).toBe("sent")
    expect(mockConnector.publish).toHaveBeenCalledTimes(2)
    expect(mockUpdateJob).toHaveBeenCalledTimes(4)
  })

  it("marks job as failed on connector failure", async () => {
    const items = [{ content: "Message 1" }]
    mockCreateJob.mockResolvedValueOnce("job_1")
    mockConnector.publish.mockResolvedValue({ success: false, error: "Send failed" })

    const jobs = await publishAll({ userId: "user1", items, config: { interSendDelayMs: 0 } })

    expect(jobs[0].status).toBe("failed")
    expect(jobs[0].error).toBe("Send failed")
    expect(mockUpdateJob).toHaveBeenCalledWith("job_1", expect.objectContaining({ status: "failed" }))
  })

  it("marks job as failed on connector throw", async () => {
    const items = [{ content: "Message 1" }]
    mockCreateJob.mockResolvedValueOnce("job_1")
    mockConnector.publish.mockRejectedValue(new Error("Network error"))

    const jobs = await publishAll({ userId: "user1", items, config: { interSendDelayMs: 0 } })

    expect(jobs[0].status).toBe("failed")
    expect(jobs[0].error).toBe("Network error")
  })

  it("calls onProgress callback after each item", async () => {
    const items = [
      { content: "Message 1" },
      { content: "Message 2" },
      { content: "Message 3" },
    ]
    mockCreateJob
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce("job_2")
      .mockResolvedValueOnce("job_3")
    mockConnector.publish.mockResolvedValue({ success: true, messageId: "msg_ok" })
    const onProgress = vi.fn()

    await publishAll({ userId: "user1", items, config: { interSendDelayMs: 0 }, onProgress })

    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3, expect.anything())
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3, expect.anything())
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3, expect.anything())
  })

  it("calls onError callback on failure", async () => {
    const items = [{ content: "Message 1" }]
    mockCreateJob.mockResolvedValueOnce("job_1")
    mockConnector.publish.mockResolvedValue({ success: false, error: "Send failed" })
    const onError = vi.fn()

    await publishAll({ userId: "user1", items, config: { interSendDelayMs: 0 }, onError })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }))
  })

  it("handles empty items array gracefully", async () => {
    const jobs = await publishAll({ userId: "user1", items: [], config: { interSendDelayMs: 0 } })

    expect(jobs).toHaveLength(0)
    expect(mockCreateJob).not.toHaveBeenCalled()
    expect(mockConnector.publish).not.toHaveBeenCalled()
  })

  it("preserves recipientPhone in jobs", async () => {
    const items = [{ content: "Message 1" }]
    mockCreateJob.mockResolvedValueOnce("job_1")
    mockConnector.publish.mockResolvedValue({ success: true, messageId: "msg_ok" })

    const jobs = await publishAll({
      userId: "user1",
      items,
      recipientPhone: "+2348012345678",
      config: { interSendDelayMs: 0 },
    })

    expect(jobs[0].recipientPhone).toBe("+2348012345678")
    expect(mockCreateJob).toHaveBeenCalledWith(
      expect.objectContaining({ recipientPhone: "+2348012345678" })
    )
  })

  it("processes items sequentially with delay between", async () => {
    const items = [
      { content: "Message 1" },
      { content: "Message 2" },
    ]
    mockCreateJob
      .mockResolvedValueOnce("job_1")
      .mockResolvedValueOnce("job_2")
    mockConnector.publish.mockResolvedValue({ success: true, messageId: "msg_ok" })

    const start = Date.now()
    await publishAll({ userId: "user1", items, config: { interSendDelayMs: 100 } })
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(90)
    expect(mockConnector.publish).toHaveBeenCalledTimes(2)
  })
})
