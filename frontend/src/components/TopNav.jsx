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

export default function TopNav() {
    const { user } = useAuth();

    return (
        <header className="fixed top-0 right-0 left-0 lg:left-[260px] h-16 z-30 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6 font-sans antialiased text-sm font-medium">
            {/* Left: Mobile menu + Search */}
            <div className="flex items-center flex-1 gap-4">
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                <div className="h-8 w-px bg-gray-200 mx-2" />
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

