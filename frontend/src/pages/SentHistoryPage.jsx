/* eslint-disable react-hooks/set-state-in-effect */
import { useDeferredValue, useEffect, useState } from "react";
import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { messageApi } from "../services/api";
import { toast } from "react-hot-toast";
import { motion as Motion, AnimatePresence } from "framer-motion";

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
        return "bg-amber-100 text-amber-700";
    }

    return "bg-primary/10 text-primary";
}

function buildPaginationItems(currentPage, totalPages) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items = [1];
    const windowStart = Math.max(2, currentPage - 1);
    const windowEnd = Math.min(totalPages - 1, currentPage + 1);

    if (windowStart > 2) {
        items.push("left-ellipsis");
    }

    for (let page = windowStart; page <= windowEnd; page += 1) {
        items.push(page);
    }

    if (windowEnd < totalPages - 1) {
        items.push("right-ellipsis");
    }

    items.push(totalPages);
    return items;
}

const pageSizeOptions = [10, 20, 50];

function MetricValueSkeleton() {
    return <div className="h-9 w-20 rounded bg-surface-variant animate-pulse" />;
}

function MetricTextSkeleton({ widthClass = "w-36" }) {
    return <div className={`h-4 rounded bg-surface-variant/70 animate-pulse ${widthClass}`} />;
}

