function AmbiguityModal({ open, candidates, selected, onChange, onConfirm, onSkip }) {
  if (!open) return null

  const toggleCandidate = (name) => {
    if (selected.includes(name)) {
      onChange(selected.filter((item) => item !== name))
    } else {
      onChange([...selected, name])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[var(--text-900)]">确认基金归属</h3>
        <p className="mt-2 text-sm text-[var(--text-500)]">
          检测到 LP/项目可能属于多支基金，请选择关联的基金（可多选）。
        </p>

        <div className="mt-4 grid gap-2">
          {candidates.map((name) => (
            <label
              key={name}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              <span className="text-[var(--text-900)]">{name}</span>
              <input
                type="checkbox"
                checked={selected.includes(name)}
                onChange={() => toggleCandidate(name)}
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onSkip}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-700)]"
          >
            跳过
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}

export default AmbiguityModal
