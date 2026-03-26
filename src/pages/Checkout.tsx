import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, CreditCard, Lock, ChevronDown, ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar";

import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOffer } from "../context/OfferContext";
import { initializePayment } from "../utils/razorpay";
import { useActiveCourse } from "../hooks/useActiveCourse";

const Checkout: React.FC = () => {
    const { user, completePurchase, redeemCode } = useAuth();
    const { isOfferActive } = useOffer();
    const navigate = useNavigate();
    const [accessCode, setAccessCode] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [redeemMessage, setRedeemMessage] = React.useState("");

    const [searchParams] = useSearchParams();
    const courseParam = searchParams.get('course') || '';
    const [selectedCourse, setSelectedCourse] = React.useState(courseParam);
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

    React.useEffect(() => {
        if (searchParams.get('course')) {
            setSelectedCourse(searchParams.get('course')!);
        }
    }, [searchParams]);

    // Dynamic Product Configuration
    const courseDetails = {
        'fullstack': {
            title: isOfferActive ? "Full Stack + AI Course Bundle" : "Full Stack Web Dev",
            badge: isOfferActive ? "🔥 Limited 2-Day Offer" : undefined,
            price: 15000,
            salePrice: isOfferActive ? 10000 : 8000,
            features: isOfferActive ? [
                "Lifetime Access to Full Stack Content",
                "🆕 AI & Machine Learning Course Included",
                "Frontend & Backend Deep Dive",
                "AI Mentor Support (Beta)",
                "5+ Real World Projects",
                "Certificate of Completion",
                "Discord Community Access"
            ] : [
                "Lifetime Access to Full Stack Content",
                "Frontend & Backend Deep Dive",
                "AI Mentor Support (Beta)",
                "5+ Real World Projects",
                "Certificate of Completion",
                "Discord Community Access"
            ]
        },
        'cyber': {
            title: "90 Days Cyber Security",
            price: 8000,
            salePrice: 5000,
            features: [
                "90 Days Intensive Training",
                "Ethical Hacking Workshops",
                "Linux & Networking Deep Dive",
                "Certificate of Completion",
                "Discord Community Access"
            ]
        },
        'datascience': {
            title: "Data Science Specialization",
            price: 12000,
            salePrice: 8000,
            features: [
                "Complete ML & Math Foundation",
                "Python & Data Wrangling Projects",
                "Advanced Data Visualization",
                "Certificate of Completion",
                "Discord Community Access"
            ]
        },
        'ai_upgrade': {
            title: "AI Course Upgrade",
            badge: "✨ Exclusive for Full Stack Students",
            price: 5000,
            salePrice: 2000,
            features: [
                "Complete AI & ML Course Content",
                "Builds on Your Full Stack Skills",
                "Hands-on AI Projects",
                "Early Access to New AI Modules",
                "Discord Community Access"
            ]
        }
    };

    const [, setActiveCourse] = useActiveCourse();
    const currentCourse = selectedCourse ? courseDetails[selectedCourse as keyof typeof courseDetails] : null;

    const handleRedeem = async () => {
        if (!accessCode || !selectedCourse) return;
        setLoading(true);
        setRedeemMessage("");

        // Simulating async delay for effect
        await new Promise(r => setTimeout(r, 600));

        const result = await redeemCode(accessCode, selectedCourse);
        setLoading(false);
        setRedeemMessage(result.message);

        if (result.success) {
            // Auto-switch active course to the one just redeemed
            setActiveCourse(selectedCourse as any);

            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        }
    };

    const handlePayment = async () => {
        if (!currentCourse) return;

        if (!user) {
            navigate('/login');
            return;
        }

        await initializePayment(
            currentCourse.salePrice, // Dynamic Amount in INR
            {
                name: user.name,
                email: user.email,
            },
            (response) => {
                console.log("Payment Success:", response);
                completePurchase(selectedCourse === 'ai_upgrade' ? 'ai_upgrade' : selectedCourse); // Grant specific course
                navigate('/dashboard');
            },
            (error) => {
                console.error("Payment Failed:", error);
                alert("Payment Failed. Please try again.");
            }
        );
    };

    return (
        <div className="min-h-[100dvh] relative bg-background">
            <Link
                to="/"
                className="fixed top-6 left-6 z-[60] flex items-center gap-2 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95 group shadow-2xl"
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-xs font-black uppercase tracking-widest leading-none">Back</span>
            </Link>
            <Navbar />
            <div className="flex items-center justify-center p-4 pt-24 min-h-[100dvh]">
                <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">

                    {/* Left: Product Info */}
                    <div className="space-y-6">
                        <div className="relative w-full sm:w-80 mt-2 z-50">
                            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                Select Track
                            </label>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`w-full flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all shadow-lg ${isDropdownOpen ? 'ring-2 ring-primary/50 border-white/20' : ''}`}
                            >
                                <span className={`font-semibold ${!currentCourse ? 'text-muted-foreground' : 'text-white'}`}>
                                    {currentCourse ? currentCourse.title : "Choose Course..."}
                                </span>
                                <div className={`p-1.5 rounded-full transition-colors ${isDropdownOpen ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'}`}>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#1a1a1a]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl shadow-black/50 z-50 flex flex-col py-2 px-2">
                                        {Object.entries(courseDetails)
                                            .filter(([key]) => {
                                                const purchased = user?.purchasedCourses || [];
                                                // If user is on trial (or trial expired), they haven't truly purchased — show all courses
                                                const isTrialUser = user?.trialExpiresAt;
                                                // Only hide courses that were permanently purchased (not trial)
                                                if (!isTrialUser) {
                                                    if (key === 'fullstack' && purchased.includes('fullstack')) return false;
                                                    if (key === 'cyber' && purchased.includes('cyber')) return false;
                                                    if (key === 'datascience' && purchased.includes('datascience')) return false;
                                                }
                                                // Show ai_upgrade only if user has permanently purchased ANY course but not ai yet
                                                if (key === 'ai_upgrade') {
                                                    if (!isOfferActive) return false; // Offer is inactive
                                                    if (isTrialUser) return false; // trial users haven't paid, no upgrade path
                                                    const hasAnyCourse = purchased.includes('fullstack') || purchased.includes('cyber') || purchased.includes('datascience');
                                                    return hasAnyCourse && !purchased.includes('ai');
                                                }
                                                return true;
                                            })
                                            .map(([key, course]) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    setSelectedCourse(key);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-5 py-4 transition-colors rounded-3xl flex justify-between items-center group ${selectedCourse === key ? 'bg-primary/20' : 'hover:bg-white/10'}`}
                                            >
                                                <div className={`font-bold transition-colors ${selectedCourse === key ? 'text-primary' : 'text-white group-hover:text-blue-100'}`}>
                                                    {course.title}
                                                </div>
                                                <div className="text-sm text-white/50 font-medium">₹{course.salePrice.toLocaleString()}</div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="pt-4">
                            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                                Complete your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">enrollment</span>
                            </h1>
                            <p className="text-muted-foreground text-lg mt-4 max-w-md">
                                {currentCourse ? "You are one step away from becoming a job-ready developer." : "Select a track above to view the curriculum features and proceed with your secure enrollment."}
                            </p>
                        </div>

                        <div className="relative">
                            {!currentCourse && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-[2rem] border border-white/5">
                                    <Lock className="w-8 h-8 text-white/40 mb-3" />
                                    <p className="text-sm font-medium text-white/60">Course track required</p>
                                </div>
                            )}
                            <div className={`space-y-4 pt-2 transition-all duration-500 ${!currentCourse ? 'opacity-30 pointer-events-none blur-[2px]' : 'opacity-100'}`}>
                                {(currentCourse ? currentCourse.features : courseDetails.fullstack.features).map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-primary" />
                                        </div>
                                        <span className="font-medium text-white/90">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t border-white/10 mt-6">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Secure checkout powered by Razorpay AES-256 encryption</span>
                        </div>
                    </div>

                    {/* Right: Payment Card */}
                    <div className="relative h-fit">
                        {!currentCourse && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-[4px] rounded-[2.5rem] border border-white/5">
                                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                    <Lock className="w-8 h-8 text-white/20" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Checkout Locked</h3>
                                <p className="text-muted-foreground text-center max-w-[250px] text-sm">Select a course track on the left to unlock payment options.</p>
                            </div>
                        )}

                        <div className={`bg-[#111111]/90 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl transition-all duration-500 ${!currentCourse ? 'opacity-30 blur-[2px] pointer-events-none scale-[0.98]' : ''}`}>
                            <div className="flex justify-between items-start mb-8 mt-2">
                                <div>
                                    <h3 className="text-2xl font-bold leading-tight max-w-[220px]">
                                        {currentCourse ? currentCourse.title : "Course Title"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2">One-time payment • Lifetime access</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black tracking-tight">₹{currentCourse ? currentCourse.salePrice.toLocaleString() : "—"}</div>
                                    <div className="text-sm text-muted-foreground line-through decoration-red-500/50 mt-1">₹{currentCourse ? currentCourse.price.toLocaleString() : "—"}</div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                            {/* Razorpay Button */}
                            <button
                                onClick={handlePayment}
                                disabled={!currentCourse}
                                className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <CreditCard className="w-5 h-5" />
                                Pay Now - ₹{currentCourse ? currentCourse.salePrice.toLocaleString() : "0"}
                            </button>

                            <div className="text-center mt-8">
                                <p className="text-sm font-medium text-muted-foreground mb-4">Or redeem an access code</p>
                                {user ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter Code"
                                                className="flex-1 bg-black/50 border border-white/10 rounded-full px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono uppercase text-center md:text-left"
                                                value={accessCode}
                                                onChange={(e) => setAccessCode(e.target.value)}
                                            />
                                            <button
                                                onClick={handleRedeem}
                                                disabled={loading || !accessCode || !currentCourse}
                                                className="bg-white/10 hover:bg-white/20 text-white rounded-full px-8 py-3 font-semibold transition-colors disabled:opacity-50"
                                            >
                                                {loading ? "..." : "Apply"}
                                            </button>
                                        </div>
                                        {redeemMessage && (
                                            <p className={`mt-2 text-sm ${redeemMessage.includes("Granted") || redeemMessage.includes("Activated") ? "text-emerald-400" : "text-red-400"}`}>
                                                {redeemMessage}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        to="/login"
                                        className="text-primary hover:text-blue-400 font-semibold inline-flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-xl transition-colors"
                                    >
                                        <Lock className="w-4 h-4" />
                                        Login to Redeem Code
                                    </Link>
                                )}
                            </div>

                            <p className="text-center text-xs text-muted-foreground/60 mt-8 border-t border-white/5 pt-6">
                                By purchasing, you agree to our Terms of Service & Privacy Policy.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Checkout;
