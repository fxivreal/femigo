import type { CoverageResult } from "@/lib/coverage"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

function ScoreRing({ score }: { score: number }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(score, 100) / 100) * circumference
  const color =
    score >= 80 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-destructive"

  return (
    <svg className="size-20 -rotate-90" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        className={color}
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function CoverageCard({ coverage }: { coverage: CoverageResult }) {
  if (!coverage || coverage.totalInsights === 0) return null

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Content Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          <div className="relative flex items-center justify-center">
            <ScoreRing score={coverage.coverageScore} />
            <span className="absolute text-lg font-bold tabular-nums">{coverage.coverageScore}%</span>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{coverage.usedInsights}</span> of{" "}
              <span className="font-medium text-foreground">{coverage.totalInsights}</span> insights used
            </p>
            <p className="text-xs text-muted-foreground">
              Higher means more of your original content is represented in generated posts.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
