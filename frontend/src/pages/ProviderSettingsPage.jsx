import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { providerApi } from "../services/api";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

export default function ProviderSettingsPage() {
    const { token } = useAuth();
    const [walletInfo, setWalletInfo] = useState(null);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [blockInput, setBlockInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [walletRes, blockRes] = await Promise.allSettled([
                providerApi.getWalletBalance(token),
                providerApi.getBlockedUsers(token)
            ]);

            if (walletRes.status === "fulfilled") setWalletInfo(walletRes.value.data);
            if (blockRes.status === "fulfilled") {
                // If the response is wrapped inside "data" or "blocked_users"
                const users = blockRes.value.data?.blocked_users || blockRes.value.data || [];
                setBlockedUsers(Array.isArray(users) ? users : []);
            }
        } catch (error) {
            toast.error("Failed to fetch provider data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const handleBlock = async (e) => {
        e.preventDefault();
        if (!blockInput.trim()) return;

        try {
            await providerApi.blockUser(blockInput.trim(), token);
            toast.success(`User ${blockInput} blocked successfully`);
            setBlockInput("");
            fetchData();
        } catch (error) {
            toast.error(error.message || "Failed to block user");
        }
    };

    const handleUnblock = async (number) => {
        try {
            await providerApi.unblockUser(number, token);
            toast.success(`User ${number} unblocked successfully`);
            fetchData();
        } catch (error) {
            toast.error(error.message || "Failed to unblock user");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="mb-8">
                <h2 className="text-[32px] font-bold text-on-surface leading-[40px]" style={{ letterSpacing: "-0.02em" }}>
                    Provider Settings (Fast2SMS)
                </h2>
                <p className="text-base text-on-surface-variant mt-2">
                    Manage your WhatsApp Provider details, including API Wallet balance and user blocking.
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-6">
                    {/* Wallet Info Card */}
                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-primary">account_balance_wallet</span>
                            Wallet Balance & Health
                        </h3>
                        {isLoading && !walletInfo ? (
                            <p className="text-sm text-on-surface-variant flex items-center gap-2">
                                <span className="material-symbols-outlined animate-spin">progress_activity</span> Loading...
                            </p>
                        ) : (
                            <div className="flex items-center gap-4 bg-surface rounded-lg p-4 border border-outline-variant">
                                <div>
                                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Current Balance</p>
                                    <p className="text-3xl font-bold text-primary mt-1">₹{Number(walletInfo?.wallet || 0).toFixed(2)}</p>
                                </div>
                                <div className="ml-auto flex items-center px-3 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                                    <span className="material-symbols-outlined text-[18px] mr-1">check_circle</span>
                                    <span className="text-sm font-medium">API Health OK</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Blocked Users Card */}
                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-error">block</span>
                            WhatsApp Blocklist
                        </h3>

                        <form onSubmit={handleBlock} className="flex gap-3 mb-6">
                            <input
                                type="text"
                                value={blockInput}
                                onChange={(e) => setBlockInput(e.target.value)}
                                placeholder="Enter phone number (e.g. 919999999999)"
                                className="flex-1 border border-outline-variant rounded-lg px-4 py-2 bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                required
                            />
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-error text-on-error text-sm font-semibold hover:bg-error/90 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                Block
                            </button>
                        </form>

                        <div className="border border-outline-variant rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm text-on-surface">
                                <thead className="bg-surface text-on-surface-variant text-xs uppercase font-semibold border-b border-outline-variant">
                                    <tr>
                                        <th className="px-4 py-3">Phone Number</th>
                                        <th className="px-4 py-3 w-[120px]">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {blockedUsers.length > 0 ? (
                                        blockedUsers.map((user, idx) => {
                                            const number = typeof user === "string" ? user : user.number || user.contact_number;
                                            return (
                                                <tr key={idx} className="border-b border-outline-variant last:border-b-0 hover:bg-surface/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium">{number}</td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleUnblock(number)}
                                                            className="text-xs font-semibold px-3 py-1 rounded bg-surface border border-outline-variant hover:bg-surface-container-highest transition-colors flex items-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                                                            Unblock
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="px-4 py-8 text-center text-on-surface-variant italic">
                                                No users currently blocked.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <aside className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6 h-fit">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                        Integration Info
                    </p>
                    <ul className="mt-4 space-y-3 text-sm text-on-surface-variant">
                        <li>This page interfaces directly with Fast2SMS Provider API.</li>
                        <li>Wallet deductions occur automatically on message dispatch based on your Meta API plan.</li>
                        <li>Blocking users stops your official WABA number from sending marketing templates or replies to them.</li>
                    </ul>
                </aside>
            </div>
        </motion.div>
    );
}
