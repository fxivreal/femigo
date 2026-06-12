export type { PlatformPrompt, ContentGoal, AudienceMode } from "./shared"
export {
  sourceFidelityRule,
  hashtagRule,
  valuePropInstruction,
  antiRepetitionRule,
  sourceCoverageRule,
  diversityRule,
  goalInstructions,
  getGoalInstruction,
  formatBrandVoice,
  formatAnalysisContext,
  audienceModes,
} from "./shared"

export { linkedinPrompt } from "./linkedin"
export { facebookPrompt } from "./facebook"
export { xPrompt } from "./x"
export { instagramPrompt } from "./instagram"
export { tiktokPrompt } from "./tiktok"
export { youtubeShortsPrompt } from "./youtube-shorts"
export { whatsappStatusPrompt } from "./whatsapp-status"

export { nigerianStrategistPreamble, getAngleInstruction, angles } from "./nigerian-strategist"
export type { ContentAngle } from "./nigerian-strategist"

import { linkedinPrompt } from "./linkedin"
import { facebookPrompt } from "./facebook"
import { xPrompt } from "./x"
import { instagramPrompt } from "./instagram"
import { tiktokPrompt } from "./tiktok"
import { youtubeShortsPrompt } from "./youtube-shorts"
import { whatsappStatusPrompt } from "./whatsapp-status"
import type { PlatformPrompt } from "./shared"

export const platformPrompts: Record<string, PlatformPrompt> = {
  linkedin: linkedinPrompt,
  x: xPrompt,
  facebook: facebookPrompt,
  instagram: instagramPrompt,
  tiktok: tiktokPrompt,
  youtube_shorts: youtubeShortsPrompt,
  whatsapp_status: whatsappStatusPrompt,
}
