/**
 * GamificationService - Business logic for gamification
 *
 * Handles streaks, achievements, and daily statistics
 */

import { addDays, format, parseISO, startOfDay } from 'date-fns'
import { ACHIEVEMENT_DEFINITIONS, RARITY_CONFIG } from './achievementDefinitions'

/**
 * Calculate streak from daily stats
 */
export const calculateStreak = (dailyStats, todayKey) => {
  let currentStreak = 0
  let checkDate = new Date(todayKey)

  // Check backwards from today
  while (true) {
    const dateKey = format(checkDate, 'yyyy-MM-dd')
    const dayStats = dailyStats[dateKey]

    if (!dayStats) {
      // No data for this day
      if (dateKey === todayKey) {
        // Today might not have data yet, check yesterday
        checkDate = addDays(checkDate, -1)
        continue
      }
      break
    }

    // Check if completion rate ≥ 80%
    if (dayStats.completionRate >= 80) {
      currentStreak++
      checkDate = addDays(checkDate, -1)
    } else {
      break
    }
  }

  return currentStreak
}

/**
 * Update daily statistics for a given date
 */
export const updateDailyStats = (tasks, dateKey, currentData) => {
  const daysTasks = tasks.filter((task) => task.dueDate === dateKey)
  const totalTasks = daysTasks.length
  const completedTasks = daysTasks.filter((t) => t.completed).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Extract unique funds from completed tasks
  const fundsWorkedOn = [
    ...new Set(
      daysTasks
        .filter((t) => t.completed)
        .flatMap((t) => t.funds || [t.fund].filter(Boolean))
    ),
  ]

  // Extract tags from completed tasks
  const tagsCompleted = [
    ...new Set(
      daysTasks.filter((t) => t.completed).flatMap((t) => t.tags || [])
    ),
  ]

  return {
    totalTasks,
    completedTasks,
    completionRate,
    fundsWorkedOn,
    tagsCompleted,
  }
}

/**
 * Check and unlock achievements
 */
export const checkAchievements = (gamificationData, context) => {
  const newlyUnlocked = []
  const { unlocked, inProgress } = gamificationData.achievements

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    // Skip already unlocked
    if (unlocked.some((a) => a.id === definition.id)) continue

    // Check if achievement is unlocked
    const isUnlocked = definition.check(gamificationData, context)

    if (isUnlocked) {
      newlyUnlocked.push({
        ...definition,
        unlockedAt: new Date().toISOString(),
      })
    } else {
      // Update progress for in-progress achievements
      if (definition.getProgress) {
        const progress = definition.getProgress(gamificationData)
        const target = definition.target || 1

        if (progress > 0) {
          const existingIndex = inProgress.findIndex((a) => a.id === definition.id)
          const progressItem = {
            id: definition.id,
            title: definition.title,
            description: definition.description,
            icon: definition.icon,
            progress,
            target,
            rarity: definition.rarity,
          }

          if (existingIndex >= 0) {
            inProgress[existingIndex] = progressItem
          } else {
            inProgress.push(progressItem)
          }
        }
      }
    }
  }

  return newlyUnlocked
}

/**
 * Process task completion and update gamification data
 */
export const processTaskCompletion = (task, gamificationData, todayKey, allTasks) => {
  const newData = { ...gamificationData }

  // Update lifetime stats
  if (task.completed) {
    newData.lifetime.totalTasksCompleted++

    // Track Capital Calls
    if (task.tags?.includes('Capital Call')) {
      newData.lifetime.totalCapitalCallsCompleted++
    }

    // Track Quarterly Reports
    if (task.tags?.includes('Quarterly Report')) {
      newData.lifetime.totalQuarterlyReportsCompleted++
    }

    // Track funds worked on
    const taskFunds = task.funds || (task.fund ? [task.fund] : [])
    for (const fund of taskFunds) {
      if (!newData.lifetime.fundsManaged.includes(fund)) {
        newData.lifetime.fundsManaged.push(fund)
      }
    }
  }

  // Update daily stats
  const dailyStats = updateDailyStats(allTasks, todayKey, newData)
  newData.dailyStats[todayKey] = dailyStats

  // Check for perfect day
  if (dailyStats.completionRate === 100) {
    newData.lifetime.perfectDays++
  }

  // Update most productive day
  if (
    dailyStats.completedTasks > 0 &&
    (!newData.lifetime.mostProductiveDay ||
      dailyStats.completedTasks >
        (newData.dailyStats[newData.lifetime.mostProductiveDay]?.completedTasks || 0))
  ) {
    newData.lifetime.mostProductiveDay = todayKey
  }

  // Calculate streak
  newData.streaks.current = calculateStreak(newData.dailyStats, todayKey)

  // Update longest streak
  if (newData.streaks.current > newData.streaks.longest) {
    newData.streaks.longest = newData.streaks.current
  }

  // Check for streak milestones
  const milestoneDays = [7, 14, 30, 60, 100]
  for (const days of milestoneDays) {
    if (
      newData.streaks.current === days &&
      !newData.streaks.milestones.some((m) => m.days === days)
    ) {
      newData.streaks.milestones.push({
        days,
        achievedAt: todayKey,
      })
    }
  }

  newData.streaks.lastCalculatedDate = todayKey

  // Check achievements
  const context = {
    todayKey,
    allFunds: getAllFundsFromTasks(allTasks),
  }
  const newAchievements = checkAchievements(newData, context)

  for (const achievement of newAchievements) {
    newData.achievements.unlocked.push(achievement)
    // Remove from in-progress if present
    newData.achievements.inProgress = newData.achievements.inProgress.filter(
      (a) => a.id !== achievement.id
    )
  }

  return {
    data: newData,
    newAchievements,
  }
}

/**
 * Get all unique fund names from tasks
 */
const getAllFundsFromTasks = (tasks) => {
  const fundsSet = new Set()
  for (const task of tasks) {
    const taskFunds = task.funds || (task.fund ? [task.fund] : [])
    for (const fund of taskFunds) {
      fundsSet.add(fund)
    }
  }
  return Array.from(fundsSet)
}

/**
 * Get weekly progress data for chart
 */
export const getWeeklyProgress = (dailyStats, daysToShow = 7) => {
  const data = []
  const today = startOfDay(new Date())

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayStats = dailyStats[dateKey]

    // Get day label
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六']
    const label = i === 0 ? '今天' : dayLabels[date.getDay()]

    data.push({
      date: dateKey,
      label,
      rate: dayStats?.completionRate || 0,
      hasData: !!dayStats,
    })
  }

  return data
}

/**
 * Get in-progress achievements with progress
 */
export const getInProgressAchievements = (gamificationData) => {
  const { inProgress } = gamificationData.achievements

  return ACHIEVEMENT_DEFINITIONS.filter(
    (def) =>
      !gamificationData.achievements.unlocked.some((a) => a.id === def.id) &&
      def.getProgress
  ).map((def) => {
    const existing = inProgress.find((a) => a.id === def.id)
    return {
      ...def,
      progress: existing?.progress || def.getProgress?.(gamificationData) || 0,
      target: def.target || 1,
    }
  })
}

export default {
  calculateStreak,
  updateDailyStats,
  checkAchievements,
  processTaskCompletion,
  getWeeklyProgress,
  getInProgressAchievements,
}
