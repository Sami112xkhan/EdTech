
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "../components/ui/Input";
import { ArrowLeft, Loader2 } from "lucide-react";
import Aurora from "../components/Aurora";
import GlassSurface from "../components/GlassSurface";
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

const Signup: React.FC = () => {
    const { register, handleSubmit, formState: { errors }, watch } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const { signup, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const password = watch("password", "");

    const calculateStrength = (pass: string) => {
        let strength = 0;
        if (pass.length > 6) strength += 1;
        if (pass.length > 10) strength += 1;
        if (/[A-Z]/.test(pass)) strength += 1;
        if (/[0-9]/.test(pass)) strength += 1;
        return strength;
    };

    const strength = calculateStrength(password);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            await signup({
                id: Math.random().toString(36).substr(2, 9),
                name: data.fullName,
                username: data.username,
                email: data.email,
                purchasedCourses: [],
                role: 'user',
                status: 'active',
                completedLessons: [],
                password: data.password // Pass password if needed by signup logic
            });
            setIsLoading(false);
            navigate(`/verify?email=${encodeURIComponent(data.email)}&redirect=/checkout`);
        } catch (error) {
            console.error("Signup submission failed:", error);
            setIsLoading(false);
        }
    };

    // ... (inside component)
    return (
        <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-black">
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
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">Create Account</h1>
                        <p className="text-muted-foreground text-sm md:text-base">Start your journey to Full Stack mastery.</p>
                    </div>

                    <div className="flex justify-center mb-6 w-full">
                        <div className="w-full flex justify-center">
                            <GoogleLogin
                                onSuccess={(credentialResponse) => {
                                    if (credentialResponse.credential) {
                                        loginWithGoogle(credentialResponse.credential);
                                        navigate('/checkout');
                                    }
                                }}
                                onError={() => {
                                    console.log('Login Failed');
                                }}
                                theme="filled_black"
                                shape="pill"
                                // Remove fixed width to allow it to be responsive or verify if string "100%" works. 
                                // Best practice for this lib is often just not setting it or setting a safe max. 
                                // I'll set it to a safer 250-300px range or use a container trick.
                                // Actually, passing nothing usually renders a standard size.
                                // Let's try passing '300' which fits most phones (320px min).
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
                            label="Full Name"
                            placeholder="John Doe"
                            {...register("fullName", { required: "Name is required" })}
                            error={errors.fullName?.message as string}
                        />

                        <Input
                            label="Username"
                            placeholder="johndoe123"
                            {...register("username", { required: "Username is required" })}
                            error={errors.username?.message as string}
                        />

                        <Input
                            label="Email"
                            type="email"
                            placeholder="john@example.com"
                            {...register("email", {
                                required: "Email is required",
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: "Invalid email address"
                                }
                            })}
                            error={errors.email?.message as string}
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            {...register("password", {
                                required: "Password is required",
                                minLength: { value: 6, message: "Min 6 chars" }
                            })}
                            error={errors.password?.message as string}
                        />

                        {/* Strength Indicator */}
                        <div className="flex gap-1 h-1 mt-1">
                            {[1, 2, 3, 4].map((level) => (
                                <div
                                    key={level}
                                    className={`flex-1 rounded-full transition-all duration-300 ${strength >= level
                                        ? strength <= 2 ? "bg-red-400" : strength === 3 ? "bg-yellow-400" : "bg-green-400"
                                        : "bg-white/10"
                                        }`}
                                />
                            ))}
                        </div>

                        <Input
                            label="Confirm Password"
                            type="password"
                            placeholder="••••••••"
                            {...register("confirmPassword", {
                                validate: (val: string) => {
                                    if (watch('password') != val) {
                                        return "Passwords do not match";
                                    }
                                }
                            })}
                            error={errors.confirmPassword?.message as string}
                        />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 mt-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted-foreground">Already have an account? </span>
                        <Link to="/login" className="text-primary hover:underline">Log in</Link>
                    </div>
                </div>
            </GlassSurface>
        </div >
    );
};

export default Signup;
