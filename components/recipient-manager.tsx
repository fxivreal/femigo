"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, Check, X, Phone, Loader2 } from "lucide-react"

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)`

async function getAuthToken(user: any): Promise<string> {
  return user.getIdToken()
}

async function firestoreFetch(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Firestore API error ${res.status}: ${body}`)
  }
  return res.json()
}

interface FirestoreDoc {
  name: string
  fields?: Record<string, any>
  createTime?: string
  updateTime?: string
}

function parseDoc(doc: FirestoreDoc): Record<string, any> & { id: string } {
  const id = doc.name.split("/").pop()!
  const fields = doc.fields || {}
  const decode = (v: any): any => {
    if (v === null || v === undefined) return v
    const key = Object.keys(v)[0]
    if (key === "stringValue") return v.stringValue
    if (key === "integerValue") return Number(v.integerValue)
    if (key === "doubleValue") return Number(v.doubleValue)
    if (key === "booleanValue") return v.booleanValue
    if (key === "timestampValue") return v.timestampValue
    return v
  }
  const data: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    data[k] = decode(v)
  }
  return { id, ...data }
}

interface Recipient {
  id: string
  phoneNumber: string
  label: string
}

interface RecipientManagerProps {
  compact?: boolean
  onSelect?: (recipient: Recipient | null) => void
  selectedId?: string | null
}

