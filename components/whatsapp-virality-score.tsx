"use client"

import { useState, useEffect } from "react"
import { analyzeVirality, type ViralityResult, type ViralityScores } from "@/lib/whatsapp/virality"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Sparkles, Lightbulb, BrainCircuit } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Color helpers ──

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-yellow-600"
  if (score >= 40) return "text-orange-500"
  return "text-red-500"
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-500"
  if (score >= 60) return "bg-yellow-500"
  if (score >= 40) return "bg-orange-500"
  return "bg-red-500"
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent"
  if (score >= 80) return "Great"
  if (score >= 70) return "Good"
  if (score >= 60) return "Fair"
  if (score >= 40) return "Needs Work"
  return "Low"
}

// ── Props ──

interface WhatsAppViralityScoreProps {
  content: string
  /** Show compact version (inline with other content) */
  compact?: boolean
  /** Allow AI-enhanced analysis */
  allowAI?: boolean
}

// ── Component ──

export function WhatsAppViralityScore({ content, compact = false, allowAI = false }: WhatsAppViralityScoreProps) {
  const [result, setResult] = useState<ViralityResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [useAI, setUseAI] = useState(false)
  const [aiRequested, setAiRequested] = useState(false)

  useEffect(() => {
    if (!content) return
    setAnalyzing(true)
    setAiRequested(false)
    const run = async () => {
      const res = await analyzeVirality(content, false)
      setResult(res)
      setAnalyzing(false)
    }
    // Small delay to avoid flicker on mount
    const timer = setTimeout(run, 100)
    return () => clearTimeout(timer)
  }, [content])

  const handleAI = async () => {
    if (!content || aiRequested) return
    setAiRequested(true)
    setUseAI(true)
    setAnalyzing(true)
    const res = await analyzeVirality(content, true)
    setResult(res)
    setAnalyzing(false)
  }

  if (!result) return null

  const dims: { key: keyof ViralityScores; label: string }[] = [
    { key: "forwardability", label: "Forwardability" },
    { key: "readability", label: "Readability" },
    { key: "emotionalImpact", label: "Emotional Impact" },
    { key: "curiosityLevel", label: "Curiosity Level" },
    { key: "sharePotential", label: "Share Potential" },
  ]

  // ── Compact inline version ──
  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span className={cn("text-lg font-bold", scoreColor(result.overall))}>
          {result.overall}
        </span>
        <div className="flex gap-2 text-[10px]">
          {dims.map((d) => (
            <span key={d.key} className={cn("font-medium", scoreColor(result.scores[d.key]))}>
              {d.label.slice(0, 4)}: {result.scores[d.key]}
            </span>
          ))}
        </div>
        {!aiRequested && allowAI && (
          <button
            type="button"
            onClick={handleAI}
            className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            AI
          </button>
        )}
      </div>
    )
  }

  // ── Full card version ──
  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="py-3 border-b border-green-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="size-4 text-yellow-500" />
            Virality Score
          </CardTitle>
          <div className="flex items-center gap-2">
            {result.source === "ai" && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <BrainCircuit className="size-3" />
                AI Analysis
              </span>
            )}
            <span className={cn("text-xl font-bold", scoreColor(result.overall))}>
              {result.overall}
            </span>
            <span className="text-[10px] text-muted-foreground">{scoreLabel(result.overall)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3 pb-3 space-y-3">
        {/* Score bars */}
        <div className="space-y-2">
          {dims.map((d) => {
            const score = result.scores[d.key]
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className={cn("font-medium", scoreColor(score))}>{score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", scoreBg(score))}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Overall gauge */}
        <div className="pt-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", scoreBg(result.overall))}
              style={{ width: `${result.overall}%` }}
            />
          </div>
        </div>

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <div className="pt-1 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Improvement suggestions
            </p>
            {result.suggestions.map((s, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-green-600 mt-0.5 shrink-0">•</span>
                {s}
              </p>
            ))}
          </div>
        )}

        {/* AI analyze button */}
        {!aiRequested && allowAI && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={handleAI}
              disabled={analyzing}
            >
              {analyzing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              Analyze with AI
            </Button>
          </div>
        )}

        {analyzing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {useAI ? "AI analysis in progress..." : "Analyzing..."}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
