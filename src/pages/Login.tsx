import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "../components/ui/Input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { verifyGumroadLicense } from "../utils/gumroad";
import { GoogleLogin } from '@react-oauth/google';

const Login: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [showAccessCode, setShowAccessCode] = useState(false);

    const onSubmit = async (data: any) => {
        setIsLoading(true);

        // Use a try-catch block for the entire flow
        try {
            let isPremium = false;
            let unlockedBy = '';

            // Access Code Logic
            if (showAccessCode && data.accessCode) {
                const code = data.accessCode.trim(); // Case sensitive for License, but we can standardise
                const usedCodes = JSON.parse(localStorage.getItem('used_access_codes') || '{}');

                // 1. Static Codes
                if ((code === 'AIFNNC9' || code === 'MASTER')) {
                    if (usedCodes[code]) {
                        alert('This access code has already been used.');
                        setIsLoading(false);
                        return;
                    }
                    isPremium = true;
                    unlockedBy = `code:${code}`;
                    usedCodes[code] = { usedBy: data.identifier, type: 'static', timestamp: new Date().toISOString() };
                    localStorage.setItem('used_access_codes', JSON.stringify(usedCodes));
                }
                // 2. Gumroad License Key Logic
                else {
                    // Check if this license key was already used LOCALLY
                    if (usedCodes[code]) {
                        alert('This license key has already been redeemed.');
                        setIsLoading(false);
                        return;
                    }

                    // Verify with Gumroad API
                    const verification = await verifyGumroadLicense(code);

                    if (verification.valid) {
                        isPremium = true;
                        unlockedBy = `gumroad:${code}`;
                        // Mark as used locally
                        usedCodes[code] = {
                            usedBy: data.identifier,
                            email: verification.email, // Store the email associated with purchase
                            type: 'gumroad_license',
                            timestamp: new Date().toISOString()
                        };
                        localStorage.setItem('used_access_codes', JSON.stringify(usedCodes));
                        alert(`License Verified! Welcome ${verification.name || ''}`);
                    } else {
                        alert(verification.message || 'Invalid Access Code or License Key');
                        setIsLoading(false);
                        return;
                    }
                }
            }

            // Mock login data
            const userData = {
                name: "User", // Placeholder name
                username: data.identifier,
                email: data.identifier,
                purchasedCourses: isPremium ? ['fullstack', 'cyber', 'datascience', 'cloudcomputing'] : [], // Grant premium if code valid
                role: 'student',
                unlockedBy: unlockedBy, // Track how they got premium
                password: data.password
            };

            // Simulate slight delay for "normal" login feel if not verifying
            if (!showAccessCode) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Hack for demo: Update the mock 'users' list in localStorage
            const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
            const existingUserIndex = storedUsers.findIndex((u: any) => u.email === data.identifier || u.username === data.identifier);

            if (existingUserIndex >= 0) {
                if (isPremium) {
                    storedUsers[existingUserIndex].purchasedCourses = ['fullstack', 'cyber', 'datascience', 'cloudcomputing'];
                    storedUsers[existingUserIndex].unlockedBy = unlockedBy;
                    localStorage.setItem('users', JSON.stringify(storedUsers));
                }
            }

            // Perform login
            try {
                const loginPayload = {
                    email: data.identifier,
                    username: data.identifier,
                    password: data.password, // Required for admin check in AuthContext
                    isVerified: true,
                    purchasedCourses: isPremium || (existingUserIndex >= 0 && storedUsers[existingUserIndex].purchasedCourses?.length > 0) ? ['fullstack', 'cyber', 'datascience', 'cloudcomputing'] : [],
                    unlockedBy: unlockedBy,
                    completedLessons: [],
                    status: 'active',
                    role: 'user'
                } as any;

                login(loginPayload);

                setIsLoading(false);
                navigate("/dashboard");
            } catch (error: any) {
                if (error.message && error.message.startsWith("NOT_VERIFIED:")) {
                    const email = error.message.split(":")[1];
                    // If login was attempted with a static code, we should auto-verify them
                    if (isPremium && (unlockedBy.startsWith('code:'))) {
                        setIsLoading(false);
                        navigate(`/verify?email=${encodeURIComponent(email)}`);
                    } else {
                        setIsLoading(false);
                        navigate(`/verify?email=${encodeURIComponent(email)}`);
                    }
                } else {
                    console.error("Login error:", error);
                    alert("An error occurred during login.");
                    setIsLoading(false);
                }
            }
        } catch (error: any) {
            console.error("Submission error:", error);
            alert("An error occurred during login.");
            setIsLoading(false);
        }
    };

    return (        <div className="min-h-[100dvh] relative bg-[#f8f9f6]" style={{ fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif" }}>

            {/* Subtle emerald glow */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.06] pointer-events-none" style={{
                background: 'radial-gradient(ellipse, #10b981 0%, transparent 60%)'
            }} />

            {/* Nav bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f8f9f6]/90 backdrop-blur-xl">
                <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between border-b border-black/[0.06]">
                    <Link to="/" className="flex items-center gap-2">
                        <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-emerald-800">DevMastery</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link to="/signup" className="text-[13px] text-gray-400 hover:text-gray-900 transition-colors">Sign up</Link>
                    </div>
                </div>
                <div className="max-w-[1200px] mx-auto px-6 py-3">
                    <Link to="/" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/[0.06] bg-white text-[13px] text-gray-500 hover:text-gray-900 hover:border-black/[0.12] transition-all shadow-sm">
                        <ArrowLeft className="w-3.5 h-3.5" /> Home
                    </Link>
                </div>
            </nav>

            <div className="pt-[9rem] md:pt-[7rem] px-6 md:px-8 pb-4 max-w-lg mx-auto animate-in fade-in duration-500">
                <div className="mb-4">
                        <h1 className="text-[36px] font-bold tracking-[-0.04em] text-gray-900 mb-2">Welcome back.</h1>
                        <p className="text-[16px] text-gray-500">Continue your learning journey.</p>
                    </div>

                    <div className="flex justify-center mb-3 w-full">
                        <div className="w-full flex justify-center">
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    if (credentialResponse.credential) {
                                        await loginWithGoogle(credentialResponse.credential);
                                        navigate('/dashboard');
                                    }
                                }}
                                onError={() => {
                                    console.log('Login Failed');
                                }}
                                theme="outline"
                                shape="pill"
                                width="300"
                            />
                        </div>
                    </div>

                    <div className="relative mb-3">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-black/[0.06]" />
                        </div>
                        <div className="relative flex justify-center text-[11px] uppercase tracking-[0.15em]">
                            <span className="bg-[#f8f9f6] px-3 text-gray-300 font-medium">Or continue with</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                        <div>
                            <label className="block text-[13px] font-medium text-gray-500 mb-1.5">Username or Email</label>
                            <input
                                type="text"
                                placeholder="john@example.com or johnwick"
                                {...register("identifier", { required: "Username or Email is required" })}
                                className="w-full px-4 py-3 rounded-xl border border-black/[0.08] bg-white text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-emerald-300 transition-all shadow-sm"
                            />
                            {errors.identifier && <p className="text-[12px] text-red-500 mt-1">{errors.identifier.message as string}</p>}
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-gray-500 mb-1.5">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                {...register("password", { required: "Password is required" })}
                                className="w-full px-4 py-3 rounded-xl border border-black/[0.08] bg-white text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-emerald-300 transition-all shadow-sm"
                            />
                            {errors.password && <p className="text-[12px] text-red-500 mt-1">{errors.password.message as string}</p>}
                        </div>

                        {showAccessCode && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">Access Code</label>
                                <input
                                    type="text"
                                    placeholder="Enter your premium code"
                                    {...register("accessCode")}
                                    className="w-full px-4 py-3 rounded-xl border border-black/[0.08] bg-white text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-emerald-300 transition-all shadow-sm"
                                />
                                <p className="text-[12px] text-amber-600/70 mt-1 ml-1">
                                    * Valid code unlocks Lifetime Premium
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-[13px]">
                            <button
                                type="button"
                                onClick={() => setShowAccessCode(!showAccessCode)}
                                className="text-emerald-700 hover:text-emerald-600 font-medium transition-colors"
                            >
                                {showAccessCode ? "Hide Access Code" : "Have an Access Code?"}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 mt-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-[14px] font-semibold shadow-lg shadow-emerald-900/10 transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
                        </button>
                    </form>

                    <div className="mt-4 text-center text-[14px]">
                        <span className="text-gray-400">Don't have an account? </span>
                        <Link to="/signup" className="text-emerald-700 font-medium hover:text-emerald-600 transition-colors">Sign up</Link>
                    </div>
                </div>
        </div>
    );
};

export default Login;
