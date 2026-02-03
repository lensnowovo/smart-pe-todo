import {
  addDays,
  addMonths,
  addQuarters,
  addYears,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from 'date-fns'

/**
 * RecurrenceEngine - Handles recurring task generation for PE Fund Operations
 *
 * Supports PE-specific recurrence patterns:
 * - Quarterly reports (Q1, Q2, Q3, Q4)
 * - Monthly capital calls
 * - Annual LP meetings
 * - Custom intervals
 */

// Quarter end dates for PE reporting
const QUARTER_ENDS = {
  Q1: { month: 2, day: 31 }, // March 31
  Q2: { month: 5, day: 30 }, // June 30
  Q3: { month: 8, day: 30 }, // September 30
  Q4: { month: 11, day: 31 }, // December 31
}

const resolveMonthDay = (year, month, day) => {
  const monthEnd = endOfMonth(new Date(year, month, 1))
  if (day > monthEnd.getDate()) return monthEnd
  return new Date(year, month, day)
}

/**
 * Get the next occurrence of a quarterly date
 */
export const getNextQuarterEnd = (referenceDate = new Date()) => {
  const ref = startOfDay(referenceDate)
  const currentMonth = ref.getMonth()
  const currentDay = ref.getDate()

  // Find which quarter we're in
  const quarters = [
    { name: 'Q1', month: 2, day: 31 }, // March
    { name: 'Q2', month: 5, day: 30 }, // June
    { name: 'Q3', month: 8, day: 30 }, // September
    { name: 'Q4', month: 11, day: 31 }, // December
  ]

  // Find next quarter end
  for (const quarter of quarters) {
    const quarterEndDate = new Date(ref.getFullYear(), quarter.month, quarter.day)
    if (quarterEndDate > ref) {
      return { date: quarterEndDate, quarter: quarter.name }
    }
  }

  // If no quarter found this year, return Q1 of next year
  const q1NextYear = new Date(ref.getFullYear() + 1, 2, 31)
  return { date: q1NextYear, quarter: 'Q1' }
}

/**
 * Get all quarter ends for a given year
 */
export const getQuarterEndsForYear = (year) => {
  return [
    { name: 'Q1', date: new Date(year, 2, 31) },
    { name: 'Q2', date: new Date(year, 5, 30) },
    { name: 'Q3', date: new Date(year, 8, 30) },
    { name: 'Q4', date: new Date(year, 11, 31) },
  ]
}

/**
 * Calculate the next occurrence date based on recurrence rule
 */
export const getNextOccurrence = (recurrence, referenceDate = new Date()) => {
  const ref = startOfDay(referenceDate)
  const anchor = recurrence.anchorDate ? startOfDay(parseISO(recurrence.anchorDate)) : null

  switch (recurrence.frequency) {
    case 'daily':
      return addDays(ref, recurrence.interval || 1)

    case 'weekly':
      return addDays(ref, (recurrence.interval || 1) * 7)

    case 'monthly': {
      const dayOfMonth = anchor ? anchor.getDate() : (recurrence.dayOfMonth || 15)
      const currentCandidate = resolveMonthDay(ref.getFullYear(), ref.getMonth(), dayOfMonth)
      if (currentCandidate > ref) return currentCandidate

      const nextMonth = addMonths(ref, recurrence.interval || 1)
      return resolveMonthDay(nextMonth.getFullYear(), nextMonth.getMonth(), dayOfMonth)
    }

    case 'quarterly': {
      if (!anchor) {
        const quarterEnd = getNextQuarterEnd(ref)
        if (recurrence.dayOfQuarter) {
          const quarterEndDate = quarterEnd.date
          const targetDate = new Date(
            quarterEndDate.getFullYear(),
            quarterEndDate.getMonth(),
            recurrence.dayOfQuarter
          )
          return targetDate <= quarterEndDate ? targetDate : quarterEndDate
        }
        return quarterEnd.date
      }

      const dayOfMonth = anchor.getDate()
      const quarterStart = startOfQuarter(ref)
      const startMonth = quarterStart.getMonth()
      const currentCandidate = resolveMonthDay(quarterStart.getFullYear(), startMonth, dayOfMonth)
      if (currentCandidate > ref) return currentCandidate

      const nextQuarterStart = startOfQuarter(addQuarters(ref, 1))
      return resolveMonthDay(
        nextQuarterStart.getFullYear(),
        nextQuarterStart.getMonth(),
        dayOfMonth
      )
    }

    case 'yearly':
      if (anchor) {
        const currentCandidate = resolveMonthDay(ref.getFullYear(), anchor.getMonth(), anchor.getDate())
        if (currentCandidate > ref) return currentCandidate
      }
      return addYears(ref, recurrence.interval || 1)

    case 'custom': {
      // Custom recurrence using cron-like syntax
      if (recurrence.customPattern) {
        return parseCustomRecurrence(recurrence.customPattern, ref)
      }
      return addMonths(ref, 1) // Fallback
    }

    default:
      return addMonths(ref, 1)
  }
}

const getFirstOccurrence = (recurrence, referenceDate = new Date()) => {
  const ref = startOfDay(referenceDate)
  const anchor = recurrence.anchorDate ? startOfDay(parseISO(recurrence.anchorDate)) : null

  switch (recurrence.frequency) {
    case 'monthly': {
      const dayOfMonth = anchor ? anchor.getDate() : (recurrence.dayOfMonth || 15)
      const currentCandidate = resolveMonthDay(ref.getFullYear(), ref.getMonth(), dayOfMonth)
      if (currentCandidate >= ref) return currentCandidate

      const nextMonth = addMonths(ref, recurrence.interval || 1)
      return resolveMonthDay(nextMonth.getFullYear(), nextMonth.getMonth(), dayOfMonth)
    }

    case 'quarterly': {
      if (!anchor) {
        const quarterEnd = addDays(startOfQuarter(addQuarters(ref, 1)), -1)

        if (recurrence.dayOfQuarter) {
          const targetDate = new Date(
            quarterEnd.getFullYear(),
            quarterEnd.getMonth(),
            recurrence.dayOfQuarter
          )
          if (targetDate <= quarterEnd && targetDate >= ref) return targetDate
        } else if (quarterEnd >= ref) {
          return quarterEnd
        }

        const nextQuarterEnd = addDays(startOfQuarter(addQuarters(ref, 2)), -1)
        if (recurrence.dayOfQuarter) {
          const targetDate = new Date(
            nextQuarterEnd.getFullYear(),
            nextQuarterEnd.getMonth(),
            recurrence.dayOfQuarter
          )
          return targetDate <= nextQuarterEnd ? targetDate : nextQuarterEnd
        }
        return nextQuarterEnd
      }

      const dayOfMonth = anchor.getDate()
      const quarterStart = startOfQuarter(ref)
      const startMonth = quarterStart.getMonth()
      const currentCandidate = resolveMonthDay(quarterStart.getFullYear(), startMonth, dayOfMonth)
      if (currentCandidate >= ref) return currentCandidate

      const nextQuarterStart = startOfQuarter(addQuarters(ref, 1))
      return resolveMonthDay(
        nextQuarterStart.getFullYear(),
        nextQuarterStart.getMonth(),
        dayOfMonth
      )
    }

    case 'yearly': {
      if (anchor) {
        const currentCandidate = resolveMonthDay(ref.getFullYear(), anchor.getMonth(), anchor.getDate())
        if (currentCandidate >= ref) return currentCandidate
        const nextYear = addYears(ref, recurrence.interval || 1)
        return resolveMonthDay(nextYear.getFullYear(), anchor.getMonth(), anchor.getDate())
      }
      return addYears(ref, recurrence.interval || 1)
    }

    default:
      return ref
  }
}

const getPreviousOccurrence = (recurrence, referenceDate = new Date()) => {
  const ref = startOfDay(referenceDate)
  const anchor = recurrence.anchorDate ? startOfDay(parseISO(recurrence.anchorDate)) : null

  switch (recurrence.frequency) {
    case 'monthly': {
      const dayOfMonth = anchor ? anchor.getDate() : (recurrence.dayOfMonth || 15)
      const prevMonth = addMonths(ref, -(recurrence.interval || 1))
      return resolveMonthDay(prevMonth.getFullYear(), prevMonth.getMonth(), dayOfMonth)
    }

    case 'quarterly': {
      if (!anchor) {
        const prevQuarterEnd = addDays(startOfQuarter(ref), -1)
        if (recurrence.dayOfQuarter) {
          const targetDate = new Date(
            prevQuarterEnd.getFullYear(),
            prevQuarterEnd.getMonth(),
            recurrence.dayOfQuarter
          )
          return targetDate <= prevQuarterEnd ? targetDate : prevQuarterEnd
        }
        return prevQuarterEnd
      }

      const dayOfMonth = anchor.getDate()
      const prevQuarterStart = startOfQuarter(addQuarters(ref, -(recurrence.interval || 1)))
      return resolveMonthDay(
        prevQuarterStart.getFullYear(),
        prevQuarterStart.getMonth(),
        dayOfMonth
      )
    }

    case 'yearly': {
      const prevYear = addYears(ref, -(recurrence.interval || 1))
      if (anchor) {
        return resolveMonthDay(prevYear.getFullYear(), anchor.getMonth(), anchor.getDate())
      }
      return prevYear
    }

    default:
      return null
  }
}

/**
 * Parse custom recurrence pattern (simplified cron-like)
 * Format: "FREQ=MONTHLY;BYDAY=MO,WE,FR;BYSETPOS=1" (simplified)
 */
const parseCustomRecurrence = (pattern, referenceDate) => {
  // Simplified implementation - can be extended
  const parts = pattern.split(';')
  const params = {}
  for (const part of parts) {
    const [key, value] = part.split('=')
    params[key] = value
  }

  switch (params.FREQ) {
    case 'WEEKLY':
      if (params.BYDAY) {
        const days = params.BYDAY.split(',')
        // Find next matching weekday
        const dayMap = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }
        const targetDays = days.map((d) => dayMap[d]).sort()
        const currentDay = referenceDate.getDay()

        for (const targetDay of targetDays) {
          if (targetDay > currentDay) {
            return addDays(referenceDate, targetDay - currentDay)
          }
        }
        // Wrap to next week
        const firstTarget = targetDays[0]
        return addDays(referenceDate, 7 - currentDay + firstTarget)
      }
      return addDays(referenceDate, 7)

    default:
      return addMonths(referenceDate, 1)
  }
}

