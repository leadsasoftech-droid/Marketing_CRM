import { useEffect, useState } from "react";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

function getInitials(name = "") {
    const parts = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) {
        return "NA";
    }

    return parts.map((part) => part[0].toUpperCase()).join("");
}

function formatDate(value, fallback = "Never") {
    if (!value) {
        return fallback;
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function getRoleBadge(role) {
    if (role === "super_admin") {
        return "bg-primary-fixed-dim text-on-primary-fixed-variant";
    }

    return "bg-surface-container-highest text-on-surface-variant border border-outline-variant";
}

export default function UserManagementPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [passwordTarget, setPasswordTarget] = useState(null);
    const [resetPassword, setResetPassword] = useState("");
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
        crmAccessId: "",
    });

    async function loadUsers() {
        setIsLoading(true);

        try {
            const payload = await authApi.listUsers(token);
            setUsers(payload.data.users);
        } catch (error) {
            toast.error(error.message || "Unable to load users.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleChange = (key) => (event) => {
        setForm((currentForm) => ({
            ...currentForm,
            [key]: event.target.value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = await authApi.createAdmin(
                {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    phoneNumber: form.phoneNumber.trim(),
                    password: form.password,
                    crmAccessId: form.crmAccessId.trim(),
                },
                token,
            );

            setUsers((currentUsers) => [payload.data.user, ...currentUsers]);
            toast.success(`Admin account created for ${payload.data.user.email}.`);
            setForm({
                name: "",
                email: "",
                phoneNumber: "",
                password: "",
                crmAccessId: "",
            });
        } catch (error) {
            toast.error(error.message || "Unable to create the admin account.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);

        try {
            await authApi.deleteAdmin(deleteTarget._id, token);
            setUsers((currentUsers) => currentUsers.filter((u) => u._id !== deleteTarget._id));
            toast.success("Admin account deleted successfully.");
        } catch (error) {
            toast.error(error.message || "Failed to delete the user.");
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    const confirmResetPassword = async () => {
        if (!passwordTarget || !resetPassword) return;
        setIsResettingPassword(true);

        try {
            await authApi.resetAdminPassword(
                passwordTarget._id,
                { newPassword: resetPassword },
                token,
            );
            toast.success(`Password for ${passwordTarget.name} has been reset.`);
        } catch (error) {
            toast.error(error.message || "Failed to reset password.");
        } finally {
            setIsResettingPassword(false);
            setPasswordTarget(null);
            setResetPassword("");
            setShowResetPassword(false);
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
                    User Management
                </h2>
                <p className="text-base text-on-surface-variant mt-2">
                    Live user data from the backend. Only supported accounts are shown here.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-surface-variant flex items-center justify-between bg-surface">
                        <h3 className="text-[20px] font-semibold text-on-surface leading-7">Existing Users</h3>
                        <button
                            type="button"
                            onClick={loadUsers}
                            className="text-on-surface-variant hover:text-primary transition-colors"
                            title="Refresh users"
                        >
                            <span className="material-symbols-outlined">refresh</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low border-b border-surface-variant">
                                    <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">User</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Role</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Phone</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">CRM Access ID</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Last Login</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-on-surface-variant uppercase tracking-wider w-[100px] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-variant">
                                {isLoading ? (
                                    <>
                                        {[0, 1, 2, 3].map((i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-surface-variant" />
                                                        <div>
                                                            <div className="h-4 w-32 bg-surface-variant rounded mb-2" />
                                                            <div className="h-3 w-40 bg-surface-variant/60 rounded" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="h-5 w-20 bg-surface-variant rounded-full" />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="h-4 w-24 bg-surface-variant rounded" />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="h-4 w-24 bg-surface-variant rounded" />
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="h-4 w-36 bg-surface-variant/60 rounded" />
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-10 px-6 text-center text-sm text-on-surface-variant">
                                            No users exist yet besides the current setup.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user._id} className="hover:bg-surface-bright transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-sm">
                                                        {getInitials(user.name)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[15px] font-semibold text-on-surface">{user.name}</p>
                                                        <p className="text-xs text-on-surface-variant">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadge(user.role)}`}>
                                                    {user.role.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-on-surface">
                                                {user.phoneNumber || "--"}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-on-surface">
                                                {user.crmAccessId || "--"}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-on-surface-variant">
                                                {formatDate(user.lastLoginAt, "Never logged in")}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                {user.role !== "super_admin" && (
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPasswordTarget(user)}
                                                            className="text-primary hover:text-primary/80 transition-colors p-2 rounded hover:bg-primary/10 flex items-center justify-center"
                                                            title="Reset Password"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">key</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteTarget(user)}
                                                            className="text-error hover:text-error/80 transition-colors p-2 rounded hover:bg-error/10 flex items-center justify-center"
                                                            title="Delete Admin"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-surface-variant bg-surface-bright text-sm text-on-surface-variant mt-auto">
                        {isLoading ? "Loading user count..." : `${users.length} real user account${users.length === 1 ? "" : "s"} loaded`}
                    </div>
                </div>

                <div className="xl:col-span-4 bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_8px_24px_rgba(0,0,0,0.04)] h-fit relative overflow-hidden">
                    <div className="h-1 w-full bg-primary absolute top-0 left-0" />
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                                <span className="material-symbols-outlined">person_add</span>
                            </div>
                            <div>
                                <h3 className="text-[20px] font-semibold text-on-surface leading-tight">Create Admin Account</h3>
                                <p className="text-xs text-on-surface-variant">The backend currently supports creating `admin` users from this screen.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3 flex flex-col">
                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-semibold text-on-surface" htmlFor="name">Full Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={form.name}
                                    onChange={handleChange("name")}
                                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    required
                                />
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-semibold text-on-surface" htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange("email")}
                                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    required
                                />
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-semibold text-on-surface" htmlFor="phoneNumber">Phone Number</label>
                                <input
                                    id="phoneNumber"
                                    type="tel"
                                    value={form.phoneNumber}
                                    onChange={handleChange("phoneNumber")}
                                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                />
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-semibold text-on-surface" htmlFor="crmAccessId">CRM Access ID (Optional)</label>
                                <input
                                    id="crmAccessId"
                                    type="text"
                                    value={form.crmAccessId}
                                    onChange={handleChange("crmAccessId")}
                                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                />
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-xs font-semibold text-on-surface" htmlFor="tempPassword">Password</label>
                                <div className="relative">
                                    <input
                                        id="tempPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={form.password}
                                        onChange={handleChange("password")}
                                        className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all pr-10"
                                        minLength={8}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPassword ? "visibility" : "visibility_off"}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 mt-2 border-t border-surface-variant">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-primary hover:bg-surface-tint text-on-primary text-sm py-3 rounded-lg shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>check_circle</span>
                                    {isSubmitting ? "Creating..." : "Provision Admin Account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => !isDeleting && setDeleteTarget(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 350 }}
                            className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-surface-variant"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-error text-[28px]">person_remove</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-on-surface">Delete Admin Account</h3>
                                        <p className="text-sm text-on-surface-variant">This action cannot be undone.</p>
                                    </div>
                                </div>

                                <div className="bg-surface-container rounded-xl p-4 mb-5 border border-surface-variant">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-error/10 text-error flex items-center justify-center font-bold text-sm flex-shrink-0">
                                            {getInitials(deleteTarget.name)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-on-surface truncate">{deleteTarget.name}</p>
                                            <p className="text-xs text-on-surface-variant truncate">{deleteTarget.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-on-surface-variant mb-6">
                                    Are you sure you want to permanently delete <span className="font-semibold text-on-surface">{deleteTarget.name}</span>? They will lose all access to the CRM immediately.
                                </p>

                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(null)}
                                        disabled={isDeleting}
                                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDelete}
                                        disabled={isDeleting}
                                        className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-error text-white hover:bg-error/90 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{isDeleting ? "progress_activity" : "delete"}</span>
                                        {isDeleting ? "Deleting..." : "Delete Account"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reset Password Modal */}
            <AnimatePresence>
                {passwordTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => !isResettingPassword && (setPasswordTarget(null), setResetPassword(""), setShowResetPassword(false))}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 350 }}
                            className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-surface-variant"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-primary text-[28px]">lock_reset</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-on-surface">Reset Admin Password</h3>
                                        <p className="text-sm text-on-surface-variant">Set a new password for this user.</p>
                                    </div>
                                </div>

                                <div className="bg-surface-container rounded-xl p-4 mb-5 border border-surface-variant">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                                            {getInitials(passwordTarget.name)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-on-surface truncate">{passwordTarget.name}</p>
                                            <p className="text-xs text-on-surface-variant truncate">{passwordTarget.email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col space-y-2 mb-6">
                                    <label className="text-xs font-semibold text-on-surface" htmlFor="resetPasswordInput">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="resetPasswordInput"
                                            type={showResetPassword ? "text" : "password"}
                                            value={resetPassword}
                                            onChange={(e) => setResetPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all pr-10"
                                            minLength={8}
                                            placeholder="Minimum 8 characters"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowResetPassword((prev) => !prev)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">
                                                {showResetPassword ? "visibility" : "visibility_off"}
                                            </span>
                                        </button>
                                    </div>
                                    {resetPassword && resetPassword.length < 8 && (
                                        <p className="text-xs text-error flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">error</span>
                                            Password must be at least 8 characters.
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setPasswordTarget(null); setResetPassword(""); setShowResetPassword(false); }}
                                        disabled={isResettingPassword}
                                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmResetPassword}
                                        disabled={isResettingPassword || resetPassword.length < 8}
                                        className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{isResettingPassword ? "progress_activity" : "lock_reset"}</span>
                                        {isResettingPassword ? "Resetting..." : "Reset Password"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
}
