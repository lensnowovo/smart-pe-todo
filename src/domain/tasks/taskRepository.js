/**
 * TaskRepository - Abstract storage layer for tasks
 *
 * Provides a clean interface for task persistence, making it easy
 * to swap localStorage for a backend API in the future.
 */

const STORAGE_KEY = 'pe-fund-ops.tasks'

/**
 * Load all tasks from storage
 */
export const loadTasks = () => {
  if (typeof window !== 'undefined' && window.electronAPI?.getStoreSync) {
    const stored = window.electronAPI.getStoreSync(STORAGE_KEY)
    if (stored !== null && stored !== undefined) return stored
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        window.electronAPI.setStoreSync(STORAGE_KEY, parsed)
        localStorage.removeItem(STORAGE_KEY)
        return parsed
      }
    } catch (error) {
      console.error('Failed to migrate tasks from localStorage:', error)
    }
    return []
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load tasks from localStorage:', error)
  }
  return []
}

/**
 * Save all tasks to storage
 */
export const saveTasks = (tasks) => {
  if (typeof window !== 'undefined' && window.electronAPI?.setStoreSync) {
    try {
      return window.electronAPI.setStoreSync(STORAGE_KEY, tasks)
    } catch (error) {
      console.error('Failed to save tasks to userData store:', error)
      return false
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    return true
  } catch (error) {
    console.error('Failed to save tasks to localStorage:', error)
    return false
  }
}

/**
 * Repository interface with CRUD operations
 */
export const TaskRepository = {
  /**
   * Get all tasks
   */
  getAll: () => {
    return loadTasks()
  },

  /**
   * Get task by ID
   */
  getById: (id) => {
    const tasks = loadTasks()
    return tasks.find((task) => task.id === id) || null
  },

  /**
   * Create new task(s)
   */
  create: (taskOrTasks) => {
    const tasks = loadTasks()
    const newTasks = Array.isArray(taskOrTasks) ? taskOrTasks : [taskOrTasks]
    const updated = [...newTasks, ...tasks]
    saveTasks(updated)
    return newTasks
  },

  /**
   * Update existing task
   */
  update: (id, updates) => {
    const tasks = loadTasks()
    const index = tasks.findIndex((task) => task.id === id)
    if (index === -1) {
      return null
    }
    const updatedTask = { ...tasks[index], ...updates }
    tasks[index] = updatedTask
    saveTasks(tasks)
    return updatedTask
  },

  /**
   * Delete task
   */
  delete: (id) => {
    const tasks = loadTasks()
    const filtered = tasks.filter((task) => task.id !== id)
    if (filtered.length === tasks.length) {
      return false // Task not found
    }
    saveTasks(filtered)
    return true
  },

  /**
   * Delete multiple tasks
   */
  deleteMany: (ids) => {
    const tasks = loadTasks()
    const idSet = new Set(ids)
    const filtered = tasks.filter((task) => !idSet.has(task.id))
    saveTasks(filtered)
    return filtered.length < tasks.length
  },

  /**
   * Clear all tasks
   */
  clear: () => {
    saveTasks([])
    return true
  },
}

export default TaskRepository