/**
 * Generate all occurrences between start and end date
 */
export const generateOccurrences = (
  recurrence,
  startDate,
  endDate,
  options = {}
) => {
  const occurrences = []
  const maxOccurrences = options.maxOccurrences || 100
  const start = startOfDay(startDate instanceof Date ? startDate : parseISO(startDate))
  const end = endOfDay(endDate instanceof Date ? endDate : parseISO(endDate))

  let currentDate = start
  let count = 0

  // Skip if we have an end date and it's before start
  if (recurrence.endDate) {
    const recurrenceEnd = startOfDay(parseISO(recurrence.endDate))
    if (recurrenceEnd < start) {
      return occurrences
    }
  }

  while (currentDate <= end && count < maxOccurrences) {
    // Check if we've passed the recurrence end date
    if (recurrence.endDate) {
      const recurrenceEnd = startOfDay(parseISO(recurrence.endDate))
      if (currentDate > recurrenceEnd) {
        break
      }
    }

    // Check count limit
    if (recurrence.count && count >= recurrence.count) {
      break
    }

    // Generate occurrence (skip the first date if it's the start date)
    if (count > 0 || options.includeFirst) {
      occurrences.push(new Date(currentDate))
    }

    currentDate = getNextOccurrence(recurrence, currentDate)
    count++
  }

  return occurrences
}

