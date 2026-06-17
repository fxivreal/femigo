import { NextResponse } from "next/server"
import { getLinkedInConfig, saveLinkedInAuth } from "@/lib/linkedin"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error || !code) {
      return NextResponse.redirect(
        new URL("/connections?linkedin=error", request.url)
      )
    }

    const config = getLinkedInConfig()

    // Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error("LinkedIn token exchange error:", errText)
      return NextResponse.redirect(
        new URL("/connections?linkedin=token_error", request.url)
      )
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string
      expires_in: number
      id_token?: string
    }

    // Get user info
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!meRes.ok) {
      return NextResponse.redirect(
        new URL("/connections?linkedin=profile_error", request.url)
      )
    }

    const meData = (await meRes.json()) as { sub: string; name?: string; email?: string }

    // We need the userId - pass it via state parameter in production
    // For now, store in cookie during auth initiation
    const cookieStore = await cookies()
    const userId = cookieStore.get("linkedin_user_id")?.value

    if (userId) {
      await saveLinkedInAuth(userId, {
        accessToken: tokenData.access_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in || 86400) * 1000),
        personId: meData.sub,
        name: meData.name,
        email: meData.email,
      })
    }

    return NextResponse.redirect(
      new URL("/connections?linkedin=connected", request.url)
    )
  } catch (err) {
    console.error("LinkedIn callback error:", err)
    return NextResponse.redirect(
      new URL("/connections?linkedin=error", request.url)
    )
  }
}
