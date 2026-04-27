import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { icon: "dashboard", label: "Dashboard", path: "/dashboard" },
    { icon: "send", label: "Send Message", path: "/send-message" },
    { icon: "outbox", label: "Bulk Message", path: "/bulk-message" },
    { icon: "history", label: "Sent History", path: "/sent-history" },
    { icon: "group", label: "User Management", path: "/users", roles: ["super_admin"] },
    { icon: "badge", label: "Roles", path: "/roles", roles: ["super_admin"] },
    { icon: "electrical_services", label: "Provider", path: "/provider", roles: ["super_admin"] },
    { icon: "person", label: "Profile", path: "/profile" },
];

export default function Sidebar({ isOpen, onClose }) {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(user?.role));

    const handleLogout = () => {
        logout();
        onClose();
        navigate("/login", { replace: true });
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}
            <nav
                className={`fixed top-0 left-0 h-full w-[260px] flex flex-col bg-slate-900 border-r border-slate-800 shadow-2xl z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Brand */}
                <div className="p-6 border-b border-slate-800/50">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <img src="/siksapath.png" alt="Siksapath Logo" className="w-48 h-auto object-contain" />
                        <p className="text-slate-400 text-xs font-semibold">WhatsApp Marketing Dashboard</p>
                    </div>
                </div>

                {/* Nav Items */}
                <div className="flex flex-col py-6 space-y-1 flex-1 overflow-y-auto tracking-tight">
                    {visibleNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                isActive
                                    ? 'bg-blue-600/10 text-white border-l-4 border-blue-600 py-3 px-6 flex items-center gap-3 transition-all duration-200'
                                    : 'text-slate-400 py-3 px-6 flex items-center gap-3 hover:text-white hover:bg-slate-800/50 transition-all duration-200 border-l-4 border-transparent'
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span
                                        className="material-symbols-outlined"
                                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                    >
                                        {item.icon}
                                    </span>
                                    <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>

                {/* Logout */}
                <div className="p-6 border-t border-slate-800/50 mt-auto">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="text-slate-400 py-3 px-6 flex items-center gap-3 hover:text-white hover:bg-slate-800/50 transition-all duration-200 rounded-lg -mx-6"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span>Logout</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
