import { NextResponse } from "next/server"
import { getLinkedInConfig } from "@/lib/linkedin"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")
  const config = getLinkedInConfig()

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }

  if (!config.clientId) {
    return NextResponse.json(
      { error: "LinkedIn Client ID not configured. Add LINKEDIN_CLIENT_ID to .env.local" },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()
  cookieStore.set("linkedin_user_id", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
  })

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state: userId,
    scope: "w_member_social openid profile email",
  })

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}
