import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { messageApi } from "../services/api";
import { toast } from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const countryOptions = [
    { label: "+1 (US)", value: "1" },
    { label: "+44 (UK)", value: "44" },
    { label: "+91 (IN)", value: "91" },
    { label: "+55 (BR)", value: "55" },
];

function getDisplayStatus(status) {
    return status === "pending" ? "processing" : status;
}

function buildResultSummary(result) {
    const history = result?.history || null;
    const delivery = result?.delivery || null;
    const rawStatus =
        history?.status || (delivery ? "pending" : "queued");
    const status = getDisplayStatus(rawStatus);

    return {
        delivery,
        history,
        jobId: result?.jobId || null,
        messageId: delivery?.messageId || history?.metaMessageId || null,
        provider: delivery?.provider || null,
        mode: delivery?.mode || null,
        warning: delivery?.warning || "",
        status,
        isQueued: status === "queued",
        isProcessing: status === "processing",
        isFailed: status === "failed",
    };
}

export default function SendMessagePage() {
    const { token } = useAuth();
    const [form, setForm] = useState({
        name: "",
        countryCode: "91",
        phoneNumber: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const [result, setResult] = useState(null);
    const resultSummary = buildResultSummary(result);

    useEffect(() => {
        if (!token || !result?.history?._id || result?.history?.status !== "pending") {
            return undefined;
        }

        let isCancelled = false;

        async function pollHistoryStatus() {
            for (let attempt = 0; attempt < 4; attempt += 1) {
                if (attempt > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }

                try {
                    const payload = await messageApi.getHistoryById(result.history._id, token);
                    if (isCancelled) {
                        return;
                    }

                    const nextHistory = payload.data.history;
                    setResult((currentResult) =>
                        currentResult
                            ? {
                                ...currentResult,
                                history: nextHistory,
                            }
                            : currentResult,
                    );

                    if (nextHistory.status === "failed") {
                        toast.error(nextHistory.errorMessage || "Message delivery failed.");
                        return;
                    }

                    if (nextHistory.status === "sent") {
                        return;
                    }
                } catch {
                    if (!isCancelled) {
                        return;
                    }
                }
            }
        }

        void pollHistoryStatus();

        return () => {
            isCancelled = true;
        };
    }, [result?.history?._id, result?.history?.status, token]);

    const handleChange = (key) => (event) => {
        setForm((currentForm) => ({
            ...currentForm,
            [key]: event.target.value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Synchronous ref guard — prevents duplicate sends even if React
        // hasn't re-rendered the disabled button yet.
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        setResult(null);

        try {
            const payload = await messageApi.sendSingle(
                {
                    name: form.name.trim(),
                    countryCode: form.countryCode,
                    phoneNumber: form.phoneNumber.trim(),
                },
                token,
            );

            setResult(payload.data);
            setForm((currentForm) => ({
                ...currentForm,
                name: "",
                phoneNumber: "",
            }));
            toast.success(payload.message || "Message submitted.");
        } catch (error) {
            toast.error(error.message || "Message could not be sent.");
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
            <div className="mb-8">
                <h2 className="text-[32px] font-bold text-on-surface mb-2 leading-[40px]" style={{ letterSpacing: "-0.02em" }}>
                    Send Message
                </h2>
                <p className="text-base text-on-surface-variant">
                    Compose and send a single WhatsApp message directly.
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <form
                    onSubmit={handleSubmit}
                    className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col gap-6"
                >

                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-semibold text-on-surface">Recipient Name (Optional)</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={handleChange("name")}
                            placeholder="e.g. John Doe"
                            className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-semibold text-on-surface">Recipient Phone Number</label>
                        <div className="flex gap-2 w-full">
                            <div className="relative w-1/3 max-w-[120px]">
                                <select
                                    value={form.countryCode}
                                    onChange={handleChange("countryCode")}
                                    className="w-full h-12 appearance-none bg-surface border border-outline-variant rounded-lg pl-4 pr-8 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                                >
                                    {countryOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none">
                                    expand_more
                                </span>
                            </div>
                            <input
                                type="tel"
                                value={form.phoneNumber}
                                onChange={handleChange("phoneNumber")}
                                placeholder="e.g. 9876543210"
                                className="flex-1 h-12 bg-surface border border-outline-variant rounded-lg px-4 py-2 text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-semibold text-on-surface">Message Preview (Template Data)</label>
                        <div className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-sm text-on-surface-variant flex gap-3">
                            <span className="material-symbols-outlined text-primary shrink-0">video_library</span>
                            <div>
                                <p className="font-semibold text-on-surface mb-1">Target Template: <span className="font-mono text-xs bg-surface-variant/30 px-1.5 py-0.5 rounded text-primary">school_catalogue</span></p>
                                <p className="text-xs opacity-90 leading-relaxed">
                                    A promotional video header will be included with the catalogue template. This template provides school marketing details and bypasses the standard 24-hour window limitation.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-surface-container-highest">
                        <button
                            type="button"
                            onClick={() =>
                                setForm({
                                    name: "",
                                    countryCode: "91",
                                    phoneNumber: "",
                                })
                            }
                            className="px-6 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low text-xs font-semibold transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-container text-xs font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-sm">send</span>
                            {isSubmitting ? "Sending..." : "Send via WhatsApp"}
                        </button>
                    </div>
                </form>

                <aside className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 flex flex-col gap-4 h-fit">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                            Delivery Status
                        </p>
                        <h3 className="text-[20px] font-semibold text-on-surface mt-2 leading-7">
                            Latest send result
                        </h3>
                    </div>

                    {result ? (
                        <div className="space-y-4">
                            <div className={`rounded-xl px-4 py-3 border ${resultSummary.isQueued
                                ? "bg-primary/10 border-primary/20"
                                : resultSummary.isProcessing
                                    ? "bg-amber-100 border-amber-200"
                                    : resultSummary.isFailed
                                        ? "bg-error-container/40 border-error/30"
                                        : "bg-secondary/10 border-secondary/20"
                                }`}>
                                <p className={`text-sm font-semibold ${resultSummary.isQueued
                                    ? "text-primary"
                                    : resultSummary.isProcessing
                                        ? "text-amber-800"
                                        : resultSummary.isFailed
                                            ? "text-error"
                                            : "text-secondary"
                                    }`}>
                                    {resultSummary.isQueued
                                        ? "Message queued"
                                        : resultSummary.isProcessing
                                            ? "Message processing"
                                            : resultSummary.isFailed
                                                ? "Message failed"
                                                : "Message sent"}
                                </p>
                                <p className="text-xs text-on-surface-variant mt-1">
                                    {resultSummary.isQueued
                                        ? "The background worker will process this delivery shortly. Track progress in Sent History."
                                        : resultSummary.isProcessing
                                            ? `Provider: ${resultSummary.provider} • Mode: ${resultSummary.mode} • Final status is being synced from Fast2SMS.`
                                            : resultSummary.isFailed
                                                ? (resultSummary.history?.errorMessage || "Fast2SMS reported a delivery failure for this send.")
                                                : `Provider: ${resultSummary.provider} • Mode: ${resultSummary.mode}`}
                                </p>
                                {resultSummary.warning ? (
                                    <p className="text-xs text-amber-800 mt-2">{resultSummary.warning}</p>
                                ) : null}
                            </div>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-xs font-semibold text-on-surface-variant">Current Status</p>
                                    <p className="text-on-surface capitalize">{resultSummary.status}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-on-surface-variant">Recipient</p>
                                    <p className="text-on-surface">
                                        {resultSummary.history?.recipientName || "Unnamed recipient"} ({resultSummary.history?.phoneNumber || "--"})
                                    </p>
                                </div>
                                {resultSummary.jobId && (
                                    <div>
                                        <p className="text-xs font-semibold text-on-surface-variant">Queue Job ID</p>
                                        <p className="text-on-surface break-all">{resultSummary.jobId}</p>
                                    </div>
                                )}
                                {resultSummary.messageId && (
                                    <div>
                                        <p className="text-xs font-semibold text-on-surface-variant">Message ID</p>
                                        <p className="text-on-surface break-all">{resultSummary.messageId}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-semibold text-on-surface-variant">Saved History Entry</p>
                                    <p className="text-on-surface break-all">{resultSummary.history?._id || "--"}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-outline-variant bg-surface px-4 py-6 text-sm text-on-surface-variant">
                            Send a test message from this page and the delivery result will appear here.
                        </div>
                    )}
                </aside>
            </div>
        </motion.div>
    );
}
