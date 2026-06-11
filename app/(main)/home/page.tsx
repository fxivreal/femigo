"use client"

import { useAuth } from "@/lib/auth-context"
import { getUserMetrics, type UserMetrics } from "@/lib/metrics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, FileText, ArrowRight, PenLine, Globe, Video, BarChart3, CalendarDays, TrendingUp, Hash } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { SkeletonCard } from "@/components/skeleton"

const quickActions = [
  { href: "/create?tab=text", icon: FileText, label: "Paste text", desc: "Write or paste content" },
  { href: "/create?tab=article", icon: Globe, label: "Article URL", desc: "Extract from a blog" },
  { href: "/create?tab=youtube", icon: Video, label: "YouTube URL", desc: "Get transcript" },
]

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube_shorts: "Shorts",
}

type RecentItem = {
  id: string
  platform: string
  content: string
  createdAt: any
}

export default function HomePage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const name = user?.displayName || user?.email?.split("@")[0] || "User"

  useEffect(() => {
    if (!user) return
    const loadDashboard = async () => {
      try {
        const [userMetrics] = await Promise.all([
          getUserMetrics(user.uid),
          loadRecentActivity(user.uid),
        ])
        setMetrics(userMetrics)
      } catch {
        // Silent
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [user])

  const loadRecentActivity = async (userId: string) => {
    try {
      const { collection, query, where, orderBy, limit, getDocs } = await import("firebase/firestore")
      const { getDbInstance } = await import("@/lib/firebase")
      const db = await getDbInstance()
      const q = query(
        collection(db, "generatedContent"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(5)
      )
      const snapshot = await getDocs(q)
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as RecentItem[]
      setRecentItems(items)
    } catch {
      // Silent
    }
  }

  const platformEntries = metrics ? Object.entries(metrics.platformCounts) : []
  const mostUsedPlatform = platformEntries.length > 0
    ? platformEntries.sort(([, a], [, b]) => b - a)[0]
    : null

  const formatDate = (ts: any) => {
    if (!ts?.toDate) return ""
    return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max).trimEnd() + "..." : text

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading">
          Welcome back, {name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create once, publish everywhere.
        </p>
      </div>

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
          Quick actions
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-4 hover:shadow-md hover:border-foreground/20 transition-all active:scale-[0.97]"
              >
                <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{action.desc}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Metrics grid */}
      <section className="mb-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="size-3.5 text-primary" />
                  Generations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {metrics?.totalGenerations ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">all time</p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarDays className="size-3.5 text-primary" />
                  This month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {metrics?.monthlyGenerations ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString("en-US", { month: "long" })}
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="size-3.5 text-primary" />
                  Most used
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mostUsedPlatform ? (
                  <>
                    <p className="text-lg font-bold text-foreground">
                      {platformLabels[mostUsedPlatform[0]] || mostUsedPlatform[0]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {mostUsedPlatform[1]} generations
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">&mdash;</p>
                    <p className="text-xs text-muted-foreground mt-0.5">no data yet</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Link href="/create" className="group">
              <Card size="sm" className="h-full hover:shadow-md hover:border-foreground/20 transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <PenLine className="size-3.5 text-primary" />
                    New content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-foreground">Create now</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    Generate for all platforms
                    <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Recent activity
          </h2>
          <Link
            href="/library"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : recentItems.length === 0 ? (
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">No generations yet</CardTitle>
              <CardDescription>
                Create your first piece of content and repurpose it across all your platforms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/create">
                <Button size="sm" className="bg-primary hover:bg-primary/80 text-white">
                  <Sparkles className="size-3.5 mr-1.5" />
                  Create content
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <Card key={item.id} size="sm">
                <CardContent className="flex items-start gap-3 py-3">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Hash className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                      {truncate(item.content, 120)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {platformLabels[item.platform] || item.platform}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
