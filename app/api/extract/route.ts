import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { type, url } = await request.json()

    if (!url || !type) {
      return NextResponse.json({ error: "URL and type are required" }, { status: 400 })
    }

    if (type === "article") {
      const html = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Femigo/1.0)" },
      }).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch URL: ${r.status}`)
        return r.text()
      })

      const { JSDOM } = await import("jsdom")
      const { Readability } = await import("@mozilla/readability")
      const doc = new JSDOM(html, { url })
      const parsed = new Readability(doc.window.document).parse()

      if (!parsed) {
        return NextResponse.json({ error: "Could not extract content from this URL." }, { status: 422 })
      }

      return NextResponse.json({ title: parsed.title, content: parsed.textContent })
    }

    if (type === "youtube") {
      const videoId = extractYoutubeId(url)
      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL." }, { status: 400 })
      }

      const { fetchTranscript } = await import("youtube-transcript")
      const transcriptItems = await fetchTranscript(videoId)
      const content = transcriptItems.map((item: { text: string }) => item.text).join(" ")

      let title = "YouTube Video"
      try {
        const oembed = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        ).then((r) => (r.ok ? r.json() : null))
        if (oembed?.title) title = oembed.title
      } catch { /* use default title */ }

      return NextResponse.json({ title, content })
    }

    return NextResponse.json({ error: "Unsupported type. Use 'article' or 'youtube'." }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to extract content."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}
