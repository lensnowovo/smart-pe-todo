function CardShell({ children, className = '' }) {
  return (
    <div
      className={`h-[360px] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm flex flex-col overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

export default CardShell
