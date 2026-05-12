import { useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

const STATUS_COLORS = {
    sent: { bg: "rgba(0, 109, 47, 0.12)", text: "#006d2f", icon: "check_circle" },
    failed: { bg: "rgba(186, 26, 26, 0.12)", text: "#ba1a1a", icon: "error" },
    processing: { bg: "rgba(0, 76, 205, 0.12)", text: "#004ccd", icon: "pending" },
    queued: { bg: "rgba(115, 118, 135, 0.12)", text: "#737687", icon: "schedule" },
};

function CircularProgress({ percentage, size = 140, strokeWidth = 10 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--color-surface-container-high)"
                    strokeWidth={strokeWidth}
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    initial={{ strokeDashoffset: circumference }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    key={percentage}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-bold text-on-surface tabular-nums"
                >
                    {Math.round(percentage)}%
                </motion.span>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest mt-0.5">
                    Progress
                </span>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface p-3 min-w-[120px]">
            <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: color + "18" }}
            >
                <span className="material-symbols-outlined text-[20px]" style={{ color }}>
                    {icon}
                </span>
            </div>
            <div>
                <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest">{label}</p>
                <p className="text-lg font-bold text-on-surface tabular-nums leading-tight">{value}</p>
            </div>
        </div>
    );
}

function ActivityLogEntry({ entry, isLatest }) {
    const style = STATUS_COLORS[entry.status] || STATUS_COLORS.queued;

    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm ${isLatest ? "bg-primary-fixed/30" : ""}`}
        >
            <span
                className="material-symbols-outlined text-[18px] shrink-0"
                style={{ color: style.text, fontVariationSettings: "'FILL' 1" }}
            >
                {style.icon}
            </span>
            <span className="text-on-surface font-medium truncate flex-1" title={entry.name || entry.phoneNumber}>
                {entry.name || "Unnamed"}
            </span>
            <span className="text-on-surface-variant text-xs font-mono truncate max-w-[140px]" title={entry.phoneNumber}>
                {entry.phoneNumber}
            </span>
            <span
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: style.bg, color: style.text }}
            >
                {entry.status}
            </span>
        </motion.div>
    );
}

export default function BulkSendProgressModal({
    isOpen,
    onCancel,
    onClose,
    totalCount,
    sentCount,
    failedCount,
    currentIndex,
    currentRecipient,
    activityLog,
    isComplete,
    isCancelled,
}) {
    const logContainerRef = useRef(null);
    const isDone = isComplete || isCancelled;

    // Auto-scroll the activity log to the bottom
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [activityLog?.length]);

    if (!isOpen) {
        return null;
    }

    const processedCount = sentCount + failedCount;
    const percentage = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;
    const remainingCount = totalCount - processedCount;

    const statusLabel = isCancelled
        ? `Cancelled — ${processedCount} of ${totalCount} processed`
        : isComplete
            ? failedCount > 0
                ? `Completed — ${sentCount} sent, ${failedCount} failed`
                : `All ${sentCount} messages sent!`
            : `Sending message ${currentIndex + 1} of ${totalCount}...`;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        transition={{ type: "spring", damping: 26, stiffness: 300 }}
                        className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-outline-variant"
                    >
                        {/* Header */}
                        <div className="bg-surface px-6 py-4 border-b border-outline-variant flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center">
                                <span
                                    className="material-symbols-outlined text-primary text-xl"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    send
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-on-surface leading-tight">
                                    WhatsApp Bulk Campaign
                                </h3>
                                <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                                    {statusLabel}
                                </p>
                            </div>
                            {!isDone && (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent shrink-0"
                                />
                            )}
                            {isDone && (
                                <span
                                    className="material-symbols-outlined text-2xl shrink-0"
                                    style={{
                                        color: isCancelled ? "#ba1a1a" : failedCount > 0 ? "#e68a00" : "#006d2f",
                                        fontVariationSettings: "'FILL' 1",
                                    }}
                                >
                                    {isCancelled ? "cancel" : failedCount > 0 ? "warning" : "task_alt"}
                                </span>
                            )}
                        </div>

                        {/* Progress Ring + Stats */}
                        <div className="px-6 pt-6 pb-4">
                            <div className="flex items-center gap-6">
                                <CircularProgress percentage={percentage} />
                                <div className="flex-1 grid grid-cols-2 gap-2.5">
                                    <StatCard icon="check_circle" label="Sent" value={sentCount} color="#006d2f" />
                                    <StatCard icon="error" label="Failed" value={failedCount} color="#ba1a1a" />
                                    <StatCard icon="schedule" label="Remaining" value={remainingCount} color="#737687" />
                                    <StatCard icon="group" label="Total" value={totalCount} color="#004ccd" />
                                </div>
                            </div>

                            {/* Currently sending indicator */}
                            {currentRecipient && !isDone && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary-fixed/10 p-3"
                                >
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-primary text-[18px]">
                                            send
                                        </span>
                                    </motion.div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-on-surface truncate">
                                            Sending to {currentRecipient.name || "Unnamed"}
                                        </p>
                                        <p className="text-[11px] text-on-surface-variant font-mono truncate">
                                            {currentRecipient.normalizedPhoneNumber || currentRecipient.phoneNumber}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Activity Log */}
                        {activityLog && activityLog.length > 0 && (
                            <div className="px-6 pb-3">
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                                    Activity Log
                                </p>
                                <div
                                    ref={logContainerRef}
                                    className="max-h-[180px] overflow-y-auto rounded-xl border border-outline-variant bg-surface p-2 space-y-0.5"
                                    style={{ scrollBehavior: "smooth" }}
                                >
                                    {activityLog.map((entry, i) => (
                                        <ActivityLogEntry
                                            key={`${entry.phoneNumber}-${i}`}
                                            entry={entry}
                                            isLatest={i === activityLog.length - 1}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="px-6 pb-5 pt-2">
                            {/* Slim progress bar */}
                            <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden mb-4">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                        background: isDone
                                            ? isCancelled
                                                ? "#ba1a1a"
                                                : failedCount > 0
                                                    ? "linear-gradient(90deg, #006d2f, #e68a00)"
                                                    : "#006d2f"
                                            : "linear-gradient(90deg, #004ccd, #0052dd)",
                                    }}
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs text-on-surface-variant">
                                    {processedCount} / {totalCount} processed
                                </p>

                                <div className="flex items-center gap-2">
                                    {/* Cancel button — visible only while sending */}
                                    {!isDone && (
                                        <button
                                            type="button"
                                            onClick={onCancel}
                                            className="flex items-center gap-1.5 bg-error/10 hover:bg-error/20 text-error px-4 py-2 rounded-lg text-xs font-bold transition-all hover:shadow-sm active:scale-[0.97]"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                            Cancel
                                        </button>
                                    )}

                                    {/* Close button — always visible once done */}
                                    {isDone && (
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-5 py-2 rounded-lg text-xs font-bold transition-all hover:shadow-sm active:scale-[0.97]"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                            Close
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
