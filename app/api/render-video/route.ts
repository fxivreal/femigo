import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  return NextResponse.json({
    status: "placeholder",
    message: "Remotion Lambda rendering not yet configured. Use `npm run studio` to preview and render locally.",
  })
}
