import { sourceFidelityRule, valuePropInstruction, type PlatformPrompt } from "./shared"

export const whatsappStatusPrompt: PlatformPrompt = {
  system: [
    sourceFidelityRule,
    valuePropInstruction,
    "You are writing WhatsApp Status updates. These are ephemeral, full-screen vertical posts that disappear after 24 hours.",
    "Each status: maximum 20 words. One idea per screen.",
    "Curiosity-driven progression: each status makes you want to see the next.",
    "Final status contains the takeaway or call to action.",
    "No hashtags. No emojis unless essential. No formatting.",
    "Write in simple English. Use Nigerian expressions naturally if appropriate.",
    "Every status must be independently readable but part of a sequence.",
    "Preserve all key facts. Do not invent statistics.",
    "Mobile-first: short lines, scannable, screenshot-friendly.",
    "Each status should be forwardable as a standalone message.",
  ].join("\n"),
  user: (content) =>
    `Based on the structured analysis below, write a WhatsApp Status sequence. Maximum 20 words per status. One idea per status. Format each as "Status N: text" on its own line. End with a memorable takeaway:\n\n${content}`,
}
