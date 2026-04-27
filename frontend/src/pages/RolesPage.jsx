import { useEffect, useState } from "react";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const supportedRoles = [
    {
        key: "super_admin",
        label: "Super Admin",
        description: "Full backend access including user provisioning, CRM access ID assignment, and account management.",
        color: "bg-primary/10 text-primary",
        permissions: [
            "Can access /users, /roles, and /profile",
            "Can create admin accounts",
            "Can assign CRM access IDs",
        ],
    },
    {
        key: "admin",
        label: "Admin",
        description: "Operational user for sending messages, uploading recipients, and viewing message history.",
        color: "bg-secondary/10 text-secondary",
        permissions: [
            "Can send single and bulk messages",
            "Can access send message, bulk upload, and sent history",
            "Cannot access super admin-only screens",
        ],
    },
];

export default function RolesPage() {
    const { token } = useAuth();
    const [counts, setCounts] = useState({
        super_admin: 0,
        admin: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;

        authApi
            .listUsers(token)
            .then((payload) => {
                if (isCancelled) {
                    return;
                }

                const nextCounts = payload.data.users.reduce(
                    (accumulator, user) => {
                        if (user.role in accumulator) {
                            accumulator[user.role] += 1;
                        }

                        return accumulator;
                    },
                    {
                        super_admin: 0,
                        admin: 0,
                    },
                );

                setCounts(nextCounts);
            })
            .catch((error) => {
                if (!isCancelled) {
                    toast.error(error.message || "Unable to load role data.");
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [token]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="mb-8">
                <h2 className="text-[32px] font-bold text-on-surface leading-[40px]" style={{ letterSpacing: "-0.02em" }}>
                    Roles & Permissions
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                    This page reflects the actual roles currently supported by the backend authorization rules.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {supportedRoles.map((role) => (
                    <div key={role.key} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-lg ${role.color} flex items-center justify-center shrink-0`}>
                                <span className="material-symbols-outlined">shield</span>
                            </div>
                            <div>
                                <h3 className="text-[15px] font-semibold text-on-surface">{role.label}</h3>
                                <p className="text-xs text-on-surface-variant mt-1">
                                    {isLoading ? (
                                        <span className="inline-block h-3 w-28 bg-surface-variant rounded animate-pulse" />
                                    ) : (
                                        `${counts[role.key]} assigned user${counts[role.key] === 1 ? "" : "s"}`
                                    )}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-on-surface-variant mb-4">{role.description}</p>
                        <div className="space-y-2">
                            {role.permissions.map((permission) => (
                                <div key={permission} className="flex items-start gap-2 text-sm text-on-surface">
                                    <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">check_circle</span>
                                    <span>{permission}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
                <h3 className="text-[20px] font-semibold text-on-surface leading-7">Role Model Status</h3>
                <p className="text-sm text-on-surface-variant mt-3">
                    Roles are currently defined by backend code, not by a dynamic role builder. That is why this screen shows the live supported roles instead of placeholder roles or fake assignment counts.
                </p>
            </div>
        </motion.div >
    );
}
