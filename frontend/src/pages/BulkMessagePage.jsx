import { useCallback, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { messageApi } from "../services/api";
import { toast } from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import BulkSendProgressModal from "../components/BulkSendProgressModal";
import VirtualizedPreviewTable from "../components/VirtualizedPreviewTable";

function normalizeDisplayStatus(status) {
    return status === "pending" ? "processing" : status;
}

export default function BulkMessagePage() {
    const { token } = useAuth();
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const cancelRef = useRef(false);

    // Progress modal state
    const [showModal, setShowModal] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [sentCount, setSentCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentRecipient, setCurrentRecipient] = useState(null);
    const [activityLog, setActivityLog] = useState([]);
    const [isComplete, setIsComplete] = useState(false);
    const [isCancelled, setIsCancelled] = useState(false);

    // Result state for the summary table after completion
    const [result, setResult] = useState(null);

    // File preview state — parsed client-side for instant display
    const [previewRows, setPreviewRows] = useState([]);
    const [previewColumns, setPreviewColumns] = useState([]);
    const [isParsing, setIsParsing] = useState(false);

    const sampleData = [
        { Name: "Rahul Sharma", Phone: "9876543210", "Country Code": "91" },
        { Name: "Priya Patel", Phone: "8765432109", "Country Code": "91" },
        { Name: "Amit Kumar", Phone: "7654321098", "Country Code": "91" },
        { Name: "Sneha Gupta", Phone: "6543210987", "Country Code": "91" },
        { Name: "Vikram Singh", Phone: "9988776655", "Country Code": "91" },
    ];

    const downloadSampleCSV = () => {
        const csvContent = [
            "Name,Phone,Country Code",
            ...sampleData.map((r) => `${r.Name},${r.Phone},${r["Country Code"]}`),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "bulk_whatsapp_sample.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Sample CSV downloaded!");
    };

    const downloadSampleExcel = () => {
        const ws = XLSX.utils.json_to_sheet(sampleData);
        ws["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contacts");
        XLSX.writeFile(wb, "bulk_whatsapp_sample.xlsx");
        toast.success("Sample Excel downloaded!");
    };

    const parseFileLocally = useCallback(async (file) => {
        if (!file) {
            setPreviewRows([]);
            setPreviewColumns([]);
            return;
        }

        setIsParsing(true);
        try {
            const buffer = await file.arrayBuffer();
            const ext = file.name.split(".").pop().toLowerCase();
            let rows = [];

            if (ext === "csv") {
                const text = new TextDecoder().decode(buffer);
                const lines = text.split(/\r?\n/).filter((l) => l.trim());
                if (lines.length > 0) {
                    const headers = lines[0].split(",").map((h) => h.trim());
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(",");
                        const row = {};
                        headers.forEach((h, idx) => {
                            row[h] = (values[idx] || "").trim();
                        });
                        rows.push(row);
                    }
                }
            } else {
                const workbook = XLSX.read(buffer, { type: "array" });
                const firstSheet = workbook.SheetNames[0];
                if (firstSheet) {
                    rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
                }
            }

            if (rows.length > 0) {
                const cols = Object.keys(rows[0]);
                setPreviewColumns(cols);
                setPreviewRows(rows);
            } else {
                setPreviewColumns([]);
                setPreviewRows([]);
            }
        } catch {
            setPreviewColumns([]);
            setPreviewRows([]);
        } finally {
            setIsParsing(false);
        }
    }, []);

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        setResult(null);
        parseFileLocally(file);
    };

    const resetModalState = useCallback(() => {
        setSentCount(0);
        setFailedCount(0);
        setCurrentIndex(0);
        setCurrentRecipient(null);
        setActivityLog([]);
        setIsComplete(false);
        setIsCancelled(false);
        cancelRef.current = false;
    }, []);

    const handleCancel = useCallback(() => {
        cancelRef.current = true;
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
    }, []);

    const handleSubmit = async () => {
        if (!selectedFile) {
            toast.error("Please choose a CSV, XLS, or XLSX file first.");
            return;
        }

        // Prevent duplicate sends
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        setResult(null);
        resetModalState();

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            // Step 1: Parse the file to get recipients
            const parseResponse = await messageApi.parseBulk(formData, token);
            const { batchId, recipients, invalidRows, duplicateRows, totalRows } = parseResponse.data;

            if (!recipients || recipients.length === 0) {
                toast.error("No valid phone numbers found in the uploaded file.");
                return;
            }

            // Step 2: Open the progress modal and send messages one by one
            setTotalCount(recipients.length);
            setShowModal(true);

            const allResults = [];
            let finalSentCount = 0;
            let finalFailedCount = 0;

            for (let i = 0; i < recipients.length; i++) {
                // Check for cancellation
                if (cancelRef.current) {
                    break;
                }

                const recipient = recipients[i];
                setCurrentIndex(i);
                setCurrentRecipient(recipient);

                try {
                    const sendResponse = await messageApi.sendBulkSingle(
                        {
                            phoneNumber: recipient.normalizedPhoneNumber,
                            name: recipient.name,
                            batchId,
                        },
                        token,
                    );

                    const status = sendResponse.data?.status || (sendResponse.success ? "sent" : "failed");

                    if (status === "sent" || status === "pending" || status === "queued") {
                        finalSentCount += 1;
                        setSentCount((prev) => prev + 1);
                    } else {
                        finalFailedCount += 1;
                        setFailedCount((prev) => prev + 1);
                    }

                    const logEntry = {
                        name: recipient.name,
                        phoneNumber: recipient.normalizedPhoneNumber,
                        status: status === "pending" ? "processing" : status,
                        rowNumber: recipient.rowNumber,
                        historyId: sendResponse.data?.historyId,
                        messageId: sendResponse.data?.messageId,
                    };

                    setActivityLog((prev) => [...prev, logEntry]);
                    allResults.push({
                        ...logEntry,
                        recipientName: recipient.name,
                    });
                } catch (error) {
                    finalFailedCount += 1;
                    setFailedCount((prev) => prev + 1);

                    const logEntry = {
                        name: recipient.name,
                        phoneNumber: recipient.normalizedPhoneNumber,
                        status: "failed",
                        rowNumber: recipient.rowNumber,
                        error: error.message,
                    };

                    setActivityLog((prev) => [...prev, logEntry]);
                    allResults.push({
                        ...logEntry,
                        recipientName: recipient.name,
                    });
                }

                // Small delay between messages to respect rate limits
                // (Fast2SMS limit: 25 per second, so ~50ms per message is safe)
                if (i < recipients.length - 1 && !cancelRef.current) {
                    await new Promise((resolve) => setTimeout(resolve, 50));
                }
            }

            // --- All sends finished (or cancelled) ---
            setCurrentRecipient(null);

            if (cancelRef.current) {
                setIsCancelled(true);
                if (finalSentCount > 0 || finalFailedCount > 0) {
                    toast(`Campaign stopped — ${finalSentCount} sent, ${finalFailedCount} failed.`, { icon: "⚠️" });
                } else {
                    toast("Campaign cancelled before any messages were sent.", { icon: "⚠️" });
                }
            } else {
                setIsComplete(true);
                if (finalFailedCount === 0) {
                    toast.success(`All ${finalSentCount} messages sent successfully!`);
                } else {
                    toast(`${finalSentCount} sent, ${finalFailedCount} failed.`, { icon: "⚠️" });
                }
            }

            // Set the result for the summary table
            setResult({
                batchId,
                totalRows,
                validRecipients: recipients.length,
                invalidRows: invalidRows || [],
                duplicateRows: duplicateRows || [],
                sentCount: finalSentCount,
                failedCount: finalFailedCount,
                resultsPreview: allResults,
            });
        } catch (error) {
            toast.error(error.message || "Could not parse the uploaded file.");
            setShowModal(false);
        } finally {
            setIsSubmitting(false);
            submittingRef.current = false;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <BulkSendProgressModal
                isOpen={showModal}
                onCancel={handleCancel}
                onClose={handleCloseModal}
                totalCount={totalCount}
                sentCount={sentCount}
                failedCount={failedCount}
                currentIndex={currentIndex}
                currentRecipient={currentRecipient}
                activityLog={activityLog}
                isComplete={isComplete}
                isCancelled={isCancelled}
            />

            <div className="mb-8">
                <h2 className="text-[32px] font-bold text-on-surface leading-[40px]" style={{ letterSpacing: "-0.02em" }}>
                    Bulk Message Campaign
                </h2>
                <p className="text-sm text-on-surface-variant mt-2">
                    Upload your recipient list and send a WhatsApp campaign. Messages are sent one by one to ensure reliable delivery.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 xl:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col">
                    <h3 className="text-[20px] font-semibold text-on-surface mb-6 leading-7">Audience Data</h3>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xls,.xlsx"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-outline-variant rounded-lg bg-surface flex flex-col items-center justify-center py-16 px-6 text-center hover:bg-primary-fixed/30 hover:border-primary transition-colors cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
                        </div>
                        <p className="text-[20px] font-semibold text-on-surface mb-2 leading-7">
                            {selectedFile ? selectedFile.name : "Select your upload file"}
                        </p>
                        <p className="text-sm text-on-surface-variant mb-6">
                            Supports .csv, .xls, .xlsx
                        </p>
                        <span className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-2">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                                folder_open
                            </span>
                            Browse Files
                        </span>
                    </button>
                </div>

                <div className="lg:col-span-12 xl:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col">
                    <h3 className="text-[20px] font-semibold text-on-surface mb-6 leading-7">Campaign Settings</h3>
                    <div className="space-y-6 flex-1">
                        <div className="rounded-lg border border-outline-variant bg-surface p-4">
                            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-[0.18em]">
                                Selected File
                            </p>
                            <p className="text-sm text-on-surface mt-2">
                                {selectedFile ? `${selectedFile.name} (${Math.ceil(selectedFile.size / 1024)} KB)` : "No file selected"}
                            </p>
                        </div>
                        <div className="rounded-lg border border-outline-variant bg-surface p-4 text-sm text-on-surface-variant">
                            Expected columns can include <span className="font-semibold text-on-surface">name</span> and a phone-like field such as <span className="font-semibold text-on-surface">phone</span>, <span className="font-semibold text-on-surface">mobile</span>, or <span className="font-semibold text-on-surface">whatsappNumber</span>.
                        </div>

                        <div className="rounded-xl border border-dashed border-primary/40 bg-primary-fixed/10 p-5">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-on-surface">Need a template?</p>
                                    <p className="text-xs text-on-surface-variant mt-0.5">Download a pre-formatted sample file with example data, fill in your contacts, and upload it.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={downloadSampleCSV}
                                    className="flex items-center justify-center gap-1.5 bg-surface-container-lowest hover:bg-surface border border-outline-variant text-on-surface text-xs font-semibold py-2.5 rounded-lg transition-all hover:shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    CSV
                                </button>
                                <button
                                    type="button"
                                    onClick={downloadSampleExcel}
                                    className="flex items-center justify-center gap-1.5 bg-surface-container-lowest hover:bg-surface border border-outline-variant text-on-surface text-xs font-semibold py-2.5 rounded-lg transition-all hover:shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Excel (.xlsx)
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant flex gap-3">
                        <span className="material-symbols-outlined text-primary shrink-0">video_library</span>
                        <div>
                            <p className="font-semibold text-on-surface mb-1">Target Template: <span className="font-mono text-xs bg-surface-variant/30 px-1.5 py-0.5 rounded text-primary">school_catalogue</span></p>
                            <p className="text-xs opacity-90 leading-relaxed">
                                A promotional video header will be included with the catalogue template. This template provides school marketing details and bypasses the standard 24-hour window limitation.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-outline-variant">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                                send
                            </span>
                            {isSubmitting ? "Sending..." : "Send Message"}
                        </button>
                    </div>
                </div>

                {/* ---- File Preview (client-side parsed, virtualized) ---- */}
                {isParsing && (
                    <div className="lg:col-span-12 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8 flex items-center justify-center gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <p className="text-sm text-on-surface-variant">Parsing file…</p>
                    </div>
                )}

                {!isParsing && previewRows.length > 0 && (
                    <div className="lg:col-span-12">
                        <VirtualizedPreviewTable rows={previewRows} columns={previewColumns} />
                    </div>
                )}

                {/* ---- Upload / Send Result ---- */}
                <div className="lg:col-span-12 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface">
                        <h3 className="text-[20px] font-semibold text-on-surface leading-7">Upload Result</h3>
                        <span className="bg-surface-container-high text-on-surface-variant text-xs px-3 py-1 rounded-full">
                            {result ? `${result.validRecipients} valid recipients` : "No upload yet"}
                        </span>
                    </div>

                    {result ? (
                        <>
                            <div className="grid gap-4 p-6 md:grid-cols-4 border-b border-outline-variant bg-surface-bright">
                                <div>
                                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-[0.16em]">Batch ID</p>
                                    <p className="text-sm text-on-surface break-all mt-2">{result.batchId}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-[0.16em]">Sent</p>
                                    <p className="text-2xl font-semibold text-on-surface mt-2">{result.sentCount || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-[0.16em]">Failed</p>
                                    <p className="text-2xl font-semibold text-error mt-2">{result.failedCount || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-[0.16em]">Skipped Rows</p>
                                    <p className="text-2xl font-semibold text-on-surface mt-2">
                                        {result.invalidRows.length + result.duplicateRows.length}
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface border-b border-outline-variant text-xs font-semibold text-on-surface-variant">
                                            <th className="py-3 px-6">Row</th>
                                            <th className="py-3 px-6">Name</th>
                                            <th className="py-3 px-6">Phone</th>
                                            <th className="py-3 px-6">Status</th>
                                            <th className="py-3 px-6">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-on-surface divide-y divide-outline-variant">
                                        {result.resultsPreview.map((entry) => {
                                            const displayStatus = normalizeDisplayStatus(entry.status);

                                            return (
                                                <tr key={`${entry.rowNumber}-${entry.phoneNumber}`}>
                                                    <td className="py-4 px-6">{entry.rowNumber}</td>
                                                    <td className="py-4 px-6">{entry.recipientName || entry.name || "Unnamed recipient"}</td>
                                                    <td className="py-4 px-6">{entry.phoneNumber}</td>
                                                    <td className="py-4 px-6">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${displayStatus === "sent"
                                                                ? "bg-secondary/10 text-secondary"
                                                                : displayStatus === "processing"
                                                                    ? "bg-amber-100 text-amber-800"
                                                                : displayStatus === "queued"
                                                                    ? "bg-primary/10 text-primary"
                                                                    : "bg-error-container text-error"
                                                                }`}
                                                        >
                                                            {displayStatus}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 break-all">
                                                        {entry.messageId || entry.error || entry.historyId}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="bg-surface p-6 text-center">
                            <p className="text-sm text-on-surface-variant">
                                Upload a file and launch the campaign to see the results here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div >
    );
}
