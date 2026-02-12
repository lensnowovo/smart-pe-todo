import { useMemo, useState, useEffect } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  Inbox,
  CalendarCheck,
  Grid2X2,
  Layers,
  Database,
  CalendarDays,
  Clock,
  Flag,
  FileText,
  Settings,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import TaskInput from './components/TaskInput'
import TaskList from './components/TaskList'
import ProgressWidget from './components/ProgressWidget'
import ContextManager from './components/ContextManager'
import AmbiguityModal from './components/AmbiguityModal'
import BatchTaskModal from './components/BatchTaskModal'
import CalendarView from './components/CalendarView'
import CalendarDayModal from './components/CalendarDayModal'
import GamificationDashboard from './components/GamificationDashboard'
import AchievementNotification from './components/AchievementNotification'
import ReportView from './components/ReportView'
import SettingsView from './components/SettingsView'
import { generateTaskInstances } from './services/recurrenceEngine'
import TaskRepository, { loadTasks, saveTasks } from './domain/tasks/taskRepository'
import {
  toISODate,
  daysUntil,
  getQuadrantKey,
  buildTaskPayload,
  normalizeAiPayload,
  TaskFilters,
  TaskOperations,
} from './domain/tasks/taskService'
import { analyzeTaskInput } from './services/aiService'
import { loadGamificationData, saveGamificationData } from './domain/gamification/gamificationRepository'
import { processTaskCompletion } from './domain/gamification/gamificationService'
import { ACHIEVEMENT_DEFINITIONS } from './domain/gamification/achievementDefinitions'

const CONTEXT_KEY = 'pe-fund-ops.context'
const TEMPLATES_KEY = 'pe-fund-ops.templates'

// Date parsing utilities for fallback parsing
const WEEKDAY_MAP_EN = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
}

const WEEKDAY_MAP_CN = {
  '一': 1,
  '二': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '日': 0,
  '天': 0,
}

const parseFund = (text) => {
  const fundMatch = text.match(/\bFund\s*([IVX]+|\d+)\b/i)
  if (!fundMatch) return { fund: null, stripped: text }
  const fundId = fundMatch[1].toUpperCase()
  const fund = `Fund ${fundId}`
  const stripped = text.replace(fundMatch[0], '').trim()
  return { fund, stripped }
}

const getUpcomingWeekday = (baseDate, targetWeekday, offsetWeeks = 0) => {
  const base = startOfDay(baseDate)
  const day = base.getDay()
  let diff = targetWeekday - day
  if (diff <= 0) diff += 7
  diff += offsetWeeks * 7
  return addDays(base, diff)
}

const parseDateFromText = (text, now = new Date()) => {
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    return { date, token: isoMatch[0] }
  }

  const mdMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/)
  if (mdMatch) {
    const date = new Date(now.getFullYear(), Number(mdMatch[1]) - 1, Number(mdMatch[2]))
    return { date, token: mdMatch[0] }
  }

  const relativeMatch = text.match(/\b(today|tomorrow)\b/i)
  if (relativeMatch) {
    const token = relativeMatch[0]
    const offset = /tomorrow/i.test(token) ? 1 : 0
    return { date: addDays(now, offset), token }
  }

  const nextDayMatch = text.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
  if (nextDayMatch) {
    const target = WEEKDAY_MAP_EN[nextDayMatch[1].toLowerCase()]
    const date = getUpcomingWeekday(now, target, 1)
    return { date, token: nextDayMatch[0] }
  }

  const dayMatch = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
  if (dayMatch) {
    const target = WEEKDAY_MAP_EN[dayMatch[1].toLowerCase()]
    const date = getUpcomingWeekday(now, target, 0)
    return { date, token: dayMatch[0] }
  }

  const cnMatch = text.match(/(本周|下周)?(周|星期)?([一二三四五六日天])/)
  if (cnMatch) {
    const weekFlag = cnMatch[1] || ''
    const weekdayChar = cnMatch[3]
    const offsetWeeks = weekFlag === '下周' ? 1 : 0
    const target = WEEKDAY_MAP_CN[weekdayChar]
    const date = getUpcomingWeekday(now, target, offsetWeeks)
    return { date, token: cnMatch[0] }
  }

  return { date: null, token: null }
}

