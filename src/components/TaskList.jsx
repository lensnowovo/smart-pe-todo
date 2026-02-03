import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Circle, FileText, Pencil, Plus, Trash2, X } from 'lucide-react'
import { refineTaskNote } from '../services/aiService'
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
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onClearChecklist,
  onDeleteTask,
  onUpdateTaskFund,
  onUpdateTaskNote,
  onUpdateTaskDueDate,
  onAddTaskTag,
  onUpdateTaskTag,
  glassMode = false,
  daysUntil,
}) {
  const [editing, setEditing] = useState({ taskId: null, itemId: null })
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const [editingFund, setEditingFund] = useState(false)
  const [fundDraft, setFundDraft] = useState('')
  const fundInputRef = useRef(null)
  const [flipped, setFlipped] = useState(false)
  const [noteDraft, setNoteDraft] = useState(task.note || '')
  const [noteRefined, setNoteRefined] = useState(task.noteRefined || '')
  const [noteLoading, setNoteLoading] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [dueDateDraft, setDueDateDraft] = useState(task.dueDate || '')
  const [editingTag, setEditingTag] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const [editingTagValue, setEditingTagValue] = useState('')
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addMenuRef = useRef(null)
  const dueDateInputRef = useRef(null)
  const tagInputRef = useRef(null)
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

  const persistNote = (nextNote, nextRefined) => {
    if (!onUpdateTaskNote) return
    onUpdateTaskNote(task.id, nextNote, nextRefined)
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
    setNoteDraft(task.note || '')
    setNoteRefined(task.noteRefined || '')
  }, [task.note, task.noteRefined])

  useEffect(() => {
    setDueDateDraft(task.dueDate || '')
  }, [task.dueDate])

  const checklistTotal = task.checklist?.length || 0
  const shouldNormalizeChecklist = checklistTotal > 0 && checklistTotal < 4
  const handleAddChecklist = (event) => {
    event.stopPropagation()
    const itemId = `${Date.now()}-manual`
    const item = { id: itemId, text: '新子任务', done: false }
    onAddChecklistItem(task.id, item)
    setEditing({ taskId: task.id, itemId })
    setDraft(item.text)
  }

  const handleRefineNote = async () => {
    if (noteLoading) return
    const trimmed = noteDraft.trim()
    if (!trimmed) return
    setNoteLoading(true)
    try {
      const refined = await refineTaskNote(trimmed)
      setNoteRefined(refined)
      persistNote(noteDraft, refined)
    } catch (error) {
      alert(error?.message || '整理失败，请稍后再试')
    } finally {
      setNoteLoading(false)
    }
  }

  const handleApplyRefinedNote = () => {
    if (!noteRefined) return
    setNoteDraft(noteRefined)
    setNoteRefined('')
    persistNote(noteRefined, '')
  }

  const handleFlip = (event, next) => {
    event.stopPropagation()
    if (typeof next === 'boolean') {
      setFlipped(next)
      return
    }
    setFlipped((prev) => !prev)
  }

  const commitDueDateDraft = () => {
    if (!onUpdateTaskDueDate) return
    const cleaned = dueDateDraft || null
    onUpdateTaskDueDate(task.id, cleaned)
    setEditingDueDate(false)
  }

  const handleClearDueDate = (event) => {
    event.stopPropagation()
    setDueDateDraft('')
    if (onUpdateTaskDueDate) {
      onUpdateTaskDueDate(task.id, null)
    }
    setEditingDueDate(false)
  }

  const commitTagDraft = () => {
    const cleaned = tagDraft.trim()
    if (!cleaned) {
      setEditingTag(false)
      setTagDraft('')
      setEditingTagValue('')
      return
    }
    if (editingTagValue && onUpdateTaskTag) {
      onUpdateTaskTag(task.id, editingTagValue, cleaned)
    } else if (onAddTaskTag) {
      onAddTaskTag(task.id, cleaned)
    }
    setEditingTag(false)
    setTagDraft('')
    setEditingTagValue('')
  }

  const cancelTagDraft = () => {
    setEditingTag(false)
    setTagDraft('')
    setEditingTagValue('')
  }

  const openAddMenu = (event) => {
    event.stopPropagation()
    setAddMenuOpen((prev) => !prev)
  }

  useEffect(() => {
    if (!addMenuOpen) return
    const handleClickOutside = (event) => {
      if (!addMenuRef.current) {
        setAddMenuOpen(false)
        return
      }
      if (addMenuRef.current.contains(event.target)) return
      setAddMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [addMenuOpen])

  const renderChecklistArea = () => (
    <>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-500)]">
        <span>子任务</span>
        <div className="flex items-center gap-2">
          {checklistTotal > 0 && (
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
          )}
          <button
            onClick={handleAddChecklist}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-[var(--text-900)]"
            aria-label="新增子任务"
          >
            <Plus className="h-3.5 w-3.5" />
            新增
          </button>
        </div>
      </div>

      <div className="mt-2 flex-1 min-h-0 border-t border-[var(--border)]/40 relative">
        {task.completed && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-3 py-6 text-xs text-[var(--text-500)] bg-[var(--surface-1)]/80 backdrop-blur-[1px]">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-[var(--border)]" />
              <CheckCircle2 className="h-5 w-5" />
              <span className="h-px w-12 bg-[var(--border)]" />
            </div>
            <span className="mt-2">任务已完成</span>
          </div>
        )}
        {checklistTotal > 0 ? (
          <div
            className={`grid gap-2 h-full overflow-y-auto pr-1 pt-3 scrollbar-auto ${
              shouldNormalizeChecklist ? 'grid-rows-4' : ''
            }`}
          >
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
                    shouldNormalizeChecklist ? 'h-full' : ''
                  } ${
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
        ) : task.completed ? null : (
          <div className="flex h-full flex-col items-center justify-center px-3 py-6 text-xs text-[var(--text-500)]">
            <Plus className="h-5 w-5" />
            <span className="mt-2">点击右上角新增，添加子任务</span>
          </div>
        )}
      </div>
    </>
  )
  const panelBase = 'rounded-2xl overflow-hidden flex flex-col'
  const panelStyle = glassMode
    ? 'home-glass-panel home-glass-edge'
    : 'border border-[var(--border)] bg-[var(--surface-1)] shadow-sm'
  return (
    <CardShell
      className="relative [perspective:1200px] bg-transparent border-transparent shadow-none overflow-visible"
      onDoubleClick={handleFlip}
    >
      <div
        className={`absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div
          className={`absolute inset-0 [backface-visibility:hidden] ${panelBase} ${panelStyle}`}
        >
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
                  onClick={(event) => handleFlip(event)}
                  className="rounded-md p-1 text-[var(--text-500)] hover:bg-[var(--surface-2)] hover:text-[var(--text-900)]"
                  aria-label="查看备注"
                >
                  <FileText className="h-4 w-4" />
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

          <div className="flex-1 px-4 pb-3 flex flex-col">
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
              {(task.tags || []).map((tag) => (
                <span
                  key={`tag-${tag}`}
                  onDoubleClick={(event) => {
                    event.stopPropagation()
                    setEditingTag(true)
                    setTagDraft(tag)
                    setEditingTagValue(tag)
                  }}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[var(--text-500)] cursor-text"
                >
                  #{tag}
                </span>
              ))}
              {task.priority === 'high' && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                  高优先级
                </span>
              )}
              {editingDueDate ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={dueDateInputRef}
                    type="date"
                    value={dueDateDraft}
                    autoFocus
                    onChange={(event) => setDueDateDraft(event.target.value)}
                    onBlur={commitDueDateDraft}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        commitDueDateDraft()
                      }
                      if (event.key === 'Escape') {
                        setEditingDueDate(false)
                        setDueDateDraft(task.dueDate || '')
                      }
                    }}
                    className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-700)]"
                  />
                  <button
                    onClick={handleClearDueDate}
                    className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-500)] hover:text-rose-600"
                  >
                    清除
                  </button>
                </div>
              ) : task.dueDate ? (
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    setEditingDueDate(true)
                  }}
                  className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-[var(--text-500)] hover:border-[var(--accent)]/40 hover:text-[var(--text-900)]"
                >
                  截止: {task.dueDate}
                </button>
              ) : null}
              {editingTag ? (
                <input
                  ref={tagInputRef}
                  value={tagDraft}
                  autoFocus
                  onChange={(event) => setTagDraft(event.target.value)}
                  onBlur={cancelTagDraft}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitTagDraft()
                    if (event.key === 'Escape') {
                      cancelTagDraft()
                    }
                  }}
                  className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--text-700)]"
                  placeholder={editingTagValue ? '修改标签' : '新增标签'}
                />
              ) : null}
              {!editingDueDate && !editingTag && (
                <div className="relative" ref={addMenuRef}>
                  <button
                    onClick={openAddMenu}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-[var(--border)] bg-white text-[var(--text-500)] hover:border-[var(--accent)]/40 hover:text-[var(--text-900)] self-center"
                    aria-label="添加"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                  {addMenuOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-32 rounded-lg border border-[var(--border)] bg-white p-1 text-xs shadow-md">
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingTag(true)
                          setAddMenuOpen(false)
                        }}
                        className="w-full rounded-md px-2 py-1 text-left text-[var(--text-700)] hover:bg-[var(--surface-2)]"
                      >
                        新增标签
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingDueDate(true)
                          setAddMenuOpen(false)
                        }}
                        className="w-full rounded-md px-2 py-1 text-left text-[var(--text-700)] hover:bg-[var(--surface-2)]"
                      >
                        添加截止日期
                      </button>
                    </div>
                  )}
                </div>
              )}
              {riskTagClass && (
                <span className={`rounded-full border px-2 py-1 ${riskTagClass}`}>
                  {urgencyLabel}
                </span>
              )}
            </div>

            {renderChecklistArea()}
          </div>
        </div>

        <div
          className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] ${panelBase} ${panelStyle}`}
        >
          <div className="shrink-0 px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-[var(--text-700)]">
              <FileText className="h-4 w-4" />
              任务备注
            </div>
            <button
              onClick={(event) => {
                persistNote(noteDraft, noteRefined)
                handleFlip(event, false)
              }}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)]"
            >
              返回
            </button>
          </div>
          <div className="flex-1 px-4 py-4 flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-500)]">原始备注</span>
              <button
                onClick={() => persistNote(noteDraft, noteRefined)}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)]"
              >
                保存
              </button>
            </div>
            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              onBlur={() => persistNote(noteDraft, noteRefined)}
              onDoubleClick={(event) => event.stopPropagation()}
              className="h-28 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-900)]"
              placeholder="写下你的备注..."
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-500)]">整理后</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefineNote}
                  disabled={noteLoading}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-700)] hover:bg-[var(--surface-2)] disabled:opacity-60"
                >
                  {noteLoading ? '整理中...' : '整理语言'}
                </button>
                {noteRefined && (
                  <button
                    onClick={handleApplyRefinedNote}
                    className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs text-white hover:bg-[var(--accent)]/90"
                  >
                    ok
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-700)] overflow-y-auto">
              {noteRefined ? noteRefined : '暂无整理内容'}
            </div>
          </div>
        </div>
      </div>
    </CardShell>
  )
}

