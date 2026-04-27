const fs = require('fs');

let content = fs.readFileSync('src/pages/SentHistoryPage.jsx', 'utf-8');

// 1. Imports
content = content.replace(
    'import { motion, AnimatePresence } from "framer-motion";',
    `import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useCallback } from "react";`
);

// 2. State definition and fetch logic
const originalStateBlock = `    const { token } = useAuth();
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [history, setHistory] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);

        messageApi
            .getHistory(
                {
                    page,
                    limit: 10,
                    status,
                    search: deferredSearch.trim(),
                },
                token,
            )
            .then((payload) => {
                if (isCancelled) {
                    return;
                }

                setHistory(payload.data.history);
                setPagination(payload.data.pagination);
            })
            .catch((error) => {
                if (isCancelled) {
                    return;
                }

                toast.error(error.message || "Unable to load message history.");
                setHistory([]);
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [deferredSearch, page, status, token]);

    const sentCount = history.filter((item) => item.status === "sent").length;
    const failedCount = history.filter((item) => item.status === "failed").length;`;

const newStateBlock = `    const { token } = useAuth();
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

    const rowVirtualizer = useVirtualizer({
        count: hasNextPage ? history.length + 1 : history.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 85,
        overscan: 5,
    });

    useEffect(() => {
        const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
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
        rowVirtualizer.getVirtualItems(),
        nextCursor,
        isLoading
    ]);

    const sentCount = history.filter((item) => item.status === "sent").length;
    const failedCount = history.filter((item) => item.status === "failed").length;`;

content = content.replace(originalStateBlock, newStateBlock);

// Replace generic "setPage(1)" occurrences with "setHistory([]);" -> actually handled by useEffect tracking fetchHistory
content = content.replace(/setPage\(1\);\n\s*setStatus\(event\.target\.value\);/g, "setStatus(event.target.value);");
content = content.replace(/setPage\(1\);\n\s*setSearch\(event\.target\.value\);/g, "setSearch(event.target.value);");

content = content.replace(/{pagination\.total}/g, "{totalRecords}");
content = content.replace(/Page {pagination\.page} snapshot/g, "Fetched so far");

const tableMatch = content.match(/<div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-\[0_4px_12px_rgba\(0,0,0,0\.05\)\] overflow-hidden">[\s\S]*?<\/div>\n\s*<\/div>/);

// Replacement UI for Virtual Table
const newTableUI = `<div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] bg-surface-container-low border-b border-surface-variant z-10">
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Recipient</div>
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Message Preview</div>
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Date & Time</div>
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Source</div>
                    <div className="py-4 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</div>
                </div>

                {/* Virtual Body */}
                <div ref={parentRef} className="h-[600px] overflow-auto">
                    {isLoading ? (
                        <div className="flex flex-col">
                           {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] border-b border-surface-variant animate-pulse px-6 py-4 items-center gap-4">
                                    <div className="flex flex-col gap-2"><div className="h-4 bg-surface-variant rounded w-3/4"></div><div className="h-3 bg-surface-variant/50 rounded w-1/2"></div></div>
                                    <div className="h-4 bg-surface-variant rounded w-full"></div>
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
                            style={{ height: \`\${rowVirtualizer.getTotalSize()}px\` }}
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
                                                height: \`\${virtualRow.size}px\`,
                                                transform: \`translateY(\${virtualRow.start}px)\`
                                            }}
                                            className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] px-6 border-b border-surface-variant items-center bg-surface-container-low/20 animate-pulse gap-4"
                                        >
                                            <div className="flex flex-col gap-2"><div className="h-4 bg-surface-variant rounded w-3/4"></div><div className="h-3 bg-surface-variant/50 rounded w-1/2"></div></div>
                                            <div className="h-4 bg-surface-variant rounded w-full"></div>
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
                                            height: \`\${virtualRow.size}px\`,
                                            transform: \`translateY(\${virtualRow.start}px)\`
                                        }}
                                        className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] border-b border-surface-variant items-center hover:bg-surface-container-low/50 transition-colors"
                                    >
                                        <div className="px-6">
                                            <p className="font-medium">{entry.phoneNumber}</p>
                                            <p className="text-xs text-on-surface-variant">
                                                {entry.recipientName || "Unnamed recipient"}
                                            </p>
                                        </div>
                                        <div className="px-6 line-clamp-2 text-on-surface-variant">{entry.message}</div>
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
                                            <span className={\`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize \${getStatusStyles(entry.status)}\`}>
                                                {entry.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>`;

content = content.replace(tableMatch[0], newTableUI);

// Remove the pagination block
const paginationBlock = `<div className="px-6 py-4 border-t border-surface-variant bg-surface-container-lowest flex items-center justify-between gap-4">
                <p className="text-xs text-on-surface-variant">
                    Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total records)
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                        className="px-3 py-2 rounded border border-outline-variant hover:bg-surface-container-low text-on-surface-variant disabled:opacity-50"
                        disabled={pagination.page <= 1 || isLoading}
                    >
                        Prev
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            setPage((currentPage) =>
                                Math.min(pagination.totalPages || 1, currentPage + 1),
                            )
                        }
                        className="px-3 py-2 rounded border border-outline-variant hover:bg-surface-container-low text-on-surface-variant disabled:opacity-50"
                        disabled={pagination.page >= pagination.totalPages || isLoading}
                    >
                        Next
                    </button>
                </div>
            </div>`;
content = content.replace(paginationBlock, '');

// Save new file
fs.writeFileSync('src/pages/SentHistoryPage.jsx', content);
