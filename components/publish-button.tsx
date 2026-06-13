"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { Send, Loader2, MessageCircle, Check } from "lucide-react"
import { RecipientManager } from "@/components/recipient-manager"
import { PublishQueueStatus } from "@/components/publish-queue-status"
import type { Recipient } from "@/lib/publish/types"

interface PublishItem {
  content: string
  label?: string
  platformType?: string
}

interface PublishButtonProps {
  items: PublishItem[]
  buttonLabel?: string
  buttonSize?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost"
  className?: string
  onPublishComplete?: (results: { id: string; status: string; error?: string }[]) => void
}

export function PublishButton({
  items,
  buttonLabel,
  buttonSize = "sm",
  variant = "default",
  className,
  onPublishComplete,
}: PublishButtonProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)
  const [delay, setDelay] = useState(3)
  const [queueResults, setQueueResults] = useState<{ id: string; status: string; error?: string }[]>([])
  const [completedCount, setCompletedCount] = useState(0)

  const handlePublish = async () => {
    if (!user) return
    if (!selectedRecipient) {
      toast.error("Select a recipient first")
      return
    }

    setPublishing(true)
    setQueueResults(items.map(() => ({ id: "", status: "queued" })))
    setCompletedCount(0)

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          items: items.map((item) => ({
            content: item.content,
            label: item.label,
            platformType: item.platformType,
          })),
          recipientPhone: selectedRecipient.phoneNumber,
          interSendDelayMs: delay * 1000,
        }),
      })

      const data = await res.json()

      if (data.jobs) {
        const results = data.jobs.map((j: { id: string; status: string; error?: string }) => ({
          id: j.id,
          status: j.status,
          error: j.error,
        }))
        setQueueResults(results)
        const sentCount = results.filter((r: { status: string }) => r.status === "sent").length
        setCompletedCount(sentCount)

        if (sentCount === items.length) {
          toast.success("All items published!")
        } else {
          toast.info(`${sentCount}/${items.length} published`)
        }

        onPublishComplete?.(results)
      }
    } catch {
      toast.error("Publish failed. Check your connection.")
      setQueueResults(items.map(() => ({ id: "", status: "failed", error: "Network error" })))
    } finally {
      setPublishing(false)
    }
  }

  const allDone = queueResults.length > 0 && queueResults.every((r) => r.status === "sent")
  const hasResults = queueResults.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={buttonSize}
          variant={variant}
          className={className || "bg-green-600 hover:bg-green-700 text-white"}
          disabled={items.length === 0}
        >
          {hasResults && allDone ? (
            <Check className="size-3.5 mr-1" />
          ) : (
            <Send className="size-3.5 mr-1" />
          )}
          {buttonLabel || (allDone ? "Published" : publishing ? "Publishing..." : `Publish (${items.length})`)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="size-4 text-green-600" />
            Publish to WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Recipient</Label>
            <RecipientManager
              compact
              onSelect={(r) => setSelectedRecipient(r)}
              selectedId={selectedRecipient?.id || null}
            />
          </div>

          {/* Delay slider */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Inter-send delay: {delay}s
            </Label>
            <Slider
              value={[delay]}
              onValueChange={([v]) => setDelay(v)}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {delay === 1 && "Fast — 1 second between each message"}
              {delay === 3 && "Standard — 3 seconds between each message (recommended)"}
              {delay === 5 && "Safe — 5 seconds between each message"}
              {delay >= 7 && "Slow — {delay} seconds between each message"}
            </p>
          </div>

          {/* Item count */}
          <p className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} to send
          </p>

          {/* Queue results */}
          {hasResults && (
            <PublishQueueStatus results={queueResults} />
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePublish}
              disabled={publishing || !selectedRecipient || allDone}
            >
              {publishing ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : allDone ? (
                <Check className="size-3.5 mr-1" />
              ) : (
                <Send className="size-3.5 mr-1" />
              )}
              {publishing ? `Publishing...` : allDone ? "Done" : `Publish All`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
