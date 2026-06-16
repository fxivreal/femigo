import { useCurrentFrame, interpolate, Img, AbsoluteFill, Sequence, spring, useVideoConfig } from "remotion"
import type { SlideShowProps, SlideCard } from "../types"

const FPS = 30
const CARD_FRAMES = 2 * FPS
const CROSSFADE_DURATION = 0.5 * FPS

function SlideCard({ card, progress, isEntering, isExiting }: { card: SlideCard; progress: number; isEntering: boolean; isExiting: boolean }) {
  const opacity = isEntering
    ? interpolate(progress, [0, 1], [0, 1])
    : isExiting
      ? interpolate(progress, [0, 1], [1, 0])
      : 1

  const scale = isEntering
    ? interpolate(progress, [0, 1], [0.95, 1])
    : isExiting
      ? interpolate(progress, [0, 1], [1, 1.05])
      : 1

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
      }}
    >
      {card.image && (
        <Img src={card.image} style={{ width: "70%", maxHeight: "50%", objectFit: "cover", borderRadius: 16, marginBottom: 32 }} />
      )}
      <h2 style={{ fontSize: 52, fontWeight: 700, color: "#FFFFFF", textAlign: "center", margin: "0 0 16px", lineHeight: 1.2 }}>
        {card.title}
      </h2>
      {card.body && (
        <p style={{ fontSize: 28, fontWeight: 400, color: "rgba(255,255,255,0.8)", textAlign: "center", margin: 0, maxWidth: 800, lineHeight: 1.4 }}>
          {card.body}
        </p>
      )}
    </AbsoluteFill>
  )
}

export function SlideShow(props: SlideShowProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { cards } = props

  const totalFrames = cards.length * CARD_FRAMES + CROSSFADE_DURATION

  const currentCardIndex = Math.min(Math.floor(frame / CARD_FRAMES), cards.length - 1)
  const cardProgress = (frame % CARD_FRAMES) / CARD_FRAMES
  const isCrossfade = cardProgress < CROSSFADE_DURATION / CARD_FRAMES && currentCardIndex > 0

  return (
    <AbsoluteFill>
      {cards.map((card, i) => {
        if (i === currentCardIndex) {
          return (
            <Sequence key={i} from={i * CARD_FRAMES}>
              <SlideCard
                card={card}
                progress={isCrossfade ? cardProgress * (CARD_FRAMES / CROSSFADE_DURATION) : 1}
                isEntering={isCrossfade}
                isExiting={false}
              />
            </Sequence>
          )
        }
        if (i === currentCardIndex - 1 && isCrossfade) {
          return (
            <Sequence key={i} from={i * CARD_FRAMES}>
              <SlideCard
                card={card}
                progress={1 - cardProgress * (CARD_FRAMES / CROSSFADE_DURATION)}
                isEntering={false}
                isExiting={true}
              />
            </Sequence>
          )
        }
        return null
      })}
    </AbsoluteFill>
  )
}
