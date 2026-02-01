import { useMemo } from 'react'

const STATUS_RULES = [
  { max: 0, label: 'Dry Powder Ready (蓄势待发)' },
  { max: 30, label: 'Sourcing Deals (正在寻找项目)' },
  { max: 60, label: 'Deep Dive DD (深度尽调中)' },
  { max: 90, label: 'IC Committee Approved (投决会已过)' },
  { max: 100, label: 'Successful Exit! 🚀 (成功退出)' },
]

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getStatusText = (progress) => {
  const rule = STATUS_RULES.find((item) => progress <= item.max)
  return rule ? rule.label : STATUS_RULES[STATUS_RULES.length - 1].label
}

const getLiquidColor = (progress) => {
  if (progress >= 100) return 'rgb(15, 64, 164)'
  if (progress > 60) return 'rgb(197, 132, 37)'
  return 'rgb(141, 33, 33)'
}

function ProgressWidget({ progress = 0 }) {
  const safeProgress = clamp(Math.round(progress), 0, 100)
  const statusText = useMemo(() => getStatusText(safeProgress), [safeProgress])
  const liquidColor = useMemo(() => getLiquidColor(safeProgress), [safeProgress])
  const waveAmplitude = safeProgress >= 100 ? 2 : 8
  const waveSpeed = safeProgress >= 100 ? '12s' : '6s'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-56 w-56">
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <defs>
            <linearGradient id="glassGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
            <radialGradient id="highlight" cx="0.3" cy="0.2" r="0.7">
              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <clipPath id="sphereClip">
              <circle cx="100" cy="100" r="82" />
            </clipPath>
          </defs>

          <g clipPath="url(#sphereClip)">
            <rect x="0" y="0" width="200" height="200" fill="transparent" />
            <g
              style={{
                transform: `translateY(${(100 - safeProgress) * 1.3}px)`,
                transformOrigin: 'center',
              }}
            >
              <path
                className="wave wave-back"
                fill={liquidColor}
                fillOpacity="0.35"
                d="M0 120 Q 25 110 50 120 T 100 120 T 150 120 T 200 120 V200 H0 Z"
              />
              <path
                className="wave wave-front"
                fill={liquidColor}
                fillOpacity="0.7"
                d="M0 120 Q 25 130 50 120 T 100 120 T 150 120 T 200 120 V200 H0 Z"
              />
            </g>
          </g>

          <circle
            cx="100"
            cy="100"
            r="84"
            fill="url(#glassGradient)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
          <circle cx="100" cy="100" r="84" fill="url(#highlight)" />

          <text
            x="100"
            y="108"
            textAnchor="middle"
            className="fill-slate-900"
            fontSize="36"
            fontWeight="600"
            fontFamily="IBM Plex Sans, Segoe UI, sans-serif"
          >
            {safeProgress}%
          </text>
        </svg>
      </div>

      <div className="text-sm font-semibold text-[var(--text-700)]">{statusText}</div>

      <style>
        {`
          .wave {
            animation: waveMove ${waveSpeed} linear infinite;
          }
          .wave-front {
            animation-delay: -1.5s;
          }
          @keyframes waveMove {
            0% { transform: translateX(0) scaleY(${waveAmplitude / 10}); }
            50% { transform: translateX(-25px) scaleY(${(waveAmplitude + 2) / 10}); }
            100% { transform: translateX(-50px) scaleY(${waveAmplitude / 10}); }
          }
        `}
      </style>
    </div>
  )
}

export default ProgressWidget
