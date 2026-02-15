
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Terminal } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion } from "motion/react";
import GlassSurface from "./GlassSurface";

const Navbar: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Home", path: "/" },
        { name: "AI Assistant", path: "/ai-assistant" },
    ];

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
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link, i) => (
                            <motion.div
                                key={link.name}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                            >
                                <Link
                                    to={link.path}
                                    className="text-sm font-medium text-muted-foreground hover:text-white transition-colors"
                                >
                                    {link.name}
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className="px-5 py-2 rounded-full glass-hover bg-white/5 border border-white/10 text-sm font-medium"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                                    Login
                                </Link>
                                <a
                                    href="https://devmastery1.gumroad.com/l/mobtax"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-105"
                                >
                                    Secure Your Spot
                                </a>
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
                            <Link
                                key={link.name}
                                to={link.path}
                                className="text-lg font-medium text-muted-foreground hover:text-white py-3 px-4 rounded-lg hover:bg-white/5 transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="h-px bg-white/10 my-2 mx-4" />
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className="mx-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-center font-bold text-white shadow-lg shadow-purple-500/25"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <div className="flex flex-col gap-3 px-4">
                                <Link
                                    to="/login"
                                    className="w-full py-3 text-center text-muted-foreground hover:text-white font-medium hover:bg-white/5 rounded-lg transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <a
                                    href="https://devmastery1.gumroad.com/l/mobtax"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 rounded-xl bg-white text-black font-bold text-center shadow-lg hover:bg-gray-100 transition-colors"
                                >
                                    Secure Your Spot — ₹10,000
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </GlassSurface>
    );
};

export default Navbar;
