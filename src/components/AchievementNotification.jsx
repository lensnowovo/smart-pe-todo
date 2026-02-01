import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { RARITY_CONFIG } from '../domain/gamification/achievementDefinitions'

/**
 * AchievementNotification - Toast notification for unlocked achievements
 */
function AchievementNotification({ achievement, visible, onDismiss }) {
  const [isVisible, setIsVisible] = useState(visible)

  useEffect(() => {
    setIsVisible(visible)
  }, [visible])

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onDismiss()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onDismiss])

  if (!isVisible) return null

  const rarityConfig = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in">
      <div
        className="relative rounded-xl border-2 shadow-2xl p-4 min-w-[280px]"
        style={{
          borderColor: rarityConfig.color,
          backgroundColor: rarityConfig.bgColor,
        }}
      >
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-[var(--text-500)] hover:text-[var(--text-900)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className="h-14 w-14 flex-shrink-0 rounded-full flex items-center justify-center text-3xl bg-white shadow-md animate-pulse"
          >
            {achievement.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-[var(--text-900)]">{achievement.title}</p>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                style={{
                  backgroundColor: rarityConfig.bgColor,
                  color: rarityConfig.color,
                }}
              >
                {rarityConfig.label}
              </span>
            </div>
            <p className="text-sm text-[var(--text-600)]">{achievement.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AchievementNotification
