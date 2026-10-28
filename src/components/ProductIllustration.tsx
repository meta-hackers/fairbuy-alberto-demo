import type { Illustration } from '../data/fixtures'

const palettes: Record<Illustration, [string, string]> = {
  forge: ['#5eead4', '#22d3ee'],
  pulse: ['#a78bfa', '#818cf8'],
  elite: ['#fbbf24', '#fb923c'],
  strix: ['#38bdf8', '#818cf8'],
  flux: ['#5eead4', '#34d399'],
  vega: ['#f0abfc', '#a78bfa'],
  air: ['#93c5fd', '#60a5fa'],
  orbit: ['#c4b5fd', '#8b5cf6'],
  titan: ['#fda4af', '#fb7185'],
  aura: ['#67e8f9', '#2dd4bf'],
}

export default function ProductIllustration({ variant, size = 'card' }: { variant: Illustration; size?: 'card' | 'large' }) {
  const [accent, accent2] = palettes[variant]
  return (
    <svg className={`pc-art pc-art--${size}`} viewBox="0 0 160 140" role="img" aria-label="Gaming PC illustration">
      <defs>
        <linearGradient id={`glow-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.5" />
          <stop offset="1" stopColor={accent2} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <ellipse cx="80" cy="126" rx="48" ry="8" fill="#000" opacity="0.35" />
      <path d="M42 22 L118 14 L128 112 L50 122 Z" fill="#0a1a2a" stroke={accent} strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M50 30 L110 24 L118 104 L58 112 Z" fill={`url(#glow-${variant})`} opacity="0.55" />
      <path d="M57 36 L103 31 L109 96 L64 103 Z" fill="#07131f" stroke={accent} strokeOpacity="0.35" />
      <rect x="66" y="44" width="32" height="20" rx="2" fill="#10293a" stroke={accent} strokeOpacity="0.7" />
      <path d="M70 51 H94 M70 56 H88" stroke={accent} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      <rect x="69" y="74" width="27" height="4" rx="2" fill={accent} opacity="0.7" />
      <rect x="69" y="82" width="19" height="3" rx="1.5" fill={accent2} opacity="0.6" />
      <g>
        <circle cx="112" cy="45" r="9" fill="#07131f" stroke={accent} strokeWidth="1.4" />
        <circle cx="112" cy="45" r="3.5" fill={accent} opacity="0.9" />
        <circle cx="112" cy="65" r="9" fill="#07131f" stroke={accent} strokeWidth="1.4" />
        <circle cx="112" cy="65" r="3.5" fill={accent2} opacity="0.9" />
        <circle cx="112" cy="85" r="9" fill="#07131f" stroke={accent} strokeWidth="1.4" />
        <circle cx="112" cy="85" r="3.5" fill={accent} opacity="0.9" />
      </g>
      <path d="M42 22 L118 14 L128 112" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.45" fill="none" />
    </svg>
  )
}
