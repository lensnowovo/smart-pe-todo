import { useState } from 'react'
import { Filter } from 'lucide-react'
import AchievementBadge from './AchievementBadge'
import { ACHIEVEMENT_CATEGORIES, RARITY_CONFIG } from '../domain/gamification/achievementDefinitions'

/**
 * AchievementGallery - Grid display of achievements
 */
function AchievementGallery({
  unlockedAchievements = [],
  inProgressAchievements = [],
  allAchievements = [],
}) {
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Filter achievements by category
  const filteredAchievements = allAchievements.filter((achievement) => {
    if (selectedCategory === 'all') return true
    return achievement.category === selectedCategory
  })

  // Get status for each achievement
  const getAchievementStatus = (achievement) => {
    if (unlockedAchievements.some((a) => a.id === achievement.id)) return 'unlocked'
    if (inProgressAchievements.some((a) => a.id === achievement.id)) return 'in-progress'
    return 'locked'
  }

  // Get achievement object with progress for in-progress
  const getAchievementWithProgress = (achievement) => {
    const inProgress = inProgressAchievements.find((a) => a.id === achievement.id)
    return inProgress || achievement
  }

  // Sort by: unlocked first, then rarity, then category
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    const statusA = getAchievementStatus(a)
    const statusB = getAchievementStatus(b)

    // Unlocked first
    if (statusA === 'unlocked' && statusB !== 'unlocked') return -1
    if (statusB === 'unlocked' && statusA !== 'unlocked') return 1

    // Then by rarity (legendary > epic > rare > common)
    const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 }
    const rarityA = rarityOrder[a.rarity] || 0
    const rarityB = rarityOrder[b.rarity] || 0
    return rarityB - rarityA
  })

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[var(--text-900)]">
          成就徽章
          <span className="ml-2 text-xs font-normal text-[var(--text-500)]">
            ({unlockedAchievements.length}/{allAchievements.length})
          </span>
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-[var(--text-500)] flex-shrink-0" />
        <div className="flex gap-1">
          {ACHIEVEMENT_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === category.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--text-700)] hover:bg-[var(--surface-1)]'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid justify-items-center gap-4 [grid-template-columns:repeat(auto-fill,minmax(72px,1fr))]">
        {sortedAchievements.map((achievement) => {
          const status = getAchievementStatus(achievement)
          const achievementWithProgress = getAchievementWithProgress(achievement)

          return (
            <AchievementBadge
              key={achievement.id}
              achievement={achievementWithProgress}
              status={status}
              size="small"
              onClick={() => {
                if (status === 'locked') return
                // Could show detail modal here
                console.log('Show achievement details:', achievement.title)
              }}
            />
          )
        })}
      </div>

      {/* Empty state */}
      {sortedAchievements.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--text-500)]">
          该分类暂无成就
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-[var(--text-900)]">{unlockedAchievements.length}</p>
            <p className="text-xs text-[var(--text-500)]">已解锁</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--text-900)]">{inProgressAchievements.length}</p>
            <p className="text-xs text-[var(--text-500)]">进行中</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--text-900)]">
              {allAchievements.length - unlockedAchievements.length}
            </p>
            <p className="text-xs text-[var(--text-500)]">未解锁</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AchievementGallery
