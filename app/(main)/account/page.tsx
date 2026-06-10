"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Mail, LogOut, Sparkles } from "lucide-react"

export default function AccountPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{user?.displayName || "User"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </div>
          <Button variant="outline" className="w-full sm:w-auto" disabled>
            <User className="size-4 mr-2" />
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Your current subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Sparkles className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Free</span>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full sm:w-auto"
        onClick={handleSignOut}
      >
        <LogOut className="size-4 mr-2" />
        Logout
      </Button>
    </div>
  )
}
