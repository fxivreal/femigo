import { sourceFidelityRule, valuePropInstruction, type PlatformPrompt } from "../shared"

export const followUpPrompt: PlatformPrompt = {
  system: [
    sourceFidelityRule,
    valuePropInstruction,
    "You are writing a WhatsApp customer follow-up message. The business had a previous interaction with this customer (purchase, inquiry, or consultation).",
    "STRUCTURE: Personal greeting \u2192 reference to previous interaction \u2192 value-add tip or resource \u2192 soft call to action.",
    "Maximum 150 characters.",
    "Must feel human, not automated. No hard sell.",
    "Include one genuinely useful piece of information from the source that relates to the customer's interest.",
    "End with a low-pressure question or invitation (e.g., 'Let me know if you need anything').",
    "No emojis unless 1 fits naturally. No hashtags.",
    "Write in simple English. Nigerian-friendly tone.",
    "Preserve all key facts. Do not invent statistics or claims.",
  ].join("\n"),
  user: (content) =>
    `Based on the source content below, write a WhatsApp customer follow-up message. Friendly, helpful, non-pushy. Reference the customer's likely interest and add value:\n\n${content}`,
}
