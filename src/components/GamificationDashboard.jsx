import { useMemo, useEffect } from 'react'
import StreakDisplay from './StreakDisplay'
import WeeklyProgressChart from './WeeklyProgressChart'
import AchievementGallery from './AchievementGallery'
import { ACHIEVEMENT_DEFINITIONS } from '../domain/gamification/achievementDefinitions'
import { getWeeklyProgress, getInProgressAchievements } from '../domain/gamification/gamificationService'

/**
 * GamificationDashboard - Main container for gamification features
 */
function GamificationDashboard({ gamificationData, tasks, todayKey }) {
  // Calculate in-progress achievements from latest data
  const inProgressAchievements = useMemo(() => {
    return getInProgressAchievements(gamificationData)
  }, [gamificationData])

  return (
    <div className="space-y-4">
      {/* Streak Display */}
      <StreakDisplay
        currentStreak={gamificationData.streaks.current}
        longestStreak={gamificationData.streaks.longest}
        milestones={gamificationData.streaks.milestones}
      />

      {/* Weekly Progress Chart */}
      <WeeklyProgressChart dailyStats={gamificationData.dailyStats} daysToShow={7} />

      {/* Achievement Gallery */}
      <AchievementGallery
        unlockedAchievements={gamificationData.achievements.unlocked}
        inProgressAchievements={inProgressAchievements}
        allAchievements={ACHIEVEMENT_DEFINITIONS}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-900)]">
            {gamificationData.lifetime.totalTasksCompleted}
          </p>
          <p className="text-xs text-[var(--text-500)]">已完成任务</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-900)]">
            {gamificationData.lifetime.perfectDays}
          </p>
          <p className="text-xs text-[var(--text-500)]">完美天数</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-900)]">
            {gamificationData.lifetime.fundsManaged.length}
          </p>
          <p className="text-xs text-[var(--text-500)]">管理基金</p>
        </div>
      </div>
    </div>
  )
}

export default GamificationDashboard
