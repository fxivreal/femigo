"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { getDbInstance } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { User, Mail, LogOut, Sparkles, Save, Mic, Users, Hash, Ban } from "lucide-react"

function Avatar({ name, email }: { name: string; email?: string | null }) {
  const initial = (name || email || "U").charAt(0).toUpperCase()
  return (
    <div className="flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
      {initial}
    </div>
  )
}

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [bvTone, setBvTone] = useState("")
  const [bvAudience, setBvAudience] = useState("")
  const [bvKeywords, setBvKeywords] = useState("")
  const [bvAvoid, setBvAvoid] = useState("")
  const [bvLoading, setBvLoading] = useState(true)
  const [bvSaving, setBvSaving] = useState(false)

  // Load brand voice from Firestore
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore")
        const db = await getDbInstance()
        const snap = await getDoc(doc(db, "users", user.uid))
        const data = snap.data()
        if (data?.brandVoice) {
          setBvTone(data.brandVoice.tone || "")
          setBvAudience(data.brandVoice.audience || "")
          setBvKeywords(data.brandVoice.keywords || "")
          setBvAvoid(data.brandVoice.avoidKeywords || "")
        }
      } catch {
        // silent
      } finally {
        setBvLoading(false)
      }
    })()
  }, [user])

  const handleSaveBrandVoice = async () => {
    if (!user) return
    setBvSaving(true)
    try {
      const { doc, setDoc } = await import("firebase/firestore")
      const db = await getDbInstance()
      await setDoc(
        doc(db, "users", user.uid),
        {
          brandVoice: {
            tone: bvTone.trim(),
            audience: bvAudience.trim(),
            keywords: bvKeywords.trim(),
            avoidKeywords: bvAvoid.trim(),
          },
        },
        { merge: true }
      )
      toast.success("Brand voice saved!")
    } catch {
      toast.error("Failed to save brand voice.")
    } finally {
      setBvSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const name = user?.displayName || "User"

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold text-heading">Account</h1>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={name} email={user?.email} />
            <div>
              <p className="font-medium text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <User className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium truncate">{name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <Mail className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="mt-4 w-full sm:w-auto" disabled>
            <User className="size-4 mr-2" />
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      {/* Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Your current subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 rounded-xl border bg-primary/5 border-primary/10 p-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Free</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unlimited generations. Upgrade anytime.
              </p>
            </div>
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Active
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Brand Voice Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="size-4" />
            Brand Voice
          </CardTitle>
          <CardDescription>
            Set your brand voice preferences. These will be applied to every generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Mic className="size-3" />
              Tone
            </label>
            <Input
              placeholder="e.g. Professional but approachable, witty, empathetic..."
              value={bvTone}
              onChange={(e) => setBvTone(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Users className="size-3" />
              Target Audience
            </label>
            <Input
              placeholder="e.g. Nigerian small business owners, Gen Z creators..."
              value={bvAudience}
              onChange={(e) => setBvAudience(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Hash className="size-3" />
              Keywords to include
            </label>
            <Input
              placeholder="e.g. affordable, local, reliable, customer-first..."
              value={bvKeywords}
              onChange={(e) => setBvKeywords(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Ban className="size-3" />
              Words to avoid
            </label>
            <Input
              placeholder="e.g. revolutionary, game-changer, synergy..."
              value={bvAvoid}
              onChange={(e) => setBvAvoid(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSaveBrandVoice}
            disabled={bvSaving}
            className="bg-primary hover:bg-primary/80 text-white"
          >
            <Save className="size-4 mr-2" />
            {bvSaving ? "Saving..." : "Save Brand Voice"}
          </Button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <div className="pt-2">
        <Button
          variant="outline"
          className="w-full sm:w-auto border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="size-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