/**
 * Generate task instances from a recurring template
 */
export const generateTaskInstances = (template, startDate, endDate) => {
  const recurrence = template.recurrence || {}
  const shouldAlign = ['monthly', 'quarterly', 'yearly'].includes(recurrence.frequency)
  const alignedStart = shouldAlign ? getFirstOccurrence(recurrence, startDate) : startDate
  const occurrences = generateOccurrences(recurrence, alignedStart, endDate, {
    includeFirst: shouldAlign,
  })

  const computeDueDate = (date) => {
    const rule = template.dueRule || {}
    const offsetMonths = Number(rule.offsetMonths || 0)
    const useMonthEnd = Boolean(rule.useMonthEnd)
    const dayOfMonth = rule.dayOfMonth ? Number(rule.dayOfMonth) : null
    const baseDate = offsetMonths > 0 ? addMonths(date, offsetMonths) : date

    if (useMonthEnd) {
      return endOfMonth(baseDate)
    }

    if (dayOfMonth) {
      return resolveMonthDay(baseDate.getFullYear(), baseDate.getMonth(), dayOfMonth)
    }

    return baseDate
  }

  if (shouldAlign) {
    const start = startOfDay(startDate instanceof Date ? startDate : parseISO(startDate))
    const end = endOfDay(endDate instanceof Date ? endDate : parseISO(endDate))
    const previous = getPreviousOccurrence(recurrence, alignedStart)
    if (previous && previous < alignedStart) {
      const previousDue = computeDueDate(previous)
      if (previousDue >= start && previousDue <= end) {
        occurrences.unshift(previous)
      }
    }
  }

  const windowStart = startOfDay(startDate instanceof Date ? startDate : parseISO(startDate))
  const notifyDays = Number(recurrence.notifyDaysBefore || 0)
  const windowEnd = notifyDays > 0
    ? endOfDay(addDays(windowStart, notifyDays))
    : null

  const instances = occurrences.map((date, index) => {
    const dueDateValue = computeDueDate(date)
    return {
      id: `${template.id}-instance-${format(date, 'yyyy-MM-dd')}`,
      title: replaceDatePlaceholders(template.title, date, index + 1),
      funds: [...(template.funds || [])],
      lp: [...(template.lp || [])],
      portfolio: [...(template.portfolio || [])],
      dueDate: format(dueDateValue, 'yyyy-MM-dd'),
      tags: [...(template.tags || [])],
      checklist: template.checklist ? template.checklist.map((item) => ({ ...item })) : [],
      completed: false,
      priority: template.priority || 'normal',
      createdAt: new Date().toISOString(),
      createdDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
      completedDate: null,
      note: '',
      noteRefined: '',
      generatedFrom: template.id,
      instanceNumber: index + 1,
      recurrenceDate: format(date, 'yyyy-MM-dd'),
      _dueDateValue: dueDateValue,
    }
  })

  const filtered = windowEnd
    ? instances.filter((item) => {
      const dueDateValue = item._dueDateValue
      return dueDateValue >= windowStart && dueDateValue <= windowEnd
    })
    : instances

  return filtered.map(({ _dueDateValue, ...rest }) => rest)
}

