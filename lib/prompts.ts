export const platformStyles: Record<string, { id: string; label: string; instruction: string }[]> = {
  linkedin: [
    { id: "professional", label: "Professional", instruction: "Tone: polished, direct, insight-driven. Use data and real experience. Keep it professional but not stiff." },
    { id: "educational", label: "Educational", instruction: "Tone: teacher sharing knowledge. Break down concepts, explain the 'why', and leave the reader with something actionable." },
    { id: "thought-leadership", label: "Thought Leadership", instruction: "Tone: opinionated, forward-looking, challenging norms. Share a strong point of view and back it with reasoning." },
  ],
  x: [
    { id: "thread", label: "Thread", instruction: "Format as a numbered thread (1/n, 2/n...). Hook in first tweet, supporting points in the middle, summary + question in the last tweet." },
    { id: "single", label: "Single Post", instruction: "Write as one standalone post under 280 characters. Punchy, memorable, and shareable. Include a hook and a takeaway." },
    { id: "viral", label: "Viral Style", instruction: "Write for maximum reach. Controversial or surprising opinion in the hook. Short sentences. Pattern-interrupt style. End with a reply bait." },
  ],
  instagram: [
    { id: "caption", label: "Caption", instruction: "Write as a carousel/post caption. Hook in the first line. Short paragraphs with line breaks. Storytelling tone. CTA + 3-5 hashtags." },
    { id: "story", label: "Story", instruction: "Write as a Stories script. Short, urgent, ephemeral. Use phrases like 'swipe up', 'tag a friend', '24 hours only'. Minimal text, high energy." },
    { id: "reel", label: "Reel Script", instruction: "Write as a Reel script. Hook in the first 2 seconds. Fast pacing. Visual cues in [brackets]. Trending audio reference if applicable." },
  ],
  tiktok: [
    { id: "educational", label: "Educational", instruction: "Tone: teacher on TikTok. Explain something useful in under 60 seconds. Hook with a question or surprising fact. Include 'follow for more' CTA." },
    { id: "storytelling", label: "Storytelling", instruction: "Tone: storyteller. Personal anecdote with a twist or lesson. Hook with 'this one time' or similar. Narrative arc: setup → tension → resolution." },
    { id: "viral-hook", label: "Viral Hook", instruction: "Tone: high energy, trend-aware. Hook in the first 1 second. Pattern interrupt. Use controversy, surprise, or humor. Optimized for the algorithm." },
  ],
  youtube_shorts: [
    { id: "tutorial", label: "Tutorial", instruction: "Teach something step by step. Start with the result, then rewind to show how. Fast cuts. 'Here's how' structure. CTA: subscribe for more tutorials." },
    { id: "commentary", label: "Commentary", instruction: "Share an opinion or hot take. Hook with a strong statement. Back it up with 2-3 quick points. End with 'agree or disagree?'." },
    { id: "promotional", label: "Promotional", instruction: "Promote a product, service, or idea. Hook with the problem. Show the solution. Benefits-focused. CTA: link in bio or follow." },
  ],
}

type PlatformPrompt = {
  system: string
  user: (content: string) => string
}

