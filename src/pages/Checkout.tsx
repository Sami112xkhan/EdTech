
import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, CreditCard, Lock } from "lucide-react";
import Navbar from "../components/Navbar";

const Checkout: React.FC = () => {
    return (
        <div className="min-h-screen relative bg-background">
            <Navbar />
            <div className="flex items-center justify-center p-4 pt-24 min-h-screen">
                <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">

                    {/* Left: Product Info */}
                    <div className="space-y-6">
                        <h1 className="text-4xl font-bold leading-tight">Complete your enrollment</h1>
                        <p className="text-muted-foreground text-lg">You are one step away from becoming a job-ready Full Stack Developer.</p>

                        <div className="space-y-4">
                            {[
                                "Lifetime Access to Course Content",
                                "AI Mentor Support (Beta)",
                                "5 Real World Projects",
                                "Certificate of Completion",
                                "Discord Community Access"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Secure payment via Gumroad</span>
                        </div>
                    </div>

                    {/* Right: Payment Card */}
                    <div className="bg-secondary/30 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-xl font-bold">Full Stack Mastery</h3>
                                <p className="text-sm text-muted-foreground">One-time payment</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold">₹10,000</div>
                                <div className="text-xs text-muted-foreground line-through">₹15,000</div>
                            </div>
                        </div>

                        <div className="h-px bg-white/10 mb-8" />

                        {/* Simulated Gumroad Button */}
                        <a
                            href="https://devmastery1.gumroad.com/l/mobtax"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 rounded-lg bg-[#ff90e8] hover:bg-[#ff90e8]/90 text-black font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                        >
                            <CreditCard className="w-5 h-5" />
                            Secure Your Spot
                        </a>

                        <div className="text-center mt-6">
                            <p className="text-sm text-muted-foreground mb-2">Have an access code?</p>
                            <Link
                                to="/login"
                                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                            >
                                <Lock className="w-3 h-3" />
                                Login to Redeem Code
                            </Link>
                        </div>

                        <p className="text-center text-xs text-muted-foreground mt-6 border-t border-white/5 pt-4">
                            By purchasing, you agree to our Terms of Service.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Checkout;
