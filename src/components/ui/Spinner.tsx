export function Spinner({
  className = "",
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label={label}
    />
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
      <Spinner label={label} />
      <span>{label}</span>
    </div>
  );
}
