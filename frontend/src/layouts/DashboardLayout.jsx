import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-surface-container-low">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <TopNav onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
            <main className="lg:pl-[260px] pt-16 min-h-screen">
                <div className="max-w-[1440px] mx-auto p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
