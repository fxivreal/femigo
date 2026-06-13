"use client"

import { Check, X, Loader2, Clock } from "lucide-react"

interface QueueResult {
  id: string
  status: string
  error?: string
}

interface PublishQueueStatusProps {
  results: QueueResult[]
}

export function PublishQueueStatus({ results }: PublishQueueStatusProps) {
  const sentCount = results.filter((r) => r.status === "sent").length
  const failedCount = results.filter((r) => r.status === "failed").length
  const queuedCount = results.filter((r) => r.status === "queued" || r.status === "sending").length

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {sentCount} sent · {failedCount} failed
          {queuedCount > 0 && ` · ${queuedCount} pending`}
        </span>
        <span className="text-muted-foreground">{results.length} total</span>
      </div>

      <div className="space-y-1">
        {results.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {r.status === "sent" && <Check className="size-3 text-green-600 shrink-0" />}
            {r.status === "failed" && <X className="size-3 text-destructive shrink-0" />}
            {r.status === "sending" && <Loader2 className="size-3 animate-spin text-muted-foreground shrink-0" />}
            {(r.status === "queued" || !["sent", "failed", "sending"].includes(r.status)) && (
              <Clock className="size-3 text-muted-foreground shrink-0" />
            )}
            <span className={r.status === "failed" ? "text-destructive" : "text-foreground"}>
              Item {i + 1}
            </span>
            {r.status === "sent" && <span className="text-green-600 ml-auto">Sent</span>}
            {r.status === "failed" && (
              <span className="text-destructive ml-auto truncate max-w-[120px]" title={r.error}>
                {r.error || "Failed"}
              </span>
            )}
            {r.status === "sending" && <span className="text-muted-foreground ml-auto">Sending...</span>}
            {r.status === "queued" && <span className="text-muted-foreground ml-auto">Queued</span>}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {results.length > 0 && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${(sentCount / results.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
