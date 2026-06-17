"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecipientManager } from "@/components/recipient-manager"
import { ConnectLinkedIn } from "@/components/connect-linkedin"
import { MessageCircle, Link2, Globe, ExternalLink, Check } from "lucide-react"

const platforms = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-600 bg-green-100", connected: true },
  { id: "linkedin", label: "LinkedIn", icon: Link2, color: "text-blue-600 bg-blue-100", connected: false },
  { id: "facebook", label: "Facebook", icon: Globe, color: "text-blue-700 bg-blue-100", connected: false },
  { id: "x", label: "X (Twitter)", icon: ExternalLink, color: "text-neutral-900 bg-neutral-100", connected: false },
  { id: "instagram", label: "Instagram", icon: ExternalLink, color: "text-pink-600 bg-pink-100", connected: false },
  { id: "tiktok", label: "TikTok", icon: ExternalLink, color: "text-neutral-900 bg-neutral-100", connected: false },
]

export default function ConnectionsPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-bold text-heading mb-1">Connections</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your social media connections and WhatsApp recipients.
      </p>

      {/* Platform Connections */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="size-4" />
            Platform Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <ConnectLinkedIn />
            {platforms.filter(p => p.id !== "linkedin").map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-lg flex items-center justify-center ${p.color}`}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.connected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {p.connected ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <Check className="size-3" />
                      Active
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Coming soon
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Recipients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="size-4 text-green-600" />
            WhatsApp Recipients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecipientManager />
        </CardContent>
      </Card>
    </div>
  )
}
