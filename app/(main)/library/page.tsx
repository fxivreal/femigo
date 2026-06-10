"use client"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore"
import { getDbInstance } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ChevronDown, ChevronUp, Trash2, Loader2 } from "lucide-react"

type ContentSource = {
  id: string
  content: string
  platforms: string[]
  createdAt: Timestamp | null
}

type GeneratedItem = {
  id: string
  platform: string
  content: string
}

const platformColors: Record<string, string> = {
  linkedin: "bg-[#0A66C2]/10 text-[#0A66C2]",
  x: "bg-neutral-900/10 text-neutral-900",
  facebook: "bg-[#1877F2]/10 text-[#1877F2]",
  instagram: "bg-[#E4405F]/10 text-[#E4405F]",
  tiktok: "bg-neutral-900/10 text-neutral-900",
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
        const db = getDbInstance()
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
      const db = getDbInstance()
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
      const db = getDbInstance()
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

  const formatDate = (timestamp: Timestamp | null) => {
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

  const platformLabel = (p: string) => {
    if (p === "x") return "X"
    return p.charAt(0).toUpperCase() + p.slice(1)
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Library</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Browse your saved content and generations.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">No content yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => {
            const isOpen = openId === source.id
            return (
              <div
                key={source.id}
                className="border rounded-lg bg-card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(source.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
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
                        {source.platforms.map((p) => (
                          <span
                            key={p}
                            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize ${platformColors[p] || "bg-muted text-muted-foreground"}`}
                          >
                            {platformLabel(p)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(source)
                      }}
                      disabled={deleting === source.id}
                    >
                      {deleting === source.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4 text-destructive" />
                      )}
                    </Button>
                    {isOpen ? (
                      <ChevronUp className="size-4 text-muted-foreground mr-1" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground mr-1" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t">
                    {loadingContent === source.id ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="divide-y">
                        {source.platforms.map((platform) => {
                          const item = openContent[source.id]?.find(
                            (gc) => gc.platform === platform
                          )
                          return (
                            <div key={platform} className="px-4 py-3">
                              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${platformColors[platform] ? platformColors[platform].split(" ")[1] : "text-muted-foreground"}`}>
                                {platformLabel(platform)}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">
                                {item?.content || "No content generated."}
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
