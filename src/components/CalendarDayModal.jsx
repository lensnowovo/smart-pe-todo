import { format } from 'date-fns'
import { X } from 'lucide-react'

function CalendarDayModal({ open, date, tasks, onClose }) {
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
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  task.completed
                    ? 'border-slate-200 bg-slate-50 text-[var(--text-500)]'
                    : 'border-[var(--border)] bg-white text-[var(--text-900)]'
                }`}
              >
                <p className={task.completed ? 'line-through' : ''}>{task.title}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-500)]">
                  {(task.funds?.length ? task.funds : task.fund ? [task.fund] : []).map((fund) => (
                    <span
                      key={fund}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1"
                    >
                      {fund}
                    </span>
                  ))}
                  {task.lp?.map((name) => (
                    <span
                      key={`lp-${name}`}
                      className="rounded-full border border-[var(--border)] bg-slate-50 px-2 py-1 text-slate-600"
                    >
                      LP: {name}
                    </span>
                  ))}
                  {task.portfolio?.map((name) => (
                    <span
                      key={`pf-${name}`}
                      className="rounded-full border border-[var(--border)] bg-slate-50 px-2 py-1 text-slate-600"
                    >
                      项目: {name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarDayModal
