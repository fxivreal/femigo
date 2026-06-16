import { useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile, AbsoluteFill, Sequence } from "remotion"
import type { TextOverlayProps } from "../types"

const gradientBg = "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)"

function Background({ image }: { image?: string }) {
  if (image) {
    return <Img src={image} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute" }} />
  }
  return <div style={{ width: "100%", height: "100%", background: gradientBg, position: "absolute" }} />
}

function Title({ text, frame, fps }: { text: string; frame: number; fps: number }) {
  const opacity = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: "clamp" })
  const translateY = spring({ frame, fps, config: { damping: 12, mass: 0.5 } })
  return (
    <h1
      style={{
        fontSize: 80,
        fontWeight: 800,
        color: "#FFFFFF",
        textAlign: "center",
        margin: 0,
        padding: "0 60px",
        lineHeight: 1.15,
        opacity,
        transform: `translateY(${interpolate(translateY, [0, 1], [40, 0])}px)`,
      }}
    >
      {text}
    </h1>
  )
}

function Subtitle({ text, frame, fps }: { text: string; frame: number; fps: number }) {
  const startFrame = fps
  const opacity = interpolate(frame, [startFrame, startFrame + fps * 0.5], [0, 1], { extrapolateRight: "clamp" })
  const translateY = interpolate(frame, [startFrame, startFrame + fps * 0.5], [20, 0], { extrapolateRight: "clamp" })
  return (
    <p
      style={{
        fontSize: 36,
        fontWeight: 400,
        color: "rgba(255,255,255,0.85)",
        textAlign: "center",
        margin: "24px 0 0",
        padding: "0 80px",
        lineHeight: 1.4,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {text}
    </p>
  )
}

export function TextOverlay(props: TextOverlayProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ fontFamily: props.fontFamily || "Inter" }}>
      <Sequence>
        <Background image={props.backgroundImage} />
      </Sequence>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: props.backgroundImage ? "rgba(0,0,0,0.35)" : "none",
        }}
      >
        <Sequence>
          <Title text={props.title} frame={frame} fps={fps} />
        </Sequence>
        {props.subtitle && (
          <Sequence from={fps}>
            <Subtitle text={props.subtitle} frame={frame} fps={fps} />
          </Sequence>
        )}
      </div>
    </AbsoluteFill>
  )
}
