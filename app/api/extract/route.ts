import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { type, url } = await request.json()

    if (!url || !type) {
      return NextResponse.json({ error: "URL and type are required" }, { status: 400 })
    }

    if (type === "article") {
      let html
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Femigo/1.0)" },
        })
        if (!res.ok) {
          return NextResponse.json(
            { error: `Failed to fetch URL (${res.status}). The site may block automated requests.` },
            { status: 422 }
          )
        }
        html = await res.text()
      } catch {
        return NextResponse.json(
          { error: "Could not reach that URL. Check the address and try again." },
          { status: 422 }
        )
      }

      try {
        const { JSDOM } = await import("jsdom")
        const { Readability } = await import("@mozilla/readability")
        const doc = new JSDOM(html, { url })
        const parsed = new Readability(doc.window.document).parse()

        if (!parsed || !parsed.textContent) {
          return NextResponse.json(
            { error: "Could not extract readable content from this URL." },
            { status: 422 }
          )
        }

        return NextResponse.json({ title: parsed.title || "Untitled", content: parsed.textContent })
      } catch (innerErr) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr)
        console.error("Readability/JSDOM error:", msg)
        return NextResponse.json(
          { error: "Content extraction failed. Try pasting the text directly instead." },
          { status: 500 }
        )
      }
    }

    if (type === "youtube") {
      const videoId = extractYoutubeId(url)
      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL." }, { status: 400 })
      }

      let title = "YouTube Video"
      try {
        const oembed = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        ).then((r) => (r.ok ? r.json() : null))
        if (oembed?.title) title = oembed.title
      } catch { /* use default title */ }

      let content = ""

      try {
        const { fetchTranscript } = await import("youtube-transcript")
        const transcriptItems = await fetchTranscript(videoId)
        content = transcriptItems.map((item: { text: string }) => item.text).join(" ")
      } catch (innerErr) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr)
        console.error("YouTube transcript error:", msg)
      }

      if (!content.trim()) {
        try {
          const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; Femigo/1.0)" },
          })
          if (pageRes.ok) {
            const pageHtml = await pageRes.text()
            const descMatch = pageHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/)
            const desc = descMatch ? descMatch[1].replace(/&#?\w+;/g, "") : ""
            if (desc) content = desc
          }
        } catch {
          console.error("YouTube page fallback failed")
        }
      }

      if (!content.trim()) {
        return NextResponse.json(
          { error: "No transcript or description available for this video." },
          { status: 422 }
        )
      }

      return NextResponse.json({ title, content })
    }

    return NextResponse.json({ error: "Unsupported type. Use 'article' or 'youtube'." }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to extract content."
    console.error("Extract route error:", message)
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
