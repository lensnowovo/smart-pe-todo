import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Pencil, Trash2, X, RotateCcw, Sparkles, Loader2 } from 'lucide-react'
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
  onUpdateTaskTags,
  onUpdateTaskDueDate,
  onUpdateTaskNotes,
  onOrganizeNotes,
  daysUntil,
}) {
  const [editing, setEditing] = useState({ taskId: null, itemId: null })
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const [editingFund, setEditingFund] = useState(false)
  const [fundDraft, setFundDraft] = useState('')
  const fundInputRef = useRef(null)
  const [editingTagIndex, setEditingTagIndex] = useState(-1)
  const [addingTag, setAddingTag] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const tagInputRef = useRef(null)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [dueDateDraft, setDueDateDraft] = useState(task.dueDate || '')
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false)
  const quickAddMenuRef = useRef(null)
  const [showUrgencyMenu, setShowUrgencyMenu] = useState(false)
  const urgencyMenuRef = useRef(null)
  const [collapsed, setCollapsed] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [notesDraft, setNotesDraft] = useState(task.notes || '')
  const [organizing, setOrganizing] = useState(false)
  const notesRef = useRef(null)
  const fundList = task.funds?.length ? task.funds : task.fund ? [task.fund] : []
  const tags = task.tags || []
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

  const commitTagDraft = () => {
    if (editingTagIndex < 0) return
    const cleaned = tagDraft.trim()
    const nextTags = [...tags]
    if (cleaned) {
      nextTags[editingTagIndex] = cleaned
    } else {
      nextTags.splice(editingTagIndex, 1)
    }
    onUpdateTaskTags(task.id, nextTags)
    setEditingTagIndex(-1)
    setTagDraft('')
  }

  const commitAddTag = () => {
    if (!addingTag) return
    const cleaned = tagDraft.trim()
    if (cleaned && !tags.includes(cleaned)) {
      onUpdateTaskTags(task.id, [...tags, cleaned])
    }
    setAddingTag(false)
    setTagDraft('')
  }

  const commitDueDateDraft = () => {
    if (!editingDueDate) return
    onUpdateTaskDueDate(task.id, dueDateDraft)
    setEditingDueDate(false)
  }

  const commitNotesDraft = () => {
    if (onUpdateTaskNotes) {
      onUpdateTaskNotes(task.id, notesDraft)
    }
  }

  const handleOrganizeNotes = async () => {
    if (!onOrganizeNotes || !notesDraft.trim()) return
    setOrganizing(true)
    try {
      const organized = await onOrganizeNotes(task.id, notesDraft, task.title)
      setNotesDraft(organized)
    } catch (error) {
      console.error('Failed to organize notes:', error)
      alert('整理笔记失败: ' + error.message)
    } finally {
      setOrganizing(false)
    }
  }

  useEffect(() => {
    setNotesDraft(task.notes || '')
  }, [task.notes])

  const toISODate = (date) => {
    const pad = (value) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }

  const updateUrgency = (level) => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (level === 'urgent') {
      onUpdateTaskDueDate(task.id, toISODate(start))
      return
    }
    if (level === 'overdue') {
      const yesterday = new Date(start)
      yesterday.setDate(yesterday.getDate() - 1)
      onUpdateTaskDueDate(task.id, toISODate(yesterday))
      return
    }
    onUpdateTaskDueDate(task.id, '')
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

  useEffect(() => {
    if (editingTagIndex < 0 && !addingTag) return
    const handleClickOutside = (event) => {
      if (!tagInputRef.current) return
      if (tagInputRef.current.contains(event.target)) return
      if (editingTagIndex >= 0) {
        commitTagDraft()
      } else {
        commitAddTag()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingTagIndex, addingTag, tagDraft, tags])

  useEffect(() => {
    if (editingDueDate) return
    setDueDateDraft(task.dueDate || '')
  }, [task.dueDate, editingDueDate])

  useEffect(() => {
    if (!showQuickAddMenu) return
    const handleClickOutside = (event) => {
      if (!quickAddMenuRef.current) return
      if (quickAddMenuRef.current.contains(event.target)) return
      setShowQuickAddMenu(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showQuickAddMenu])

  useEffect(() => {
    if (!showUrgencyMenu) return
    const handleClickOutside = (event) => {
      if (!urgencyMenuRef.current) return
      if (urgencyMenuRef.current.contains(event.target)) return
      setShowUrgencyMenu(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUrgencyMenu])

  const checklistTotal = task.checklist?.length || 0
  const hasNotes = task.notes?.trim()

  // Flipped card - back side with notes
  if (flipped) {
    return (
      <CardShell className="h-auto">
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-semibold text-[var(--text-900)] truncate">{task.title}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  commitNotesDraft()
                  setFlipped(false)
                }}
                className="rounded-md p-1.5 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-[var(--text-900)]"
                aria-label="翻转回正面"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <textarea
              ref={notesRef}
              value={notesDraft}
              onChange={(event) => setNotesDraft(event.target.value)}
              onBlur={() => commitNotesDraft()}
              onClick={(event) => event.stopPropagation()}
              placeholder="在这里添加笔记和备注..."
              className="w-full min-h-[120px] rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-700)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  handleOrganizeNotes()
                }}
                disabled={organizing || !notesDraft.trim()}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {organizing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {organizing ? '整理中...' : 'AI 整理笔记'}
              </button>
              <span className="text-xs text-[var(--text-500)]">
                {notesDraft.length} 字符
              </span>
            </div>
          </div>
        </div>
      </CardShell>
    )
  }

  if (collapsed) {
    return (
      <CardShell className="h-auto">
        <div className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleTask(task.id)
                }}
                className="mt-0.5 text-[var(--accent)]"
                aria-label="Toggle task"
              >
                {task.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </button>
              <p
                className={`min-w-0 truncate text-sm font-semibold ${
                  task.completed ? 'line-through text-[var(--text-500)]' : 'text-[var(--text-900)]'
                }`}
              >
                {task.title}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  setFlipped(true)
                }}
                className={`rounded-md p-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-[var(--text-900)] ${hasNotes ? 'text-amber-600' : ''}`}
                aria-label="查看笔记"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  setCollapsed(false)
                }}
                className="rounded-md p-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-[var(--text-900)]"
                aria-label="展开任务卡片"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
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
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-500)]">
            {(fundList[0] || '未设置基金') && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5">
                {fundList[0] || '未设置基金'}
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 ${riskTagClass || 'border-[var(--border)]'}`}>
              {urgencyLabel}
            </span>
            {task.dueDate && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5">
                DDL {task.dueDate}
              </span>
            )}
            {checklistTotal > 0 && (
              <span className="rounded-full border border-[var(--border)] bg-white px-2 py-0.5">
                子任务 {checklistTotal}
              </span>
            )}
            {hasNotes && (
              <span className="rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5">
                有笔记
              </span>
            )}
          </div>
        </div>
      </CardShell>
    )
  }

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
                setFlipped(true)
              }}
              className={`rounded-md p-1 hover:bg-[var(--surface-2)] ${hasNotes ? 'text-amber-600' : 'text-[var(--text-500)] hover:text-[var(--text-900)]'}`}
              aria-label="翻转查看笔记"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation()
                setCollapsed((prev) => !prev)
              }}
              className="rounded-md p-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-[var(--text-900)]"
              aria-label={collapsed ? '展开任务卡片' : '折叠任务卡片'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
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
            <button
              onDoubleClick={(event) => {
                event.stopPropagation()
                setEditingFund(true)
                setFundDraft(fundList[0] || '')
              }}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[var(--text-500)] hover:border-[var(--accent)]/40 hover:text-[var(--text-900)]"
              aria-label="双击编辑基金归属"
            >
              <span>{fundList.join(', ')}</span>
            </button>
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
          <div ref={urgencyMenuRef} className="relative">
            <button
              onDoubleClick={(event) => {
                event.stopPropagation()
                setShowUrgencyMenu((prev) => !prev)
              }}
              onClick={(event) => event.stopPropagation()}
              className={`rounded-full border px-2 py-1 ${
                riskTagClass || 'border-[var(--border)]'
              }`}
              aria-label="双击编辑紧急程度"
            >
              {urgencyLabel}
            </button>
            {showUrgencyMenu && (
              <div className="absolute left-0 top-8 z-20 w-28 rounded-lg border border-[var(--border)] bg-white p-1 shadow-lg">
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    setShowUrgencyMenu(false)
                    updateUrgency('urgent')
                  }}
                  className="w-full rounded-md px-2 py-1 text-left text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)]"
                >
                  紧急
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    setShowUrgencyMenu(false)
                    updateUrgency('not_urgent')
                  }}
                  className="w-full rounded-md px-2 py-1 text-left text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)]"
                >
                  不紧急
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    setShowUrgencyMenu(false)
                    updateUrgency('overdue')
                  }}
                  className="w-full rounded-md px-2 py-1 text-left text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)]"
                >
                  逾期
                </button>
              </div>
            )}
          </div>
          {editingDueDate ? (
            <input
              type="date"
              value={dueDateDraft}
              autoFocus
              onChange={(event) => setDueDateDraft(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onBlur={() => commitDueDateDraft()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitDueDateDraft()
                if (event.key === 'Escape') {
                  setDueDateDraft(task.dueDate || '')
                  setEditingDueDate(false)
                }
              }}
              className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-700)]"
              aria-label="编辑截止日期"
            />
          ) : task.dueDate ? (
            <button
              onDoubleClick={(event) => {
                event.stopPropagation()
                setEditingDueDate(true)
              }}
              onClick={(event) => event.stopPropagation()}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 hover:border-[var(--accent)]/40 hover:text-[var(--text-900)]"
              aria-label="双击编辑截止日期"
            >
              DDL {task.dueDate}
            </button>
          ) : null}
          {tags.map((tag, index) =>
            editingTagIndex === index ? (
              <input
                key={`${task.id}-tag-edit-${index}`}
                ref={tagInputRef}
                value={tagDraft}
                autoFocus
                onChange={(event) => setTagDraft(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitTagDraft()
                  if (event.key === 'Escape') {
                    setEditingTagIndex(-1)
                    setTagDraft('')
                  }
                }}
                className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-700)]"
                placeholder="标签"
              />
            ) : (
              <span
                key={`${task.id}-tag-${index}-${tag}`}
                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700"
              >
                <button
                  onDoubleClick={(event) => {
                    event.stopPropagation()
                    setAddingTag(false)
                    setEditingTagIndex(index)
                    setTagDraft(tag)
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="max-w-36 truncate"
                  aria-label="双击编辑标签"
                >
                  {tag}
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    onUpdateTaskTags(task.id, tags.filter((item) => item !== tag))
                  }}
                  className="rounded-full p-0.5 hover:bg-sky-100"
                  aria-label="删除标签"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          )}
          {addingTag ? (
            <input
              ref={tagInputRef}
              value={tagDraft}
              autoFocus
              onChange={(event) => setTagDraft(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitAddTag()
                if (event.key === 'Escape') {
                  setAddingTag(false)
                  setTagDraft('')
                }
              }}
              className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-700)]"
              placeholder="新增标签"
            />
          ) : (
            <div ref={quickAddMenuRef} className="relative">
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  setShowQuickAddMenu((prev) => !prev)
                }}
                className="rounded-full border border-dashed border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-500)] hover:border-[var(--accent)]/40 hover:text-[var(--text-900)]"
                aria-label="新增项"
              >
                +
              </button>
              {showQuickAddMenu && (
                <div className="absolute left-0 top-8 z-20 w-24 rounded-lg border border-[var(--border)] bg-white p-1 shadow-lg">
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowQuickAddMenu(false)
                      setEditingTagIndex(-1)
                      setAddingTag(true)
                      setTagDraft('')
                    }}
                    className="w-full rounded-md px-2 py-1 text-left text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)]"
                  >
                    +标签
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowQuickAddMenu(false)
                      setEditingDueDate(true)
                    }}
                    className="w-full rounded-md px-2 py-1 text-left text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)]"
                  >
                    +DDL
                  </button>
                </div>
              )}
            </div>
          )}
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

function MatrixTaskItem({ task, onToggleTask, onDeleteTask, daysUntil }) {
  const fundList = task.funds?.length ? task.funds : task.fund ? [task.fund] : []
  const dueText = (() => {
    if (!task.dueDate) return '无截止日期'
    const days = daysUntil(task.dueDate)
    if (days === null) return task.dueDate
    if (days < 0) return `已逾期 ${Math.abs(days)} 天`
    if (days === 0) return '今天截止'
    return `${days} 天后截止`
  })()

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={(event) => {
            event.stopPropagation()
            onToggleTask(task.id)
          }}
          className="mt-0.5 text-[var(--accent)]"
          aria-label="Toggle task"
        >
          {task.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </button>
        <p
          className={`flex-1 text-sm leading-5 ${
            task.completed ? 'line-through text-[var(--text-500)]' : 'text-[var(--text-900)]'
          } truncate`}
        >
          {task.title}
        </p>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onDeleteTask(task.id)
          }}
          className="rounded-md p-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-rose-600"
          aria-label="删除任务"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 pl-6 text-xs text-[var(--text-500)]">
        <span>{dueText}</span>
        {fundList[0] && (
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5">
            {fundList[0]}
          </span>
        )}
        {task.priority === 'high' && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
            高优先级
          </span>
        )}
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
  onUpdateTaskTags,
  onUpdateTaskDueDate,
  onUpdateTaskNotes,
  onOrganizeNotes,
  daysUntil,
}) {
  const [openGroupId, setOpenGroupId] = useState(null)
  const [collapsedFunds, setCollapsedFunds] = useState({})
  const [fundTimeFilter, setFundTimeFilter] = useState('all')

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

  const parseTaskDate = (task) => {
    const raw = task.completedDate || task.createdDate || (task.createdAt ? String(task.createdAt).slice(0, 10) : '')
    if (!raw) return null
    const date = new Date(`${raw}T00:00:00`)
    if (Number.isNaN(date.getTime())) return null
    return date
  }

  const isInCurrentWeek = (date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const mondayOffset = (today.getDay() + 6) % 7
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - mondayOffset)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return date >= weekStart && date <= weekEnd
  }

  const filterTaskByTime = (task) => {
    if (!task.completed) return true
    if (fundTimeFilter === 'all') return true
    const date = parseTaskDate(task)
    if (!date) return false
    const now = new Date()

    if (fundTimeFilter === 'week') return isInCurrentWeek(date)
    if (fundTimeFilter === 'month') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    }
    if (fundTimeFilter === 'year') {
      return date.getFullYear() === now.getFullYear()
    }
    return true
  }
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
                  <MatrixTaskItem
                    task={task}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
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
    const filterOptions = [
      { key: 'all', label: '全部' },
      { key: 'week', label: '本周' },
      { key: 'month', label: '本月' },
      { key: 'year', label: '本年度' },
    ]
    const fundEntries = Object.entries(funds)
      .map(([fund, items]) => [fund, items.filter(filterTaskByTime)])
      .filter(([, items]) => items.length > 0)

    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setFundTimeFilter(option.key)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                fundTimeFilter === option.key
                  ? 'border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border border-[var(--border)] bg-white text-[var(--text-500)] hover:text-[var(--text-900)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {fundEntries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--text-500)]">
            当前筛选条件下暂无关联基金任务。
          </div>
        )}
        {fundEntries.map(([fund, items]) => (
          <div key={fund} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() =>
                  setCollapsedFunds((prev) => ({
                    ...prev,
                    [fund]: !prev[fund],
                  }))
                }
                className="flex items-center gap-2 text-left"
              >
                {collapsedFunds[fund] ? (
                  <ChevronRight className="h-4 w-4 text-[var(--text-500)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--text-500)]" />
                )}
                <p className="text-sm font-semibold text-[var(--text-900)]">{fund}</p>
              </button>
              <span className="text-xs text-[var(--text-500)]">{items.length}</span>
            </div>
            {!collapsedFunds[fund] && (
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
                    onUpdateTaskTags={onUpdateTaskTags}
                    onUpdateTaskDueDate={onUpdateTaskDueDate}
                    onUpdateTaskNotes={onUpdateTaskNotes}
                    onOrganizeNotes={onOrganizeNotes}
                    daysUntil={daysUntil}
                  />
                ))}
              </div>
            )}
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
              onUpdateTaskTags={onUpdateTaskTags}
              onUpdateTaskDueDate={onUpdateTaskDueDate}
              onUpdateTaskNotes={onUpdateTaskNotes}
              onOrganizeNotes={onOrganizeNotes}
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
              onUpdateTaskTags={onUpdateTaskTags}
              onUpdateTaskDueDate={onUpdateTaskDueDate}
              onUpdateTaskNotes={onUpdateTaskNotes}
              onOrganizeNotes={onOrganizeNotes}
              daysUntil={daysUntil}
            />
          ))}
        </div>
      </GroupModal>
    </div>
  )
}

export default TaskList
