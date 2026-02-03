import { Flame } from 'lucide-react'

/**
 * StreakDisplay - Display current streak with fire emoji
 */
function StreakDisplay({ currentStreak = 0, longestStreak = 0, milestones = [] }) {
  if (currentStreak === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xl">
            🔥
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text-900)]">开始你的连胜</p>
            <p className="text-xs text-[var(--text-500)]">保持每日80%以上完成率</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-2xl streak-fire shadow-lg">
          🔥
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-[var(--text-900)]">
              {currentStreak} 天连胜!
            </p>
            {currentStreak >= 7 && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                热度上升
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-500)]">
            最佳纪录: {longestStreak} 天
          </p>
        </div>
      </div>

      {/* Milestone progress */}
      {currentStreak < 7 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-500)] mb-1">
            <span>距离 7 天连胜</span>
            <span>{currentStreak}/7</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
              style={{ width: `${(currentStreak / 7) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Next milestone */}
      {currentStreak >= 7 && currentStreak < 30 && (
        <div className="mt-3 rounded-lg bg-gradient-to-r from-teal-50 to-teal-100 px-3 py-2 text-xs text-teal-800">
          <span className="font-semibold">🏆 下一个目标:</span> 30 天季度冠军
        </div>
      )}
    </div>
  )
}

export default StreakDisplay
