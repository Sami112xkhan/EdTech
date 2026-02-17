
import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, CreditCard, Lock } from "lucide-react";
import Navbar from "../components/Navbar";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { initializePayment } from "../utils/razorpay";

const Checkout: React.FC = () => {
    const { user, completePurchase, redeemCode } = useAuth();
    const navigate = useNavigate();
    const [accessCode, setAccessCode] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [redeemMessage, setRedeemMessage] = React.useState("");

    const handleRedeem = async () => {
        if (!accessCode) return;
        setLoading(true);
        setRedeemMessage("");

        // Simulating async delay for effect
        await new Promise(r => setTimeout(r, 600));

        const result = redeemCode(accessCode);
        setLoading(false);
        setRedeemMessage(result.message);

        if (result.success) {
            // If lifetime, go dashboard
            // If trial, go dashboard (timer will start)
            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        }
    };

    const handlePayment = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        await initializePayment(
            10, // Amount in INR
            {
                name: user.name,
                email: user.email,
            },
            (response) => {
                console.log("Payment Success:", response);
                completePurchase(); // Mark user as paid
                navigate('/dashboard');
            },
            (error) => {
                console.error("Payment Failed:", error);
                alert("Payment Failed. Please try again.");
            }
        );
    };

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
                            <span>Secure payment via Razorpay</span>
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
                                <div className="text-3xl font-bold">₹10</div>
                                <div className="text-xs text-muted-foreground line-through">₹15,000</div>
                            </div>
                        </div>

                        <div className="h-px bg-white/10 mb-8" />

                        {/* Razorpay Button */}
                        <button
                            onClick={handlePayment}
                            className="w-full py-4 rounded-lg bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                        >
                            <CreditCard className="w-5 h-5" />
                            Pay Now - ₹10
                        </button>

                        <div className="text-center mt-6">
                            <p className="text-sm text-muted-foreground mb-2">Have an access code?</p>
                            {user ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Enter Code (e.g. TRIAL5 or TRIAL3)"
                                            className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                                            value={accessCode}
                                            onChange={(e) => setAccessCode(e.target.value)}
                                        />
                                        <button
                                            onClick={handleRedeem}
                                            disabled={loading}
                                            className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2 text-sm transition-colors"
                                        >
                                            {loading ? "..." : "Apply"}
                                        </button>
                                    </div>
                                    {redeemMessage && (
                                        <p className={`text-xs ${redeemMessage.includes("Granted") || redeemMessage.includes("Activated") ? "text-green-400" : "text-red-400"}`}>
                                            {redeemMessage}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                                >
                                    <Lock className="w-3 h-3" />
                                    Login to Redeem Code
                                </Link>
                            )}
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
