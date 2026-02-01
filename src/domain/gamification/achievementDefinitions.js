/**
 * Achievement Definitions
 *
 * PE/Fund-themed achievements for gamification
 */

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'first-deal',
    title: '首单落地',
    description: '完成第一个任务',
    icon: '🎯',
    rarity: 'common',
    category: 'milestone',
    check: (stats, context) => stats.lifetime.totalTasksCompleted >= 1,
  },
  {
    id: 'perfect-day',
    title: '完美一天',
    description: '单日任务100%完成',
    icon: '💎',
    rarity: 'rare',
    category: 'daily',
    check: (stats, context) => {
      const todayKey = context.todayKey
      const todayStats = stats.dailyStats[todayKey]
      return todayStats?.completionRate === 100
    },
  },
  {
    id: '7-day-streak',
    title: '连续作战',
    description: '连续7天保持80%以上完成率',
    icon: '🔥',
    rarity: 'rare',
    category: 'streak',
    target: 7,
    check: (stats, context) => stats.streaks.current >= 7,
    getProgress: (stats) => stats.streaks.current,
  },
  {
    id: '30-day-streak',
    title: '季度冠军',
    description: '连续30天保持80%以上完成率',
    icon: '🏆',
    rarity: 'epic',
    category: 'streak',
    target: 30,
    check: (stats, context) => stats.streaks.current >= 30,
    getProgress: (stats) => stats.streaks.current,
  },
  {
    id: 'portfolio-master',
    title: '组合管理大师',
    description: '在3个以上基金完成过任务',
    icon: '📊',
    rarity: 'rare',
    category: 'fund',
    target: 3,
    check: (stats, context) => stats.lifetime.fundsManaged.length >= 3,
    getProgress: (stats) => stats.lifetime.fundsManaged.length,
  },
  {
    id: 'capital-call-expert',
    title: '出资专家',
    description: '完成10次Capital Call任务',
    icon: '💰',
    rarity: 'rare',
    category: 'specialist',
    target: 10,
    check: (stats, context) => stats.lifetime.totalCapitalCallsCompleted >= 10,
    getProgress: (stats) => stats.lifetime.totalCapitalCallsCompleted,
  },
  {
    id: 'quarterly-champion',
    title: '季报能手',
    description: '完成5份季度报告',
    icon: '📈',
    rarity: 'rare',
    category: 'specialist',
    target: 5,
    check: (stats, context) => stats.lifetime.totalQuarterlyReportsCompleted >= 5,
    getProgress: (stats) => stats.lifetime.totalQuarterlyReportsCompleted,
  },
  {
    id: 'centurion',
    title: '百战成名',
    description: '累计完成100个任务',
    icon: '⭐',
    rarity: 'epic',
    category: 'milestone',
    target: 100,
    check: (stats, context) => stats.lifetime.totalTasksCompleted >= 100,
    getProgress: (stats) => stats.lifetime.totalTasksCompleted,
  },
  {
    id: 'ic-approved',
    title: '投委会认可',
    description: '连续5天保持90%以上完成率',
    icon: '👔',
    rarity: 'epic',
    category: 'streak',
    target: 5,
    check: (stats, context) => {
      const { dailyStats } = stats
      const sortedDays = Object.keys(dailyStats).sort().reverse()
      if (sortedDays.length < 5) return false

      let consecutiveDays = 0
      for (const dayKey of sortedDays) {
        const dayStats = dailyStats[dayKey]
        if (dayStats?.completionRate >= 90) {
          consecutiveDays++
          if (consecutiveDays >= 5) return true
        } else {
          consecutiveDays = 0
        }
      }
      return false
    },
  },
  {
    id: 'fund-manager',
    title: '基金经理',
    description: '在所有已创建的基金都完成过任务',
    icon: '🏦',
    rarity: 'legendary',
    category: 'fund',
    check: (stats, context) => {
      const allFunds = context.allFunds || []
      return (
        allFunds.length > 0 &&
        allFunds.every((fund) => stats.lifetime.fundsManaged.includes(fund))
      )
    },
  },
]

/**
 * Rarity configuration for visual styling
 */
export const RARITY_CONFIG = {
  common: {
    color: '#64748b',
    bgColor: '#f1f5f9',
    label: '普通',
  },
  rare: {
    color: '#0ea5a4',
    bgColor: '#e0f2f1',
    label: '稀有',
  },
  epic: {
    color: '#7c3aed',
    bgColor: '#ede9fe',
    label: '史诗',
  },
  legendary: {
    color: '#dc2626',
    bgColor: '#fee2e2',
    label: '传说',
  },
}

/**
 * Get achievement by ID
 */
export const getAchievementById = (id) => {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id)
}

/**
 * Get achievements by category
 */
export const getAchievementsByCategory = (category) => {
  return ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === category)
}

/**
 * Get all category names
 */
export const ACHIEVEMENT_CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'milestone', label: '里程碑' },
  { id: 'daily', label: '每日' },
  { id: 'streak', label: '连续' },
  { id: 'fund', label: '基金' },
  { id: 'specialist', label: '专家' },
]

export default ACHIEVEMENT_DEFINITIONS