const deriveTags = (text) => {
  const tags = []
  if (/capital call/i.test(text)) tags.push('Capital Call')
  if (/quarterly report|q[1-4]|季报|季度报告/i.test(text)) tags.push('Quarterly Report')
  return tags
}

// Fallback parser for when AI fails
const parseInput = (raw) => {
  const normalized = raw.replace(/\s+/g, ' ').trim()
  if (!normalized) return { title: '', fund: null, dueDate: null, tags: [] }

  const fundResult = parseFund(normalized)
  let working = fundResult.stripped
  const { date, token } = parseDateFromText(working)
  if (token) {
    working = working.replace(token, '').trim()
  }

  working = working.replace(/[，,。.]+$/, '').trim()
  const title = working || normalized
  const tags = deriveTags(normalized)

  return {
    title,
    fund: fundResult.fund,
    dueDate: date ? toISODate(date) : null,
    tags,
  }
}

const buildChecklistFromSubtasks = (subtasks, title) => {
  if (subtasks.length > 0) {
    return subtasks.map((item) => ({
      id: `${Date.now()}-${item}`,
      text: item,
      done: false,
    }))
  }
  // Use taskService's buildChecklistFromTitle via the imported buildTaskPayload
  return []
}

// Sample tasks for first-time users
const sampleTasks = () => [
  {
    id: 'seed-1',
    title: '准备 Fund III 的 Q1 季报材料包',
    fund: 'Fund III',
    funds: ['Fund III'],
    lp: [],
    portfolio: [],
    dueDate: toISODate(addDays(new Date(), 4)),
    tags: ['Quarterly Report'],
    checklist: [
      { id: 'qr-1', text: '汇总组合公司经营指标', done: false },
      { id: 'qr-2', text: '更新估值模型', done: false },
      { id: 'qr-3', text: '整理 LP 报告材料', done: false },
      { id: 'qr-4', text: '内部审阅与修订', done: false },
      { id: 'qr-5', text: '对 LP 发布报告', done: false },
    ],
    completed: false,
    priority: 'high',
    createdAt: new Date().toISOString(),
    createdDate: toISODate(startOfDay(new Date())),
    completedDate: null,
  },
  {
    id: 'seed-2',
    title: '起草 Capital Call 通知',
    fund: 'Fund II',
    funds: ['Fund II'],
    lp: [],
    portfolio: [],
    dueDate: toISODate(addDays(new Date(), 1)),
    tags: ['Capital Call'],
    checklist: [
      { id: 'cc-1', text: '收集 Capital Call 所需数据', done: false },
      { id: 'cc-2', text: '起草 LP 通知', done: false },
      { id: 'cc-3', text: '合规与法务复核', done: false },
      { id: 'cc-4', text: '发送出资通知', done: false },
      { id: 'cc-5', text: '跟踪确认回执与到账情况', done: false },
    ],
    completed: false,
    priority: 'high',
    createdAt: new Date().toISOString(),
    createdDate: toISODate(startOfDay(new Date())),
    completedDate: null,
  },
]

function Calendar({ selectedDate, onSelectDate, tasks }) {
  const [month, setMonth] = useState(startOfMonth(selectedDate))

  useEffect(() => {
    setMonth(startOfMonth(selectedDate))
  }, [selectedDate])

  const taskDateSet = useMemo(() => {
    return new Set(tasks.filter((task) => task.dueDate).map((task) => task.dueDate))
  }, [tasks])

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = []

  for (let day = start; day <= end; day = addDays(day, 1)) {
    days.push(day)
  }

  const weekdays = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-xs text-slate-300">
        <button
          onClick={() => setMonth(subMonths(month, 1))}
          className="rounded-lg px-2 py-1 hover:bg-white/10"
        >
          上一月
        </button>
        <span className="text-sm font-semibold text-white">
          {format(month, 'yyyy年MM月')}
        </span>
        <button
          onClick={() => setMonth(addMonths(month, 1))}
          className="rounded-lg px-2 py-1 hover:bg-white/10"
        >
          下一月
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
        {weekdays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())
          const key = format(day, 'yyyy-MM-dd')
          const hasTask = taskDateSet.has(key)

          return (
            <button
              key={key}
              onClick={() => onSelectDate(startOfDay(day))}
              className={`relative flex h-8 items-center justify-center rounded-lg text-xs transition ${
                isSelected
                  ? 'bg-[var(--accent)] text-white'
                  : isToday
                    ? 'ring-1 ring-[var(--accent)]/60 text-white'
                    : inMonth
                      ? 'text-slate-200 hover:bg-white/10'
                      : 'text-slate-500'
              }`}
            >
              {format(day, 'd')}
              {hasTask && (
                <span className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-[var(--accent-2)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function App() {
  // View state
  const [view, setView] = useState('inbox')
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
  const [quickFilter, setQuickFilter] = useState('all')
  const [updateStatus, setUpdateStatus] = useState({ state: 'idle' })

  // Modal states
  const [fundPicker, setFundPicker] = useState({
    open: false,
    candidates: [],
    selected: [],
    baseTask: null,
  })
  const [batchPicker, setBatchPicker] = useState({ open: false, tasks: [] })
  const [calendarModalDate, setCalendarModalDate] = useState(null)

  // Data state with repository
  const [tasks, setTasks] = useState(() => loadTasks() || sampleTasks())
  const [contextData, setContextData] = useState(() => {
    if (window.electronAPI?.getStoreSync) {
      const stored = window.electronAPI.getStoreSync(CONTEXT_KEY)
      if (stored !== null && stored !== undefined) return stored
      const raw = localStorage.getItem(CONTEXT_KEY)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          window.electronAPI.setStoreSync(CONTEXT_KEY, parsed)
          localStorage.removeItem(CONTEXT_KEY)
          return parsed
        } catch {
          return { funds: [] }
        }
      }
      return { funds: [] }
    }
    const stored = localStorage.getItem(CONTEXT_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return { funds: [] }
      }
    }
    return { funds: [] }
  })
  const [templates, setTemplates] = useState(() => {
    if (window.electronAPI?.getStoreSync) {
      const stored = window.electronAPI.getStoreSync(TEMPLATES_KEY)
      if (stored !== null && stored !== undefined) return stored
      const raw = localStorage.getItem(TEMPLATES_KEY)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          window.electronAPI.setStoreSync(TEMPLATES_KEY, parsed)
          localStorage.removeItem(TEMPLATES_KEY)
          return parsed
        } catch {
          return []
        }
      }
      return []
    }
    const stored = localStorage.getItem(TEMPLATES_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return []
      }
    }
    return []
  })

  // Gamification state
  const [gamificationData, setGamificationData] = useState(() => loadGamificationData())
  const [notificationQueue, setNotificationQueue] = useState([])

  // Persist data changes
  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return undefined
    const handler = (_event, payload) => {
      setUpdateStatus(payload || { state: 'idle' })
    }
    window.electronAPI.onUpdateStatus(handler)
    return () => window.electronAPI.offUpdateStatus(handler)
  }, [])


  useEffect(() => {
    if (window.electronAPI?.setStoreSync) {
      window.electronAPI.setStoreSync(CONTEXT_KEY, contextData)
      return
    }
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(contextData))
  }, [contextData])

  useEffect(() => {
    if (window.electronAPI?.setStoreSync) {
      window.electronAPI.setStoreSync(TEMPLATES_KEY, templates)
      return
    }
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  }, [templates])

  useEffect(() => {
    saveGamificationData(gamificationData)
  }, [gamificationData])

  // Register global handler for template generation
  useEffect(() => {
    window.handleGenerateFromTemplate = handleGenerateFromTemplate
    return () => {
      delete window.handleGenerateFromTemplate
    }
  }, [templates, tasks])

  // Template handlers
  const handleGenerateFromTemplate = (template) => {
    const today = new Date()
    const endDate = addMonths(today, 12)
    const instances = generateTaskInstances(template, today, endDate)

    if (instances.length === 0) {
      alert('无法从模板生成任务，请检查周期设置')
      return
    }

    const confirmMessage = `将从模板 "${template.name}" 生成 ${instances.length} 个任务:\n\n` +
      instances.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} (${t.dueDate})`).join('\n') +
      (instances.length > 5 ? `\n... 还有 ${instances.length - 5} 个` : '')

    if (window.confirm(confirmMessage + '\n\n确认生成?')) {
      setTasks((prev) => [...instances, ...prev])
      alert(`成功生成 ${instances.length} 个任务`)
    }
  }

  const handleTemplatesChange = (newTemplates) => {
    setTemplates(newTemplates)
  }

  // Computed values (moved from line 595 to fix TDZ issue)
  const todayKey = format(startOfDay(new Date()), 'yyyy-MM-dd')

  // Task handlers using TaskOperations
  const handleAddTask = (input) => {
    const aiTasks = typeof input !== 'string' && Array.isArray(input?.parsed?.tasks)
      ? input.parsed.tasks
      : null
    let singleTaskOverride = null

    if (aiTasks && aiTasks.length > 1) {
      const groupId = `group-${Date.now()}`
      const normalizedEntries = aiTasks.map((item) => ({
        raw: item,
        normalized: normalizeAiPayload(item, input?.raw || ''),
      }))
      const taskPayloads = normalizedEntries.map((entry) =>
        buildTaskPayload({ ...entry.normalized, groupId })
      )
      const validIndices = taskPayloads.reduce((acc, task, index) => {
        if (task.title?.trim()) acc.push(index)
        return acc
      }, [])

      if (validIndices.length > 1) {
        const batchTasks = validIndices.map((index) => {
          const taskPayload = taskPayloads[index]
          return {
            ...taskPayload,
            selected: true,
            selectedFunds: taskPayload.funds?.length
              ? [...taskPayload.funds]
              : taskPayload.fundCandidates || [],
          }
        })
        setBatchPicker({ open: true, tasks: batchTasks })
        return
      }

      setBatchPicker({ open: false, tasks: [] })
      if (validIndices.length === 1) {
        singleTaskOverride = normalizedEntries[validIndices[0]]?.raw || null
      }
    }

    const parsed = typeof input === 'string'
      ? (() => {
        const fallback = parseInput(input)
        return {
          ...fallback,
          subtasks: [],
          priority: null,
          funds: fallback.fund ? [fallback.fund] : [],
          lp: [],
          portfolio: [],
          fundCandidates: [],
        }
      })()
      : normalizeAiPayload(
        singleTaskOverride ||
          (Array.isArray(input?.parsed?.tasks) && input.parsed.tasks.length === 1
            ? input.parsed.tasks[0]
            : input?.parsed),
        input?.raw
      )

    if (!parsed.title) return

    const baseTask = buildTaskPayload(parsed)

    if (parsed.fundCandidates && parsed.fundCandidates.length > 1) {
      setFundPicker({
        open: true,
        candidates: parsed.fundCandidates,
        selected: parsed.fundCandidates,
        baseTask,
      })
      return
    }

    setTasks((prev) => [baseTask, ...prev])
  }

  const handleToggleTask = (taskId) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const updatedTask = TaskOperations.toggleComplete(task)
    const updatedTasks = tasks.map((t) => (t.id === taskId ? updatedTask : t))

    setTasks(updatedTasks)

    // Update gamification data
    const updates = processTaskCompletion(updatedTask, gamificationData, todayKey, updatedTasks)
    setGamificationData(updates.data)

    // Queue notifications for new achievements
    if (updates.newAchievements?.length > 0) {
      setNotificationQueue((prev) => [...prev, ...updates.newAchievements])
    }
  }

  const handleToggleChecklist = (taskId, itemId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? TaskOperations.toggleChecklistItem(task, itemId) : task
      )
    )
  }

  const handleUpdateChecklistItem = (taskId, itemId, text) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? TaskOperations.updateChecklistItem(task, itemId, text) : task
      )
    )
  }

  const handleDeleteChecklistItem = (taskId, itemId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? TaskOperations.deleteChecklistItem(task, itemId) : task
      )
    )
  }

  const handleClearChecklist = (taskId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? TaskOperations.clearChecklist(task) : task
      )
    )
  }

  const handleDeleteTask = (taskId) => {
    const ok = window.confirm('确定要删除该任务吗？')
    if (!ok) return
    setTasks((prev) => prev.filter((task) => task.id !== taskId))
  }

  const handleUpdateTaskFund = (taskId, fund) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? TaskOperations.updateFund(task, fund) : t
      )
    )
  }

  const handleUpdateTaskStatus = (taskId, status) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status } : task
      )
    )
  }

  const handleUpdateTaskWaitingOn = (taskId, waitingOn) => {
    const cleaned = waitingOn.trim()
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              waitingOn: cleaned,
              status: cleaned ? 'blocked' : task.status,
            }
          : task
      )
    )
  }

  const handleUpdateTaskFollowUpDate = (taskId, followUpDate) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              followUpDate: followUpDate || null,
            }
          : task
      )
    )
  }

  const handleMoveTaskMatrix = (taskId, quadrantKey) => {
    const quadrant = quadrantKey || 'q4'
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task
        const important = quadrant === 'q1' || quadrant === 'q2'
        const urgent = quadrant === 'q1' || quadrant === 'q3'
        const urgencyDays = task.dueDate ? daysUntil(task.dueDate) : null
        const isCurrentlyUrgent = urgencyDays !== null && urgencyDays <= 3
        let nextDueDate = task.dueDate

        if (urgent && !isCurrentlyUrgent) {
          nextDueDate = toISODate(startOfDay(new Date()))
        } else if (!urgent && isCurrentlyUrgent) {
          nextDueDate = null
        }

        return {
          ...task,
          priority: important ? 'high' : 'normal',
          importanceOverride: important,
          dueDate: nextDueDate,
        }
      })
    )
  }

  const handleMoveTaskDate = (taskId, dayKey) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? TaskOperations.moveToDate(task, dayKey) : t
      )
    )
  }

  // Batch task handlers
  const handleConfirmBatchTasks = () => {
    const selectedTasks = batchPicker.tasks.filter((task) => task.selected)
    const finalTasks = selectedTasks.map((task) => {
      const funds = task.selectedFunds?.length ? task.selectedFunds : task.funds
      return {
        ...task,
        funds,
        fund: funds?.[0] || null,
      }
    })
    setTasks((prev) => [...finalTasks, ...prev])
    setBatchPicker({ open: false, tasks: [] })
  }

  const handleCancelBatchTasks = () => {
    setBatchPicker({ open: false, tasks: [] })
  }

  // Fund picker handlers
  const handleConfirmFundSelection = () => {
    if (!fundPicker.baseTask) {
      setFundPicker({ open: false, candidates: [], selected: [], baseTask: null })
      return
    }
    const selectedFunds = fundPicker.selected
    const taskWithFunds = {
      ...fundPicker.baseTask,
      funds: selectedFunds,
      fund: selectedFunds[0] || null,
    }
    setTasks((prev) => [taskWithFunds, ...prev])
    setFundPicker({ open: false, candidates: [], selected: [], baseTask: null })
  }

  const handleSkipFundSelection = () => {
    if (fundPicker.baseTask) {
      const taskWithoutFunds = {
        ...fundPicker.baseTask,
        funds: [],
        fund: null,
      }
      setTasks((prev) => [taskWithoutFunds, ...prev])
    }
    setFundPicker({ open: false, candidates: [], selected: [], baseTask: null })
  }

  // Navigation
  const navItems = [
    { key: 'inbox', label: '待办事项', icon: Inbox },
    { key: 'today', label: '今日进度', icon: CalendarCheck },
    { key: 'calendar', label: '日历', icon: CalendarDays },
    { key: 'matrix', label: '矩阵视图', icon: Grid2X2 },
    { key: 'funds', label: '基金', icon: Layers },
    { key: 'context', label: '背景信息', icon: Database },
    { key: 'report', label: '报告', icon: FileText },
  ]

  const filteredTasks = useMemo(() => {
    if (!selectedDate) return tasks
    return TaskFilters.byDate(tasks, selectedDate)
  }, [tasks, selectedDate])

  const activeTasks = TaskFilters.active(filteredTasks)
  const allActiveTasks = TaskFilters.active(tasks)

  const getTaskCreatedDate = (task) => {
    if (task.createdDate) return task.createdDate
    if (task.createdAt) {
      try {
        const date = new Date(task.createdAt)
        if (!Number.isNaN(date.getTime())) return format(date, 'yyyy-MM-dd')
      } catch {
        return todayKey
      }
    }
    return todayKey
  }

  const todayAllTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.dueDate) {
        const date = parseISO(task.dueDate)
        return isValid(date) && format(date, 'yyyy-MM-dd') === todayKey
      }
      const createdDate = getTaskCreatedDate(task)
      return createdDate === todayKey
    })
  }, [tasks, todayKey])

  const shouldShowTask = (task, dayKey) => {
    if (!task.completed) return true
    if (!task.completedDate) return true
    const createdDate = getTaskCreatedDate(task)
    return createdDate <= dayKey && task.completedDate >= dayKey
  }

  const isBlockedTask = (task) => Boolean(task.waitingOn) || task.status === 'blocked'

  const isOverdueTask = (task) => {
    if (!task.dueDate) return false
    const days = daysUntil(task.dueDate)
    return days !== null && days < 0
  }

  const isDueSoonTask = (task) => {
    if (!task.dueDate) return false
    const days = daysUntil(task.dueDate)
    return days !== null && days >= 0 && days <= 7
  }

  const applyQuickFilter = (items) => {
    if (quickFilter === 'overdue') return items.filter(isOverdueTask)
    if (quickFilter === 'due7') return items.filter(isDueSoonTask)
    if (quickFilter === 'blocked') return items.filter(isBlockedTask)
    return items
  }

  const tasksForDate = (date) => {
    const dayKey = format(date, 'yyyy-MM-dd')
    return tasks.filter((task) => task.dueDate === dayKey && shouldShowTask(task, dayKey))
  }

  const todayCompletedTasks = todayAllTasks.filter((task) => task.completed)
  const todayCompletionRate = todayAllTasks.length
    ? Math.round((todayCompletedTasks.length / todayAllTasks.length) * 100)
    : 0

  const todayOpenTasks = todayAllTasks.filter((task) => !task.completed)

  const overdueCount = useMemo(() => {
    return tasks.filter((task) => !task.completed && isOverdueTask(task)).length
  }, [tasks])

  const dueSoonCount = useMemo(() => {
    return tasks.filter((task) => !task.completed && isDueSoonTask(task)).length
  }, [tasks])

  const blockedCount = useMemo(() => {
    return tasks.filter((task) => !task.completed && isBlockedTask(task)).length
  }, [tasks])

  const funds = useMemo(() => TaskFilters.groupByFund(tasks), [tasks])
  const matrixBuckets = useMemo(() => TaskFilters.groupByMatrix(allActiveTasks), [allActiveTasks])

  const isFilterable = view === 'inbox'

  const listTasks = view === 'inbox'
    ? applyQuickFilter(tasks.filter((task) => shouldShowTask(task, todayKey)))
    : view === 'matrix'
      ? allActiveTasks
      : activeTasks

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-900)] overflow-hidden">
      <div className="flex min-h-screen">
        <aside className="w-auto max-w-[280px] bg-[var(--navy-950)] text-slate-100 flex flex-col px-5 py-6 h-full transition-all duration-300">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center">
                <img src={`${import.meta.env.BASE_URL}app-icon.svg`} alt="app icon" className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm text-slate-300">PE Fund Ops</p>
                <h1 className="text-lg font-semibold tracking-wide">AI 任务中台</h1>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">日历</p>
                <button
                  onClick={() => setSelectedDate(startOfDay(new Date()))}
                  className="text-xs text-slate-300 hover:text-white"
                >
                  今天
                </button>
              </div>
              <Calendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                tasks={tasks}
              />
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = view === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="mt-10">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
                基金
              </p>
              <div className="space-y-2 text-sm text-slate-300">
                {Object.keys(funds).length === 0 && (
                  <div className="text-xs text-slate-500">暂无基金任务</div>
                )}
                {Object.keys(funds).map((fund) => (
                  <div key={fund} className="flex items-center justify-between">
                    <span>{fund}</span>
                    <span className="text-xs text-slate-500">{funds[fund].length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-6">
            <button
              onClick={() => setView('settings')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:scale-[1.06] hover:bg-white/10 hover:shadow-md"
              aria-label="设置"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <main className="flex-1 bg-[var(--surface-0)] overflow-x-hidden overflow-y-auto">
          {updateStatus.state === 'available' && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-700">
              发现新版本，前往设置页手动下载更新。
            </div>
          )}
          <header className="border-b border-[var(--border)] bg-[var(--surface-1)] px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-500)]">
                  运营看板
                </p>
                <h2 className="text-2xl font-semibold text-[var(--text-900)]">
                  {view === 'matrix'
                    ? '优先级矩阵'
                    : view === 'today'
                      ? '今日进度'
                      : view === 'calendar'
                        ? '日历视图'
                        : view === 'report'
                          ? '报告'
                          : view === 'settings'
                            ? '设置'
                          : '任务指挥中心'}
                </h2>
                {view !== 'today' && view !== 'calendar' && (
                  <p className="mt-2 text-xs text-[var(--text-500)]">
                    当前日期筛选：{format(selectedDate, 'yyyy-MM-dd')}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (!isFilterable) return
                    setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')
                  }}
                  disabled={!isFilterable}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    quickFilter === 'overdue'
                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-700)]'
                  } ${!isFilterable ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-4 w-4" />
                    已逾期
                  </div>
                  <p className="text-lg font-semibold">{overdueCount}</p>
                </button>
                <button
                  onClick={() => {
                    if (!isFilterable) return
                    setQuickFilter(quickFilter === 'due7' ? 'all' : 'due7')
                  }}
                  disabled={!isFilterable}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    quickFilter === 'due7'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-700)]'
                  } ${!isFilterable ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Flag className="h-4 w-4" />
                    7天内到期
                  </div>
                  <p className="text-lg font-semibold">{dueSoonCount}</p>
                </button>
                <button
                  onClick={() => {
                    if (!isFilterable) return
                    setQuickFilter(quickFilter === 'blocked' ? 'all' : 'blocked')
                  }}
                  disabled={!isFilterable}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    quickFilter === 'blocked'
                      ? 'border-slate-300 bg-slate-100 text-slate-700'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-700)]'
                  } ${!isFilterable ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Flag className="h-4 w-4" />
                    等待中
                  </div>
                  <p className="text-lg font-semibold">{blockedCount}</p>
                </button>
              </div>
            </div>
            {view === 'inbox' && quickFilter !== 'all' && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs text-[var(--text-700)]">
                <span>
                  当前筛选：
                  {quickFilter === 'overdue'
                    ? '已逾期'
                    : quickFilter === 'due7'
                      ? '7天内到期'
                      : '等待中'}
                </span>
                <button
                  onClick={() => setQuickFilter('all')}
                  className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-[var(--text-700)]"
                >
                  清除筛选
                </button>
              </div>
            )}
          </header>

          <section className="w-full min-w-0 px-6 py-6 space-y-6">
            {view !== 'context' && view !== 'calendar' && view !== 'report' && view !== 'settings' && (
              <TaskInput onAddTask={handleAddTask} parseInput={parseInput} contextData={contextData} />
            )}
            {view === 'context' ? (
              <ContextManager
                contextData={contextData}
                onUpdateContext={setContextData}
                templates={templates}
                onTemplatesChange={handleTemplatesChange}
              />
            ) : view === 'report' ? (
              <ReportView tasks={tasks} />
            ) : view === 'settings' ? (
              <SettingsView />
            ) : view === 'calendar' ? (
              <CalendarView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                tasks={tasks}
                tasksForDate={tasksForDate}
                onMoveTaskDate={handleMoveTaskDate}
                onOpenDate={(date) => setCalendarModalDate(date)}
              />
            ) : view === 'today' ? (
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
                    <ProgressWidget progress={todayCompletionRate} />
                    <div className="mt-6 grid gap-3 text-sm text-[var(--text-700)]">
                      <div className="flex items-center justify-between">
                        <span>今日完成</span>
                        <span className="font-semibold text-[var(--text-900)]">
                          {todayCompletedTasks.length}/{todayAllTasks.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>待完成</span>
                        <span className="font-semibold text-[var(--text-900)]">
                          {todayOpenTasks.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* NEW: Gamification Dashboard */}
                  <GamificationDashboard
                    gamificationData={gamificationData}
                    tasks={tasks}
                    todayKey={todayKey}
                  />
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-900)]">今日任务清单</p>
                    <span className="text-xs text-[var(--text-500)]">{todayKey}</span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {todayAllTasks.length === 0 && (
                      <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-xs text-[var(--text-500)]">
                        今日暂无到期任务。
                      </div>
                    )}
                    {todayAllTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                          task.completed
                            ? 'border-slate-200 bg-slate-50 text-[var(--text-500)]'
                            : 'border-[var(--border)] bg-white text-[var(--text-900)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className="mt-0.5 text-[var(--accent)]"
                              aria-label="切换任务完成"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </button>
                            <div>
                              <p className={task.completed ? 'line-through' : ''}>{task.title}</p>
                              {(task.funds?.[0] || task.fund) && (
                                <span className="mt-2 inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text-500)]">
                                  {task.funds?.[0] || task.fund}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-[var(--text-500)]">
                            {task.completed ? '已完成' : '未完成'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <TaskList
                  view={view}
                  tasks={listTasks}
                  funds={funds}
                  matrixBuckets={matrixBuckets}
                  onMoveTaskMatrix={handleMoveTaskMatrix}
                  onToggleTask={handleToggleTask}
                  onToggleChecklist={handleToggleChecklist}
                  onUpdateChecklistItem={handleUpdateChecklistItem}
                  onDeleteChecklistItem={handleDeleteChecklistItem}
                  onClearChecklist={handleClearChecklist}
                  onDeleteTask={handleDeleteTask}
                  onUpdateTaskFund={handleUpdateTaskFund}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onUpdateTaskWaitingOn={handleUpdateTaskWaitingOn}
                  onUpdateTaskFollowUpDate={handleUpdateTaskFollowUpDate}
                  daysUntil={daysUntil}
                />
              </div>
            )}
          </section>
        </main>
      </div>
      <AmbiguityModal
        open={fundPicker.open}
        candidates={fundPicker.candidates}
        selected={fundPicker.selected}
        onChange={(selected) =>
          setFundPicker((prev) => ({
            ...prev,
            selected,
          }))
        }
        onConfirm={handleConfirmFundSelection}
        onSkip={handleSkipFundSelection}
      />
      <BatchTaskModal
        open={batchPicker.open}
        tasks={batchPicker.tasks}
        onChange={(tasks) => setBatchPicker((prev) => ({ ...prev, tasks }))}
        onConfirm={handleConfirmBatchTasks}
        onCancel={handleCancelBatchTasks}
      />
      <CalendarDayModal
        open={Boolean(calendarModalDate)}
        date={calendarModalDate}
        tasks={calendarModalDate ? tasksForDate(calendarModalDate) : []}
        onClose={() => setCalendarModalDate(null)}
      />

      {/* Achievement Notifications */}
      {notificationQueue.map((achievement, index) => (
        <AchievementNotification
          key={`${achievement.id}-${index}`}
          achievement={achievement}
          visible={true}
          onDismiss={() => {
            setNotificationQueue((prev) => prev.filter((_, i) => i !== index))
          }}
        />
      ))}
    </div>
  )
}

export default App
