import { useDeferredValue, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { messageApi } from "../services/api";
import { toast } from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useCallback } from "react";

function formatDateParts(value) {
    if (!value) {
        return {
            date: "--",
            time: "--",
        };
    }

    const parsedDate = new Date(value);

    return {
        date: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(parsedDate),
        time: new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(parsedDate),
    };
}

function getStatusStyles(status) {
    if (status === "sent") {
        return "bg-secondary/10 text-secondary";
    }

    if (status === "failed") {
        return "bg-error-container text-error";
    }

    if (status === "queued") {
        return "text-[#b45309]";
    }

    return "bg-primary/10 text-primary";
}

export default function SentHistoryPage() {
    const { token } = useAuth();
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);

    const [history, setHistory] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [nextCursor, setNextCursor] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const hasNextPage = nextCursor !== null;

    const parentRef = useRef(null);

    const fetchHistory = useCallback(async (cursor = null, isRefresh = false) => {
        if (!token) return;

        try {
            if (isRefresh) setIsLoading(true);
            else setIsFetchingNextPage(true);

            const payload = await messageApi.getHistory({
                limit: 15,
                status,
                search: deferredSearch.trim(),
                cursor
            }, token);

            setHistory(prev => isRefresh ? payload.data.history : [...prev, ...payload.data.history]);
            setNextCursor(payload.data.pagination.nextCursor);
            setTotalRecords(payload.data.pagination.total);

        } catch (error) {
            toast.error(error.message || "Unable to load message history.");
            if (isRefresh) setHistory([]);
        } finally {
            setIsLoading(false);
            setIsFetchingNextPage(false);
        }
    }, [deferredSearch, status, token]);

    useEffect(() => {
        fetchHistory(null, true);
    }, [fetchHistory]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const rowVirtualizer = useVirtualizer({
        count: hasNextPage ? history.length + 1 : history.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 85,
        overscan: 5,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();

    useEffect(() => {
        const [lastItem] = [...virtualItems].reverse();
        if (!lastItem) return;

        if (
            lastItem.index >= history.length - 1 &&
            hasNextPage &&
            !isFetchingNextPage &&
            !isLoading
        ) {
            fetchHistory(nextCursor, false);
        }
    }, [
        hasNextPage,
        fetchHistory,
        history.length,
        isFetchingNextPage,
        virtualItems,
        nextCursor,
        isLoading
    ]);

    const sentCount = history.filter((item) => item.status === "sent").length;
    const failedCount = history.filter((item) => item.status === "failed").length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-[32px] font-bold text-on-surface leading-[40px]" style={{ letterSpacing: "-0.02em" }}>
                        Sent History
                    </h2>
                    <p className="text-sm text-on-surface-variant mt-1">
                        Review and track delivery status of all outbound communications.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                            search
                        </span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                            }}
                            placeholder="Search recipient, phone, or message"
                            className="pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[260px]"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={status}
                            onChange={(event) => {
                                setStatus(event.target.value);
                            }}
                            className="appearance-none pl-4 pr-10 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="">All Statuses</option>
                            <option value="queued">Queued</option>
                            <option value="pending">Pending</option>
                            <option value="sent">Sent</option>
                            <option value="failed">Failed</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                            filter_list
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">history</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Records</p>
                            <h3 className="text-[24px] font-semibold text-on-surface leading-8" style={{ letterSpacing: "-0.01em" }}>
                                {totalRecords}
                            </h3>
                        </div>
                    </div>
                    <div className="flex items-center text-on-surface-variant text-sm">
                        <span className="material-symbols-outlined text-sm mr-1">stacked_bar_chart</span>
                        <span>Across all pages</span>
                    </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-secondary-container">send</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Sent On This Page</p>
                            <h3 className="text-[24px] font-semibold text-on-surface leading-8" style={{ letterSpacing: "-0.01em" }}>
                                {sentCount}
                            </h3>
                        </div>
                    </div>
                    <div className="flex items-center text-on-surface-variant text-sm">
                        <span className="material-symbols-outlined text-sm mr-1">page_info</span>
                        <span>Fetched so far</span>
                    </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-error">error</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Failed On This Page</p>
                            <h3 className="text-[24px] font-semibold text-on-surface leading-8" style={{ letterSpacing: "-0.01em" }}>
                                {failedCount}
                            </h3>
                        </div>
                    </div>
                    <div className="flex items-center text-error text-sm">
                        <span className="material-symbols-outlined text-sm mr-1">warning</span>
                        <span>Failures need follow-up</span>
                    </div>
                </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="grid grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr] bg-surface-container-low border-b border-surface-variant z-10">
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Recipient</div>
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Message Preview</div>
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Sent By</div>
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Date & Time</div>
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Source</div>
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</div>
                </div>

                {/* Virtual Body */}
                <div ref={parentRef} className="h-[600px] overflow-auto">
                    {isLoading ? (
                        <div className="flex flex-col">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="grid grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr] border-b border-surface-variant animate-pulse px-6 py-4 items-center gap-4">
                                    <div className="flex flex-col gap-2"><div className="h-4 bg-surface-variant rounded w-3/4"></div><div className="h-3 bg-surface-variant/50 rounded w-1/2"></div></div>
                                    <div className="h-4 bg-surface-variant rounded w-full"></div>
                                    <div className="flex flex-col gap-2"><div className="h-4 bg-surface-variant rounded w-1/2"></div><div className="h-3 bg-surface-variant/50 rounded w-1/3"></div></div>
                                    <div className="flex flex-col gap-2"><div className="h-4 bg-surface-variant rounded w-1/2"></div><div className="h-3 bg-surface-variant/50 rounded w-1/3"></div></div>
                                    <div className="h-6 w-16 bg-surface-variant rounded-full"></div>
                                    <div className="h-6 w-20 bg-surface-variant rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-12 px-6 text-center text-on-surface-variant">
                            No messages matched the current filters yet.
                        </div>
                    ) : (
                        <div
                            className="relative w-full text-sm text-on-surface"
                            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                        >
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const isLoaderRow = virtualRow.index > history.length - 1;
                                const entry = history[virtualRow.index];

                                if (isLoaderRow) {
                                    return (
                                        <div
                                            key={virtualRow.index}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`
                                            }}
                                            className="grid grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr] px-6 border-b border-surface-variant items-center bg-surface-container-low/20 animate-pulse gap-4"
                                        >
                                            <div className="flex flex-col gap-2"><div className="h-4 bg-surface-variant rounded w-3/4"></div><div className="h-3 bg-surface-variant/50 rounded w-1/2"></div></div>
                                            <div className="h-4 bg-surface-variant rounded w-full"></div>
                                            <div className="flex flex-col gap-2"><div className="h-4 bg-surface-variant rounded w-1/2"></div><div className="h-3 bg-surface-variant/50 rounded w-1/3"></div></div>
                                            <div className="flex flex-col gap-2"><div className="h-4 bg-surface-variant rounded w-1/2"></div><div className="h-3 bg-surface-variant/50 rounded w-1/3"></div></div>
                                            <div className="h-6 w-16 bg-surface-variant rounded-full"></div>
                                            <div className="h-6 w-20 bg-surface-variant rounded-full"></div>
                                        </div>
                                    );
                                }

                                const { date, time } = formatDateParts(entry.sentAt || entry.createdAt);

                                return (
                                    <div
                                        key={entry._id}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`
                                        }}
                                        className="grid grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr] border-b border-surface-variant items-center hover:bg-surface-container-low/50 transition-colors"
                                    >
                                        <div className="px-6">
                                            <p className="font-medium">{entry.phoneNumber}</p>
                                            <p className="text-xs text-on-surface-variant">
                                                {entry.recipientName || "Unnamed recipient"}
                                            </p>
                                        </div>
                                        <div className="px-6 line-clamp-2 text-on-surface-variant">{entry.message}</div>
                                        <div className="px-6 flex flex-col justify-center overflow-hidden">
                                            {entry.owner?.role === "super_admin" ? (
                                                <span className="inline-flex items-center gap-1 text-primary uppercase tracking-wider font-semibold text-[11px] bg-primary/10 px-2 py-0.5 rounded-full w-fit">
                                                    <span className="material-symbols-outlined text-[14px]">shield</span>
                                                    Super Admin
                                                </span>
                                            ) : (
                                                <>
                                                    <p className="font-medium text-[13px] truncate" title={entry.owner?.name}>{entry.owner?.name || "Unknown User"}</p>
                                                    <p className="text-[11px] text-on-surface-variant truncate" title={entry.owner?.email}>{entry.owner?.email || "No email"}</p>
                                                </>
                                            )}
                                        </div>
                                        <div className="px-6 whitespace-nowrap">
                                            <p>{date}</p>
                                            <p className="text-xs text-on-surface-variant">{time}</p>
                                        </div>
                                        <div className="px-6">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-xs capitalize">
                                                <span className="material-symbols-outlined text-[14px]">
                                                    {entry.source === "bulk" ? "outbox" : "send"}
                                                </span>
                                                {entry.source}
                                            </span>
                                        </div>
                                        <div className="px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusStyles(entry.status)}`}>
                                                {entry.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>


        </motion.div>
    );
}