/**
 * Replace date placeholders in title (e.g., "{Q1} Quarterly Report")
 */
const replaceDatePlaceholders = (title, date, instanceNumber) => {
  const month = date.getMonth() + 1
  const quarter = Math.ceil(month / 3)

  return title
    .replace(/\{Q([1-4])\}/g, `Q${quarter}`)
    .replace(/\{QUARTER\}/gi, `Q${quarter}`)
    .replace(/\{MONTH\}/gi, `${month}月`)
    .replace(/\{YEAR\}/gi, date.getFullYear())
    .replace(/\{INSTANCE\}/gi, `#${instanceNumber}`)
}

/**
 * Predefined templates for common PE operations
 */
export const PE_TEMPLATES = {
  quarterlyReport: {
    name: '季度报告',
    description: 'LP季度报告标准流程',
    recurrence: {
      frequency: 'quarterly',
      dayOfQuarter: null, // Due on quarter end
      autoGenerate: true,
      notifyDaysBefore: 14,
    },
    tags: ['Quarterly Report'],
    priority: 'high',
    dueRule: { offsetMonths: 0, dayOfMonth: null, useMonthEnd: true },
    checklist: [
      { id: 'qr-1', text: '汇总组合公司经营指标', done: false },
      { id: 'qr-2', text: '更新估值模型', done: false },
      { id: 'qr-3', text: '整理 LP 报告材料', done: false },
      { id: 'qr-4', text: '内部审阅与修订', done: false },
      { id: 'qr-5', text: '对 LP 发布报告', done: false },
    ],
  },

  capitalCall: {
    name: '出资通知 (Capital Call)',
    description: '标准出资通知流程',
    recurrence: {
      frequency: 'quarterly',
      dayOfQuarter: 15, // 15th day after quarter start
      autoGenerate: true,
      notifyDaysBefore: 7,
    },
    tags: ['Capital Call'],
    priority: 'high',
    dueRule: { offsetMonths: 0, dayOfMonth: null, useMonthEnd: false },
    checklist: [
      { id: 'cc-1', text: '收集 Capital Call 所需数据', done: false },
      { id: 'cc-2', text: '起草 LP 通知', done: false },
      { id: 'cc-3', text: '合规与法务复核', done: false },
      { id: 'cc-4', text: '发送出资通知', done: false },
      { id: 'cc-5', text: '跟踪确认回执与到账情况', done: false },
    ],
  },

  annualMeeting: {
    name: '年度 LP 会议',
    description: '年度投资人顾问委员会会议',
    recurrence: {
      frequency: 'yearly',
      interval: 1,
      autoGenerate: true,
      notifyDaysBefore: 30,
    },
    tags: ['LP Meeting', 'Annual'],
    priority: 'high',
    dueRule: { offsetMonths: 0, dayOfMonth: null, useMonthEnd: false },
    checklist: [
      { id: 'am-1', text: '确定会议时间地点', done: false },
      { id: 'am-2', text: '准备年度业绩报告', done: false },
      { id: 'am-3', text: '发送会议邀请', done: false },
      { id: 'am-4', text: '收集 RSVP', done: false },
      { id: 'am-5', text: '准备会议材料和餐饮', done: false },
    ],
  },

  monthlyValuation: {
    name: '月度估值更新',
    description: '组合公司月度估值更新',
    recurrence: {
      frequency: 'monthly',
      dayOfMonth: 5, // 5th of each month
      autoGenerate: true,
      notifyDaysBefore: 3,
    },
    tags: ['Valuation', 'Monthly'],
    priority: 'normal',
    dueRule: { offsetMonths: 0, dayOfMonth: null, useMonthEnd: false },
    checklist: [
      { id: 'mv-1', text: '收集各公司财务数据', done: false },
      { id: 'mv-2', text: '更新估值模型', done: false },
      { id: 'mv-3', text: '与投资团队核对', done: false },
      { id: 'mv-4', text: '更新内部估值表', done: false },
    ],
  },
}

