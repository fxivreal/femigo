"use client"

import { useState } from "react"
import { Check } from "lucide-react"

type Preview = {
  label: string
  content: string
}

const previews: Preview[] = [
  {
    label: "LinkedIn",
    content:
      "Most people overthink content strategy.\n\nThey obsess over posting schedules, algorithms, and the perfect hook.\n\nMeanwhile, the founders I admire do one thing differently: they share what they're actually learning in real time.\n\nNot polished case studies. Not \"5 lessons from...\" listicles. Just honest, raw observations from the trenches.\n\nI tested this approach for 30 days. Wrote about what went wrong, what surprised me, and what I'd do differently.\n\nResult? More replies, more DMs, more real conversations than any \"strategic\" post ever got.\n\nTry it. Share something uncomfortable tomorrow. See what happens.\n\n#RealTalk #FounderLife #BuildingInPublic",
  },
  {
    label: "X (Twitter)",
    content:
      "1/6 Most people think you need a content strategy.\n\nYou don't. You just need something interesting to say.\n\n2/6 The problem isn't \"what should I post about?\"\n\nThe problem is you're trying to sound like an expert instead of sounding like yourself.\n\n3/6 I spent 2 years writing the \"perfect\" posts. Polished. Strategic. Brand-voice-approved.\n\nThey got crickets.\n\n4/6 Then I started writing like I talk. Short sentences. Hot takes. Unfinished thoughts.\n\nEngagement went up 10x.\n\n5/6 Here's the truth:\n- Algorithms reward clarity, not complexity\n- People crave opinions, not summaries\n- Imperfect > perfect\n\n6/6 Post the thing you're afraid to post.\nThat's the one that'll resonate.",
  },
  {
    label: "Instagram",
    content:
      "the best thing i ever did for my business?\n\nstop trying to sound professional.\n\ni used to write captions like a press release.\n\nnow i write like i'm texting a friend.\n\nguess which one actually works.\n\nthis shift changed everything.\n\nsave this if you needed to hear it 💌",
  },
  {
    label: "TikTok",
    content:
      "[HOOK - direct camera, eyebrow raise]\n\n\"Wait — you're still writing LinkedIn posts like a robot?\"\n\n[BODY - split screen: bad vs good example]\n\n\"Here's what most people do: they open ChatGPT, type 'write a professional post,' and paste the word salad it gives them.\"\n\n\"Here's what actually works: write it like you're explaining it to a friend over coffee.\"\n\n[Text overlay: THE FORMULA]\n\n\"Opinion → Story → Takeaway. That's it.\"\n\n[CTA - finger point]\n\n\"Follow for more. I post daily.\"",
  },
  {
    label: "Shorts",
    content:
      "[HOOK - fast zoom in, 0:00-0:03]\n\n\"The biggest content myth of 2024?\"\n\n[fast cuts, 0:03-0:15]\n\n\"You don't need to post every day.\"\n\n\"You need ONE good piece of content.\"\n\n\"Then repurpose it for every platform.\"\n\n\"LinkedIn gets the story. X gets the thread. TikTok gets the hot take.\"\n\n\"Same idea. Different formats. Zero extra work.\"\n\n[CTA - 0:15-0:20]\n\n\"Follow for more content strategy that actually makes sense.\"\n\n\"Drop a comment if you're tired of the 'post daily' advice.\"",
  },
]

export function ContentPreview() {
  const [active, setActive] = useState(0)

  return (
    <section className="px-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-heading">
            See it in action
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            One source. Five platforms. Every output feels native, not recycled.
          </p>
        </div>

        {/* Platform pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {previews.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setActive(i)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                i === active
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {i === active && <Check className="size-3" />}
              {p.label}
            </button>
          ))}
        </div>

        {/* Preview card */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden transition-all duration-300">
          <div className="flex items-center justify-between px-5 py-2.5 border-b bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {previews[active].label} output
            </span>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-red-400" />
              <div className="size-2.5 rounded-full bg-yellow-400" />
              <div className="size-2.5 rounded-full bg-green-400" />
            </div>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5 max-h-[420px] overflow-y-auto">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {previews[active].content}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