function CompactTaskCard({ task, onToggleTask, onDeleteTask, daysUntil }) {
  const fundLabel = task.funds?.[0] || task.fund
  const dueLabel = task.dueDate ? `${daysUntil(task.dueDate)}天` : null

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-3 text-left">
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
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${task.completed ? 'line-through text-[var(--text-500)]' : 'text-[var(--text-900)]'} line-clamp-2`}>
            {task.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--text-500)]">
            {fundLabel && (
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5">
                {fundLabel}
              </span>
            )}
            {task.dueDate && (
              <span className="rounded-full border border-[var(--border)] bg-white px-2 py-0.5">
                {task.dueDate}
                {dueLabel ? ` · ${dueLabel}` : ''}
              </span>
            )}
          </div>
        </div>
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
  )
}

function GroupCard({ group, onOpen, daysUntil, glassMode = false }) {
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
      <CardShell
        className={glassMode ? 'home-glass-panel home-glass-edge' : 'shadow-md'}
      >
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
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onClearChecklist,
  onDeleteTask,
  onUpdateTaskFund,
  onUpdateTaskNote,
  onUpdateTaskDueDate,
  onAddTaskTag,
  onUpdateTaskTag,
  glassMode = false,
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
                  <CompactTaskCard
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
                <CompactTaskCard
                  key={task.id}
                  task={task}
                  onToggleTask={onToggleTask}
                  onDeleteTask={onDeleteTask}
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
              onAddChecklistItem={onAddChecklistItem}
              onUpdateChecklistItem={onUpdateChecklistItem}
              onDeleteChecklistItem={onDeleteChecklistItem}
              onClearChecklist={onClearChecklist}
              onDeleteTask={onDeleteTask}
              onUpdateTaskFund={onUpdateTaskFund}
              onUpdateTaskNote={onUpdateTaskNote}
              onUpdateTaskDueDate={onUpdateTaskDueDate}
              onAddTaskTag={onAddTaskTag}
              onUpdateTaskTag={onUpdateTaskTag}
              glassMode={glassMode}
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
              glassMode={glassMode}
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
              onAddChecklistItem={onAddChecklistItem}
              onUpdateChecklistItem={onUpdateChecklistItem}
              onDeleteChecklistItem={onDeleteChecklistItem}
              onClearChecklist={onClearChecklist}
              onDeleteTask={onDeleteTask}
              onUpdateTaskFund={onUpdateTaskFund}
              onUpdateTaskNote={onUpdateTaskNote}
              onUpdateTaskDueDate={onUpdateTaskDueDate}
              onAddTaskTag={onAddTaskTag}
              onUpdateTaskTag={onUpdateTaskTag}
              glassMode={glassMode}
              daysUntil={daysUntil}
            />
          ))}
        </div>
      </GroupModal>
    </div>
  )
}

export default TaskList
