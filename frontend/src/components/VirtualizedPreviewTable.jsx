import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const ROW_HEIGHT = 44;

/**
 * Renders a virtualized table from raw spreadsheet rows.
 * Accepts `rows` (array of objects) and `columns` (array of header strings).
 * Uses @tanstack/react-virtual so even 50k+ rows render smoothly.
 */
export default function VirtualizedPreviewTable({ rows, columns }) {
    const parentRef = useRef(null);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 20,
    });

    const totalSize = virtualizer.getTotalSize();
    const virtualItems = virtualizer.getVirtualItems();

    // Detect which columns look like phone / name / country code for subtle highlighting
    const phoneColSet = useMemo(() => {
        const phoneKeys = new Set(["phone", "phonenumber", "number", "mobile", "mobilenumber", "whatsapp", "whatsappnumber", "contact", "contactnumber"]);
        return new Set(columns.filter((c) => phoneKeys.has(c.toLowerCase().replace(/[\s_-]+/g, ""))));
    }, [columns]);

    if (!rows.length) return null;

    return (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
            {/* Header bar */}
            <div className="px-6 py-4 border-b border-outline-variant bg-surface flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[20px]">table_chart</span>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-on-surface leading-tight">File Preview</h3>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">
                            Showing all {rows.length.toLocaleString()} rows &middot; {columns.length} columns detected
                        </p>
                    </div>
                </div>
                <span className="bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full">
                    {rows.length.toLocaleString()} rows
                </span>
            </div>

            {/* Virtualized table */}
            <div className="overflow-x-auto">
                {/* Sticky header */}
                <div className="min-w-max">
                    <div className="flex bg-surface border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-widest sticky top-0 z-10">
                        <div className="w-[64px] shrink-0 py-3 px-4 text-center">#</div>
                        {columns.map((col) => (
                            <div
                                key={col}
                                className="flex-1 min-w-[140px] py-3 px-4 flex items-center gap-1.5"
                            >
                                {phoneColSet.has(col) && (
                                    <span className="material-symbols-outlined text-primary text-[14px]">call</span>
                                )}
                                {col}
                            </div>
                        ))}
                    </div>

                    {/* Scrollable body */}
                    <div
                        ref={parentRef}
                        className="overflow-y-auto"
                        style={{ maxHeight: "420px" }}
                    >
                        <div style={{ height: totalSize, position: "relative", width: "100%" }}>
                            {virtualItems.map((virtualRow) => {
                                const row = rows[virtualRow.index];
                                const isEven = virtualRow.index % 2 === 0;

                                return (
                                    <div
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        className={`flex text-sm text-on-surface border-b border-outline-variant/50 ${isEven ? "bg-surface-container-lowest" : "bg-surface"
                                            } hover:bg-primary-fixed/20 transition-colors`}
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: ROW_HEIGHT,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <div className="w-[64px] shrink-0 py-3 px-4 text-center text-xs text-on-surface-variant font-mono tabular-nums">
                                            {virtualRow.index + 1}
                                        </div>
                                        {columns.map((col) => (
                                            <div
                                                key={col}
                                                className={`flex-1 min-w-[140px] py-3 px-4 truncate ${phoneColSet.has(col)
                                                    ? "font-mono text-xs text-primary/80"
                                                    : ""
                                                    }`}
                                                title={String(row[col] ?? "")}
                                            >
                                                {row[col] ?? ""}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
