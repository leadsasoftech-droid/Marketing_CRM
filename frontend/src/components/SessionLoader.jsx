export default function SessionLoader({
  title = "Checking your CRM session...",
  subtitle = "Hold on while we restore your workspace.",
}) {
  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container-lowest px-6 py-7 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[22px]">sync</span>
            </div>
          </div>

          <p className="text-base font-semibold text-on-surface">{title}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{subtitle}</p>

          <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${dot * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
