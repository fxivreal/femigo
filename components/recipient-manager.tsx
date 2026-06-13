"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getDbInstance } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, Check, X, Phone, Loader2 } from "lucide-react"

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
  const dbRef = useRef<any>(null)

  const ensureDb = useCallback(async () => {
    if (!dbRef.current) {
      console.log("[RecipientManager] getting db instance...")
      dbRef.current = await getDbInstance()
      console.log("[RecipientManager] db ready")
    }
    return dbRef.current
  }, [])

  const loadRecipients = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      console.log("[RecipientManager] loading recipients...")
      const db = await ensureDb()
      const { collection, getDocs, query, where, orderBy } = await import("firebase/firestore")
      const q = query(
        collection(db, "whatsapp_recipients"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      )
      const snap = await getDocs(q)
      console.log("[RecipientManager] loaded", snap.docs.length, "recipients")
      setRecipients(snap.docs.map((doc) => ({ id: doc.id, phoneNumber: doc.data().phoneNumber, label: doc.data().label })))
    } catch (err) {
      console.error("[RecipientManager] load error:", err)
    } finally {
      setLoading(false)
    }
  }, [user, ensureDb])

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
      const db = await ensureDb()
      const { doc, collection, setDoc } = await import("firebase/firestore")
      const ref = doc(collection(db, "whatsapp_recipients"))
      await setDoc(ref, {
        userId: user.uid,
        phoneNumber: phone,
        label,
        createdAt: Date.now(),
      })
      console.log("[RecipientManager] addDoc done in", Date.now() - startTime, "ms, id:", ref.id)
      setRecipients((prev) => prev.map((r) => (r.id === tempId ? { ...r, id: ref.id } : r)))
      toast.success("Recipient added!")
    } catch (err: any) {
      console.error("[RecipientManager] addDoc error:", err.name, err.message, err.code)
      setRecipients((prev) => prev.filter((r) => r.id !== tempId))
      toast.error(err?.code || err?.message || "Failed to save")
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
      const db = await ensureDb()
      const { doc, deleteDoc } = await import("firebase/firestore")
      await deleteDoc(doc(db, "whatsapp_recipients", id))
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
      const db = await ensureDb()
      const { doc, updateDoc } = await import("firebase/firestore")
      await updateDoc(doc(db, "whatsapp_recipients", id), { phoneNumber: editPhone, label: editLabel })
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
