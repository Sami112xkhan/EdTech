import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useOffer } from "../context/OfferContext";

const Hero: React.FC = () => {
    const { isOfferActive } = useOffer();

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-16 pb-20 overflow-hidden">
            <div className="max-w-[1080px] mx-auto px-6 relative z-10 text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8"
                >
                    <span className="inline-block text-[18px] font-light tracking-wide text-[#6e6e73]">
                        New AI-Powered Curriculum 2026
                    </span>
                </motion.div>

                {/* Hero headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                    className="text-[clamp(42px,8vw,96px)] font-semibold leading-[1.04] tracking-[-0.03em] text-white mb-4"
                >
                    Become a
                </motion.h1>
                <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="text-[clamp(42px,8vw,96px)] font-semibold leading-[1.04] tracking-[-0.03em] text-white mb-4"
                >
                    Developer
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
                    className="text-[clamp(28px,5vw,52px)] font-light leading-[1.1] tracking-[-0.02em] text-[#86868b] mb-10"
                >
                    in our Specialized Tracks.
                </motion.p>

                {/* Lead */}
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    className="text-[clamp(18px,2.5vw,28px)] font-light leading-[1.4] text-[#86868b] max-w-[720px] mx-auto mb-14"
                >
                    Master Full Stack Web Development, Data Science, Cybersecurity, or Cloud Computing.
                    Build real-world portfolios with Lifetime access and AI Mentorship.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.65, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col items-center gap-5 relative z-20"
                >
                    <div className="relative">
                        {isOfferActive && (
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm text-[#ff6b35] font-medium whitespace-nowrap">
                                Limited Offer -- Save Rs.5,000
                            </span>
                        )}
                        <Link
                            to="/checkout?course=fullstack"
                            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#2997ff] text-white text-[19px] font-medium leading-none hover:bg-[#0071e3] active:scale-[0.98] transition-all"
                        >
                            Full Stack + AI Bundle -- Rs.10,000
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap justify-center">
                        <Link
                            to="/checkout?course=datascience"
                            className="px-6 py-3 rounded-full border border-[#2997ff]/40 text-[#2997ff] text-[17px] font-normal leading-none hover:bg-[#2997ff]/10 active:scale-[0.98] transition-all"
                        >
                            Data Science -- Rs.8,000
                        </Link>
                        <Link
                            to="/checkout?course=cyber"
                            className="px-6 py-3 rounded-full border border-[#2997ff]/40 text-[#2997ff] text-[17px] font-normal leading-none hover:bg-[#2997ff]/10 active:scale-[0.98] transition-all"
                        >
                            Cyber Security -- Rs.5,000
                        </Link>
                        <Link
                            to="/checkout?course=cloudcomputing"
                            className="px-6 py-3 rounded-full border border-[#2997ff]/40 text-[#2997ff] text-[17px] font-normal leading-none hover:bg-[#2997ff]/10 active:scale-[0.98] transition-all"
                        >
                            Cloud Computing -- Rs.11,500
                        </Link>
                    </div>

                    <a
                        href="#curriculum"
                        className="text-[#2997ff] text-[17px] font-normal leading-none mt-2 hover:underline"
                    >
                        View Curriculum
                    </a>
                </motion.div>

                {/* Features */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1 }}
                    className="mt-28 flex items-center justify-center gap-8 md:gap-14 flex-wrap"
                >
                    {[
                        "Lifetime Access",
                        "AI-Powered Support",
                        "Real-World Projects",
                        "Certificate"
                    ].map((feature, i) => (
                        <motion.span
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 1.1 + i * 0.1 }}
                            className="text-[14px] font-normal text-[#6e6e73] tracking-[-0.01em]"
                        >
                            {feature}
                        </motion.span>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