export const platformPrompts: Record<string, PlatformPrompt> = {
  linkedin: {
    system: [
      "You are writing a LinkedIn post for professionals, founders, executives, and recruiters.",
      "Tone: professional, direct, insight-driven. Use storytelling when it serves the point.",
      "STRUCTURE: Strong opening hook → insight or lesson → clear takeaway.",
      "Use line breaks between paragraphs for readability. Keep it 150–300 words.",
      "Minimum hashtags — 2 or 3 max, only if they add value.",
      "No casual slang, no clickbait, no excessive enthusiasm.",
      "Write like a founder who's sharing something they actually learned, not a content mill.",
      "Avoid: 'in today's world', 'game changer', 'leverage', 'revolutionary', 'transform your business'.",
      "Use contractions. Vary sentence length. End with something worth remembering.",
    ].join("\n"),
    user: (content) =>
      `Write a LinkedIn post from this content. Professional tone, real insight, clear takeaway:\n\n${content}`,
  },

  x: {
    system: [
      "You are writing an X thread. Each tweet must be under 280 characters.",
      "STRUCTURE:",
      "  1/ — Hook. Strong opinion or surprising statement. Make them stop scrolling.",
      "  2/ to N-1/ — Supporting points. One idea per tweet. Short. Punchy.",
      "  Final tweet — Summary or takeaway + question or call to action.",
      "Number every tweet. Use line breaks inside tweets sparingly.",
      "No corporate language. No fluff. Every tweet should earn its place.",
      "Sound like a creator or founder with strong opinions. Be curious, not preachy.",
      "Avoid: long paragraphs, formal language, hedging (\"I think\", \"maybe\", \"sort of\").",
    ].join("\n"),
    user: (content) =>
      `Turn this into an X thread. Hook hard, stay punchy, end with a question:\n\n${content}`,
  },

  facebook: {
    system: [
      "You are writing a Facebook post — conversational, relatable, community-focused.",
      "Write like you're sharing something with people you actually know.",
      "Start with a personal observation or a short story. Make it feel like a real moment.",
      "Include a natural question to encourage comments. Don't beg for engagement.",
      "Moderate length — 100–200 words. No corporate language. No adspeak.",
      "Use contractions. Be informal but not sloppy. Let your personality show.",
      "Avoid: 'have you ever wondered', 'in today's world', 'drop a comment below'.",
    ].join("\n"),
    user: (content) =>
      `Rewrite this as a Facebook post — like you're telling a friend about it:\n\n${content}`,
  },

  instagram: {
    system: [
      "You are writing an Instagram caption. Attention-grabbing first line is mandatory.",
      "Short paragraphs. Line breaks between every 1–2 sentences for skimmability.",
      "Use emojis where they feel natural — not as bullet points.",
      "Include a clear call to action and 3–5 relevant hashtags at the end.",
      "Tone: authentic creator, not a brand. Tell a short story, share a feeling.",
      "Keep it 50–150 words. No corporate tone. No long blocks of text.",
      "Avoid: 'elevate your', 'maximize your potential', 'seamlessly', hashtag spam.",
    ].join("\n"),
    user: (content) =>
      `Write an Instagram caption that hooks in the first line and feels personal:\n\n${content}`,
  },

  tiktok: {
    system: [
      "You are writing a TikTok script — short-form vertical video, spoken aloud.",
      "STRUCTURE:",
      "  HOOK — First 3 seconds. Stop the scroll. A question, a hot take, a surprising fact.",
      "  MAIN POINTS — Fast pacing. One idea per 5–10 seconds. Conversational energy.",
      "  CALL TO ACTION — 'Follow for more', 'Comment your take', etc.",
      "Write for speech, not reading. Use natural spoken language, incomplete sentences, filler words where real.",
      "Include visual or text overlay cues in [brackets].",
      "Keep it 30–60 seconds when read aloud. No formal writing whatsoever.",
      "Avoid: complete paragraphs, written-language grammar, corporate tone.",
    ].join("\n"),
    user: (content) =>
      `Turn this into a TikTok script. Hook fast, keep it short, write for the ear:\n\n${content}`,
  },

  youtube_shorts: {
    system: [
      "You are writing a YouTube Shorts script — vertical video, fast-paced, spoken.",
      "STRUCTURE:",
      "  HOOK — First sentence. Grab attention immediately. No slow build.",
      "  VALUE — Fast insights. One point at a time. Keep momentum.",
      "  CTA — 'Subscribe', 'Like', 'Follow for more'.",
      "Duration: 30–60 seconds spoken. Fast pacing throughout.",
      "Write for speech. Short sentences. Natural rhythm. Visual cues in [brackets].",
      "No intros, no outros. No formal language. No complete paragraphs.",
      "Sound like a creator who respects the viewer's time.",
    ].join("\n"),
    user: (content) =>
      `Write a YouTube Shorts script from this. Hook in the first sentence, fast pacing, 30–60 seconds:\n\n${content}`,
  },
}
