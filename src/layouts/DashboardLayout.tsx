
import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    BookOpen,
    FolderKanban,
    Bot,
    Settings,
    LogOut,
    ChevronRight,
    PanelLeft,
    MessageSquare,
    Clock,
    Code
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AIAssistant from "../components/AIAssistant";
import { motion, AnimatePresence } from "motion/react";

const TrialCountdown = ({ expiry }: { expiry: string }) => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date().getTime();
            const end = new Date(expiry).getTime();
            const diff = end - now;

            if (diff <= 0) return "Expired";

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            if (days > 0) return `${days}d ${hours}h left`;
            if (hours > 0) return `${hours}h ${mins}m left`;
            return `${mins}m ${secs}s left`;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTime());
        }, 1000);

        setTimeLeft(calculateTime());
        return () => clearInterval(timer);
    }, [expiry]);

    return (
        <div className="bg-primary/10 border-b border-primary/20 py-2 px-6 flex items-center justify-center gap-2 overflow-hidden">
            <Clock className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">
                Trial Access: <span className="font-mono">{timeLeft}</span>
            </span>
        </div>
    );
};

interface SidebarLinkProps {
    to: string;
    icon: any;
    children: React.ReactNode;
    isCollapsed: boolean;
    isAiAssistant?: boolean;
    isActiveHover: boolean;
    onHover: () => void;
    isDraggingSelector: boolean;
}

const SidebarLink = ({ to, icon: Icon, children, isCollapsed, isAiAssistant = false, isActiveHover, onHover, isDraggingSelector }: SidebarLinkProps) => {
    return (
        <NavLink
            to={to}
            end={to === "/dashboard"}
            draggable={false}
            data-sidebar-link="true"
            onPointerEnter={onHover}
            className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${isCollapsed ? "justify-center" : ""}`
            }
        >
            {({ isActive }) => (
                <>
                    {isActiveHover && (
                        <motion.div
                            layoutId="activeSidebarItem"
                            className={`absolute inset-0 rounded-xl transition-all duration-200 pointer-events-none ${isDraggingSelector ? "bg-transparent backdrop-blur-none border border-white/5" : "bg-white/20 backdrop-blur-xl border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.2),0_4_24_rgba(0,0,0,0.5)] group-active:bg-transparent group-active:backdrop-blur-none group-active:shadow-none"}`}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        />
                    )}

                    <div className="relative z-10 flex items-center gap-3">
                        <Icon className={`w-5 h-5 shrink-0 transition-all duration-300 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-white group-hover:scale-105"
                            }`} />

                        <motion.div
                            className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
                        >
                            <span className={`font-medium whitespace-nowrap transition-colors ${isActive ? "text-white font-semibold" : "text-muted-foreground group-hover:text-white"}`}>
                                {children}
                            </span>
                        </motion.div>
                    </div>

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap pointer-events-none shadow-xl translate-x-2 group-hover:translate-x-0">
                            {children}
                        </div>
                    )}
                </>
            )}
        </NavLink>
    );
};

interface MobileSidebarLinkProps {
    to: string;
    icon: any;
    children: React.ReactNode;
    onClick: () => void;
    isActiveHover: boolean;
    onHover: () => void;
    isDraggingSelector: boolean;
}

const MobileSidebarLink = ({ to, icon: Icon, children, onClick, isActiveHover, onHover, isDraggingSelector }: MobileSidebarLinkProps) => (
    <NavLink
        to={to}
        end={to === "/dashboard"}
        draggable={false}
        data-sidebar-link="true"
        onPointerEnter={onHover}
        onClick={(e) => {
            if (isDraggingSelector) e.preventDefault();
            else onClick();
        }}
        className={({ isActive }) =>
            `relative flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 text-lg font-medium group`
        }
    >
        {({ isActive }) => (
            <>
                {isActiveHover && (
                    <motion.div
                        layoutId="mobileActiveSidebarItem"
                        className={`absolute inset-0 rounded-xl transition-all duration-200 pointer-events-none ${isDraggingSelector ? "bg-transparent backdrop-blur-none border border-white/5" : "bg-white/20 backdrop-blur-xl border border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.2),0_4_24_rgba(0,0,0,0.5)] group-active:bg-transparent group-active:backdrop-blur-none group-active:shadow-none"}`}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                )}
                <div className="relative z-10 flex items-center gap-4">
                    <Icon className={`w-6 h-6 shrink-0 transition-all duration-300 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-white group-hover:scale-105"}`} />
                    <span className={`transition-colors ${isActive ? "text-white font-bold" : "text-muted-foreground group-hover:text-white"}`}>{children}</span>
                </div>
            </>
        )}
    </NavLink>
);

const DashboardLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [isDraggingSelector, setIsDraggingSelector] = useState(false);

    const isPlayground = location.pathname === '/playground';

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const sidebarItems = [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/curriculum", icon: BookOpen, label: "Curriculum" },
        { to: "/projects", icon: FolderKanban, label: "Projects" },
        { to: "/playground", icon: Code, label: "Playground" },
        { to: "/feedback", icon: MessageSquare, label: "Feedback" },
        { to: "/ai-assistant", icon: Bot, label: "AI Assistant", isAiAssistant: true },
        ...(user?.role === 'admin' ? [{ to: "/admin", icon: LayoutDashboard, label: "Admin Panel", isAdmin: true }] : []),
        { to: "/settings", icon: Settings, label: "Settings" }
    ];

    const activeItem = sidebarItems.find(item =>
        item.to === "/dashboard"
            ? location.pathname === "/dashboard"
            : location.pathname.startsWith(item.to)
    )?.to || "/dashboard";

    const currentSelectorTarget = hoveredItem || activeItem;

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDraggingSelector(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDraggingSelector) {
            setIsDraggingSelector(false);
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { }
            if (hoveredItem) {
                navigate(hoveredItem);
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDraggingSelector) return;

        const el = document.elementFromPoint(e.clientX, e.clientY);
        const link = el?.closest('a[data-sidebar-link="true"]');

        if (link) {
            const to = link.getAttribute('href');
            if (to && to !== hoveredItem) {
                setHoveredItem(to);
            }
        }
    };

    return (
        <div className="flex h-[100dvh] bg-background overflow-hidden md:p-6 md:gap-6">
            {/* Sidebar - Desktop */}
            <motion.aside
                initial={false}
                animate={{ width: isCollapsed ? 84 : 260 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="hidden md:flex flex-col rounded-3xl border border-white/10 bg-black/20 backdrop-blur-3xl shadow-2xl relative z-50 h-[calc(100vh-2rem)] shrink-0"
            >
                {/* Header with Toggle */}
                <div className="flex items-center justify-between px-4 py-6 mb-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-[#FF7B00] shrink-0 shadow-lg shadow-orange-500/20 flex items-center justify-center">
                            <span className="font-bold text-white text-base font-serif">m</span>
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

                {/* Always Visible Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute top-6 right-[-12px] z-50 p-1.5 rounded-full bg-zinc-900 border border-white/10 text-muted-foreground hover:text-white hover:bg-zinc-800 transition-all shadow-md group"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <PanelLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
                </button>

                <nav
                    className="flex-1 px-3 pt-4 select-none touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                    onPointerLeave={() => {
                        if (!isDraggingSelector) setHoveredItem(null);
                    }}
                >
                    <ul className="space-y-2">
                        {sidebarItems.map((item, index) => (
                            <motion.li
                                key={item.to}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                    delay: 0.1 + index * 0.05,
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 20
                                }}
                            >
                                <SidebarLink
                                    to={item.to}
                                    icon={item.icon}
                                    isCollapsed={isCollapsed}
                                    isAiAssistant={item.isAiAssistant}
                                    isActiveHover={currentSelectorTarget === item.to}
                                    onHover={() => {
                                        if (!isDraggingSelector) setHoveredItem(item.to);
                                    }}
                                    isDraggingSelector={isDraggingSelector}
                                >
                                    {item.isAdmin ? <span className="text-purple-400 font-bold">{item.label}</span> : item.label}
                                </SidebarLink>
                            </motion.li>
                        ))}
                    </ul>
                </nav>

                <div className="p-3 mt-auto mb-4 mx-3 rounded-2xl bg-[#202022] overflow-hidden group/user flex items-center justify-between">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? "justify-center w-full" : ""}`}>
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {user?.name?.charAt(0) || 'U'}
                        </div>

                        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                            <span className="text-[13px] font-medium text-white truncate">{user?.name}</span>
                            <span className="text-[11px] text-muted-foreground truncate">{user?.role === 'admin' ? 'admin' : user?.username}</span>
                        </div>
                    </div>

                    {!isCollapsed && (
                        <button
                            onClick={handleLogout}
                            className="p-2 text-muted-foreground hover:text-white transition-colors"
                            title="Logout"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></svg>
                        </button>
                    )}
                </div>
            </motion.aside>

            {/* Main Content */}
            <main data-lenis-prevent className={`flex-1 relative flex flex-col h-full w-full ${isPlayground ? "overflow-hidden" : "overflow-y-auto"}`}>
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

                {/* Trial Countdown Indicator */}
                {
                    user?.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED' && !(user.purchasedCourses && user.purchasedCourses.length > 0) && (
                        <TrialCountdown expiry={user.trialExpiresAt} />
                    )
                }

                <div className={isPlayground ? "h-full w-full overflow-hidden" : "p-4 md:p-6 max-w-7xl mx-auto pb-40 w-full"}>
                    <Outlet />
                </div>

                {/* Trial Expired Overlay */}
                {
                    user?.trialExpiresAt === 'EXPIRED' && !(user.purchasedCourses && user.purchasedCourses.length > 0) && (
                        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="max-w-md w-full bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-primary to-red-500 animate-pulse" />
                                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <Clock className="w-10 h-10 text-red-400" />
                                </div>
                                <h2 className="text-3xl font-black mb-4">Trial Ended</h2>
                                <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                                    Your trial period has expired. We hope you enjoyed the content! To continue your mastery journey, please upgrade to a full account.
                                </p>
                                <div className="space-y-4">
                                    <button
                                        onClick={() => navigate('/curriculum')}
                                        className="w-full py-4 bg-white text-black font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/10"
                                    >
                                        Get Full Access
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-2 text-muted-foreground hover:text-white text-sm font-bold transition-colors"
                                    >
                                        Logout & Start Over
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </main >

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {
                    isMobileMenuOpen && (
                        <motion.div
                            key="mobile-menu"
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

                            <nav
                                className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 select-none touch-none"
                                onPointerDown={(e) => {
                                    handlePointerDown(e);
                                    // Make sure hoveredItem is initialized so we don't jump to null initially
                                    const el = document.elementFromPoint(e.clientX, e.clientY);
                                    const link = el?.closest('a[data-sidebar-link="true"]');
                                    if (link) {
                                        setHoveredItem(link.getAttribute('href'));
                                    } else {
                                        setHoveredItem(activeItem);
                                    }
                                }}
                                onPointerUp={(e) => {
                                    handlePointerUp(e);
                                    if (isDraggingSelector && hoveredItem && hoveredItem !== activeItem) {
                                        setIsMobileMenuOpen(false);
                                    }
                                }}
                                onPointerMove={handlePointerMove}
                                onPointerLeave={() => {
                                    if (!isDraggingSelector) setHoveredItem(null);
                                }}
                            >
                                {sidebarItems.map((item, index) => (
                                    <MobileSidebarLink
                                        key={item.to}
                                        to={item.to}
                                        icon={item.icon}
                                        isActiveHover={currentSelectorTarget === item.to}
                                        onHover={() => {
                                            if (!isDraggingSelector) setHoveredItem(item.to);
                                        }}
                                        isDraggingSelector={isDraggingSelector}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {item.isAdmin ? <span className="text-purple-400 font-bold">{item.label}</span> : item.label}
                                    </MobileSidebarLink>
                                ))}

                                <div className="mt-auto pt-8 border-t border-white/5">
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-4 px-6 py-4 text-lg font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition"
                                    >
                                        <LogOut className="w-6 h-6" />
                                        Logout
                                    </button>
                                </div>
                            </nav>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {location.pathname !== '/ai-assistant' && <AIAssistant />}
        </div >
    );
};

export default DashboardLayout;
