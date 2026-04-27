import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window === "undefined") {
            return false;
        }

        return window.innerWidth >= 1024;
    });

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }

        const mediaQuery = window.matchMedia("(min-width: 1024px)");
        const handleChange = (event) => {
            setSidebarOpen(event.matches);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, []);

    return (
        <div className="min-h-screen bg-surface-container-low">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <TopNav
                isSidebarOpen={sidebarOpen}
                onMenuToggle={() => setSidebarOpen((currentValue) => !currentValue)}
            />
            <main className={`pt-16 min-h-screen transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-[260px]" : "lg:pl-0"}`}>
                <div className="max-w-[1440px] mx-auto p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
