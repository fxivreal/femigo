"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
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

  const loadRecipients = async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(`/api/recipients?userId=${user.uid}`)
      const data = await res.json()
      if (data.recipients) setRecipients(data.recipients)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecipients()
  }, [user])

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
    setAdding(true)
    try {
      const res = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          phoneNumber: phone,
          label: newLabel.trim() || phone,
        }),
      })
      if (res.ok) {
        toast.success("Recipient added!")
        setNewPhone("")
        setNewLabel("")
        loadRecipients()
      }
    } catch {
      toast.error("Failed to add recipient")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/recipients?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Recipient removed")
        loadRecipients()
      }
    } catch {
      toast.error("Failed to delete")
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch("/api/recipients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, phoneNumber: editPhone, label: editLabel }),
      })
      if (res.ok) {
        toast.success("Recipient updated!")
        setEditingId(null)
        loadRecipients()
      }
    } catch {
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

      {/* Add form */}
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

      {/* Recipient list */}
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
                    <Button size="xs" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="size-2.5" />
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
