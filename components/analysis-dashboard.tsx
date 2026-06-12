"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Lightbulb, Layers, Target, FileText, Brain, MessageSquareQuote, AlertTriangle, BookOpen, BarChart3, ListChecks } from "lucide-react"
import type { ContentAnalysis, InsightCluster } from "@/lib/analysis-types"
import type { CoverageResult } from "@/lib/coverage"
import { flattenInsightsForClustering } from "@/lib/analyze"

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
      <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

function ExpandableSection({
  title,
  icon,
  defaultOpen,
  children,
}: {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen || false)
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-medium flex-1">{title}</span>
        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border">{children}</div>}
    </div>
  )
}

export function AnalysisDashboard({
  analysis,
  clusters,
  coverage,
  totalAssets,
}: {
  analysis: ContentAnalysis | null
  clusters: InsightCluster[] | null
  coverage: CoverageResult | null
  totalAssets: number
}) {
  if (!analysis) return null

  const allInsights = flattenInsightsForClustering(analysis)
  const totalInsights = allInsights.length
  const takeawayCount = analysis.keyTakeaways.length
  const clusterCount = clusters?.length ?? 0
  const score = coverage?.coverageScore ?? 0

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4" />
            Analysis Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Topic */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Main Topic</p>
            <p className="text-sm font-medium text-foreground">{analysis.mainTopic || "No topic extracted"}</p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              icon={<Brain className="size-5 text-indigo-600" />}
              label="Insights Found"
              value={totalInsights}
              color="bg-indigo-100"
            />
            <MetricCard
              icon={<Layers className="size-5 text-emerald-600" />}
              label="Clusters"
              value={clusterCount}
              color="bg-emerald-100"
            />
            <MetricCard
              icon={<FileText className="size-5 text-blue-600" />}
              label="Assets Generated"
              value={totalAssets}
              color="bg-blue-100"
            />
            <MetricCard
              icon={<Target className="size-5 text-amber-600" />}
              label="Coverage Score"
              value={`${score}%`}
              color="bg-amber-100"
            />
          </div>

          {/* Key Takeaways */}
          {takeawayCount > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <ListChecks className="size-3" />
                Key Takeaways
              </p>
              <ul className="space-y-1">
                {analysis.keyTakeaways.slice(0, 5).map((t, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-primary mt-1 shrink-0">•</span>
                    <span>{t}</span>
                  </li>
                ))}
                {takeawayCount > 5 && (
                  <li className="text-xs text-muted-foreground pl-4">
                    +{takeawayCount - 5} more takeaways
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Expandable Sections */}
          <div className="space-y-2 pt-2">
            {/* Content Clusters */}
            {clusters && clusters.length > 0 && (
              <ExpandableSection title="Content Clusters" icon={<Layers className="size-4 text-emerald-600" />}>
                <div className="space-y-3 pt-2">
                  {clusters.map((c) => (
                    <div key={c.id} className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {c.insightIndices.length} insight{c.insightIndices.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </ExpandableSection>
            )}

            {/* Extracted Insights */}
            <ExpandableSection title="Extracted Insights" icon={<Lightbulb className="size-4 text-indigo-600" />}>
              <div className="space-y-3 pt-2 max-h-80 overflow-y-auto">
                {analysis.keyTakeaways.length > 0 && (
                  <InsightGroup label="Key Takeaways" icon={<ListChecks className="size-3.5 text-primary" />} items={analysis.keyTakeaways} />
                )}
                {analysis.actionableAdvice.length > 0 && (
                  <InsightGroup label="Actionable Advice" icon={<Target className="size-3.5 text-emerald-600" />} items={analysis.actionableAdvice} />
                )}
                {analysis.statistics.length > 0 && (
                  <InsightGroup label="Statistics" icon={<BarChart3 className="size-3.5 text-blue-600" />} items={analysis.statistics.map((s) => `${s.value} — ${s.context}`)} />
                )}
                {analysis.quotes.length > 0 && (
                  <InsightGroup label="Quotes" icon={<MessageSquareQuote className="size-3.5 text-amber-600" />} items={analysis.quotes.map((q) => q.attribution ? `"${q.text}" — ${q.attribution}` : q.text)} />
                )}
                {analysis.examples.length > 0 && (
                  <InsightGroup label="Examples" icon={<BookOpen className="size-3.5 text-purple-600" />} items={analysis.examples} />
                )}
                {analysis.commonMistakes.length > 0 && (
                  <InsightGroup label="Common Mistakes" icon={<AlertTriangle className="size-3.5 text-red-600" />} items={analysis.commonMistakes} />
                )}
                {analysis.lessonsLearned.length > 0 && (
                  <InsightGroup label="Lessons Learned" icon={<BookOpen className="size-3.5 text-cyan-600" />} items={analysis.lessonsLearned} />
                )}
              </div>
            </ExpandableSection>

            {/* Content Opportunities */}
            <ExpandableSection title="Content Opportunities" icon={<Lightbulb className="size-4 text-amber-600" />}>
              <div className="space-y-3 pt-2">
                {analysis.contentHooks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Hooks to Try</p>
                    <ul className="space-y-1">
                      {analysis.contentHooks.map((h, i) => (
                        <li key={i} className="text-sm text-foreground flex gap-2">
                          <span className="text-amber-500 shrink-0">→</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.viralAngles.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Viral Angles</p>
                    <ul className="space-y-1">
                      {analysis.viralAngles.map((v, i) => (
                        <li key={i} className="text-sm text-foreground flex gap-2">
                          <span className="text-rose-500 shrink-0">→</span>
                          <span>{v}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ExpandableSection>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InsightGroup({ label, icon, items }: { label: string; icon: React.ReactNode; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">{icon} {label}</p>
      <ul className="space-y-0.5 ml-4">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foreground flex gap-2">
            <span className="text-muted-foreground shrink-0">-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