export function RecipientManager({ compact, onSelect, selectedId }: RecipientManagerProps) {
  const { user } = useAuth()
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [newPhone, setNewPhone] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPhone, setEditPhone] = useState("")
  const [editLabel, setEditLabel] = useState("")
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const loadRecipients = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      console.log("[RecipientManager] loading recipients...")
      const token = await getAuthToken(user)
      const body = {
        structuredQuery: {
          from: [{ collectionId: "whatsapp_recipients" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "userId" },
              op: "EQUAL",
              value: { stringValue: user.uid },
            },
          },
          orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
        },
      }
      const data = await firestoreFetch("/documents:runQuery", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const docs: Recipient[] = []
      for (const result of data) {
        if (result.document) {
          const parsed: any = parseDoc(result.document)
          docs.push({ id: parsed.id, phoneNumber: parsed.phoneNumber, label: parsed.label })
        }
      }
      console.log("[RecipientManager] loaded", docs.length, "recipients")
      setRecipients(docs)
    } catch (err) {
      console.error("[RecipientManager] load error:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadRecipients()
  }, [loadRecipients])

  const formatPhone = (phone: string): string => {
    let cleaned = phone.replace(/[^0-9+]/g, "")
    if (cleaned.startsWith("0")) cleaned = "+234" + cleaned.slice(1)
    if (!cleaned.startsWith("+")) cleaned = "+234" + cleaned
    return cleaned
  }

  const handleAdd = async () => {
    if (!user || !newPhone.trim()) return
    const phone = formatPhone(newPhone.trim())
    if (phone.length < 10) {
      toast.error("Enter a valid phone number")
      return
    }
    const label = newLabel.trim() || phone
    const tempId = `temp_${Date.now()}`
    setRecipients((prev) => [{ id: tempId, phoneNumber: phone, label }, ...prev])
    setNewPhone("")
    setNewLabel("")
    setAdding(true)

    console.log("[RecipientManager] addDoc starting...")
    const startTime = Date.now()

    try {
      const token = await getAuthToken(user)
      const data = await firestoreFetch("/documents/whatsapp_recipients", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fields: {
            userId: { stringValue: user.uid },
            phoneNumber: { stringValue: phone },
            label: { stringValue: label },
            createdAt: { integerValue: String(Date.now()) },
          },
        }),
      })
      const refId = data.name.split("/").pop()!
      console.log("[RecipientManager] addDoc done in", Date.now() - startTime, "ms, id:", refId)
      setRecipients((prev) => prev.map((r) => (r.id === tempId ? { ...r, id: refId } : r)))
      toast.success("Recipient added!")
    } catch (err: any) {
      console.error("[RecipientManager] addDoc error:", err.message)
      setRecipients((prev) => prev.filter((r) => r.id !== tempId))
      toast.error(err.message || "Failed to save")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    const prev = recipients
    setDeletingIds((prevSet) => new Set(prevSet).add(id))
    setRecipients((prevList) => prevList.filter((r) => r.id !== id))
    try {
      console.log("[RecipientManager] deleteDoc starting...")
      const token = await getAuthToken(user)
      await firestoreFetch(`/documents/whatsapp_recipients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log("[RecipientManager] deleteDoc done")
      toast.success("Recipient removed")
    } catch (err) {
      console.error("[RecipientManager] deleteDoc error:", err)
      setRecipients(prev)
      toast.error("Failed to delete")
    } finally {
      setDeletingIds((prevSet) => {
        const next = new Set(prevSet)
        next.delete(id)
        return next
      })
    }
  }

  const handleUpdate = async (id: string) => {
    const prev = recipients
    setEditingId(null)
    setRecipients((prevList) =>
      prevList.map((r) =>
        r.id === id ? { ...r, phoneNumber: editPhone, label: editLabel } : r
      )
    )
    try {
      console.log("[RecipientManager] updateDoc starting...")
      const token = await getAuthToken(user)
      await firestoreFetch(`/documents/whatsapp_recipients/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fields: {
            phoneNumber: { stringValue: editPhone },
            label: { stringValue: editLabel },
          },
        }),
      })
      console.log("[RecipientManager] updateDoc done")
      toast.success("Recipient updated!")
    } catch (err) {
      console.error("[RecipientManager] updateDoc error:", err)
      setRecipients(prev)
      toast.error("Failed to update")
    }
  }

  const startEdit = (r: Recipient) => {
    setEditingId(r.id)
    setEditPhone(r.phoneNumber)
    setEditLabel(r.label)
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {!compact && (
        <div className="flex items-center gap-2 mb-2">
          <Phone className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Saved Recipients</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <Input
          placeholder="Phone number (e.g. 08012345678)"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          className="text-sm min-w-0 flex-1"
        />
        {!compact && (
          <Input
            placeholder="Label (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="text-sm min-w-0 flex-1"
          />
        )}
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={adding || !newPhone.trim()}
          className="shrink-0"
        >
          {adding ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
          <span className="hidden sm:inline ml-1">Add</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : recipients.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          No saved recipients. Add one above.
        </p>
      ) : (
        <div className="space-y-1">
          {recipients.map((r) => (
            <div
              key={r.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                selectedId === r.id
                  ? "bg-primary/10 border border-primary/30"
                  : onSelect
                  ? "bg-muted/50 hover:bg-muted cursor-pointer border border-transparent"
                  : "bg-muted/50"
              }`}
              onClick={() => onSelect?.(selectedId === r.id ? null : r)}
            >
              {editingId === r.id ? (
                <>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="text-xs h-7 flex-1 min-w-0"
                  />
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="text-xs h-7 flex-1 min-w-0"
                  />
                  <Button size="xs" variant="ghost" className="h-6" onClick={() => handleUpdate(r.id)}>
                    <Check className="size-3 text-green-600" />
                  </Button>
                  <Button size="xs" variant="ghost" className="h-6" onClick={() => setEditingId(null)}>
                    <X className="size-3 text-muted-foreground" />
                  </Button>
                </>
              ) : (
                <>
                  {onSelect && (
                    <div className={`size-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      selectedId === r.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {selectedId === r.id && <div className="size-2 rounded-full bg-white" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground">{r.phoneNumber}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button size="xs" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEdit(r)}>
                      <Pencil className="size-2.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingIds.has(r.id)}
                    >
                      {deletingIds.has(r.id) ? (
                        <Loader2 className="size-2.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-2.5" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
