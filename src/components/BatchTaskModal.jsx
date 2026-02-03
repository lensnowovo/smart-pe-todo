function BatchTaskModal({ open, tasks, onChange, onConfirm, onCancel }) {
  if (!open) return null

  const toggleTask = (id) => {
    onChange(
      tasks.map((task) => (task.id === id ? { ...task, selected: !task.selected } : task))
    )
  }

  const toggleFund = (taskId, fund) => {
    onChange(
      tasks.map((task) => {
        if (task.id !== taskId) return task
        const selected = task.selectedFunds || []
        const next = selected.includes(fund)
          ? selected.filter((item) => item !== fund)
          : [...selected, fund]
        return { ...task, selectedFunds: next }
      })
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[var(--text-900)]">批量任务预览</h3>
        <p className="mt-2 text-sm text-[var(--text-500)]">
          已识别多条任务，请确认需要创建的任务，并处理多基金归属。
        </p>

        <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-700)]"
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.selected}
                    onChange={() => toggleTask(task.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold text-[var(--text-900)]">{task.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-500)]">
                      {task.deadline && (
                        <span className="rounded-full border border-[var(--border)] px-2 py-1">
                          截止 {task.deadline}
                        </span>
                      )}
                      {(task.funds || []).map((fund) => (
                        <span
                          key={fund}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1"
                        >
                          {fund}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
                <span className="text-xs text-[var(--text-500)]">{task.subtasks.length} 子任务</span>
              </div>

              {task.fundCandidates.length > 0 && (
                <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-3 text-xs">
                  <p className="font-semibold text-[var(--text-700)]">基金归属候选</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {task.fundCandidates.map((fund) => (
                      <label
                        key={fund}
                        className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={task.selectedFunds.includes(fund)}
                          onChange={() => toggleFund(task.id, fund)}
                        />
                        {fund}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-700)]"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            创建任务
          </button>
        </div>
      </div>
    </div>
  )
}

export default BatchTaskModal
