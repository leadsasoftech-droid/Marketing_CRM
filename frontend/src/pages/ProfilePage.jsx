import { useEffect, useState } from "react";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

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

function formatDate(value, fallback = "--") {
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

function getRoleLabel(role) {
    if (role === "super_admin") return "Super Admin";
    if (role === "admin") return "Admin";
    return role || "Unknown";
}

function getRoleBadgeStyle(role) {
    if (role === "super_admin") {
        return "bg-primary-fixed-dim text-on-primary-fixed-variant";
    }
    return "bg-surface-container-highest text-on-surface-variant border border-outline-variant";
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ProfilePage() {
    const { user, token } = useAuth();
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Password change state
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        async function fetchProfile() {
            setIsLoading(true);
            try {
                const payload = await authApi.me(token);
                if (!isCancelled) {
                    setProfile(payload.data.user);
                }
            } catch (error) {
                if (!isCancelled) {
                    toast.error(error.message || "Unable to load profile.");
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        }

        fetchProfile();

        return () => {
            isCancelled = true;
        };
    }, [token]);

    const handlePasswordChange = async (event) => {
        event.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }

        setIsChangingPassword(true);
        try {
            await authApi.updateOwnPassword({ newPassword }, token);
            toast.success("Password updated successfully.");
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswordSection(false);
        } catch (error) {
            toast.error(error.message || "Unable to update password.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const displayUser = profile || user;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="mb-8">
                <h2
                    className="text-[32px] font-bold text-on-surface leading-[40px]"
                    style={{ letterSpacing: "-0.02em" }}
                >
                    My Profile
                </h2>
                <p className="text-base text-on-surface-variant mt-2">
                    View and manage your account information.
                </p>
            </div>

            <motion.div
                className="grid grid-cols-1 xl:grid-cols-12 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Profile Card */}
                <motion.div
                    variants={itemVariants}
                    className="xl:col-span-4 bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_8px_24px_rgba(0,0,0,0.04)] overflow-hidden relative"
                >
                    {/* Gradient Banner */}
                    <div className="h-28 bg-gradient-to-br from-primary via-primary/80 to-secondary relative">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-40" />
                    </div>

                    {/* Avatar */}
                    <div className="flex justify-center -mt-12 relative z-10">
                        {isLoading ? (
                            <div className="w-24 h-24 rounded-full bg-surface-variant border-4 border-surface-container-lowest animate-pulse" />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-primary-container border-4 border-surface-container-lowest flex items-center justify-center text-on-primary-container text-2xl font-bold shadow-lg">
                                {getInitials(displayUser?.name)}
                            </div>
                        )}
                    </div>

                    <div className="px-6 pb-6 pt-4 text-center">
                        {isLoading ? (
                            <div className="space-y-3 flex flex-col items-center">
                                <div className="h-6 w-40 bg-surface-variant rounded animate-pulse" />
                                <div className="h-4 w-48 bg-surface-variant/60 rounded animate-pulse" />
                                <div className="h-5 w-20 bg-surface-variant rounded-full animate-pulse mt-2" />
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-on-surface">
                                    {displayUser?.name || "Unknown User"}
                                </h3>
                                <p className="text-sm text-on-surface-variant mt-1">
                                    {displayUser?.email || "No email"}
                                </p>
                                <div className="mt-3 inline-flex items-center gap-1.5">
                                    <span
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeStyle(displayUser?.role)}`}
                                    >
                                        <span className="material-symbols-outlined text-[14px] mr-1">
                                            {displayUser?.role === "super_admin" ? "shield" : "admin_panel_settings"}
                                        </span>
                                        {getRoleLabel(displayUser?.role)}
                                    </span>
                                </div>
                            </>
                        )}

                        {/* Divider */}
                        <div className="border-t border-surface-variant mt-5 pt-5">
                            {isLoading ? (
                                <div className="space-y-3">
                                    <div className="h-4 w-full bg-surface-variant/60 rounded animate-pulse" />
                                    <div className="h-4 w-full bg-surface-variant/60 rounded animate-pulse" />
                                </div>
                            ) : (
                                <div className="space-y-3 text-left">
                                    {displayUser?.phoneNumber && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">phone</span>
                                            <span className="text-on-surface">{displayUser.phoneNumber}</span>
                                        </div>
                                    )}
                                    {displayUser?.crmAccessId && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">key</span>
                                            <span className="text-on-surface font-mono text-xs bg-surface-container px-2 py-1 rounded">
                                                {displayUser.crmAccessId}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">calendar_today</span>
                                        <span className="text-on-surface-variant">
                                            Joined {formatDate(displayUser?.createdAt, "Unknown")}
                                        </span>
                                    </div>
                                    {displayUser?.lastLoginAt && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">login</span>
                                            <span className="text-on-surface-variant">
                                                Last login {formatDate(displayUser.lastLoginAt)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Details & Actions */}
                <motion.div variants={itemVariants} className="xl:col-span-8 flex flex-col gap-6">
                    {/* Account Details Card */}
                    <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="p-6 border-b border-surface-variant bg-surface flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[20px]">account_circle</span>
                            </div>
                            <h3 className="text-[18px] font-semibold text-on-surface leading-tight">
                                Account Information
                            </h3>
                        </div>
                        <div className="p-6">
                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="space-y-2 animate-pulse">
                                            <div className="h-3 w-20 bg-surface-variant rounded" />
                                            <div className="h-5 w-full bg-surface-variant/60 rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                                            Full Name
                                        </label>
                                        <p className="mt-1.5 text-[15px] font-medium text-on-surface bg-surface-container rounded-lg px-4 py-2.5 border border-outline-variant">
                                            {displayUser?.name || "--"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                                            Email Address
                                        </label>
                                        <p className="mt-1.5 text-[15px] font-medium text-on-surface bg-surface-container rounded-lg px-4 py-2.5 border border-outline-variant">
                                            {displayUser?.email || "--"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                                            Phone Number
                                        </label>
                                        <p className="mt-1.5 text-[15px] font-medium text-on-surface bg-surface-container rounded-lg px-4 py-2.5 border border-outline-variant">
                                            {displayUser?.phoneNumber || "Not provided"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                                            Role
                                        </label>
                                        <p className="mt-1.5 text-[15px] font-medium text-on-surface bg-surface-container rounded-lg px-4 py-2.5 border border-outline-variant flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-primary">
                                                {displayUser?.role === "super_admin" ? "shield" : "admin_panel_settings"}
                                            </span>
                                            {getRoleLabel(displayUser?.role)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                                            CRM Access ID
                                        </label>
                                        <p className="mt-1.5 text-[15px] font-medium text-on-surface bg-surface-container rounded-lg px-4 py-2.5 border border-outline-variant">
                                            <span className="font-mono">
                                                {displayUser?.crmAccessId || "--"}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                                            Account Status
                                        </label>
                                        <p className="mt-1.5 text-[15px] font-medium text-on-surface bg-surface-container rounded-lg px-4 py-2.5 border border-outline-variant flex items-center gap-2">
                                            <span className={`inline-block w-2 h-2 rounded-full ${displayUser?.isActive ? "bg-secondary" : "bg-error"}`} />
                                            {displayUser?.isActive ? "Active" : "Inactive"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Change Password Card (only for super_admin) */}
                    {displayUser?.role === "super_admin" && (
                        <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.02)] overflow-hidden">
                            <div className="p-6 border-b border-surface-variant bg-surface flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-error/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-error text-[20px]">lock</span>
                                    </div>
                                    <div>
                                        <h3 className="text-[18px] font-semibold text-on-surface leading-tight">
                                            Change Password
                                        </h3>
                                        <p className="text-xs text-on-surface-variant">Update your account password</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordSection((prev) => !prev)}
                                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showPasswordSection ? "expand_less" : "expand_more"}
                                    </span>
                                    {showPasswordSection ? "Hide" : "Show"}
                                </button>
                            </div>
                            {showPasswordSection && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    transition={{ duration: 0.2 }}
                                    className="p-6"
                                >
                                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                        <div className="flex flex-col space-y-2">
                                            <label className="text-xs font-semibold text-on-surface" htmlFor="newPassword">
                                                New Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="newPassword"
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all pr-10"
                                                    minLength={8}
                                                    required
                                                    placeholder="Minimum 8 characters"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword((prev) => !prev)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        {showNewPassword ? "visibility" : "visibility_off"}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col space-y-2">
                                            <label className="text-xs font-semibold text-on-surface" htmlFor="confirmPassword">
                                                Confirm Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="confirmPassword"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-lg text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all pr-10"
                                                    minLength={8}
                                                    required
                                                    placeholder="Re-enter your new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        {showConfirmPassword ? "visibility" : "visibility_off"}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                            <p className="text-xs text-error flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">error</span>
                                                Passwords do not match.
                                            </p>
                                        )}

                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={isChangingPassword || !newPassword || !confirmPassword}
                                                className="bg-primary hover:bg-surface-tint text-on-primary text-sm py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {isChangingPassword ? "progress_activity" : "lock_reset"}
                                                </span>
                                                {isChangingPassword ? "Updating..." : "Update Password"}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Activity Stats Card */}
                    <div className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-[0px_4px_12px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="p-6 border-b border-surface-variant bg-surface flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-secondary text-[20px]">insights</span>
                            </div>
                            <h3 className="text-[18px] font-semibold text-on-surface leading-tight">
                                Account Activity
                            </h3>
                        </div>
                        <div className="p-6">
                            {isLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="rounded-xl border border-outline-variant bg-surface p-4 animate-pulse">
                                            <div className="h-3 w-20 bg-surface-variant rounded mb-2" />
                                            <div className="h-6 w-32 bg-surface-variant/60 rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="rounded-xl border border-outline-variant bg-surface p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                                            Account Created
                                        </p>
                                        <p className="text-sm font-medium text-on-surface mt-2">
                                            {formatDate(displayUser?.createdAt, "Unknown")}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-outline-variant bg-surface p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                                            Last Login
                                        </p>
                                        <p className="text-sm font-medium text-on-surface mt-2">
                                            {formatDate(displayUser?.lastLoginAt, "Never")}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-outline-variant bg-surface p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                                            Last Updated
                                        </p>
                                        <p className="text-sm font-medium text-on-surface mt-2">
                                            {formatDate(displayUser?.updatedAt, "Unknown")}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
