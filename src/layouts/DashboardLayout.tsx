
import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    BookOpen,
    FolderKanban,
    Bot,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    PanelLeft
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AIAssistant from "../components/AIAssistant";
import { motion, AnimatePresence } from "motion/react";

const SidebarLink = ({ to, icon: Icon, children, isCollapsed }: { to: string; icon: any; children: React.ReactNode; isCollapsed: boolean }) => (
    <NavLink
        to={to}
        className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:text-white hover:bg-white/10"
            } ${isCollapsed ? "justify-center" : ""}`
        }
    >
        <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isCollapsed ? "scale-110" : ""}`} />

        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
            <span className="font-medium whitespace-nowrap pl-1">
                {children}
            </span>
        </div>

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap pointer-events-none shadow-xl translate-x-2 group-hover:translate-x-0">
                {children}
            </div>
        )}
    </NavLink>
);

const MobileSidebarLink = ({ to, icon: Icon, children, onClick }: { to: string; icon: any; children: React.ReactNode; onClick: () => void }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-200 text-lg font-medium ${isActive
                ? "bg-primary/20 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`
        }
    >
        <Icon className="w-6 h-6" />
        <span>{children}</span>
    </NavLink>
);

const DashboardLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar - Desktop */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? 84 : 280 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="hidden md:flex flex-col border-r border-white/5 bg-zinc-950/50 backdrop-blur-2xl relative"
            >
                {/* Header with Toggle */}
                <div className="flex items-center justify-between px-4 py-6 mb-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shrink-0 shadow-lg shadow-purple-500/20 flex items-center justify-center">
                            <span className="font-bold text-white text-lg">D</span>
                        </div>

                        <motion.div
                            animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : "auto" }}
                            transition={{ duration: 0.2 }}
                            className="whitespace-nowrap overflow-hidden"
                        >
                            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                                DevMastery
                            </span>
                        </motion.div>
                    </div>
                </div>

                {/* Always Visible Toggle Button - Positioned absolutely to be consistent */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute top-6 right-[-12px] z-50 p-1.5 rounded-full bg-zinc-900 border border-white/10 text-muted-foreground hover:text-white hover:bg-zinc-800 transition-all shadow-md group"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <PanelLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
                </button>

                <nav className="flex-1 space-y-2 px-3 pt-4">
                    <SidebarLink to="/dashboard" icon={LayoutDashboard} isCollapsed={isCollapsed}>Dashboard</SidebarLink>
                    <SidebarLink to="/curriculum" icon={BookOpen} isCollapsed={isCollapsed}>Curriculum</SidebarLink>
                    <SidebarLink to="/projects" icon={FolderKanban} isCollapsed={isCollapsed}>Projects</SidebarLink>
                    <SidebarLink to="/ai-assistant" icon={Bot} isCollapsed={isCollapsed}>AI Assistant</SidebarLink>
                    {user?.role === 'admin' && (
                        <SidebarLink to="/admin" icon={LayoutDashboard} isCollapsed={isCollapsed}>
                            <span className="text-purple-400 font-bold">Admin Panel</span>
                        </SidebarLink>
                    )}
                    <SidebarLink to="/settings" icon={Settings} isCollapsed={isCollapsed}>Settings</SidebarLink>
                </nav>

                <div className="p-4 mt-auto border-t border-white/5 mx-3 mb-4 rounded-2xl bg-white/5 overflow-hidden">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? "justify-center" : ""}`}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center text-sm font-bold text-white shrink-0 ring-2 ring-black/20">
                            {user?.name.charAt(0)}
                        </div>

                        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                            <span className="text-sm font-medium text-white truncate">{user?.name}</span>
                            <span className="text-xs text-muted-foreground truncate">{user?.username}</span>
                        </div>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative flex flex-col">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-40">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="font-bold text-white text-sm">D</span>
                        </div>
                        <span className="font-bold tracking-tight">DevMastery</span>
                    </div>

                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -mr-2 text-muted-foreground hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
                    </button>
                </header>

                <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 w-full">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="fixed inset-0 z-50 bg-background md:hidden flex flex-col"
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <span className="font-bold text-lg">Menu</span>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 -mr-2 text-muted-foreground hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                            <MobileSidebarLink to="/dashboard" icon={LayoutDashboard} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</MobileSidebarLink>
                            <MobileSidebarLink to="/curriculum" icon={BookOpen} onClick={() => setIsMobileMenuOpen(false)}>Curriculum</MobileSidebarLink>
                            <MobileSidebarLink to="/projects" icon={FolderKanban} onClick={() => setIsMobileMenuOpen(false)}>Projects</MobileSidebarLink>
                            <MobileSidebarLink to="/ai-assistant" icon={Bot} onClick={() => setIsMobileMenuOpen(false)}>AI Assistant</MobileSidebarLink>
                            {user?.role === 'admin' && (
                                <MobileSidebarLink to="/admin" icon={LayoutDashboard} onClick={() => setIsMobileMenuOpen(false)}>
                                    <span className="text-purple-400">Admin Panel</span>
                                </MobileSidebarLink>
                            )}
                            <MobileSidebarLink to="/settings" icon={Settings} onClick={() => setIsMobileMenuOpen(false)}>Settings</MobileSidebarLink>

                            <div className="mt-auto pt-8 border-t border-white/5">
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-4 px-6 py-4 text-lg font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition"
                                >
                                    <LogOut className="w-6 h-6" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AIAssistant />
        </div>
    );
};

export default DashboardLayout;
