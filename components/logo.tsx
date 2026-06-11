"use client"

type LogoProps = {
  size?: number
  showText?: boolean
  className?: string
}

export function Logo({ size = 24, showText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="logo-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill="url(#logo-bg)" />
        <path d="M184 124v280" stroke="white" strokeWidth="44" strokeLinecap="round" fill="none" />
        <path d="M184 152h135" stroke="white" strokeWidth="38" strokeLinecap="round" fill="none" />
        <path d="M184 246h88" stroke="white" strokeWidth="38" strokeLinecap="round" fill="none" />
        <circle cx="338" cy="152" r="15" fill="#8B5CF6" />
        <circle cx="376" cy="152" r="10" fill="#A78BFA" />
        <circle cx="288" cy="246" r="10" fill="#8B5CF6" />
        <circle cx="318" cy="246" r="7" fill="#A78BFA" />
      </svg>
      {showText && (
        <span className="font-semibold text-base text-heading">Femigo</span>
      )}
    </div>
  )
}
