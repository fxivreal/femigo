"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Library, Sparkles, User, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: Sparkles },
  { href: "/library", label: "Library", icon: Library },
  { href: "/account", label: "Account", icon: User },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-60 md:border-r md:bg-background md:z-30">
        <div className="flex items-center gap-2 px-6 h-14 border-b shrink-0">
          <Sparkles className="size-5 text-[#6366F1]" />
          <span className="font-semibold text-base text-heading">Femigo</span>
        </div>
        <nav className="flex-1 flex flex-col p-3 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-[#6366F1]/10 text-[#6366F1]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-[#6366F1]" />
                )}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="flex items-center justify-center size-7 rounded-full bg-[#6366F1]/10 text-[#6366F1] text-xs font-bold">
              {(user?.displayName || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground">
                {user?.displayName || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                Free plan
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sm font-normal text-muted-foreground hover:text-foreground h-9"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full w-full text-xs font-medium transition-all relative",
                  active
                    ? "text-[#6366F1]"
                    : "text-muted-foreground"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#6366F1]" />
                )}
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