export default function SentHistoryPage() {
    const { token } = useAuth();
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);

    const [history, setHistory] = useState([]);
    const [queuedTotal, setQueuedTotal] = useState(0);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [pageJumpInput, setPageJumpInput] = useState("1");

    const [isLoading, setIsLoading] = useState(true);
    const [isClearingQueued, setIsClearingQueued] = useState(false);
    const [isClearQueuedModalOpen, setIsClearQueuedModalOpen] = useState(false);

    const refreshQueuedTotal = useCallback(async () => {
        if (!token) return;

        try {
            const payload = await messageApi.getHistory({ limit: 1, status: "queued" }, token);
            setQueuedTotal(payload.data.pagination.total);
        } catch (error) {
            toast.error(error.message || "Unable to load queued message count.");
        }
    }, [token]);

    const fetchHistory = useCallback(async () => {
        if (!token) return;

        try {
            setIsLoading(true);

            const payload = await messageApi.getHistory({
                page: currentPage,
                limit: pageSize,
                status,
                search: deferredSearch.trim(),
            }, token);

            const nextPagination = payload.data.pagination;
            setHistory(payload.data.history);
            setPagination(nextPagination);
            setPageJumpInput(String(nextPagination.page));

            if (nextPagination.total > 0 && currentPage > nextPagination.totalPages) {
                setCurrentPage(nextPagination.totalPages);
            }
        } catch (error) {
            toast.error(error.message || "Unable to load message history.");
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, deferredSearch, pageSize, status, token]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        refreshQueuedTotal();
    }, [refreshQueuedTotal]);

    const totalRecords = pagination.total;
    const totalPages = Math.max(pagination.totalPages || 1, 1);
    const sentCount = history.filter((item) => item.status === "sent").length;
    const failedCount = history.filter((item) => item.status === "failed").length;
    const pageRecordStart = history.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const pageRecordEnd = history.length === 0 ? 0 : pageRecordStart + history.length - 1;
    const paginationItems = buildPaginationItems(pagination.page, totalPages);

    const handlePageChange = (page) => {
        const nextPage = Math.min(Math.max(page, 1), totalPages);
        setCurrentPage(nextPage);
        setPageJumpInput(String(nextPage));
    };

    const handlePageJumpSubmit = (event) => {
        event.preventDefault();

        const parsedPage = Number.parseInt(pageJumpInput, 10);
        if (Number.isNaN(parsedPage)) {
            toast.error("Enter a valid page number.");
            setPageJumpInput(String(pagination.page));
            return;
        }

        handlePageChange(parsedPage);
    };

    const handleClearQueued = () => {
        if (!queuedTotal || isClearingQueued) {
            return;
        }

        setIsClearQueuedModalOpen(true);
    };

    const confirmClearQueued = async () => {
        try {
            setIsClearingQueued(true);
            const payload = await messageApi.clearQueued(token);
            toast.success(payload.message || "Queued messages cleared.");
            await Promise.all([
                fetchHistory(),
                refreshQueuedTotal(),
            ]);
            setIsClearQueuedModalOpen(false);
        } catch (error) {
            toast.error(error.message || "Unable to clear queued messages.");
        } finally {
            setIsClearingQueued(false);
        }
    };

    return (
        <Motion.div
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
                                setCurrentPage(1);
                                setPageJumpInput("1");
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
                                setCurrentPage(1);
                                setPageJumpInput("1");
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
                    <button
                        type="button"
                        onClick={handleClearQueued}
                        disabled={!queuedTotal || isClearingQueued}
                        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[18px]">playlist_remove</span>
                        {isClearingQueued ? "Clearing..." : `Clear Queued${queuedTotal ? ` (${queuedTotal})` : ""}`}
                    </button>
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
                            {isLoading ? (
                                <div className="mt-2">
                                    <MetricValueSkeleton />
                                </div>
                            ) : (
                                <h3 className="text-[24px] font-semibold text-on-surface leading-8" style={{ letterSpacing: "-0.01em" }}>
                                    {totalRecords}
                                </h3>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center text-on-surface-variant text-sm">
                        <span className="material-symbols-outlined text-sm mr-1">stacked_bar_chart</span>
                        {isLoading ? (
                            <MetricTextSkeleton widthClass="w-32" />
                        ) : (
                            <span>{pageRecordStart > 0 ? `Showing ${pageRecordStart}-${pageRecordEnd}` : "No records on this page"}</span>
                        )}
                    </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-secondary-container">send</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Sent On This Page</p>
                            {isLoading ? (
                                <div className="mt-2">
                                    <MetricValueSkeleton />
                                </div>
                            ) : (
                                <h3 className="text-[24px] font-semibold text-on-surface leading-8" style={{ letterSpacing: "-0.01em" }}>
                                    {sentCount}
                                </h3>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center text-on-surface-variant text-sm">
                        <span className="material-symbols-outlined text-sm mr-1">page_info</span>
                        {isLoading ? (
                            <MetricTextSkeleton widthClass="w-28" />
                        ) : (
                            <span>Page {pagination.page} of {totalPages}</span>
                        )}
                    </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-error">error</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Failed On This Page</p>
                            {isLoading ? (
                                <div className="mt-2">
                                    <MetricValueSkeleton />
                                </div>
                            ) : (
                                <h3 className="text-[24px] font-semibold text-on-surface leading-8" style={{ letterSpacing: "-0.01em" }}>
                                    {failedCount}
                                </h3>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center text-error text-sm">
                        <span className="material-symbols-outlined text-sm mr-1">warning</span>
                        {isLoading ? (
                            <MetricTextSkeleton widthClass="w-36" />
                        ) : (
                            <span>Failures need follow-up</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-on-surface">
                        <thead className="bg-surface-container-low border-b border-surface-variant">
                            <tr>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Recipient</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Message Preview</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Sent By</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Date & Time</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Source</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: pageSize }, (_, index) => (
                                    <tr key={index} className="border-b border-surface-variant animate-pulse">
                                        <td className="px-6 py-5">
                                            <div className="h-4 w-24 rounded bg-surface-variant" />
                                            <div className="mt-2 h-3 w-20 rounded bg-surface-variant/50" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="h-4 w-40 rounded bg-surface-variant" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="h-8 w-32 rounded-full bg-surface-variant/60" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="h-4 w-24 rounded bg-surface-variant" />
                                            <div className="mt-2 h-3 w-16 rounded bg-surface-variant/50" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="h-8 w-24 rounded-full bg-surface-variant/60" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="h-8 w-20 rounded-full bg-surface-variant/60" />
                                        </td>
                                    </tr>
                                ))
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-on-surface-variant">
                                        No messages matched the current filters.
                                    </td>
                                </tr>
                            ) : (
                                history.map((entry) => {
                                    const { date, time } = formatDateParts(entry.sentAt || entry.createdAt);

                                    return (
                                        <tr key={entry._id} className="border-b border-surface-variant hover:bg-surface-container-low/50 transition-colors">
                                            <td className="px-6 py-5 align-top">
                                                <p className="font-medium">{entry.phoneNumber}</p>
                                                <p className="text-xs text-on-surface-variant mt-1">
                                                    {entry.recipientName || "Unnamed recipient"}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5 align-top text-on-surface-variant">
                                                <p className="line-clamp-2">{entry.message}</p>
                                            </td>
                                            <td className="px-6 py-5 align-top">
                                                {entry.owner?.role === "super_admin" ? (
                                                    <span className="inline-flex items-center gap-1 text-primary uppercase tracking-wider font-semibold text-[11px] bg-primary/10 px-2 py-1 rounded-full">
                                                        <span className="material-symbols-outlined text-[14px]">shield</span>
                                                        Super Admin
                                                    </span>
                                                ) : (
                                                    <div className="min-w-[160px]">
                                                        <p className="font-medium text-[13px] truncate" title={entry.owner?.name}>
                                                            {entry.owner?.name || "Unknown User"}
                                                        </p>
                                                        <p className="text-[11px] text-on-surface-variant truncate mt-1" title={entry.owner?.email}>
                                                            {entry.owner?.email || "No email"}
                                                        </p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 align-top whitespace-nowrap">
                                                <p>{date}</p>
                                                <p className="text-xs text-on-surface-variant mt-1">{time}</p>
                                            </td>
                                            <td className="px-6 py-5 align-top">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-xs capitalize">
                                                    <span className="material-symbols-outlined text-[14px]">
                                                        {entry.source === "bulk" ? "outbox" : "send"}
                                                    </span>
                                                    {entry.source}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 align-top">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusStyles(entry.status)}`}>
                                                    {entry.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-surface-variant bg-surface px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            {isLoading ? (
                                <div className="h-4 w-64 rounded bg-surface-variant/70 animate-pulse" />
                            ) : (
                                <div className="text-sm text-on-surface-variant">
                                    {pageRecordStart > 0
                                        ? `Showing ${pageRecordStart}-${pageRecordEnd} of ${totalRecords} records • Page ${pagination.page} of ${totalPages}`
                                        : `Showing 0 of ${totalRecords} records • Page ${pagination.page} of ${totalPages}`}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-on-surface-variant">Rows per page</span>
                                <div className="relative">
                                    <select
                                        value={pageSize}
                                        onChange={(event) => {
                                            setPageSize(Number(event.target.value));
                                            setCurrentPage(1);
                                            setPageJumpInput("1");
                                        }}
                                        className="appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-3 pr-9 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        {pageSizeOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]">
                                        expand_more
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            {isLoading ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="h-10 w-20 rounded-lg bg-surface-variant/70 animate-pulse" />
                                        <div className="h-10 w-10 rounded-lg bg-surface-variant/70 animate-pulse" />
                                        <div className="h-10 w-10 rounded-lg bg-surface-variant/70 animate-pulse" />
                                        <div className="h-10 w-10 rounded-lg bg-surface-variant/70 animate-pulse" />
                                        <div className="h-10 w-16 rounded-lg bg-surface-variant/70 animate-pulse" />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="h-4 w-24 rounded bg-surface-variant/70 animate-pulse" />
                                        <div className="h-10 w-24 rounded-lg bg-surface-variant/70 animate-pulse" />
                                        <div className="h-10 w-14 rounded-lg bg-surface-variant/70 animate-pulse" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page <= 1 || isLoading}
                                            className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        {paginationItems.map((item) => (
                                            typeof item === "number" ? (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() => handlePageChange(item)}
                                                    disabled={isLoading}
                                                    className={`min-w-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${item === pagination.page
                                                        ? "bg-primary text-on-primary"
                                                        : "border border-outline-variant text-on-surface hover:bg-surface-container-low"
                                                        } disabled:cursor-not-allowed disabled:opacity-50`}
                                                >
                                                    {item}
                                                </button>
                                            ) : (
                                                <span key={item} className="px-1 text-on-surface-variant">
                                                    ...
                                                </span>
                                            )
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page >= totalPages || isLoading}
                                            className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>

                                    <form onSubmit={handlePageJumpSubmit} className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm text-on-surface-variant">Jump to page</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={totalPages}
                                            value={pageJumpInput}
                                            onChange={(event) => setPageJumpInput(event.target.value)}
                                            className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary transition-colors hover:bg-on-secondary-container disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Go
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isClearQueuedModalOpen && (
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
                        onClick={() => {
                            if (!isClearingQueued) {
                                setIsClearQueuedModalOpen(false);
                            }
                        }}
                    >
                        <Motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ duration: 0.18 }}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full max-w-md overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
                        >
                            <div className="border-b border-outline-variant px-6 py-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-error-container/70 text-error">
                                        <span className="material-symbols-outlined text-[24px]">playlist_remove</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-on-surface leading-7">Clear queued messages?</h3>
                                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                                            {queuedTotal} queued message{queuedTotal === 1 ? "" : "s"} will be removed from the queue and marked as failed before delivery.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-5">
                                <div className="rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface-variant">
                                    Active jobs that are already being processed may be skipped and will remain in history until they finish.
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-outline-variant bg-surface px-6 py-4">
                                <button
                                    type="button"
                                    onClick={() => setIsClearQueuedModalOpen(false)}
                                    disabled={isClearingQueued}
                                    className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmClearQueued}
                                    disabled={isClearingQueued}
                                    className="inline-flex items-center gap-2 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                                    {isClearingQueued ? "Clearing..." : "Clear queue"}
                                </button>
                            </div>
                        </Motion.div>
                    </Motion.div>
                )}
            </AnimatePresence>
        </Motion.div>
    );
}
