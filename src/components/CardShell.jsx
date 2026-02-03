function CardShell({ children, className = '', ...props }) {
  return (
    <div
      className={`h-[360px] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm flex flex-col overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default CardShell
