import { useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile, AbsoluteFill, Sequence } from "remotion"
import type { SocialClipProps } from "../types"

const gradientBg = "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A78BFA 100%)"

function Background({ image }: { image?: string }) {
  if (image) {
    return <Img src={image} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute" }} />
  }
  return <div style={{ width: "100%", height: "100%", background: gradientBg, position: "absolute" }} />
}

function Title({ text, frame, fps }: { text: string; frame: number; fps: number }) {
  const opacity = interpolate(frame, [0, fps * 0.8], [0, 1], { extrapolateRight: "clamp" })
  const translateY = spring({ frame, fps, config: { damping: 14, mass: 0.6 } })
  return (
    <h1
      style={{
        fontSize: 64,
        fontWeight: 800,
        color: "#FFFFFF",
        textAlign: "center",
        margin: 0,
        padding: "0 40px",
        lineHeight: 1.2,
        opacity,
        transform: `translateY(${interpolate(translateY, [0, 1], [30, 0])}px)`,
      }}
    >
      {text}
    </h1>
  )
}

function Subtitle({ text, frame, fps }: { text: string; frame: number; fps: number }) {
  const start = fps * 1.5
  const opacity = interpolate(frame, [start, start + fps * 0.5], [0, 1], { extrapolateRight: "clamp" })
  const translateY = interpolate(frame, [start, start + fps * 0.5], [20, 0], { extrapolateRight: "clamp" })
  return (
    <p
      style={{
        fontSize: 32,
        fontWeight: 400,
        color: "rgba(255,255,255,0.85)",
        textAlign: "center",
        margin: "20px 0 0",
        padding: "0 40px",
        lineHeight: 1.4,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {text}
    </p>
  )
}

function CtaBar({ text, frame, fps }: { text: string; frame: number; fps: number }) {
  const start = fps * 3
  const translateY = interpolate(frame, [start, start + fps * 0.4], [80, 0], { extrapolateRight: "clamp" })
  const opacity = interpolate(frame, [start, start + fps * 0.4], [0, 1], { extrapolateRight: "clamp" })
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: "50%",
        transform: `translateX(-50%) translateY(${translateY}px)`,
        background: "#FFFFFF",
        color: "#6366F1",
        fontSize: 28,
        fontWeight: 700,
        padding: "16px 48px",
        borderRadius: 50,
        opacity,
      }}
    >
      {text}
    </div>
  )
}

function Branding() {
  return (
    <div style={{ position: "absolute", top: 40, right: 40, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 32, height: 32, background: "#FFFFFF", borderRadius: 8, opacity: 0.3 }} />
      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, fontWeight: 600 }}>Femigo</span>
    </div>
  )
}

export function SocialClip(props: SocialClipProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
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
          <Sequence from={fps * 1.5}>
            <Subtitle text={props.subtitle} frame={frame} fps={fps} />
          </Sequence>
        )}
        {props.ctaText && (
          <Sequence from={fps * 3}>
            <CtaBar text={props.ctaText} frame={frame} fps={fps} />
          </Sequence>
        )}
      </div>
      {props.branding && <Branding />}
    </AbsoluteFill>
  )
}
