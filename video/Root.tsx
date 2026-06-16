import { Composition } from "remotion"
import { TextOverlay } from "./templates/TextOverlay"
import { SlideShow } from "./templates/SlideShow"
import { SocialClip } from "./templates/SocialClip"
import {
  TEXT_OVERLAY_DURATION,
  SLIDESHOW_CARD_DURATION,
  SOCIAL_CLIP_DURATION,
  VIDEO_FPS,
} from "./types"

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="TextOverlay"
        component={TextOverlay}
        durationInFrames={TEXT_OVERLAY_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1080}
        defaultProps={{ title: "Your Title Here", subtitle: "Optional subtitle" }}
      />
      <Composition
        id="SlideShow"
        component={SlideShow}
        durationInFrames={SLIDESHOW_CARD_DURATION * 3 + 15}
        fps={VIDEO_FPS}
        width={1080}
        height={1080}
        defaultProps={{
          cards: [
            { title: "First Slide", body: "Description one" },
            { title: "Second Slide", body: "Description two" },
            { title: "Third Slide", body: "Description three" },
          ],
        }}
      />
      <Composition
        id="SocialClip"
        component={SocialClip}
        durationInFrames={SOCIAL_CLIP_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1920}
        defaultProps={{
          title: "Your Title Here",
          subtitle: "Optional subtitle",
          ctaText: "Learn More",
        }}
      />
    </>
  )
}
