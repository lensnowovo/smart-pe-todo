function CardShell({ children, className = '', onDoubleClick }) {
  return (
    <div
      className={`h-[360px] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm flex flex-col overflow-hidden ${className}`}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  )
}

export default CardShell
