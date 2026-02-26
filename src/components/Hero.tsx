
import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import GradientText from "./GradientText";
import GlassSurface from "./GlassSurface";


const Hero: React.FC = () => {
    const currentPrice = 10000;

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-36 md:pt-32 overflow-hidden">
            {/* Background Elements */}


            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none z-0 opacity-50">
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
            </div>

            <div className="container max-w-6xl mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-block mb-8"
                >
                    <GlassSurface
                        borderRadius={40}
                        borderWidth={0.2}
                        width="auto"
                        height="auto"
                        className="px-5 py-2" // Padding handled by GlassSurface content usually, but let's check CSS. 
                        // The CSS has .glass-surface__content { padding: 0.5rem; }
                        // I'll add horizontal padding via className to parent or let GlassSurface handle it?
                        // The user said "make it fixed" - I'll try to match the previous look but with the glass effect.
                        opacity={0.5}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-medium text-gray-300">New AI-Powered Curriculum 2026</span>
                        </div>
                    </GlassSurface>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
                >
                    Become a <GradientText
                        colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
                        animationSpeed={3}
                        showBorder={false}
                        className="inline-flex text-5xl md:text-7xl font-bold tracking-tight px-0"
                    >
                        Full Stack Developer
                    </GradientText>
                    <br /> in One Comprehensive Course.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10"
                >
                    Master Python, React, Backend, Database, Deployment, and build a real-world Portfolio.
                    Lifetime access + AI Mentor for a single price.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20"
                >
                    <div className="relative group">
                        <Link
                            to="/checkout"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-lg shadow-xl shadow-primary/25 transition-all hover:scale-105 flex items-center justify-center gap-2 relative z-10"
                        >
                            Secure Your Spot — ₹{currentPrice.toLocaleString()}
                            <ArrowRight className="w-5 h-5" />
                        </Link>

                        {/* Glass Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                            <GlassSurface
                                borderRadius={15}
                                borderWidth={0.1}
                                opacity={0.6}
                                backgroundOpacity={0.6}
                                blur={10}
                                className="p-4 shadow-xl"
                            >
                                <p className="text-xs text-center text-white/90 font-medium leading-relaxed">
                                    Secure your spot today to unlock premium content and accelerate your journey to becoming a professional developer.
                                </p>
                            </GlassSurface>
                            {/* Arrow/Triangle for tooltip */}
                            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white/20 absolute left-1/2 -translate-x-1/2 top-full"></div>
                        </div>
                    </div>

                    <a
                        href="#curriculum"
                        className="w-full sm:w-auto px-8 py-4 rounded-full glass hover:bg-white/10 text-white font-medium text-lg transition-all flex items-center justify-center"
                    >
                        View Curriculum
                    </a>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 text-left"
                >
                    {[
                        "Lifetime Access",
                        "AI-Powered Support",
                        "Production-Grade Projects",
                        "Certificate of Completion"
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
                            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                            <span className="font-medium text-sm">{feature}</span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
