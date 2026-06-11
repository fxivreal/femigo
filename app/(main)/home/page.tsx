"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Library, FileText, ArrowRight, PenLine, Globe, Hash, Video } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { getDbInstance } from "@/lib/firebase"
import { SkeletonCard } from "@/components/skeleton"

const quickActions = [
  { href: "/create?tab=text", icon: FileText, label: "Paste text", desc: "Write or paste content" },
  { href: "/create?tab=article", icon: Globe, label: "Article URL", desc: "Extract from a blog" },
  { href: "/create?tab=youtube", icon: Video, label: "YouTube URL", desc: "Get transcript" },
]

export default function HomePage() {
  const { user } = useAuth()
  const [recentCount, setRecentCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const name = user?.displayName || user?.email?.split("@")[0] || "User"

  useEffect(() => {
    if (!user) return
    const fetchCount = async () => {
      try {
        const { collection, query, where, getDocs, orderBy, limit } = await import("firebase/firestore")
        const db = await getDbInstance()
        const q = query(
          collection(db, "contentSources"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1)
        )
        const snapshot = await getDocs(q)
        setRecentCount(snapshot.docs.length)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchCount()
  }, [user])

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
                <div className="flex items-center justify-center size-9 rounded-lg bg-[#1877F2]/10 text-[#1877F2]">
                  <Icon className="size-4" />
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{action.desc}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Stats row */}
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-3.5 text-[#1877F2]" />
                Generations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-7 w-12 animate-skeleton rounded bg-foreground/5" />
              ) : (
                <p className="text-2xl font-bold text-foreground">
                  {recentCount !== null && recentCount > 0 ? recentCount : 0}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {recentCount && recentCount > 0 ? "in your library" : "start creating"}
              </p>
            </CardContent>
          </Card>
          <Link href="/create" className="group">
            <Card size="sm" className="h-full hover:shadow-md hover:border-foreground/20 transition-all cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PenLine className="size-3.5 text-[#1877F2]" />
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
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Recent activity
          </h2>
          <Link
            href="/library"
            className="text-xs font-medium text-[#1877F2] hover:underline"
          >
            View all
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : recentCount === 0 ? (
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">No generations yet</CardTitle>
              <CardDescription>
                Create your first piece of content and repurpose it across all your platforms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/create">
                <Button size="sm" className="bg-[#1877F2] hover:bg-[#1877F2]/80 text-white">
                  <Sparkles className="size-3.5 mr-1.5" />
                  Create content
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card size="sm">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#1877F2]/10 text-[#1877F2]">
                <Library className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Content saved</p>
                <p className="text-xs text-muted-foreground">View your library for all saved generations</p>
              </div>
              <Link href="/library">
                <Button variant="ghost" size="sm">
                  Open <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
