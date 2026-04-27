import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { messageApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

function formatDateTime(value) {
    if (!value) {
        return "--";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function getDeliveryRate(total, sent) {
    if (!total) {
        return "0%";
    }

    return `${((sent / total) * 100).toFixed(1)}%`;
}

export default function DashboardPage() {
    const { token } = useAuth();
    const [overview, setOverview] = useState({
        total: 0,
        sent: 0,
        failed: 0,
        queued: 0,
        recent: [],
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;

        async function loadDashboard() {
            setIsLoading(true);

            try {
                const [totalResponse, sentResponse, failedResponse, queuedResponse, recentResponse] =
                    await Promise.all([
                        messageApi.getHistory({ page: 1, limit: 1 }, token),
                        messageApi.getHistory({ page: 1, limit: 1, status: "sent" }, token),
                        messageApi.getHistory({ page: 1, limit: 1, status: "failed" }, token),
                        messageApi.getHistory({ page: 1, limit: 1, status: "queued" }, token),
                        messageApi.getHistory({ page: 1, limit: 5 }, token),
                    ]);

                if (isCancelled) {
                    return;
                }

                setOverview({
                    total: totalResponse.data.pagination.total,
                    sent: sentResponse.data.pagination.total,
                    failed: failedResponse.data.pagination.total,
                    queued: queuedResponse.data.pagination.total,
                    recent: recentResponse.data.history,
                });
            } catch (error) {
                if (!isCancelled) {
                    toast.error(error.message || "Unable to load dashboard metrics.");
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        loadDashboard();

        return () => {
            isCancelled = true;
        };
    }, [token]);

    const cards = [
        {
            label: "Total Messages",
            value: overview.total,
            icon: "send",
            iconStyle: "bg-primary/10 text-primary",
        },
        {
            label: "Delivered",
            value: overview.sent,
            icon: "done_all",
            iconStyle: "bg-secondary/10 text-secondary",
        },
        {
            label: "Failed",
            value: overview.failed,
            icon: "error",
            iconStyle: "bg-error/10 text-error",
        },
        {
            label: "Delivery Rate",
            value: getDeliveryRate(overview.total, overview.sent),
            icon: "analytics",
            iconStyle: "bg-tertiary/10 text-tertiary",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h2 className="text-[32px] font-bold text-on-surface leading-[40px]" style={{ letterSpacing: "-0.02em" }}>
                        Dashboard Overview
                    </h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                        Live CRM metrics based on the current message history in the backend.
                    </p>
                </div>
                <Link
                    to="/send-message"
                    className="bg-secondary text-on-secondary px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 hover:bg-secondary/90 transition-colors shadow-sm self-start"
                >
                    <span className="material-symbols-outlined text-sm">send</span>
                    Send New Message
                </Link>
            </div>

            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {isLoading
                    ? [0, 1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            variants={itemVariants}
                            className="bg-surface-container-lowest rounded-lg border border-outline-variant p-6 shadow-sm animate-pulse"
                        >
                            <div className="flex items-center justify-between gap-4 mb-5">
                                <div className="w-12 h-12 rounded-lg bg-surface-variant" />
                            </div>
                            <div className="h-4 w-24 bg-surface-variant rounded mb-3" />
                            <div className="h-8 w-20 bg-surface-variant rounded" />
                        </motion.div>
                    ))
                    : cards.map((card) => (
                        <motion.div
                            key={card.label}
                            variants={itemVariants}
                            className="bg-surface-container-lowest rounded-lg border border-outline-variant p-6 shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-4 mb-5">
                                <div className={`p-3 rounded-lg ${card.iconStyle}`}>
                                    <span className="material-symbols-outlined">{card.icon}</span>
                                </div>
                            </div>
                            <h3 className="text-sm text-on-surface-variant mb-2">{card.label}</h3>
                            <p className="text-[32px] font-bold text-on-surface leading-[40px]" style={{ letterSpacing: "-0.02em" }}>
                                {card.value}
                            </p>
                        </motion.div>
                    ))}
            </motion.div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <section className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-outline-variant bg-surface-bright">
                        <h3 className="text-[20px] font-semibold text-on-surface leading-7">Recent Message Activity</h3>
                    </div>
                    <div className="divide-y divide-outline-variant">
                        {isLoading ? (
                            <div className="divide-y divide-outline-variant">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-pulse">
                                        <div className="flex-1">
                                            <div className="h-4 w-48 bg-surface-variant rounded mb-2" />
                                            <div className="h-3 w-64 bg-surface-variant/60 rounded" />
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="h-5 w-16 bg-surface-variant rounded-full" />
                                            <div className="h-3 w-28 bg-surface-variant/60 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : overview.recent.length === 0 ? (
                            <div className="p-6 text-sm text-on-surface-variant">
                                No message activity has been recorded yet.
                            </div>
                        ) : (
                            overview.recent.map((entry) => (
                                <div key={entry._id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-on-surface">
                                            {entry.recipientName || "Unnamed recipient"} ({entry.phoneNumber})
                                        </p>
                                        <p className="text-sm text-on-surface-variant line-clamp-2 mt-1">
                                            {entry.message}
                                        </p>
                                    </div>
                                    <div className="sm:text-right">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${entry.status === "sent"
                                                ? "bg-secondary/10 text-secondary"
                                                : entry.status === "failed"
                                                    ? "bg-error-container text-error"
                                                    : entry.status === "queued"
                                                        ? "text-[#b45309]"
                                                        : "bg-primary/10 text-primary"
                                                }`}
                                        >
                                            {entry.status}
                                        </span>
                                        <p className="text-xs text-on-surface-variant mt-2">
                                            {formatDateTime(entry.sentAt || entry.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <aside className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-outline-variant bg-surface-bright">
                        <h3 className="text-[20px] font-semibold text-on-surface leading-7">Queue Snapshot</h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="rounded-xl border border-outline-variant bg-surface p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                                Queued Messages
                            </p>
                            {isLoading ? (
                                <div className="h-7 w-12 bg-surface-variant rounded mt-2 animate-pulse" />
                            ) : (
                                <p className="text-[24px] font-semibold text-on-surface mt-2">
                                    {overview.queued}
                                </p>
                            )}
                        </div>
                        <div className="rounded-xl border border-outline-variant bg-surface p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                                Failed Messages
                            </p>
                            {isLoading ? (
                                <div className="h-7 w-12 bg-surface-variant rounded mt-2 animate-pulse" />
                            ) : (
                                <p className="text-[24px] font-semibold text-on-surface mt-2">
                                    {overview.failed}
                                </p>
                            )}
                        </div>
                        <Link
                            to="/sent-history"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                        >
                            View full history
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </Link>
                    </div>
                </aside>
            </div>
        </motion.div>
    );
}
