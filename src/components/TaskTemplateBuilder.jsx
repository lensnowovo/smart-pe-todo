import { useState, useMemo } from 'react'
import { Plus, Trash2, Calendar, Clock, CheckCircle2, Pencil } from 'lucide-react'
import { PE_TEMPLATES } from '../services/recurrenceEngine'

/**
 * TaskTemplateBuilder - Component for creating and managing recurring task templates
 *
 * This component allows users to:
 * 1. Select from predefined PE templates
 * 2. Create custom recurring task templates
 * 3. Preview upcoming occurrences
 * 4. Generate tasks from templates
 */
function TaskTemplateBuilder({
  contextData,
  templates = [],
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onGenerateFromTemplate,
}) {
  const [showBuilder, setShowBuilder] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [previewCount, setPreviewCount] = useState(4)
  const [editingTemplateId, setEditingTemplateId] = useState(null)

  const getTodayKey = () => new Date().toISOString().slice(0, 10)

  const computeDueRule = (anchorDate, dueBaseDate) => {
    const anchor = anchorDate ? new Date(`${anchorDate}T00:00:00`) : null
    const base = dueBaseDate ? new Date(`${dueBaseDate}T00:00:00`) : null
    if (!base || Number.isNaN(base.getTime())) {
      return { offsetMonths: 0, dayOfMonth: null, useMonthEnd: false }
    }
    const dayOfMonth = base.getDate()
    const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    const useMonthEnd = dayOfMonth === monthEnd.getDate()
    if (!anchor || Number.isNaN(anchor.getTime())) {
      return { offsetMonths: 0, dayOfMonth, useMonthEnd }
    }
    const offsetMonths =
      (base.getFullYear() - anchor.getFullYear()) * 12 +
      (base.getMonth() - anchor.getMonth())
    return { offsetMonths, dayOfMonth, useMonthEnd }
  }

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    title: '',
    funds: [],
    recurrence: {
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 15,
      dayOfQuarter: null,
      autoGenerate: true,
      notifyDaysBefore: 7,
    },
    tags: [],
    priority: 'normal',
    checklist: [],
    anchorDate: new Date().toISOString().slice(0, 10),
    dueDateBaseDate: new Date().toISOString().slice(0, 10),
    dueRule: {
      offsetMonths: 0,
      dayOfMonth: null,
      useMonthEnd: false,
    },
  })

  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newTag, setNewTag] = useState('')

  // Predefined PE templates
  const predefinedTemplates = useMemo(() => Object.values(PE_TEMPLATES), [])

  const handleUsePredefinedTemplate = (template) => {
    const todayKey = getTodayKey()
    const anchorDate = template.anchorDate || todayKey
    const dueBaseDate = template.dueDateBaseDate || todayKey
    setFormData({
      name: template.name,
      description: template.description,
      title: template.name,
      funds: [],
      recurrence: { ...template.recurrence },
      tags: [...template.tags],
      priority: template.priority,
      checklist: template.checklist.map((item) => ({ ...item, id: `${Date.now()}-${item.id}` })),
      anchorDate,
      dueDateBaseDate: dueBaseDate,
      dueRule: template.dueRule || computeDueRule(anchorDate, dueBaseDate),
    })
    setShowBuilder(true)
  }

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    setFormData({
      ...formData,
      checklist: [
        ...formData.checklist,
        { id: `${Date.now()}-checklist`, text: newChecklistItem.trim(), done: false },
      ],
    })
    setNewChecklistItem('')
  }

  const handleRemoveChecklistItem = (id) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter((item) => item.id !== id),
    })
  }

  const handleAddTag = () => {
    if (!newTag.trim()) return
    if (formData.tags.includes(newTag.trim())) return
    setFormData({
      ...formData,
      tags: [...formData.tags, newTag.trim()],
    })
    setNewTag('')
  }

  const handleRemoveTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      title: '',
      funds: [],
      recurrence: {
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 15,
        dayOfQuarter: null,
        autoGenerate: true,
        notifyDaysBefore: 7,
      },
      tags: [],
      priority: 'normal',
      checklist: [],
      anchorDate: getTodayKey(),
      dueDateBaseDate: getTodayKey(),
      dueRule: {
        offsetMonths: 0,
        dayOfMonth: null,
        useMonthEnd: false,
      },
    })
    setEditingTemplateId(null)
  }

  const handleSaveTemplate = () => {
    if (!formData.name || !formData.title) {
      alert('请填写模板名称和任务标题')
      return
    }

    const nextDueRule = computeDueRule(formData.anchorDate, formData.dueDateBaseDate)

    if (editingTemplateId) {
      onUpdateTemplate({
        id: editingTemplateId,
        ...formData,
        dueRule: nextDueRule,
        recurrence: {
          ...formData.recurrence,
          anchorDate: formData.anchorDate,
        },
        updatedAt: new Date().toISOString(),
      })
    } else {
      const template = {
        id: `template-${Date.now()}`,
        ...formData,
        dueRule: nextDueRule,
        recurrence: {
          ...formData.recurrence,
          anchorDate: formData.anchorDate,
        },
        createdAt: new Date().toISOString(),
      }
      onAddTemplate(template)
    }

    setShowBuilder(false)
    resetForm()
  }

  const handleEditTemplate = (template) => {
    setEditingTemplateId(template.id)
    setFormData({
      name: template.name || '',
      description: template.description || '',
      title: template.title || template.name || '',
      funds: template.funds || [],
      recurrence: { ...template.recurrence },
      tags: template.tags || [],
      priority: template.priority || 'normal',
      anchorDate: template.anchorDate || getTodayKey(),
      dueDateBaseDate: template.dueDateBaseDate || template.anchorDate || getTodayKey(),
      dueRule:
        template.dueRule ||
        computeDueRule(
          template.anchorDate || getTodayKey(),
          template.dueDateBaseDate || template.anchorDate || getTodayKey()
        ),
      checklist: (template.checklist || []).map((item) => ({
        id: item.id || `${Date.now()}-${item.text}`,
        text: item.text,
        done: Boolean(item.done),
      })),
    })
    setShowBuilder(true)
  }

  const handleGenerateFromTemplate = (template) => {
    onGenerateFromTemplate(template)
  }

  const recurrenceLabels = {
    daily: '每日',
    weekly: '每周',
    monthly: '每月',
    quarterly: '每季度',
    yearly: '每年',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-900)]">任务模板管理</p>
          <p className="text-xs text-[var(--text-500)]">
            创建周期性任务模板，自动生成重复任务
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-[var(--text-700)] hover:bg-[var(--surface-1)]"
        >
          <Plus className="h-4 w-4" />
          {showBuilder ? '收起' : '新建模板'}
        </button>
      </div>

      {/* Predefined Templates */}
      {!showBuilder && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="text-xs font-semibold text-[var(--text-700)] mb-3">快速开始 - PE 常用模板</p>
          <div className="grid gap-2 md:grid-cols-2">
            {predefinedTemplates.map((template) => (
              <button
                key={template.name}
                onClick={() => handleUsePredefinedTemplate(template)}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-left hover:border-[var(--accent)] transition"
              >
                <CheckCircle2 className="h-5 w-5 text-[var(--accent)] flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-900)] truncate">
                    {template.name}
                  </p>
                  <p className="text-xs text-[var(--text-500)] truncate">{template.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template Builder */}
      {showBuilder && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-900)]">
              {editingTemplateId ? '编辑模板' : '创建新模板'}
            </p>
            <button
              onClick={() => {
                setShowBuilder(false)
                resetForm()
              }}
              className="text-xs text-[var(--text-500)] hover:text-[var(--text-700)]"
            >
              取消
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-[var(--text-700)]">
              模板名称
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="如：季度报告"
              />
            </label>
            <label className="text-sm text-[var(--text-700)]">
              任务标题（可使用占位符）
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="如：{QUARTER} 季度报告"
              />
              <p className="mt-1 text-xs text-[var(--text-500)]">
                可用占位符: {'{Q}'}, {'{QUARTER}'}, {'{MONTH}'}, {'{YEAR}'}, {'{INSTANCE}'}
              </p>
            </label>
          </div>

          <label className="text-sm text-[var(--text-700)]">
            描述
            <input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              placeholder="模板用途说明"
            />
          </label>

          {/* Recurrence Settings */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-semibold text-[var(--text-700)] mb-3">
              <Calendar className="inline h-4 w-4 mr-1" />
              周期设置
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm text-[var(--text-700)]">
                频率
                <select
                  value={formData.recurrence.frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurrence: { ...formData.recurrence, frequency: e.target.value },
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <option value="daily">每日</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                  <option value="quarterly">每季度</option>
                  <option value="yearly">每年</option>
                </select>
              </label>

              <label className="text-sm text-[var(--text-700)]">
                间隔
                <input
                  type="number"
                  min="1"
                  value={formData.recurrence.interval}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurrence: { ...formData.recurrence, interval: Number(e.target.value) },
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm text-[var(--text-700)]">
                提前通知（天）
                <input
                  type="number"
                  min="0"
                  value={formData.recurrence.notifyDaysBefore ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurrence: {
                        ...formData.recurrence,
                        notifyDaysBefore: e.target.value === '' ? '' : Number(e.target.value),
                      },
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 rounded-lg border border-[var(--border)] bg-white p-3">
              <p className="text-xs font-semibold text-[var(--text-700)] mb-2">生成日期与截止日期</p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-xs text-[var(--text-700)]">
                  生成日期基准
                  <input
                    type="date"
                    value={formData.anchorDate}
                    onChange={(e) => {
                      const nextAnchor = e.target.value
                      setFormData({
                        ...formData,
                        anchorDate: nextAnchor,
                        dueRule: computeDueRule(nextAnchor, formData.dueDateBaseDate),
                      })
                    }}
                    className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-[var(--text-700)]">
                  截止日期基准
                  <input
                    type="date"
                    value={formData.dueDateBaseDate}
                    onChange={(e) => {
                      const nextDueBase = e.target.value
                      setFormData({
                        ...formData,
                        dueDateBaseDate: nextDueBase,
                        dueRule: computeDueRule(formData.anchorDate, nextDueBase),
                      })
                    }}
                    className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-500)]">
                月度按“生成日期基准”的日生成，年度按“月+日”生成；若当月无对应日期，自动取月末。
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-500)]">
                示例：生成基准 1/30，月度任务每月 30 日生成；截止基准 4/30，则 DDL 为生成日期后 3 个月的 30 日。
              </p>
            </div>
          </div>

          {/* Funds Selection */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-semibold text-[var(--text-700)] mb-3">关联基金</p>
            <div className="flex flex-wrap gap-2">
              {(contextData?.funds || []).map((fund) => (
                <button
                  key={fund.id}
                  onClick={() => {
                    const newFunds = formData.funds.includes(fund.shortName || fund.fullName)
                      ? formData.funds.filter((f) => f !== (fund.shortName || fund.fullName))
                      : [...formData.funds, fund.shortName || fund.fullName]
                    setFormData({ ...formData, funds: newFunds })
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    formData.funds.includes(fund.shortName || fund.fullName)
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-white border border-[var(--border)] text-[var(--text-700)]'
                  }`}
                >
                  {fund.shortName || fund.fullName}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-semibold text-[var(--text-700)] mb-3">标签</p>
            <div className="flex gap-2 mb-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="添加标签"
              />
              <button
                onClick={handleAddTag}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--text-700)]"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-[var(--text-500)] hover:text-rose-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="text-xs font-semibold text-[var(--text-700)] mb-3">
              子任务清单
            </p>
            <div className="flex gap-2 mb-3">
              <input
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="添加子任务"
              />
              <button
                onClick={handleAddChecklistItem}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              >
                添加
              </button>
            </div>
            <div className="space-y-2">
              {formData.checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <span className="flex-1">{item.text}</span>
                  <button
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="text-[var(--text-500)] hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowBuilder(false)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--text-700)]"
            >
              取消
            </button>
            <button
              onClick={handleSaveTemplate}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)]/90"
            >
              {editingTemplateId ? '保存修改' : '保存模板'}
            </button>
          </div>
        </div>
      )}

      {/* Template List */}
      {templates.length > 0 && !showBuilder && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--text-700)]">已保存的模板</p>
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-900)]">{template.name}</p>
                    <span className="rounded-md bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                      {recurrenceLabels[template.recurrence?.frequency] || '自定义'}
                    </span>
                  </div>
                  {template.description && (
                    <p className="mt-1 text-xs text-[var(--text-500)]">{template.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {template.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--border)] bg-white px-2 py-0.5 text-xs text-[var(--text-500)]"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.funds?.map((fund) => (
                      <span
                        key={fund}
                        className="rounded-md border border-[var(--border)] bg-white px-2 py-0.5 text-xs text-[var(--text-500)]"
                      >
                        {fund}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-[var(--text-500)]">
                    <Clock className="h-3 w-3" />
                    <span>
                      {template.recurrence?.notifyDaysBefore || 0} 天前通知 ·{' '}
                      {template.checklist?.length || 0} 个子任务
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-[var(--text-700)] hover:bg-[var(--surface-1)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleGenerateFromTemplate(template)}
                    className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/20"
                  >
                    生成任务
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(template.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TaskTemplateBuilder
