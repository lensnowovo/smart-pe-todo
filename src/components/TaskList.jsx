import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Circle, Pencil, Trash2, X } from 'lucide-react'
import CardShell from './CardShell'

const SLA_KEYWORDS = /(capital call|quarterly report|kyc|tax filing|报税|税务)/i

const isSlaTask = (task) => {
  const text = `${task.title || ''} ${(task.tags || []).join(' ')}`
  return SLA_KEYWORDS.test(text)
}

const getRiskLevel = (task, daysUntil) => {
  if (!task.dueDate || !isSlaTask(task)) return null
  const days = daysUntil(task.dueDate)
  if (days === null) return null
  if (days < 0) return 'overdue'
  if (days <= 1) return 't1'
  if (days <= 3) return 't3'
  if (days <= 7) return 't7'
  return null
}

const riskTagStyles = {
  overdue: 'border-rose-200 bg-rose-50 text-rose-700',
  t1: 'border-amber-200 bg-amber-50 text-amber-700',
  t3: 'border-orange-200 bg-orange-50 text-orange-700',
  t7: 'border-slate-200 bg-slate-50 text-slate-700',
}

function TaskCard({
  task,
  onToggleTask,
  onToggleChecklist,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onClearChecklist,
  onDeleteTask,
  onUpdateTaskFund,
  daysUntil,
}) {
  const [editing, setEditing] = useState({ taskId: null, itemId: null })
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const [editingFund, setEditingFund] = useState(false)
  const [fundDraft, setFundDraft] = useState('')
  const fundInputRef = useRef(null)
  const fundList = task.funds?.length ? task.funds : task.fund ? [task.fund] : []
  const riskLevel = getRiskLevel(task, daysUntil)
  const riskTagClass = riskLevel ? riskTagStyles[riskLevel] : ''
  const urgencyLabel = (() => {
    if (!task.dueDate) return '不紧急'
    const days = daysUntil(task.dueDate)
    if (days === null) return '不紧急'
    if (days < 0) return '逾期'
    if (days <= 3) return '紧急'
    return '不紧急'
  })()

  const commitDraft = () => {
    if (!editing.itemId) return
    const cleaned = draft.trim()
    if (cleaned) {
      onUpdateChecklistItem(task.id, editing.itemId, cleaned)
    }
    setEditing({ taskId: null, itemId: null })
    setDraft('')
  }

  const commitFundDraft = () => {
    if (!editingFund) return
    onUpdateTaskFund(task.id, fundDraft)
    setEditingFund(false)
    setFundDraft('')
  }

  useEffect(() => {
    if (!editingFund) return
    const handleClickOutside = (event) => {
      if (!fundInputRef.current) return
      if (fundInputRef.current.contains(event.target)) return
      commitFundDraft()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingFund, fundDraft])

  useEffect(() => {
    if (!editing.itemId) return
    const handleClickOutside = (event) => {
      if (!inputRef.current) return
      if (inputRef.current.contains(event.target)) return
      commitDraft()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editing.itemId, draft])

  const checklistTotal = task.checklist?.length || 0
  return (
    <CardShell>
      <div className="shrink-0 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={(event) => {
                event.stopPropagation()
                onToggleTask(task.id)
              }}
              className="mt-1 text-[var(--accent)]"
              aria-label="Toggle task"
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <div className="min-w-0">
              <p
                className={`text-sm font-semibold ${
                  task.completed ? 'line-through text-[var(--text-500)]' : 'text-[var(--text-900)]'
                }`}
              >
                {task.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-500)]">
            <button
              onClick={(event) => {
                event.stopPropagation()
                onDeleteTask(task.id)
              }}
              className="rounded-md p-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-rose-600"
              aria-label="删除任务"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 scrollbar-auto">
        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-500)]">
          {editingFund ? (
            <input
              ref={fundInputRef}
              value={fundDraft}
              autoFocus
              onChange={(event) => setFundDraft(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitFundDraft()
                if (event.key === 'Escape') {
                  setEditingFund(false)
                  setFundDraft('')
                }
              }}
              className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-700)]"
              placeholder="Fund 名称"
            />
          ) : fundList.length <= 1 ? (
            <button
              onDoubleClick={(event) => {
                event.stopPropagation()
                setEditingFund(true)
                setFundDraft(fundList[0] || '')
              }}
              onClick={(event) => event.stopPropagation()}
              className={`inline-flex items-center rounded-full border px-2 py-1 transition ${
                fundList[0]
                  ? 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-500)]'
                  : 'border-dashed border-[var(--border)] bg-white text-[var(--text-500)]'
              } hover:border-[var(--accent)]/40 hover:text-[var(--text-900)]`}
              aria-label="双击编辑基金归属"
            >
              <span>{fundList[0] || '添加基金'}</span>
            </button>
          ) : (
            fundList.map((fundName) => (
              <span
                key={fundName}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[var(--text-500)]"
              >
                {fundName}
              </span>
            ))
          )}
          {task.portfolio?.map((name) => (
            <span
              key={`pf-${name}`}
              className="rounded-full border border-[var(--border)] bg-slate-50 px-2 py-1 text-slate-600"
            >
              项目: {name}
            </span>
          ))}
          {task.priority === 'high' && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
              高优先级
            </span>
          )}
          <span
            className={`rounded-full border px-2 py-1 ${
              riskTagClass || 'border-[var(--border)]'
            }`}
          >
            {urgencyLabel}
          </span>
        </div>

        {checklistTotal > 0 && (
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-500)]">
              <span>子任务</span>
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  onClearChecklist(task.id)
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-[var(--text-900)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                清空
              </button>
            </div>
            {task.checklist.map((item) => {
              const isEditing = editing.taskId === task.id && editing.itemId === item.id
              return (
                <div
                  key={item.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleChecklist(task.id, item.id)
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors duration-200 ${
                    item.done
                      ? 'border-slate-200 bg-slate-50 text-[var(--text-500)]'
                      : 'border-[var(--border)] bg-white text-[var(--text-700)]'
                  }`}
                >
                  {item.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        value={draft}
                        autoFocus
                        onChange={(event) => setDraft(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            commitDraft()
                          }
                          if (event.key === 'Escape') {
                            setEditing({ taskId: null, itemId: null })
                            setDraft('')
                          }
                        }}
                        ref={inputRef}
                        className="w-full rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-900)]"
                      />
                    ) : (
                      <span
                        onDoubleClick={(event) => {
                          event.stopPropagation()
                          setEditing({ taskId: task.id, itemId: item.id })
                          setDraft(item.text)
                        }}
                        className={`transition-colors duration-200 ${
                          item.done ? 'text-[var(--text-500)] line-through' : 'text-[var(--text-700)]'
                        }`}
                      >
                        {item.text}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        setEditing({ taskId: task.id, itemId: item.id })
                        setDraft(item.text)
                      }}
                      className="rounded-md p-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-[var(--text-900)]"
                      aria-label="编辑子任务"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        onDeleteChecklistItem(task.id, item.id)
                      }}
                      className="rounded-md p-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-rose-600"
                      aria-label="删除子任务"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CardShell>
  )
}

function GroupCard({ group, onOpen, daysUntil }) {
  const topTask = group.tasks[0]
  const count = group.tasks.length
  const fundList = topTask.funds?.length ? topTask.funds : topTask.fund ? [topTask.fund] : []
  const riskLevel = getRiskLevel(topTask, daysUntil)
  const riskTagClass = riskLevel ? riskTagStyles[riskLevel] : ''
  const urgencyLabel = (() => {
    if (!topTask.dueDate) return '不紧急'
    const days = daysUntil(topTask.dueDate)
    if (days === null) return '不紧急'
    if (days < 0) return '逾期'
    if (days <= 3) return '紧急'
    return '不紧急'
  })()

  return (
    <div
      onClick={() => onOpen(group.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(group.id)
        }
      }}
      className="w-full text-left"
      role="button"
      tabIndex={0}
      aria-label="查看批次任务"
    >
      <CardShell className="shadow-md">
        <div className="shrink-0 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-900)] truncate">{topTask.title}</p>
              <p className="mt-1 text-xs text-[var(--text-500)]">批次任务概览</p>
            </div>
            <div className="text-xs text-[var(--text-500)]">{count} 项</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-3 scrollbar-auto">
          <div className="flex flex-wrap gap-2 text-xs text-[var(--text-500)]">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1">
              批次任务
            </span>
            {fundList.map((fund) => (
              <span
                key={fund}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1"
              >
                {fund}
              </span>
            ))}
            {topTask.portfolio?.map((name) => (
              <span
                key={`pf-${name}`}
                className="rounded-full border border-[var(--border)] bg-slate-50 px-2 py-1 text-slate-600"
              >
                项目: {name}
              </span>
            ))}
            {topTask.priority === 'high' && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                高优先级
              </span>
            )}
            <span
              className={`rounded-full border px-2 py-1 ${
                riskTagClass || 'border-[var(--border)]'
              }`}
            >
              {urgencyLabel}
            </span>
          </div>
        </div>
      </CardShell>
    </div>
  )
}

function GroupModal({ open, group, onClose, children }) {
  if (!open || !group) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
      <div className="w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <p className="text-sm text-[var(--text-500)]">批次任务</p>
            <h3 className="text-lg font-semibold text-[var(--text-900)]">{group.title}</h3>
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
          {children}
        </div>
      </div>
    </div>
  )
}

function TaskList({
  view,
  tasks,
  funds,
  matrixBuckets,
  onMoveTaskMatrix,
  onToggleTask,
  onToggleChecklist,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onClearChecklist,
  onDeleteTask,
  onUpdateTaskFund,
  daysUntil,
}) {
  const [openGroupId, setOpenGroupId] = useState(null)

  const riskSummary = useMemo(() => {
    const counts = { overdue: 0, t1: 0, t3: 0, t7: 0 }
    for (const task of tasks) {
      const level = getRiskLevel(task, daysUntil)
      if (level) counts[level] += 1
    }
    return counts
  }, [tasks, daysUntil])

  const riskTotal =
    riskSummary.overdue + riskSummary.t1 + riskSummary.t3 + riskSummary.t7

  const showRiskBanner = view === 'inbox' && riskTotal > 0

  const groupedList = useMemo(() => {
    const order = []
    const map = new Map()
    for (const task of tasks) {
      if (task.groupId) {
        if (!map.has(task.groupId)) {
          map.set(task.groupId, [])
          order.push({ type: 'group', id: task.groupId })
        }
        map.get(task.groupId).push(task)
      } else {
        order.push({ type: 'task', task })
      }
    }
    return { order, map }
  }, [tasks])

  const openGroup = openGroupId ? groupedList.map.get(openGroupId) : null
  const openGroupTitle = openGroup?.[0]?.title || '批次任务'
  if (view === 'matrix') {
    const quadrants = [
      {
        key: 'q1',
        title: '重要 + 紧急',
        hint: '立即处理',
      },
      {
        key: 'q2',
        title: '重要 + 不紧急',
        hint: '规划安排',
      },
      {
        key: 'q3',
        title: '不重要 + 紧急',
        hint: '委派跟进',
      },
      {
        key: 'q4',
        title: '不重要 + 不紧急',
        hint: '稍后处理',
      },
    ]

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {quadrants.map((quad) => (
          <div
            key={quad.key}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const taskId = event.dataTransfer.getData('text/task-id')
              if (taskId && onMoveTaskMatrix) onMoveTaskMatrix(taskId, quad.key)
            }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-900)]">{quad.title}</p>
                <p className="text-xs text-[var(--text-500)]">{quad.hint}</p>
              </div>
              <span className="text-xs text-[var(--text-500)]">{matrixBuckets[quad.key].length}</span>
            </div>
            <div className="mt-3 grid gap-3 items-start">
              {matrixBuckets[quad.key].length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-xs text-[var(--text-500)]">
                  暂无任务
                </div>
              )}
              {matrixBuckets[quad.key].map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/task-id', task.id)
                  }}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <TaskCard
                    task={task}
                    onToggleTask={onToggleTask}
                    onToggleChecklist={onToggleChecklist}
                    onUpdateChecklistItem={onUpdateChecklistItem}
                    onDeleteChecklistItem={onDeleteChecklistItem}
                    onClearChecklist={onClearChecklist}
                    onDeleteTask={onDeleteTask}
                    onUpdateTaskFund={onUpdateTaskFund}
                    daysUntil={daysUntil}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (view === 'funds') {
    const fundEntries = Object.entries(funds)
    return (
      <div className="grid gap-4">
        {fundEntries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-500)]">
            暂无关联基金的任务。
          </div>
        )}
        {fundEntries.map(([fund, items]) => (
          <div key={fund} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-900)]">{fund}</p>
              <span className="text-xs text-[var(--text-500)]">{items.length}</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 items-start">
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleTask={onToggleTask}
                  onToggleChecklist={onToggleChecklist}
                  onUpdateChecklistItem={onUpdateChecklistItem}
                  onDeleteChecklistItem={onDeleteChecklistItem}
                  onClearChecklist={onClearChecklist}
                  onDeleteTask={onDeleteTask}
                  onUpdateTaskFund={onUpdateTaskFund}
                  daysUntil={daysUntil}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {showRiskBanner && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <span className="font-semibold">风险提示</span>
          <span className="text-amber-700">仅对 Capital Call / 季报 / KYC / 报税类任务生效</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {riskSummary.overdue > 0 && (
              <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-rose-700">
                已逾期 {riskSummary.overdue}
              </span>
            )}
            {riskSummary.t1 > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-amber-700">
                T-1 {riskSummary.t1}
              </span>
            )}
            {riskSummary.t3 > 0 && (
              <span className="rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-orange-700">
                T-3 {riskSummary.t3}
              </span>
            )}
            {riskSummary.t7 > 0 && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700">
                T-7 {riskSummary.t7}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start">
        {tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-500)]">
            当前视图暂无任务。
          </div>
        )}
      {groupedList.order.map((item) => {
        if (item.type === 'task') {
          return (
            <TaskCard
              key={item.task.id}
              task={item.task}
              onToggleTask={onToggleTask}
              onToggleChecklist={onToggleChecklist}
              onUpdateChecklistItem={onUpdateChecklistItem}
              onDeleteChecklistItem={onDeleteChecklistItem}
              onClearChecklist={onClearChecklist}
              onDeleteTask={onDeleteTask}
              onUpdateTaskFund={onUpdateTaskFund}
              daysUntil={daysUntil}
            />
          )
        }

        const groupTasks = groupedList.map.get(item.id) || []
        return (
          <GroupCard
            key={item.id}
            group={{ id: item.id, tasks: groupTasks }}
            onOpen={setOpenGroupId}
            daysUntil={daysUntil}
          />
        )
      })}
      </div>
      <GroupModal
        open={Boolean(openGroupId)}
        group={{ title: openGroupTitle }}
        onClose={() => setOpenGroupId(null)}
      >
        <div className="grid gap-3 items-start">
          {(openGroup || []).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleTask={onToggleTask}
              onToggleChecklist={onToggleChecklist}
              onUpdateChecklistItem={onUpdateChecklistItem}
              onDeleteChecklistItem={onDeleteChecklistItem}
              onClearChecklist={onClearChecklist}
              onDeleteTask={onDeleteTask}
              onUpdateTaskFund={onUpdateTaskFund}
              daysUntil={daysUntil}
            />
          ))}
        </div>
      </GroupModal>
    </div>
  )
}

export default TaskList
