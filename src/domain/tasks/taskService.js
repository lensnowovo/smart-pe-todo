/**
 * TaskService - Business logic for task operations
 *
 * Contains all business rules for task management, including:
 * - Task creation and validation
 * - Task filtering and grouping
 * - Priority calculation
 * - Date utilities
 */

import {
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

/**
 * Generate unique ID for tasks
 */
export const generateTaskId = () => {
  return crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Convert date to ISO format (YYYY-MM-DD)
 */
export const toISODate = (date) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Calculate days until a due date
 */
export const daysUntil = (dateStr) => {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T00:00:00`)
  const today = startOfDay(new Date())
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
  return diff
}

/**
 * Important keywords for PE operations
 */
const IMPORTANT_KEYWORDS = [
  /capital call/i,
  /quarterly report/i,
  /audit/i,
  /valuation/i,
  /investor/i,
  /subscription/i,
  /distribution/i,
  /lp\b/i,
]

/**
 * Check if a task is important based on its content
 */
export const isImportant = (task) => {
  if (task.importanceOverride === true) return true
  if (task.importanceOverride === false) return false
  if (task.priority === 'high') return true
  const text = `${task.title} ${(task.tags || []).join(' ')}`
  return IMPORTANT_KEYWORDS.some((rule) => rule.test(text))
}

/**
 * Get Eisenhower Matrix quadrant for a task
 */
export const getQuadrantKey = (task) => {
  const urgencyDays = daysUntil(task.dueDate)
  const urgent = urgencyDays !== null && urgencyDays <= 3
  const important = isImportant(task)
  if (important && urgent) return 'q1'
  if (important && !urgent) return 'q2'
  if (!important && urgent) return 'q3'
  return 'q4'
}

/**
 * Build checklist from subtasks or title
 */
export const buildChecklistFromSubtasks = (subtasks, title) => {
  if (subtasks && subtasks.length > 0) {
    return subtasks.map((item) => ({
      id: `${Date.now()}-${item}`,
      text: item,
      done: false,
    }))
  }
  return buildChecklistFromTitle(title)
}

/**
 * Build checklist from title using predefined rules
 */
const buildChecklistFromTitle = (title) => {
  const BREAKDOWN_RULES = [
    {
      match: /capital call/i,
      items: [
        '收集 Capital Call 所需数据',
        '起草 LP 通知',
        '合规与法务复核',
        '发送出资通知',
        '跟踪确认回执与到账情况',
      ],
    },
    {
      match: /quarterly report|q[1-4]/i,
      items: [
        '汇总组合公司经营指标',
        '更新估值模型',
        '整理 LP 报告材料',
        '内部审阅与修订',
        '对 LP 发布报告',
      ],
    },
  ]

  for (const rule of BREAKDOWN_RULES) {
    if (rule.match.test(title)) {
      return rule.items.map((item) => ({
        id: `${Date.now()}-${item}`,
        text: item,
        done: false,
      }))
    }
  }
  return []
}

/**
 * Derive tags from task title
 */
export const deriveTags = (text) => {
  const tags = []
  if (/capital call/i.test(text)) tags.push('Capital Call')
  if (/quarterly report|q[1-4]|季报|季度报告/i.test(text)) tags.push('Quarterly Report')
  return tags
}

/**
 * Calculate priority for a task
 */
export const calculatePriority = (task) => {
  if (task.priority === 'high') return 'high'
  if (isImportant(task)) return 'high'
  return 'normal'
}

/**
 * Build task payload from parsed data
 */
export const buildTaskPayload = (parsed) => {
  const checklist = buildChecklistFromSubtasks(parsed.subtasks || [], parsed.title)
  const priority = calculatePriority(parsed)
  const completed = Boolean(parsed.completed)
  const completedDate = completed
    ? parsed.completedDate || toISODate(startOfDay(new Date()))
    : null

  return {
    id: generateTaskId(),
    title: parsed.title,
    fund: parsed.fund,
    funds: parsed.funds || (parsed.fund ? [parsed.fund] : []),
    lp: parsed.lp || [],
    portfolio: parsed.portfolio || [],
    dueDate: parsed.dueDate,
    tags: parsed.tags,
    subtasks: parsed.subtasks || [],
    checklist,
    completed,
    priority,
    status: parsed.status || 'active',
    createdAt: new Date().toISOString(),
    createdDate: toISODate(startOfDay(new Date())),
    completedDate,
    note: parsed.note || '',
    noteRefined: parsed.noteRefined || '',
    waitingOn: parsed.waitingOn || '',
    followUpDate: parsed.followUpDate || null,
    fundCandidates: parsed.fundCandidates || [],
    groupId: parsed.groupId || null,
    generatedFrom: parsed.generatedFrom || null,
    instanceNumber: parsed.instanceNumber || null,
  }
}

/**
 * Normalize AI payload to task format
 */
export const normalizeAiPayload = (payload, raw) => {
  const fallback = parseInput(raw || '')
  const title = (payload?.title || fallback.title || raw || '').trim()
  const entity = payload?.entity?.trim() || fallback.fund
  let dueDate = null

  if (payload?.deadline) {
    try {
      const parsedDate = parseISO(payload.deadline)
      if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
        dueDate = format(parsedDate, 'yyyy-MM-dd')
      }
    } catch {
      // Invalid date, use fallback
    }
  }

  if (!dueDate) {
    dueDate = fallback.dueDate
  }

  const priority = /high/i.test(payload?.priority || '') ? 'high' : 'normal'
  const subtasks = Array.isArray(payload?.subtasks)
    ? payload.subtasks.map((item) => String(item).trim()).filter(Boolean)
    : []
  const tags = deriveTags(title)
  const directFund = payload?.fund ?? payload?.fundName
  const funds = Array.isArray(payload?.funds)
    ? payload.funds.map((item) => String(item).trim()).filter(Boolean)
    : directFund
      ? [String(directFund).trim()]
      : entity
        ? [entity]
        : []
  const lp = Array.isArray(payload?.lp)
    ? payload.lp.map((item) => String(item).trim()).filter(Boolean)
    : payload?.lp
      ? [String(payload.lp).trim()]
      : []
  const portfolio = Array.isArray(payload?.portfolio)
    ? payload.portfolio.map((item) => String(item).trim()).filter(Boolean)
    : payload?.portfolio
      ? [String(payload.portfolio).trim()]
      : []
  const fundCandidates = payload?.ambiguity?.fundCandidates || []
  const waitingOn = payload?.waitingOn || payload?.waiting_on || ''
  const followUpDate = payload?.followUpDate || payload?.follow_up_date || null
  const status = payload?.status || (waitingOn ? 'blocked' : 'active')

  return {
    title,
    fund: funds[0] || null,
    funds,
    lp,
    portfolio,
    dueDate,
    priority,
    subtasks,
    tags,
    fundCandidates: Array.isArray(fundCandidates) ? fundCandidates : [],
    waitingOn: typeof waitingOn === 'string' ? waitingOn.trim() : '',
    followUpDate: followUpDate || null,
    status,
  }
}

/**
 * Parse input text (fallback for AI)
 */
const parseInput = (raw) => {
  const normalized = raw?.replace(/\s+/g, ' ').trim() || ''
  if (!normalized) return { title: '', fund: null, dueDate: null, tags: [] }

  // Simple fund detection
  const fundMatch = normalized.match(/\bFund\s*([IVX]+|\d+)\b/i)
  const fund = fundMatch ? `Fund ${fundMatch[1].toUpperCase()}` : null

  // Remove fund from text
  let working = fundMatch ? normalized.replace(fundMatch[0], '').trim() : normalized

  // Simple date detection (ISO format)
  const isoMatch = working.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  let dueDate = null
  if (isoMatch) {
    dueDate = isoMatch[0]
    working = working.replace(isoMatch[0], '').trim()
  }

  working = working.replace(/[，,。.]+$/, '').trim()
  const title = working || normalized
  const tags = deriveTags(normalized)

  return {
    title,
    fund,
    dueDate,
    tags,
  }
}

/**
 * Task filtering utilities
 */
export const TaskFilters = {
  /**
   * Filter tasks by due date
   */
  byDate: (tasks, date) => {
    const key = format(date, 'yyyy-MM-dd')
    return tasks.filter((task) => task.dueDate === key)
  },

  /**
   * Filter incomplete tasks
   */
  active: (tasks) => {
    return tasks.filter((task) => !task.completed)
  },

  /**
   * Filter tasks by fund
   */
  byFund: (tasks, fundName) => {
    return tasks.filter((task) =>
      (task.funds || []).includes(fundName) || task.fund === fundName
    )
  },

  /**
   * Group tasks by fund
   */
  groupByFund: (tasks) => {
    const groups = {}
    for (const task of tasks) {
      const fundList = task.funds?.length ? task.funds : task.fund ? [task.fund] : []
      for (const fundName of fundList) {
        if (!groups[fundName]) groups[fundName] = []
        groups[fundName].push(task)
      }
    }
    return groups
  },

  /**
   * Group tasks by Eisenhower Matrix quadrant
   */
  groupByMatrix: (tasks) => {
    return tasks.reduce(
      (acc, task) => {
        const key = getQuadrantKey(task)
        acc[key].push(task)
        return acc
      },
      { q1: [], q2: [], q3: [], q4: [] }
    )
  },

  /**
   * Filter tasks that should be shown for a given day
   */
  shouldShowTask: (task, dayKey, getCreatedDate) => {
    if (!task.completed) return true
    if (!task.completedDate) return true
    const createdDate = getCreatedDate(task)
    return createdDate <= dayKey && task.completedDate >= dayKey
  },
}

/**
 * Task operations
 */
export const TaskOperations = {
  /**
   * Toggle task completion
   */
  toggleComplete: (task, completed = !task.completed) => {
    return {
      ...task,
      completed,
      completedDate: completed ? toISODate(startOfDay(new Date())) : null,
    }
  },

  /**
   * Toggle checklist item completion
   */
  toggleChecklistItem: (task, itemId) => {
    return {
      ...task,
      checklist: task.checklist.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      ),
    }
  },

  /**
   * Update checklist item text
   */
  updateChecklistItem: (task, itemId, text) => {
    const cleaned = text.trim()
    if (!cleaned) return task
    return {
      ...task,
      checklist: task.checklist.map((item) =>
        item.id === itemId ? { ...item, text: cleaned } : item
      ),
    }
  },

  /**
   * Add checklist item
   */
  addChecklistItem: (task, item) => {
    return {
      ...task,
      checklist: [...(task.checklist || []), item],
    }
  },

  /**
   * Delete checklist item
   */
  deleteChecklistItem: (task, itemId) => {
    return {
      ...task,
      checklist: task.checklist.filter((item) => item.id !== itemId),
    }
  },

  /**
   * Clear all checklist items
   */
  clearChecklist: (task) => {
    return {
      ...task,
      checklist: [],
    }
  },

  /**
   * Update task due date
   */
  updateDueDate: (task, dueDate) => {
    return {
      ...task,
      dueDate: dueDate || null,
    }
  },

  /**
   * Add task tag
   */
  addTag: (task, tag) => {
    const cleaned = tag.trim()
    if (!cleaned) return task
    const existing = task.tags || []
    if (existing.includes(cleaned)) return task
    return {
      ...task,
      tags: [...existing, cleaned],
    }
  },

  /**
   * Update task tag
   */
  updateTag: (task, previousTag, nextTag) => {
    const cleaned = nextTag.trim()
    if (!cleaned) return task
    const existing = task.tags || []
    if (!existing.includes(previousTag)) return task
    if (existing.includes(cleaned)) {
      return {
        ...task,
        tags: existing.filter((tag) => tag !== previousTag),
      }
    }
    return {
      ...task,
      tags: existing.map((tag) => (tag === previousTag ? cleaned : tag)),
    }
  },

  /**
   * Update task note
   */
  updateNote: (task, note, noteRefined) => {
    return {
      ...task,
      note: typeof note === 'string' ? note : task.note || '',
      noteRefined: typeof noteRefined === 'string' ? noteRefined : task.noteRefined || '',
    }
  },

  /**
   * Update task fund
   */
  updateFund: (task, fund) => {
    const cleaned = fund.trim()
    return {
      ...task,
      fund: cleaned ? cleaned : null,
      funds: cleaned ? [cleaned] : [],
    }
  },

  /**
   * Move task to new date
   */
  moveToDate: (task, dayKey) => {
    return {
      ...task,
      dueDate: dayKey,
    }
  },
}

export default {
  generateTaskId,
  toISODate,
  daysUntil,
  isImportant,
  getQuadrantKey,
  buildChecklistFromSubtasks,
  deriveTags,
  calculatePriority,
  buildTaskPayload,
  normalizeAiPayload,
  TaskFilters,
  TaskOperations,
}
