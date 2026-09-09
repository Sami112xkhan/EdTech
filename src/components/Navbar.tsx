import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Terminal, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOffer } from "../context/OfferContext";
import { motion, AnimatePresence } from "motion/react";

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const { isAuthenticated } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated) return;
        fetch('/api/notifications', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') } })
            .then(r => r.json())
            .then(d => setNotifications(d || []))
            .catch(() => {});
    }, [isAuthenticated]);

    const unread = notifications.filter(n => !n.read).length;

    if (!isAuthenticated || notifications.length === 0) return null;

    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
                <Bell className="w-4.5 h-4.5 text-[#86868b]" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full">
                        {unread}
                    </span>
                )}
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50">
                        <div className="p-3 border-b border-white/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Notifications</h3>
                        </div>
                        <div className="p-2 space-y-1">
                            {notifications.map(n => (
                                <button
                                    key={n.id}
                                    onClick={async () => {
                                        if (!n.read) {
                                            await fetch(`/api/notifications/${n.id}/read`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') } });
                                            setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, read: true } : p));
                                        }
                                    }}
                                    className={`w-full text-left p-3 rounded-xl transition-colors ${n.read ? 'bg-transparent hover:bg-white/5' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{n.title}</p>
                                            <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                                            <p className="text-[10px] text-white/30 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const Navbar: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isAuthenticated, user, logout } = useAuth();
    const { isOfferActive } = useOffer();
    const location = useLocation();

    const navLinks = [
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
        ...(!isAuthenticated ? [{ name: "Login", path: "/login" }] : [])
    ];

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-[1080px] mx-auto px-6 h-14 flex items-center justify-between">
                    {/* Logo — slightly bigger for education brand */}
                    <Link
                        to="/"
                        onClick={(e) => {
                            if (location.pathname === "/") {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                        }}
                        className="flex items-center gap-2.5 shrink-0"
                    >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Terminal className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-[17px] font-semibold text-white/90 tracking-tight">
                            DevMastery
                        </span>
                    </Link>

                    {/* Desktop Nav — 15px links, comfortable spacing */}
                    <div className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`text-[15px] leading-none transition-colors ${
                                    location.pathname === link.path
                                        ? "text-white font-medium"
                                        : "text-[#86868b] hover:text-white"
                                }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="hidden md:flex items-center gap-4 shrink-0">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-3">
                                {user?.streak && user.streak > 0 && (
                                    <span className="text-[14px] text-orange-400 font-medium">
                                        {user.streak}
                                    </span>
                                )}
                                <NotificationBell />
                                <Link
                                    to="/dashboard"
                                    className="px-5 py-2 rounded-full bg-[#2997ff] text-white text-[15px] font-medium hover:bg-[#0071e3] transition-colors"
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={logout}
                                    className="text-[15px] text-[#86868b] hover:text-white transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/checkout"
                                className="px-5 py-2 rounded-full bg-[#2997ff] text-white text-[15px] font-medium hover:bg-[#0071e3] transition-colors"
                            >
                                {isOfferActive ? 'Get Started' : 'Buy'}
                            </Link>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden text-white p-2 -mr-2"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 top-14 z-40 bg-black/95 backdrop-blur-2xl"
                    >
                        <div className="max-w-[1080px] mx-auto px-6 py-8 flex flex-col">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className="py-4 border-b border-white/[0.06] text-[17px] text-white/80 hover:text-white transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="mt-8">
                                {isAuthenticated ? (
                                    <div className="flex flex-col gap-3">
                                        <Link
                                            to="/dashboard"
                                            className="py-3.5 rounded-full bg-[#2997ff] text-center text-[17px] font-medium text-white"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            Dashboard
                                        </Link>
                                        <button
                                            onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                                            className="py-3 text-center text-[17px] text-[#86868b]"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                ) : (
                                    <Link
                                        to="/checkout"
                                        className="block py-3.5 rounded-full bg-[#2997ff] text-center text-[17px] font-medium text-white"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {isOfferActive ? 'Get Started' : 'Buy'}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
