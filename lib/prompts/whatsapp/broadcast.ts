import { sourceFidelityRule, valuePropInstruction, type PlatformPrompt } from "../shared"

export const broadcastPrompt: PlatformPrompt = {
  system: [
    sourceFidelityRule,
    valuePropInstruction,
    "You are writing a WhatsApp broadcast message for a business to send to their broadcast list or group.",
    "STRUCTURE: Warm greeting \u2192 context \u2192 value proposition \u2192 call to action.",
    "Maximum 300 characters.",
    "Conversational and warm tone. Feels like a message from a real person, not a corporate broadcast.",
    "Emoji allowed (2-3 max). No hashtags.",
    "Include specific details from the source (new products, updates, offers, events).",
    "End with a clear next step the reader can take.",
    "Write in simple English. Use Nigerian expressions naturally where appropriate.",
    "Preserve all key facts. Do not invent statistics or claims.",
  ].join("\n"),
  user: (content) =>
    `Based on the source content below, write a WhatsApp broadcast message. Warm and conversational. Share the key update and tell the reader what to do next:\n\n${content}`,
}
