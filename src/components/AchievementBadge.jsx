import { Lock } from 'lucide-react'
import { RARITY_CONFIG } from '../domain/gamification/achievementDefinitions'

/**
 * AchievementBadge - Individual achievement badge display
 */
function AchievementBadge({ achievement, status = 'locked', onClick, size = 'normal' }) {
  const isLocked = status === 'locked'
  const isUnlocked = status === 'unlocked'
  const rarityConfig = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common

  const sizeClasses = {
    small: 'w-16 h-16 gap-1 p-2',
    normal: 'w-20 h-20 gap-2 p-3',
    large: 'w-24 h-24 gap-2 p-3',
  }

  const iconSizeClasses = {
    small: 'w-10 h-10 text-[20px]',
    normal: 'w-12 h-12 text-[22px]',
    large: 'w-14 h-14 text-[24px]',
  }

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center rounded-xl transition-all shrink-0
        ${sizeClasses[size]}
        ${isUnlocked
          ? 'bg-white border-2 border-yellow-400 shadow-md hover:shadow-lg cursor-pointer'
          : isLocked
            ? 'bg-[var(--surface-2)] border border-[var(--border)] opacity-60 cursor-not-allowed'
            : 'bg-white border-2 border-teal-400 shadow-sm hover:shadow-md cursor-pointer'
        }
      `}
      style={{
        borderColor: isUnlocked ? undefined : rarityConfig.color,
      }}
    >
      {/* Icon */}
      <div
        className={`
          flex items-center justify-center rounded-full flex-shrink-0
          ${isLocked ? 'grayscale' : ''}
          ${iconSizeClasses[size]}
        `}
        style={{
          backgroundColor: isUnlocked ? '#fef08a' : rarityConfig.bgColor,
        }}
      >
        {isLocked ? (
          <Lock className="h-1/2 w-1/2" />
        ) : typeof achievement.icon === 'string' ? (
          <span className="leading-none select-none">{achievement.icon}</span>
        ) : (
          achievement.icon
        )}
      </div>

      {/* Title - only show for normal and large sizes */}
      {size !== 'small' && (
        <p
          className={`text-xs font-medium text-center leading-tight ${
            isLocked ? 'text-[var(--text-500)]' : 'text-[var(--text-900)]'
          }`}
        >
          {achievement.title}
        </p>
      )}

      {/* Progress bar for in-progress achievements */}
      {status === 'in-progress' && achievement.progress !== undefined && (
        <div className="w-full mt-1">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-500)] mb-0.5">
            <span>{achievement.progress}</span>
            <span>{achievement.target}</span>
          </div>
          <div className="h-1 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Rarity label for unlocked achievements */}
      {isUnlocked && size === 'large' && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            backgroundColor: rarityConfig.bgColor,
            color: rarityConfig.color,
          }}
        >
          {rarityConfig.label}
        </span>
      )}
    </button>
  )
}

export default AchievementBadge
