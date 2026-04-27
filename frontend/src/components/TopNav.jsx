import { useAuth } from "../context/AuthContext";

function getInitials(name = "") {
    const parts = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) {
        return "CRM";
    }

    return parts.map((part) => part[0].toUpperCase()).join("");
}

export default function TopNav({ isSidebarOpen, onMenuToggle }) {
    const { user } = useAuth();

    return (
        <header
            className={`fixed top-0 right-0 left-0 h-16 z-30 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-4 sm:px-6 font-sans antialiased text-sm font-medium transition-[left] duration-300 ${isSidebarOpen ? "lg:left-[260px]" : "lg:left-0"
                }`}
        >
            <div className="flex items-center flex-1 gap-4 min-w-0">
                <button
                    type="button"
                    onClick={onMenuToggle}
                    className="h-10 w-10 shrink-0 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface transition-colors flex items-center justify-center"
                    aria-label={isSidebarOpen ? "Hide navigation" : "Show navigation"}
                >
                    <span className="material-symbols-outlined text-[20px]">
                        {isSidebarOpen ? "menu_open" : "menu"}
                    </span>
                </button>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">Siksapath CRM</p>
                    <p className="text-xs text-on-surface-variant truncate">WhatsApp marketing dashboard</p>
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-8 w-px bg-gray-200 hidden sm:block" />
                <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-on-surface">{user?.role === "super_admin" ? "Super Admin" : "Admin"}</p>
                    <p className="text-xs text-on-surface-variant">{user?.email || "No email"}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-container overflow-hidden border border-outline-variant flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(user?.name)}
                </div>
            </div>
        </header>
    );
}
