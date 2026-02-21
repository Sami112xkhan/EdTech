import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "../components/ui/Input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { verifyGumroadLicense } from "../utils/gumroad";
import Aurora from "../components/Aurora";
import GlassSurface from "../components/GlassSurface";
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
                isPaid: isPremium, // Grant premium if code valid
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
                    storedUsers[existingUserIndex].isPaid = true;
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
                    isPaid: isPremium || (existingUserIndex >= 0 ? storedUsers[existingUserIndex].isPaid : false),
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

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
            <div className="absolute inset-0 z-0">
                <Aurora
                    colorStops={["#3b82f6", "#8b5cf6", "#6366f1"]}
                    blend={0.5}
                    amplitude={1.0}
                    speed={0.5}
                />
            </div>

            <GlassSurface
                className="w-full max-w-md p-6 md:p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500 my-4"
                borderRadius={24}
                opacity={0.6}
            >
                <div className="w-full">
                    <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-white mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                    </Link>

                    <div className="mb-6 text-center">
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome Back</h1>
                        <p className="text-muted-foreground text-sm md:text-base">Continue your learning journey.</p>
                    </div>

                    <div className="flex justify-center mb-6 w-full">
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
                                theme="filled_black"
                                shape="pill"
                                width="300"
                            />
                        </div>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-black px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label="Username or Email"
                            type="text"
                            placeholder="john@example.com or johnwick"
                            {...register("identifier", { required: "Username or Email is required" })}
                            error={errors.identifier?.message as string}
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            {...register("password", { required: "Password is required" })}
                            error={errors.password?.message as string}
                        />

                        {showAccessCode && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                <Input
                                    label="Access Code"
                                    type="text"
                                    placeholder="Enter your premium code"
                                    {...register("accessCode")}
                                />
                                <p className="text-xs text-yellow-500/80 mt-1 ml-1">
                                    * Valid code unlocks Lifetime Premium
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                onClick={() => setShowAccessCode(!showAccessCode)}
                                className="text-primary hover:underline font-medium"
                            >
                                {showAccessCode ? "Hide Access Code" : "Have an Access Code?"}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 mt-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted-foreground">Don't have an account? </span>
                        <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
                    </div>
                </div>
            </GlassSurface>
        </div>
    );
};

export default Login;
