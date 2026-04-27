import { motion as Motion } from "framer-motion";

const dotTransition = {
  duration: 0.8,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeInOut",
};

export default function SessionLoader({
  title = "Checking your CRM session...",
  subtitle = "Hold on while we restore your workspace.",
}) {
  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
      <Motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_18px_48px_rgba(15,23,42,0.10)]"
      >
        <div className="px-6 py-7">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
              <Motion.div
                className="absolute inset-0 rounded-full border-4 border-primary/10"
                animate={{ scale: [1, 1.14, 1], opacity: [0.45, 0.12, 0.45] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <Motion.div
                className="absolute inset-[6px] rounded-full border-[3px] border-transparent border-t-primary border-r-primary/50"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
              <Motion.div
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="material-symbols-outlined text-[24px]">sync</span>
              </Motion.div>
            </div>

            <p className="text-base font-semibold text-on-surface">{title}</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{subtitle}</p>

            <div className="mt-5 w-full max-w-[220px] overflow-hidden rounded-full bg-surface-container-high">
              <Motion.div
                className="h-2 rounded-full bg-primary"
                initial={{ x: "-60%", width: "40%" }}
                animate={{ x: "160%" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="mt-5 flex items-center gap-2" aria-hidden="true">
              {[0, 1, 2].map((dot) => (
                <Motion.span
                  key={dot}
                  className="h-2.5 w-2.5 rounded-full bg-primary"
                  animate={{ y: [0, -6, 0], opacity: [0.45, 1, 0.45] }}
                  transition={{ ...dotTransition, delay: dot * 0.14 }}
                />
              ))}
            </div>
          </div>
        </div>
      </Motion.div>
    </div>
  );
}
