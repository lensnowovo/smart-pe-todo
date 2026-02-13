import { useState } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function CalendarView({
  selectedDate,
  onSelectDate,
  tasksForDate,
  onMoveTaskDate,
  onOpenDate,
}) {
  const [month, setMonth] = useState(startOfMonth(selectedDate))

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = []

  for (let day = start; day <= end; day = addDays(day, 1)) {
    days.push(day)
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-500)]">月度日历</p>
          <h3 className="text-xl font-semibold text-[var(--text-900)]">
            {format(month, 'yyyy年MM月')}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-500)]">仅显示有截止日期或周期性生成的任务</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-700)]"
          >
            上一月
          </button>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-700)]"
          >
            下一月
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-[var(--text-500)]">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, month)
          const isSelected = isSameDay(day, selectedDate)
          const visibleTasks = tasksForDate(day)
          const previewTasks = visibleTasks.slice(0, 3)
          const moreCount = Math.max(visibleTasks.length - 3, 0)

          return (
            <div
              key={dayKey}
              onClick={() => {
                onSelectDate(day)
                onOpenDate(day)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const taskId = event.dataTransfer.getData('text/task-id')
                if (taskId) onMoveTaskDate(taskId, dayKey)
              }}
              className={`min-h-[140px] rounded-xl border border-[var(--border)] p-2 text-left transition ${
                inMonth ? 'bg-white' : 'bg-slate-50'
              } ${isSelected ? 'ring-2 ring-[var(--accent)]/40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs ${inMonth ? 'text-[var(--text-900)]' : 'text-slate-400'}`}>
                  {format(day, 'd')}
                </span>
                {visibleTasks.length > 0 && (
                  <span className="text-[10px] text-[var(--text-500)]">{visibleTasks.length}</span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {previewTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/task-id', task.id)
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectDate(day)
                      onOpenDate(day, task.id)
                    }}
                    className={`cursor-grab rounded-lg border px-2 py-1 text-[11px] ${
                      task.calendarType === 'completed'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : task.completed
                          ? 'border-slate-200 bg-slate-100 text-slate-600'
                          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-700)]'
                    }`}
                  >
                    <span>{task.title}</span>
                  </div>
                ))}
                {moreCount > 0 && (
                  <div className="text-[11px] text-[var(--text-500)]">+{moreCount} 更多</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarView
