
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Terminal, Flame } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion } from "motion/react";
import GlassSurface from "./GlassSurface";

const Navbar: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
        { name: "AI Assistant", path: "/ai-assistant" },
    ];

    const activeLink = navLinks.find(link => link.path === location.pathname)?.name || navLinks[0].name;
    const currentDesktopPill = isDragging ? activeLink : (hoveredTab || activeLink);

    return (
        <GlassSurface
            borderRadius={isMobileMenuOpen ? 24 : 50}
            borderWidth={0.2}
            opacity={isMobileMenuOpen ? 0.95 : 0.6}
            backgroundOpacity={isMobileMenuOpen ? 0.9 : 0.4}
            blur={isMobileMenuOpen ? 40 : 15}
            className={`!fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 w-[92%] md:w-fit md:min-w-[650px] md:max-w-3xl shadow-2xl shadow-black/20 ${isMobileMenuOpen ? "bg-black/80" : ""}`}
        >
            <div className="w-full flex flex-col">
                <div className="w-full max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between shrink-0">
                    {/* Logo */}
                    <Link
                        to="/"
                        onClick={(e) => {
                            setIsMobileMenuOpen(false);
                            if (location.pathname === "/") {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                        }}
                        className="flex items-center gap-3 group"
                    >
                        <motion.div
                            initial={{ rotate: 0 }}
                            whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ duration: 0.5 }}
                            className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all overflow-hidden border border-white/10"
                        >
                            <motion.div
                                animate={{ opacity: [0.8, 1, 0.8] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            >
                                <Terminal className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </motion.div>
                        </motion.div>

                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 group-hover:to-white transition-all">
                                DevMastery
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors font-semibold">
                                Academy
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-2 relative z-30" onMouseLeave={() => setHoveredTab(null)}>
                        {navLinks.map((link, i) => (
                            <motion.div
                                key={link.name}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="relative flex-shrink-0"
                                onMouseEnter={() => !isDragging && setHoveredTab(link.name)}
                            >
                                {currentDesktopPill === link.name && (
                                    <motion.div
                                        layoutId="desktop-nav-pill"
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={1}
                                        onDragStart={() => setIsDragging(true)}
                                        onDragEnd={(_, info) => {
                                            setIsDragging(false);
                                            const threshold = 40;
                                            const velocityThreshold = 500;
                                            const currentIndex = navLinks.findIndex(l => l.name === link.name);

                                            if ((info.offset.x > threshold || info.velocity.x > velocityThreshold) && currentIndex < navLinks.length - 1) {
                                                navigate(navLinks[currentIndex + 1].path);
                                            } else if ((info.offset.x < -threshold || info.velocity.x < -velocityThreshold) && currentIndex > 0) {
                                                navigate(navLinks[currentIndex - 1].path);
                                            }
                                        }}
                                        whileDrag={{
                                            opacity: 0.9,
                                            scale: 1.1,
                                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                                            backdropFilter: "blur(0px)",
                                            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                                            cursor: "grabbing"
                                        }}
                                        whileTap={{ scale: 1.05 }}
                                        className="absolute inset-0 bg-white/20 backdrop-blur-2xl rounded-full border border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8_32_rgba(0,0,0,0.3)] cursor-grab active:cursor-grabbing z-0"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        style={{ touchAction: "none" }}
                                    />
                                )}
                                <Link
                                    to={link.path}
                                    className={`relative z-10 block px-4 py-2 text-sm font-medium transition-colors ${currentDesktopPill === link.name ? "text-white" : "text-muted-foreground hover:text-white"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-3">
                                {/* Gamification Stats */}
                                <div className="hidden lg:flex items-center gap-4 mr-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                                    <div className="flex items-center gap-1.5" title="Daily Streak">
                                        <Flame className={`w-4 h-4 ${user?.streak && user.streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-muted-foreground'}`} />
                                        <span className={`text-sm font-bold ${user?.streak && user.streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>{user?.streak || 0}</span>
                                    </div>
                                    <div className="w-px h-4 bg-white/10" />
                                    <div className="flex items-center gap-1.5" title="Level">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">LVL</span>
                                        <span className="text-sm font-bold text-indigo-400">{user?.level || 1}</span>
                                    </div>
                                </div>

                                <Link
                                    to="/dashboard"
                                    className="px-5 py-2 rounded-full glass-hover bg-white/5 border border-white/10 text-sm font-medium"
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={logout}
                                    className="px-5 py-2 rounded-full glass-hover bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/20 transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                                    Login
                                </Link>
                                <Link
                                    to="/checkout"
                                    className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-105"
                                >
                                    Secure Your Spot
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden text-white p-2"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden w-full border-t border-white/10 p-4 pb-6 flex flex-col gap-2 animate-in slide-in-from-top-4 fade-in-0">
                        {navLinks.map((link) => (
                            <div
                                key={link.name}
                                className="relative"
                                onMouseEnter={() => !isDragging && setHoveredTab(link.name)}
                                onMouseLeave={() => setHoveredTab(null)}
                            >
                                {currentDesktopPill === link.name && (
                                    <motion.div
                                        layoutId="mobile-nav-pill"
                                        drag="y"
                                        dragConstraints={{ top: 0, bottom: 0 }}
                                        dragElastic={1}
                                        onDragStart={() => setIsDragging(true)}
                                        onDragEnd={(_, info) => {
                                            setIsDragging(false);
                                            const threshold = 20;
                                            const velocityThreshold = 300;
                                            const currentIndex = navLinks.findIndex(l => l.name === link.name);

                                            if ((info.offset.y > threshold || info.velocity.y > velocityThreshold) && currentIndex < navLinks.length - 1) {
                                                navigate(navLinks[currentIndex + 1].path);
                                                setIsMobileMenuOpen(false);
                                            } else if ((info.offset.y < -threshold || info.velocity.y < -velocityThreshold) && currentIndex > 0) {
                                                navigate(navLinks[currentIndex - 1].path);
                                                setIsMobileMenuOpen(false);
                                            }
                                        }}
                                        whileDrag={{
                                            opacity: 0.9,
                                            scale: 1.02,
                                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                                            backdropFilter: "blur(0px)",
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                                            cursor: "grabbing"
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        className="absolute inset-0 bg-white/20 backdrop-blur-2xl border border-white/40 rounded-full shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8_32_rgba(0,0,0,0.3)] cursor-grab active:cursor-grabbing z-0"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        style={{ touchAction: "none" }}
                                    />
                                )}
                                <Link
                                    to={link.path}
                                    className={`relative block text-lg font-medium py-3 px-4 transition-colors z-10 text-center ${currentDesktopPill === link.name ? "text-white" : "text-muted-foreground hover:text-white"
                                        }`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <span className="relative z-10">{link.name}</span>
                                </Link>
                            </div>
                        ))}
                        <div className="h-px bg-white/10 my-2 mx-4" />
                        {isAuthenticated ? (
                            <div className="flex flex-col gap-3 px-4">
                                <Link
                                    to="/dashboard"
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-center font-bold text-white shadow-lg shadow-purple-500/25"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Go to Dashboard
                                </Link>
                                <button
                                    onClick={() => {
                                        logout();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full py-3 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 font-bold text-center"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 px-4">
                                <Link
                                    to="/login"
                                    className="w-full py-3 text-center text-muted-foreground hover:text-white font-medium hover:bg-white/5 rounded-lg transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/checkout"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full py-3 rounded-xl bg-white text-black font-bold text-center shadow-lg hover:bg-gray-100 transition-colors"
                                >
                                    Secure Your Spot — ₹10,000
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </GlassSurface>
    );
};

export default Navbar;
