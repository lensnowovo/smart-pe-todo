import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Command, Plus, CalendarClock, Building2, Target } from 'lucide-react'
import { analyzeTaskInput } from '../services/aiService'
import { loadConfig, saveConfig } from '../services/configStore'

function TaskInput({ onAddTask, parseInput, contextData, className = '' }) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [modelOptions, setModelOptions] = useState([])
  const [activeProviderId, setActiveProviderId] = useState('')

  const preview = useMemo(() => {
    return parseInput(value)
  }, [value, parseInput])

  useEffect(() => {
    const load = async () => {
      const config = await loadConfig()
      setModelOptions(config.providers || [])
      setActiveProviderId(config.activeProviderId || config.providers?.[0]?.id || '')
    }
    load()
    const handleConfigUpdate = (event) => {
      const next = event.detail
      if (!next) return
      setModelOptions(next.providers || [])
      setActiveProviderId(next.activeProviderId || next.providers?.[0]?.id || '')
    }
    window.addEventListener('config:updated', handleConfigUpdate)
    return () => window.removeEventListener('config:updated', handleConfigUpdate)
  }, [])

  const handleChangeProvider = async (id) => {
    const config = await loadConfig()
    const next = { ...config, activeProviderId: id }
    setActiveProviderId(id)
    await saveConfig(next)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!value.trim() || loading) return
    setError('')
    setLoading(true)
    try {
      const aiResult = await analyzeTaskInput(value.trim(), contextData)
      onAddTask({ parsed: aiResult, raw: value.trim() })
      setValue('')
      setExpanded(false)
    } catch (err) {
      onAddTask(value.trim())
      setError('AI 解析失败，已使用本地规则处理。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-md ${className}`}
    >
      <div className="flex items-center gap-3 text-sm text-[var(--text-500)]">
        <Command className="h-4 w-4" />
        指令输入
        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-500)]">
          <span>模型</span>
          <div className="relative">
            <select
              value={activeProviderId}
              onChange={(event) => handleChangeProvider(event.target.value)}
              className="appearance-none rounded-lg border border-[var(--border)] bg-white px-2 py-1 pr-6 text-xs text-[var(--text-700)]"
            >
              {modelOptions.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--text-500)]" />
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex w-full flex-col min-w-0">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={() => {
            if (!value.trim()) setExpanded(false)
          }}
          placeholder="输入指令，例如：准备 Fund III Q1 季报，下周五截止"
          disabled={loading}
          rows={expanded ? 3 : 1}
          className={`w-full min-w-[240px] min-w-0 rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-900)] shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 overflow-y-auto overflow-x-hidden resize-none break-words ${
            expanded ? 'min-h-[96px]' : 'h-12'
          }`}
        />
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--navy-700)]"
          >
            <Plus className="h-4 w-4" />
            {loading ? 'AI 正在分析...' : '新增任务'}
          </button>
        </div>
      </form>

      {error && <div className="mt-2 text-xs text-amber-700">{error}</div>}

      <div className="mt-4 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--text-700)]">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="h-4 w-4 text-[var(--accent)]" />
          <span className="font-semibold text-[var(--text-900)]">解析任务：</span>
          <span className="truncate block min-w-0">{preview.title || '—'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--accent)]" />
            <span className="font-semibold text-[var(--text-900)]">基金：</span>
            <span>{preview.fund || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-[var(--accent)]" />
            <span className="font-semibold text-[var(--text-900)]">截止日期：</span>
            <span>{preview.dueDate || '—'}</span>
          </div>
          {preview.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-900)]">标签：</span>
              <span>{preview.tags.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskInput
