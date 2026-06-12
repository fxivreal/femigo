"use client"

import { useState, useEffect } from "react"
import { getDbInstance } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { ChevronDown, ChevronUp, Trash2, Loader2, Library, Sparkles } from "lucide-react"
import { ContentActions } from "@/components/content-actions"
import { Skeleton } from "@/components/skeleton"
import Link from "next/link"

type ContentSource = {
  id: string
  content: string
  platforms: string[]
  createdAt: any
}

type GeneratedItem = {
  id: string
  platform: string
  content: string
  favorited?: boolean
}

const platformColors: Record<string, { bg: string; text: string; label: string }> = {
  linkedin: { bg: "bg-[#0A66C2]/10", text: "text-[#0A66C2]", label: "LinkedIn" },
  x: { bg: "bg-neutral-900/10", text: "text-neutral-900", label: "X (Twitter)" },
  facebook: { bg: "bg-primary/10", text: "text-primary", label: "Facebook" },
  instagram: { bg: "bg-[#E4405F]/10", text: "text-[#E4405F]", label: "Instagram" },
  tiktok: { bg: "bg-neutral-900/10", text: "text-neutral-900", label: "TikTok" },
  youtube_shorts: { bg: "bg-red-500/10", text: "text-red-600", label: "Shorts" },
  whatsapp_status: { bg: "bg-green-500/10", text: "text-green-600", label: "WhatsApp Status" },
  whatsapp_broadcast: { bg: "bg-green-500/10", text: "text-green-600", label: "WhatsApp Broadcast" },
  whatsapp_promotional: { bg: "bg-emerald-500/10", text: "text-emerald-600", label: "WhatsApp Promo" },
  "whatsapp_quick-reply": { bg: "bg-teal-500/10", text: "text-teal-600", label: "WhatsApp Quick Reply" },
  whatsapp_followup: { bg: "bg-teal-500/10", text: "text-teal-600", label: "WhatsApp Follow-up" },
}

export default function LibraryPage() {
  const { user } = useAuth()
  const [sources, setSources] = useState<ContentSource[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [openContent, setOpenContent] = useState<Record<string, GeneratedItem[]>>({})
  const [loadingContent, setLoadingContent] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const fetchSources = async () => {
      setLoading(true)
      try {
        const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore")
        const db = await getDbInstance()
        const q = query(
          collection(db, "contentSources"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        )
        const snapshot = await getDocs(q)
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ContentSource[]
        setSources(items)
      } catch {
        toast.error("Failed to load library.")
      } finally {
        setLoading(false)
      }
    }
    fetchSources()
  }, [user])

  const fetchGeneratedContent = async (sourceId: string) => {
    if (openContent[sourceId]) return
    setLoadingContent(sourceId)
    try {
      const { collection, query, where, getDocs } = await import("firebase/firestore")
      const db = await getDbInstance()
      const q = query(
        collection(db, "generatedContent"),
        where("sourceId", "==", sourceId)
      )
      const snapshot = await getDocs(q)
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as GeneratedItem[]
      setOpenContent((prev) => ({ ...prev, [sourceId]: items }))
    } catch {
      toast.error("Failed to load generated content.")
    } finally {
      setLoadingContent(null)
    }
  }

  const handleToggle = (id: string) => {
    if (openId === id) {
      setOpenId(null)
    } else {
      setOpenId(id)
      fetchGeneratedContent(id)
    }
  }

  const handleDelete = async (source: ContentSource) => {
    setDeleting(source.id)
    try {
      const { collection, query, where, getDocs, doc, writeBatch } = await import("firebase/firestore")
      const db = await getDbInstance()
      const batch = writeBatch(db)
      batch.delete(doc(db, "contentSources", source.id))

      const q = query(
        collection(db, "generatedContent"),
        where("sourceId", "==", source.id)
      )
      const snapshot = await getDocs(q)
      snapshot.docs.forEach((d) => batch.delete(d.ref))

      await batch.commit()
      setSources((prev) => prev.filter((s) => s.id !== source.id))
      setOpenContent((prev) => {
        const next = { ...prev }
        delete next[source.id]
        return next
      })
      toast.success("Content deleted.")
    } catch {
      toast.error("Failed to delete.")
    } finally {
      setDeleting(null)
    }
  }

  const handleFavoriteToggle = async (contentId: string, favorited: boolean) => {
    const { doc, updateDoc } = await import("firebase/firestore")
    const db = await getDbInstance()
    await updateDoc(doc(db, "generatedContent", contentId), { favorited })
    setOpenContent((prev) => {
      const next = { ...prev }
      for (const sourceId of Object.keys(next)) {
        next[sourceId] = next[sourceId].map((item) =>
          item.id === contentId ? { ...item, favorited } : item
        )
      }
      return next
    })
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""
    return timestamp.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const projectName = (content: string) => {
    const cleaned = content.replace(/\s+/g, " ").trim()
    return cleaned.length > 60 ? cleaned.slice(0, 60) + "..." : cleaned
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold text-heading mb-1">Library</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Browse your saved content and generations.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="flex items-center justify-center size-14 rounded-xl bg-primary/10 text-primary mb-4">
            <Library className="size-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No content yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Create your first piece of content and it will appear here.
          </p>
          <Link href="/create">
            <Button className="bg-primary hover:bg-primary/80 text-white">
              <Sparkles className="size-4 mr-1.5" />
              Create content
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => {
            const isOpen = openId === source.id
            return (
              <div
                key={source.id}
                className={`rounded-xl border bg-card overflow-hidden transition-all ${
                  isOpen ? "shadow-md" : "hover:shadow-sm hover:border-foreground/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(source.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {projectName(source.content)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(source.createdAt)}
                    </p>
                    {source.platforms && source.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {source.platforms.map((p) => {
                          const pc = platformColors[p]
                          if (!pc) return null
                          return (
                            <span
                              key={p}
                              className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}
                            >
                              {pc.label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(source)
                      }}
                      disabled={deleting === source.id}
                      className="h-8 w-8 p-0"
                    >
                      {deleting === source.id ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Trash2 className="size-4 text-destructive/70 hover:text-destructive" />
                      )}
                    </Button>
                    <div className="flex items-center justify-center size-8 text-muted-foreground">
                      {isOpen ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t animate-fade-in">
                    {loadingContent === source.id ? (
                      <div className="p-4 space-y-3">
                        <div className="h-3 w-1/4 animate-skeleton rounded bg-foreground/5" />
                        <div className="h-12 w-full animate-skeleton rounded bg-foreground/5" />
                        <div className="h-3 w-1/4 animate-skeleton rounded bg-foreground/5" />
                        <div className="h-12 w-full animate-skeleton rounded bg-foreground/5" />
                      </div>
                    ) : (
                      <div className="divide-y">
                        {source.platforms.map((platform) => {
                          const pc = platformColors[platform]
                          const item = openContent[source.id]?.find(
                            (gc) => gc.platform === platform
                          )
                          return (
                            <div key={platform} className="px-4 py-3.5">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  {pc && (
                                    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${pc.bg} ${pc.text}`}>
                                      {pc.label}
                                    </span>
                                  )}
                                </div>
                                {item && (
                                  <ContentActions
                                    content={item.content}
                                    platform={platform}
                                    platformLabel={pc?.label || platform}
                                    contentId={item.id}
                                    isFavorited={item.favorited}
                                    onFavoriteToggle={handleFavoriteToggle}
                                  />
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                                {item?.content || (
                                  <span className="text-muted-foreground italic">No content generated.</span>
                                )}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
