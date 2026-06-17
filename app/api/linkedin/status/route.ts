import { NextResponse } from "next/server"
import { getLinkedInAuth } from "@/lib/linkedin"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ connected: false }, { status: 400 })
  }

  const auth = await getLinkedInAuth(userId)
  if (!auth) {
    return NextResponse.json({ connected: false })
  }

  const expired = auth.expiresAt < new Date()

  return NextResponse.json({
    connected: !expired,
    name: auth.name,
    email: auth.email,
    expired,
    expiresAt: auth.expiresAt.toISOString(),
  })
}
