"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Mail, LogOut, Sparkles, ShieldCheck } from "lucide-react"

function Avatar({ name, email }: { name: string; email?: string | null }) {
  const initial = (name || email || "U").charAt(0).toUpperCase()
  return (
    <div className="flex items-center justify-center size-12 rounded-full bg-[#6366F1]/10 text-[#6366F1] font-bold text-lg">
      {initial}
    </div>
  )
}

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

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
          <div className="flex items-center gap-4 rounded-xl border bg-[#6366F1]/5 border-[#6366F1]/10 p-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
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
