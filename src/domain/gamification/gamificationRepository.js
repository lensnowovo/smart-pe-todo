/**
 * GamificationRepository - Storage layer for gamification data
 *
 * Handles persistence of streaks, achievements, and daily statistics
 */

const GAMIFICATION_KEY = 'pe-fund-ops.gamification'
const CURRENT_VERSION = 1

/**
 * Load gamification data from localStorage
 */
export const loadGamificationData = () => {
  try {
    const stored = localStorage.getItem(GAMIFICATION_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      // Handle migrations if needed
      return migrateGamificationData(data)
    }
  } catch (error) {
    console.error('Failed to load gamification data:', error)
  }
  return initializeGamificationData()
}

/**
 * Save gamification data to localStorage
 */
export const saveGamificationData = (data) => {
  try {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(data))
    return true
  } catch (error) {
    console.error('Failed to save gamification data:', error)
    return false
  }
}

/**
 * Initialize empty gamification data structure
 */
export const initializeGamificationData = () => ({
  version: CURRENT_VERSION,
  streaks: {
    current: 0,
    longest: 0,
    lastCalculatedDate: null,
    milestones: [],
  },
  dailyStats: {},
  achievements: {
    unlocked: [],
    inProgress: [],
  },
  lifetime: {
    totalTasksCompleted: 0,
    totalTasksCreated: 0,
    perfectDays: 0,
    mostProductiveDay: null,
    fundsManaged: [],
    totalCapitalCallsCompleted: 0,
    totalQuarterlyReportsCompleted: 0,
  },
  preferences: {
    showNotifications: true,
    celebrationEnabled: true,
  },
})

/**
 * Migrate data from older versions
 */
function migrateGamificationData(oldData) {
  if (!oldData || !oldData.version) {
    return initializeGamificationData()
  }

  if (oldData.version < CURRENT_VERSION) {
    let data = { ...oldData }

    // Add migrations here when version increases
    // if (data.version === 0) {
    //   data = migrateV0ToV1(data)
    // }

    data.version = CURRENT_VERSION
    return data
  }

  return oldData
}

export default {
  loadGamificationData,
  saveGamificationData,
  initializeGamificationData,
}