/**
 * Create a new template from a task
 */
export const createTemplateFromTask = (task, recurrence) => {
  const todayKey = format(startOfDay(new Date()), 'yyyy-MM-dd')
  const anchorDate = task.dueDate || todayKey
  return {
    id: `template-${Date.now()}`,
    name: task.title,
    description: `基于任务 "${task.title}" 创建的模板`,
    title: task.title,
    funds: task.funds || [],
    lp: task.lp || [],
    portfolio: task.portfolio || [],
    tags: task.tags || [],
    checklist: task.checklist?.map((item) => ({ ...item })) || [],
    priority: task.priority || 'normal',
    anchorDate,
    dueDateBaseDate: task.dueDate || anchorDate,
    dueRule: { offsetMonths: 0, dayOfMonth: null, useMonthEnd: false },
    recurrence: { ...recurrence, anchorDate },
    createdAt: new Date().toISOString(),
  }
}

/**
 * Calculate next notification date for a recurring task
 */
export const getNextNotificationDate = (recurrence, referenceDate = new Date()) => {
  if (!recurrence.notifyDaysBefore || recurrence.notifyDaysBefore <= 0) {
    return null
  }

  const nextOccurrence = getNextOccurrence(recurrence, referenceDate)
  return addDays(nextOccurrence, -recurrence.notifyDaysBefore)
}

/**
 * Check if a recurring task needs to be generated
 */
export const shouldGenerateInstance = (template, referenceDate = new Date()) => {
  const notificationDate = getNextNotificationDate(template.recurrence, referenceDate)

  if (!notificationDate) {
    return { shouldGenerate: false, reason: 'No notification configured' }
  }

  const today = startOfDay(referenceDate)
  const notifyDay = startOfDay(notificationDate)

  // Generate if we're at or past the notification date
  if (today >= notifyDay) {
    const nextOccurrence = getNextOccurrence(template.recurrence, referenceDate)
    return {
      shouldGenerate: true,
      dueDate: format(nextOccurrence, 'yyyy-MM-dd'),
      notificationDate: format(notificationDate, 'yyyy-MM-dd'),
    }
  }

  return {
    shouldGenerate: false,
    reason: 'Not yet time to generate',
    nextNotification: format(notificationDate, 'yyyy-MM-dd'),
  }
}

export default {
  getNextOccurrence,
  generateOccurrences,
  generateTaskInstances,
  PE_TEMPLATES,
  createTemplateFromTask,
  shouldGenerateInstance,
  getNextNotificationDate,
  getNextQuarterEnd,
  getQuarterEndsForYear,
}
