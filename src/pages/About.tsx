import React from "react";
import { motion } from "motion/react";
import { Terminal, Users, Zap, Shield, ChevronRight, Sparkles, ChevronLeft, User } from "lucide-react";
import { Link } from "react-router-dom";
import LiquidGlass from "../components/LiquidGlass";
import GradientText from "../components/GradientText";
import ColorBends from "../components/ColorBends";

const About: React.FC = () => {
    return (
        <div className="min-h-screen relative w-full overflow-hidden">
            {/* Full-width Animated Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <ColorBends
                    colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
                    rotation={0}
                    speed={0.2}
                    scale={1}
                    frequency={1}
                    warpStrength={1}
                    mouseInfluence={1}
                    parallax={0.5}
                    noise={0.1}
                    transparent
                    autoRotate={0}
                />
            </div>

            <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto relative z-10">
                {/* Fallback ambient background elements behind cards */}
                <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

                {/* Back Button */}
                <div className="max-w-4xl mx-auto mb-8">
                    <Link to="/" className="inline-block">
                        <LiquidGlass borderRadius={40} borderWidth={0.2} opacity={0.5} width="auto" height="auto" className="pl-3 pr-5 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors group">
                            <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">Back</span>
                        </LiquidGlass>
                    </Link>
                </div>

                <div className="max-w-4xl mx-auto space-y-16">

                    {/* Hero Section */}
                    <div className="text-center space-y-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm font-medium text-purple-300"
                        >
                            <Terminal className="w-4 h-4" />
                            <span>Our Mission</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-5xl md:text-6xl font-black tracking-tight"
                        >
                            Building the Next Generation of <br />
                            <GradientText colors={["#5227FF", "#FF9FFC", "#B19EEF"]} animationSpeed={4}>
                                Unstoppable Developers
                            </GradientText>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto"
                        >
                            DevMastery Academy was founded on a simple premise: traditional education is too slow for the modern tech landscape. We combine elite curriculum with AI to accelerate your path to Senior Developer.
                        </motion.p>
                    </div>

                    {/* Core Philosophy Section - Glass Surface */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                    >
                        <LiquidGlass
                            borderRadius={30}
                            borderWidth={0.2}
                            opacity={0.5}
                            className="p-8 md:p-12 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

                            <div className="relative z-10 flex flex-col gap-16">
                                <div className="space-y-6 max-w-3xl mx-auto text-center">
                                    <h2 className="text-3xl md:text-5xl font-bold text-white">Why We Exist</h2>
                                    <p className="text-muted-foreground leading-relaxed md:text-lg">
                                        The gap between learning syntax and shipping production code is massive. Most bootcamps leave you exactly there—knowing how to write a loop, but completely lost when configuring a scalable backend or managing global state.
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed md:text-lg">
                                        We bridge that gap. By putting you directly into complex, real-world architectures with an ever-present AI mentor, you don't just learn to code. You learn to engineer.
                                    </p>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6 w-full">
                                    {/* Card 1: Fast-Tracked */}
                                    <LiquidGlass borderRadius={24} borderWidth={0.2} opacity={0.5} className="!block p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-500" />
                                        <Zap className="absolute -bottom-6 -right-6 w-32 h-32 text-blue-500/5 group-hover:text-blue-500/10 transition-colors duration-500 rotate-12" />

                                        <div className="relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                                <Zap className="w-6 h-6 text-blue-400" />
                                            </div>
                                            <h3 className="font-bold text-white text-2xl mb-3 tracking-tight">Fast-Tracked</h3>
                                            <p className="text-white/60 leading-relaxed md:text-base">
                                                Skip the academic fluff. Learn exactly what the industry demands and get production-ready in record time.
                                            </p>
                                        </div>
                                    </LiquidGlass>

                                    {/* Card 2: Community */}
                                    <LiquidGlass borderRadius={24} borderWidth={0.2} opacity={0.5} className="!block p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-500" />
                                        <Users className="absolute -bottom-6 -right-6 w-32 h-32 text-purple-500/5 group-hover:text-purple-500/10 transition-colors duration-500 -rotate-12" />

                                        <div className="relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                                                <Users className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <h3 className="font-bold text-white text-2xl mb-3 tracking-tight">Elite Network</h3>
                                            <p className="text-white/60 leading-relaxed md:text-base">
                                                Code alongside ambitious builders. Share architectures, review code, and grow together in a high-signal environment.
                                            </p>
                                        </div>
                                    </LiquidGlass>

                                    {/* Card 3: Production Ready */}
                                    <LiquidGlass borderRadius={24} borderWidth={0.2} opacity={0.5} className="!block p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-colors duration-500" />
                                        <Shield className="absolute -bottom-6 -right-6 w-32 h-32 text-green-500/5 group-hover:text-green-500/10 transition-colors duration-500 rotate-12" />

                                        <div className="relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/5 border border-green-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                                <Shield className="w-6 h-6 text-green-400" />
                                            </div>
                                            <h3 className="font-bold text-white text-2xl mb-3 tracking-tight">Production Ready</h3>
                                            <p className="text-white/60 leading-relaxed md:text-base">
                                                Build systems, not scripts. Master Docker, CI/CD, and scalable cloud architectures from day one.
                                            </p>
                                        </div>
                                    </LiquidGlass>

                                    {/* Card 4: AI Powered */}
                                    <LiquidGlass borderRadius={24} borderWidth={0.2} opacity={0.5} className="!block p-8 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-colors duration-500" />
                                        <Sparkles className="absolute -bottom-6 -right-6 w-32 h-32 text-yellow-500/5 group-hover:text-yellow-500/10 transition-colors duration-500 -rotate-12" />

                                        <div className="relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 border border-yellow-500/20 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                                <Sparkles className="w-6 h-6 text-yellow-400" />
                                            </div>
                                            <h3 className="font-bold text-white text-2xl mb-3 tracking-tight">AI Mentorship</h3>
                                            <p className="text-white/60 leading-relaxed md:text-base">
                                                Stuck on a bug? Your personal AI Senior Developer is available 24/7 to unlbock you and review your approach.
                                            </p>
                                        </div>
                                    </LiquidGlass>
                                </div>
                            </div>
                        </LiquidGlass>
                    </motion.div>

                    {/* Call to Action */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="text-center pt-10"
                    >
                        <h2 className="text-2xl md:text-3xl font-bold mb-6">Ready to join the elite?</h2>
                        <Link
                            to="/checkout"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-all shadow-xl shadow-white/20"
                        >
                            Secure Your Spot Today
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </motion.div>

                </div>
            </div>
        </div>
    );
};

export default About;
