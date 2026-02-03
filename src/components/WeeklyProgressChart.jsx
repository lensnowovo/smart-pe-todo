/**
 * WeeklyProgressChart - Simple CSS bar chart showing last 7 days completion
 */
function WeeklyProgressChart({ dailyStats = {}, daysToShow = 7 }) {
  const today = new Date()
  const data = []

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]

    const dayStats = dailyStats[dateKey]
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六']
    const label = i === 0 ? '今天' : dayLabels[date.getDay()]

    data.push({
      date: dateKey,
      label,
      rate: dayStats?.completionRate || 0,
      hasData: !!dayStats,
    })
  }

  const maxRate = Math.max(...data.map((d) => d.rate), 100)

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <p className="text-xs font-semibold text-[var(--text-900)] mb-3">本周完成率趋势</p>
      <div className="flex items-end gap-2 h-28">
        {data.map((day, index) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full flex-1 flex items-end justify-center h-full bg-[var(--surface-2)] rounded-t">
              {day.hasData ? (
                <div
                  className="w-full bg-[var(--accent)] rounded-t transition-all duration-300 group-hover:bg-[var(--accent)]/80"
                  style={{ height: `${(day.rate / maxRate) * 100}%` }}
                />
              ) : (
                <div className="h-full w-full rounded-t bg-[var(--surface-2)] opacity-30" />
              )}
            </div>
            <span
              className={`text-xs transition-colors ${
                day.hasData ? 'text-[var(--text-500)]' : 'text-[var(--text-500)]/30'
              }`}
            >
              {day.label}
            </span>
            {day.hasData && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[var(--text-900)] text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                {day.rate}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default WeeklyProgressChart
