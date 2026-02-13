import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { X } from 'lucide-react'

function CalendarDayModal({
  open,
  date,
  tasks,
  focusedTaskId,
  onClose,
  onToggleTask,
  onUpdateTaskTitle,
  onUpdateTaskFund,
  onUpdateTaskDueDate,
  onUpdateTaskTags,
}) {
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [tagDraftByTask, setTagDraftByTask] = useState({})

  useEffect(() => {
    if (!open) {
      setExpandedTaskId(null)
      return
    }
    setExpandedTaskId(focusedTaskId || null)
  }, [open, focusedTaskId])

  if (!open || !date) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
      <div className="w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-500)]">当日任务</p>
            <h3 className="text-lg font-semibold text-[var(--text-900)]">
              {format(date, 'yyyy-MM-dd')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-700)]"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          {tasks.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-500)]">
              当天暂无任务。
            </div>
          )}
            <div className="grid gap-3">
              {tasks.map((task) => {
                const fundValue = task.funds?.[0] || task.fund || ''
                const tags = task.tags || []
                const expanded = expandedTaskId === task.id
                const tagDraft = tagDraftByTask[task.id] || ''

                return (
                  <div
                    key={task.id}
                    onClick={() => setExpandedTaskId((prev) => (prev === task.id ? null : task.id))}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      task.completed
                        ? 'border-slate-200 bg-slate-50 text-[var(--text-500)]'
                        : 'border-[var(--border)] bg-white text-[var(--text-900)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex-1">{task.title}</p>
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          onToggleTask(task.id)
                        }}
                        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)]"
                      >
                        {task.completed ? '设为未完成' : '设为完成'}
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-500)]">
                      {task.calendarType === 'due' && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                          DDL
                        </span>
                      )}
                      {task.calendarType === 'completed' && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                          已完成
                        </span>
                      )}
                      {(task.funds?.length ? task.funds : task.fund ? [task.fund] : []).map((fund) => (
                        <span
                          key={fund}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1"
                        >
                          {fund}
                        </span>
                      ))}
                    </div>

                    {expanded && (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="mt-3 grid gap-3 rounded-lg border border-[var(--border)] bg-white p-3"
                      >
                        <label className="grid gap-1 text-xs text-[var(--text-500)]">
                          标题
                          <input
                            defaultValue={task.title}
                            onBlur={(event) => onUpdateTaskTitle(task.id, event.target.value)}
                            className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text-900)]"
                          />
                        </label>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="grid gap-1 text-xs text-[var(--text-500)]">
                            基金
                            <input
                              defaultValue={fundValue}
                              onBlur={(event) => onUpdateTaskFund(task.id, event.target.value)}
                              className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text-900)]"
                              placeholder="Fund 名称"
                            />
                          </label>
                          <label className="grid gap-1 text-xs text-[var(--text-500)]">
                            DDL
                            <input
                              type="date"
                              value={task.dueDate || ''}
                              onChange={(event) => onUpdateTaskDueDate(task.id, event.target.value)}
                              className="rounded-md border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text-900)]"
                            />
                          </label>
                        </div>

                        <div className="grid gap-2">
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <span
                                key={`${task.id}-${tag}`}
                                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700"
                              >
                                {tag}
                                <button
                                  onClick={() => onUpdateTaskTags(task.id, tags.filter((item) => item !== tag))}
                                  className="rounded-full p-0.5 hover:bg-sky-100"
                                  aria-label="删除标签"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={tagDraft}
                              onChange={(event) =>
                                setTagDraftByTask((prev) => ({ ...prev, [task.id]: event.target.value }))
                              }
                              className="flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm text-[var(--text-900)]"
                              placeholder="新增标签"
                            />
                            <button
                              onClick={() => {
                                const cleaned = tagDraft.trim()
                                if (!cleaned) return
                                if (tags.includes(cleaned)) return
                                onUpdateTaskTags(task.id, [...tags, cleaned])
                                setTagDraftByTask((prev) => ({ ...prev, [task.id]: '' }))
                              }}
                              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)]"
                            >
                              添加标签
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarDayModal
