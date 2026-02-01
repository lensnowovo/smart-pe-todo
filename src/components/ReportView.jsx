import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { Copy } from 'lucide-react'
import { generateReportSummary } from '../services/aiService'
import { loadConfig, saveConfig } from '../services/configStore'
import { daysUntil } from '../domain/tasks/taskService'

const getChinaNow = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
}

const getDateKey = (date) => format(date, 'yyyy-MM-dd')

const getCreatedDate = (task) => {
  if (task.createdDate) return task.createdDate
  if (task.createdAt) {
    const date = new Date(task.createdAt)
    if (!Number.isNaN(date.getTime())) return getDateKey(date)
  }
  return null
}

const getSummary = (task) => {
  const checklistItems = (task.checklist || []).map((item) => item.text).filter(Boolean)
  const subtasks = (task.subtasks || []).map((item) => String(item).trim()).filter(Boolean)
  const source = checklistItems.length > 0 ? checklistItems : subtasks
  if (source.length === 0) return '—'
  return source.slice(0, 3).join('；')
}

const escapeCell = (value) => String(value).replace(/\|/g, '\\|')
const escapeCsvCell = (value) => {
  const text = String(value).replace(/"/g, '""')
  return `"${text}"`
}

const PERIOD_OPTIONS = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '本年度' },
  { key: 'custom', label: '自定义' },
]

const getPeriodRange = (period, now, customRange) => {
  if (period === 'month') {
    const start = startOfMonth(now)
    return { start, end: endOfMonth(now) }
  }
  if (period === 'year') {
    const start = startOfYear(now)
    return { start, end: endOfYear(now) }
  }
  if (period === 'custom' && customRange?.start && customRange?.end) {
    const start = new Date(`${customRange.start}T00:00:00`)
    const end = new Date(`${customRange.end}T23:59:59`)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      if (start <= end) return { start, end }
      return { start: end, end: start }
    }
  }
  const start = startOfWeek(now, { weekStartsOn: 1 })
  return { start, end: endOfWeek(now, { weekStartsOn: 1 }) }
}

const getPeriodLabel = (period, start, end) => {
  const range = `${format(start, 'yyyy-MM-dd')} ~ ${format(end, 'yyyy-MM-dd')}`
  if (period === 'month') return `本月（${range}）`
  if (period === 'year') return `本年度（${range}）`
  if (period === 'custom') return `自定义（${range}）`
  return `本周（${range}）`
}

const getPeriodTag = (period) => {
  if (period === 'month') return '月度报告'
  if (period === 'year') return '年度报告'
  if (period === 'custom') return '自定义报告'
  return '周度报告'
}

const shiftPeriod = (period, date, offset) => {
  if (period === 'month') return addMonths(date, offset)
  if (period === 'year') return addYears(date, offset)
  return addWeeks(date, offset)
}

const getTaskType = (task) => {
  if (task.tags?.length) return task.tags[0]
  const text = `${task.title || ''}`
  if (/capital call/i.test(text)) return 'Capital Call'
  if (/quarterly report|季报|季度报告/i.test(text)) return 'Quarterly Report'
  if (/kyc/i.test(text)) return 'KYC'
  if (/tax filing|报税|税务/i.test(text)) return '税务'
  return '其他'
}

function TrendChart({ points }) {
  const width = 520
  const height = 140
  const padding = 16
  const maxValue = Math.max(
    ...points.flatMap((item) => [item.completed, item.inProgress]),
    1
  )
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0

  const coords = points.map((point, index) => {
    const x = padding + index * stepX
    const completedY = height - padding - (point.completed / maxValue) * (height - padding * 2)
    const inProgressY = height - padding - (point.inProgress / maxValue) * (height - padding * 2)
    return {
      x,
      completedY,
      inProgressY,
      label: point.label,
      completed: point.completed,
      inProgress: point.inProgress,
    }
  })

  return (
    <div className="mt-4">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          points={coords.map((point) => `${point.x},${point.completedY}`).join(' ')}
        />
        <polyline
          fill="none"
          stroke="var(--accent-2)"
          strokeWidth="2"
          points={coords.map((point) => `${point.x},${point.inProgressY}`).join(' ')}
        />
        {coords.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.completedY} r="3" fill="var(--accent)" />
            <circle cx={point.x} cy={point.inProgressY} r="3" fill="var(--accent-2)" />
            <text x={point.x} y={height - 4} textAnchor="middle" fontSize="10" fill="var(--text-500)">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-500)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
            已完成
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent-2)' }} />
            进行中
          </span>
        </div>
        <span>最高：{maxValue}</span>
      </div>
    </div>
  )
}

function ReportView({ tasks }) {
  const [copied, setCopied] = useState(false)
  const [period, setPeriod] = useState('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [providerOptions, setProviderOptions] = useState([])
  const [activeProviderId, setActiveProviderId] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiReport, setAiReport] = useState('')

  useEffect(() => {
    const load = async () => {
      const config = await loadConfig()
      setProviderOptions(config.providers || [])
      setActiveProviderId(config.activeProviderId || config.providers?.[0]?.id || '')
    }
    load()
  }, [])

  const computed = useMemo(() => {
    const chinaNow = getChinaNow()
    const { start, end } = getPeriodRange(period, chinaNow, {
      start: customStart,
      end: customEnd,
    })
    const startKey = getDateKey(start)
    const endKey = getDateKey(end)
    const rangeLabel = getPeriodLabel(period, start, end)
    const periodTag = getPeriodTag(period)
    const todayKey = getDateKey(chinaNow)

    const periodTasks = tasks.filter((task) => {
      if (task.completedDate && task.completed) {
        return task.completedDate >= startKey && task.completedDate <= endKey
      }
      if (!task.completed) {
        const createdDate = getCreatedDate(task)
        return createdDate ? createdDate >= startKey && createdDate <= endKey : false
      }
      return false
    })

    const rows = periodTasks.map((task) => {
      const status = task.completed ? '已完成' : '进行中'
      return {
        id: task.id,
        title: task.title || '—',
        summary: getSummary(task),
        status,
        fund: task.funds?.[0] || task.fund || '—',
        waitingOn: task.waitingOn || '',
        dueDate: task.dueDate || null,
      }
    })

    const completedCount = periodTasks.filter((task) => task.completed).length
    const inProgressCount = periodTasks.filter((task) => !task.completed).length
    const overdueCount = periodTasks.filter((task) => {
      if (task.completed) return false
      if (!task.dueDate) return false
      const days = daysUntil(task.dueDate)
      return days !== null && days < 0
    }).length
    const blockedCount = periodTasks.filter((task) => task.status === 'blocked' || task.waitingOn).length
    const totalCount = completedCount + inProgressCount
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    const typeCounts = new Map()
    const fundCounts = new Map()
    const waitingCounts = new Map()
    const overdueTasks = []

    for (const task of periodTasks) {
      const type = getTaskType(task)
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1)

      const fund = task.funds?.[0] || task.fund || '未归属'
      fundCounts.set(fund, (fundCounts.get(fund) || 0) + 1)

      if (task.waitingOn) {
        waitingCounts.set(task.waitingOn, (waitingCounts.get(task.waitingOn) || 0) + 1)
      }

      if (!task.completed && task.dueDate) {
        const days = daysUntil(task.dueDate)
        if (days !== null && days < 0) overdueTasks.push(task)
      }
    }

    const typeTop = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    const fundTop = Array.from(fundCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    const waitingTop = Array.from(waitingCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const trendSpan = period === 'year' ? 5 : 6
    const trendPoints = []
    for (let i = trendSpan - 1; i >= 0; i--) {
      const targetDate = shiftPeriod(period, start, -i)
      const { start: pStart, end: pEnd } = getPeriodRange(period, targetDate)
      const pStartKey = getDateKey(pStart)
      const pEndKey = getDateKey(pEnd)
      const completedValue = tasks.filter(
        (task) => task.completed && task.completedDate && task.completedDate >= pStartKey && task.completedDate <= pEndKey
      ).length
      const inProgressValue = tasks.filter((task) => {
        if (task.completed) return false
        const createdDate = getCreatedDate(task)
        return createdDate ? createdDate >= pStartKey && createdDate <= pEndKey : false
      }).length
      const label =
        period === 'year'
          ? format(pStart, 'yyyy')
          : period === 'month'
            ? format(pStart, 'MM月')
            : format(pStart, 'MM-dd')
      trendPoints.push({ label, completed: completedValue, inProgress: inProgressValue })
    }

    const header = `# ${rangeLabel}工作完成情况\n\n- 已完成：${completedCount}\n- 进行中：${inProgressCount}\n- 逾期：${overdueCount}\n- 等待中：${blockedCount}\n- 完成率：${completionRate}%\n\n`
    const tableHeader = '| 任务名 | 概要 | 完成情况 |\n| --- | --- | --- |\n'
    const tableBody = rows
      .map((row) => `| ${[row.title, row.summary, row.status].map(escapeCell).join(' | ')} |`)
      .join('\n')
    const markdown = `${header}${tableHeader}${tableBody || '| — | — | — |'}`

    return {
      rows,
      markdown,
      rangeLabel,
      periodTag,
      completedCount,
      inProgressCount,
      overdueCount,
      blockedCount,
      completionRate,
      typeTop,
      fundTop,
      waitingTop,
      overdueTasks,
      trendPoints,
    }
  }, [tasks, period, customStart, customEnd])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(computed.markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleExportCsv = () => {
    const csvHeader = ['任务名', '概要', '完成情况'].map(escapeCsvCell).join(',')
    const csvRows = computed.rows
      .map((row) => [row.title, row.summary, row.status].map(escapeCsvCell).join(','))
      .join('\n')
    const csvContent = `${csvHeader}\n${csvRows || ''}`
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${computed.rangeLabel}-任务表.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyAi = async () => {
    try {
      await navigator.clipboard.writeText(aiReport)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleDownloadAi = () => {
    if (!aiReport) return
    const blob = new Blob([aiReport], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${computed.rangeLabel}-AI周报.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const buildAiPrompt = () => {
    const typeLines = computed.typeTop.map(([name, count]) => `- ${name}: ${count}`).join('\n')
    const fundLines = computed.fundTop.map(([name, count]) => `- ${name}: ${count}`).join('\n')
    const waitingLines = computed.waitingTop.map(([name, count]) => `- ${name}: ${count}`).join('\n')
    const overdueLines = computed.overdueTasks
      .slice(0, 5)
      .map((task) => `- ${task.title}（${task.dueDate || '无截止日期'}）`)
      .join('\n')

    return `请基于以下数据，生成一份客观简洁的${computed.rangeLabel}工作报告，使用 Markdown 输出，包含：\n\n1) 本期概况（1-2句）\n2) 完成情况摘要（列表）\n3) 风险与待跟进（列表）\n4) 下期关注建议（列表）\n\n数据摘要：\n- 已完成：${computed.completedCount}\n- 进行中：${computed.inProgressCount}\n- 逾期：${computed.overdueCount}\n- 等待中：${computed.blockedCount}\n- 完成率：${computed.completionRate}%\n\n任务类型分布：\n${typeLines || '—'}\n\n基金分布：\n${fundLines || '—'}\n\n阻塞原因：\n${waitingLines || '—'}\n\n逾期任务（最多5条）：\n${overdueLines || '—'}\n`
  }

  const handleGenerateAi = async () => {
    setAiError('')
    setAiLoading(true)
    try {
      const activeProvider = providerOptions.find((provider) => provider.id === activeProviderId)
      const report = await generateReportSummary({
        model: activeProvider?.model,
        provider: activeProvider,
        systemPrompt: '你是私募股权基金运营的工作报告助手，输出客观简洁的中文周报。',
        prompt: buildAiPrompt(),
      })
      setAiReport(report)
    } catch (error) {
      setAiError(error?.message || '生成失败')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-500)]">报告中心</p>
          <h3 className="text-xl font-semibold text-[var(--text-900)]">任务报告</h3>
          <p className="mt-2 text-xs text-[var(--text-500)]">周期：{computed.rangeLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-center">
            <p className="text-lg font-semibold text-[var(--text-900)]">{computed.completedCount}</p>
            <p className="text-xs text-[var(--text-500)]">已完成</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-center">
            <p className="text-lg font-semibold text-[var(--text-900)]">{computed.inProgressCount}</p>
            <p className="text-xs text-[var(--text-500)]">进行中</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => setPeriod(option.key)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              period === option.key
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-[var(--border)] bg-white text-[var(--text-700)]'
            }`}
          >
            {option.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-700)]"
            />
            <span className="text-xs text-[var(--text-500)]">至</span>
            <input
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-700)]"
            />
          </div>
        )}
        <div className="ml-auto rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--text-700)]">
          完成率：{computed.completionRate}%
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <p className="text-xs text-[var(--text-500)]">逾期任务</p>
          <p className="mt-2 text-xl font-semibold text-[var(--text-900)]">{computed.overdueCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <p className="text-xs text-[var(--text-500)]">等待中</p>
          <p className="mt-2 text-xl font-semibold text-[var(--text-900)]">{computed.blockedCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <p className="text-xs text-[var(--text-500)]">任务类型 Top</p>
          <div className="mt-2 space-y-1 text-xs text-[var(--text-700)]">
            {computed.typeTop.length === 0 && <p className="text-[var(--text-500)]">—</p>}
            {computed.typeTop.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span>{name}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <p className="text-xs text-[var(--text-500)]">基金分布</p>
          <div className="mt-2 space-y-1 text-xs text-[var(--text-700)]">
            {computed.fundTop.length === 0 && <p className="text-[var(--text-500)]">—</p>}
            {computed.fundTop.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span>{name}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-900)]">完成趋势</p>
            <span className="text-xs text-[var(--text-500)]">最近 {computed.trendPoints.length} 个周期</span>
          </div>
          <TrendChart points={computed.trendPoints} />
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-sm font-semibold text-[var(--text-900)]">等待对象 Top</p>
          <div className="mt-3 space-y-2 text-xs text-[var(--text-700)]">
            {computed.waitingTop.length === 0 && <p className="text-[var(--text-500)]">—</p>}
            {computed.waitingTop.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span>{name}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-[var(--text-900)]">逾期任务</p>
          <div className="mt-2 space-y-2 text-xs text-[var(--text-700)]">
            {computed.overdueTasks.length === 0 && <p className="text-[var(--text-500)]">—</p>}
            {computed.overdueTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between">
                <span className="truncate">{task.title}</span>
                <span className="text-[var(--text-500)]">{task.dueDate || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-900)]">任务表</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-700)] transition-transform duration-200 hover:scale-[1.03] hover:shadow-md focus-visible:scale-[1.03] focus-visible:shadow-md focus-visible:outline-none"
          >
            导出 CSV
          </button>
          <button
            onClick={handleCopy}
            className="rounded-lg border border-[var(--border)] bg-white p-2 text-[var(--text-700)] transition-transform duration-200 hover:scale-[1.03] hover:shadow-md focus-visible:scale-[1.03] focus-visible:shadow-md focus-visible:outline-none"
            title="复制 Markdown"
            aria-label="复制 Markdown"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-[var(--surface-2)] text-[var(--text-700)]">
            <tr>
              <th className="px-4 py-3 font-semibold">任务名</th>
              <th className="px-4 py-3 font-semibold">概要</th>
              <th className="px-4 py-3 font-semibold">完成情况</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text-700)]">
            {computed.rows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-[var(--text-500)]" colSpan={3}>
                  本周期暂无任务记录
                </td>
              </tr>
            )}
            {computed.rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-0)]">
                <td className="px-4 py-3 font-medium text-[var(--text-900)]">{row.title}</td>
                <td className="px-4 py-3">
                  <span className="line-clamp-2 text-[var(--text-500)]">{row.summary}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 ${
                      row.status === '已完成'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-sky-200 bg-sky-50 text-sky-700'
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {copied && <p className="mt-3 text-xs text-[var(--text-500)]">Markdown 已复制</p>}

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-500)]">AI 报告</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-[var(--text-900)]">自动生成报告摘要</h3>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-700)]">
                {computed.periodTag}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-500)]">偏客观数据总结，可编辑后复制或下载</p>
          </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeProviderId}
            onChange={async (event) => {
              const nextId = event.target.value
              setActiveProviderId(nextId)
              const config = await loadConfig()
              await saveConfig({ ...config, activeProviderId: nextId })
            }}
            className="rounded-lg border border-[var(--border)] bg-white px-2 py-2 text-xs text-[var(--text-700)]"
          >
            {providerOptions.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerateAi}
            disabled={aiLoading}
            className="rounded-lg border border-[var(--border)] bg-[var(--accent)] px-3 py-2 text-xs text-white disabled:opacity-60"
          >
              {aiLoading ? '生成中...' : '生成 AI 报告'}
            </button>
          </div>
        </div>
        {aiError && <p className="mt-3 text-xs text-rose-600">{aiError}</p>}
        <textarea
          value={aiReport}
          onChange={(event) => setAiReport(event.target.value)}
          placeholder="点击“生成 AI 报告”后在此查看与编辑内容"
          className="mt-4 h-[260px] w-full rounded-xl border border-[var(--border)] bg-white p-4 text-xs text-[var(--text-700)] focus:outline-none"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyAi}
            disabled={!aiReport}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-700)] disabled:opacity-60"
          >
            复制 AI 报告
          </button>
          <button
            onClick={handleDownloadAi}
            disabled={!aiReport}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--text-700)] disabled:opacity-60"
          >
            下载 Markdown
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportView
