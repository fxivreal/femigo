"use client"

import { Check, Loader2 } from "lucide-react"

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  whatsapp_status: "Status",
}

type StepStatus = "pending" | "active" | "done" | "error"

interface ProgressStep {
  id: string
  label: string
  status: StepStatus
}

export function GenerationProgress({
  platforms,
  startedPlatforms,
  completedPlatforms,
  errors,
}: {
  platforms: string[]
  startedPlatforms: Set<string>
  completedPlatforms: Set<string>
  errors: Set<string>
}) {
  const steps: ProgressStep[] = [
    {
      id: "analyzing",
      label: "Analyzing content",
      status: completedPlatforms.has("analyzing") ? "done" : "active",
    },
    ...platforms.map((p) => ({
      id: p,
      label: platformLabels[p] || p,
      status: errors.has(p)
        ? ("error" as const)
        : completedPlatforms.has(p)
          ? ("done" as const)
          : startedPlatforms.has(p)
            ? ("active" as const)
            : ("pending" as const),
    })),
  ]

  const total = platforms.length
  const done = completedPlatforms.size
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Generating your content</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {done}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted mb-5 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step list */}
      <div className="space-y-0">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3 py-1.5">
            {/* Icon */}
            <div className="size-5 shrink-0 flex items-center justify-center">
              {step.status === "done" && (
                <div className="size-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="size-3 text-white" />
                </div>
              )}
              {step.status === "active" && (
                <div className="size-4 rounded-full border-2 border-primary flex items-center justify-center">
                  <div className="size-1.5 rounded-full bg-primary animate-ping" />
                </div>
              )}
              {step.status === "error" && (
                <div className="size-4 rounded-full bg-destructive flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">!</span>
                </div>
              )}
              {step.status === "pending" && (
                <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
              )}
            </div>

            {/* Label */}
            <span
              className={`text-sm transition-colors ${
                step.status === "done"
                  ? "text-foreground"
                  : step.status === "active"
                    ? "text-foreground font-medium"
                    : step.status === "error"
                      ? "text-destructive"
                      : "text-muted-foreground"
              }`}
            >
              {step.label}
              {step.status === "active" && step.id !== "analyzing" && (
                <span className="ml-1.5 inline-flex">
                  <Loader2 className="size-3 animate-spin text-primary" />
                </span>
              )}
            </span>

            {step.status === "error" && (
              <span className="text-[10px] text-destructive ml-auto">Failed</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
