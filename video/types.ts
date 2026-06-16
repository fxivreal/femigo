import { z } from "zod"

export const TextOverlaySchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(400).optional().default(""),
  backgroundImage: z.string().url().optional(),
  fontFamily: z.string().optional().default("Inter"),
})

export const SlideCardSchema = z.object({
  image: z.string().url().optional(),
  title: z.string().min(1).max(150),
  body: z.string().max(400).optional().default(""),
})

export const SlideShowSchema = z.object({
  cards: z.array(SlideCardSchema).min(1).max(20),
  transitionStyle: z.enum(["crossfade", "slide"]).optional().default("crossfade"),
})

export const SocialClipSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(400).optional().default(""),
  ctaText: z.string().max(100).optional().default(""),
  backgroundImage: z.string().url().optional(),
  branding: z.boolean().optional().default(true),
})

export type TextOverlayProps = z.infer<typeof TextOverlaySchema>
export type SlideCard = z.infer<typeof SlideCardSchema>
export type SlideShowProps = z.infer<typeof SlideShowSchema>
export type SocialClipProps = z.infer<typeof SocialClipSchema>

export const VIDEO_FPS = 30
export const TEXT_OVERLAY_DURATION = 5 * VIDEO_FPS
export const SLIDESHOW_CARD_DURATION = 2 * VIDEO_FPS
export const SOCIAL_CLIP_DURATION = 15 * VIDEO_FPS
