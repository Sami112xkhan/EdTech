import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "../components/ui/Input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';
import { toast } from "sonner";

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
      const result = await signup({
        id: Math.random().toString(36).substr(2, 9),
        name: data.fullName,
        username: data.username,
        email: data.email,
        purchasedCourses: [],
        role: 'user',
        status: 'active',
        completedLessons: [],
        password: data.password
      });
      setIsLoading(false);
      if (!result.emailSent) {
        toast.error(result.emailError || "Verification email could not be sent. You can retry from the next page.");
      }
      navigate(`/verify?email=${encodeURIComponent(data.email)}&redirect=/checkout&emailSent=${result.emailSent ? "true" : "false"}`);
    } catch (error) {
      console.error("Signup submission failed:", error);
      setIsLoading(false);
      toast.error(error instanceof Error ? error.message : "Could not create your account. Please try again.");
    }
  };

  return (
    <div className="min-h-[100dvh] relative bg-[#f8f9f6]" style={{ fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif" }}>

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
            <Link to="/login" className="text-[13px] text-gray-400 hover:text-gray-900 transition-colors">Log in</Link>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-6 py-3">
          <Link to="/" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/[0.06] bg-white text-[13px] text-gray-500 hover:text-gray-900 hover:border-black/[0.12] transition-all shadow-sm">
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
        </div>
      </nav>

      <div className="pt-[9rem] md:pt-[7rem] px-6 md:px-8 pb-4 max-w-lg mx-auto animate-in fade-in duration-500">
          <div className="mb-3 md:mb-5">
            <h1 className="text-[32px] md:text-[36px] font-bold tracking-[-0.04em] text-gray-900 mb-2">Create Account</h1>
            <p className="text-[15px] md:text-[16px] text-gray-500">Start your journey to Full Stack mastery.</p>
          </div>

          <div className="flex justify-center mb-3">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  loginWithGoogle(credentialResponse.credential);
                  navigate('/checkout');
                }
              }}
              onError={() => {
                console.log('Signup Failed');
              }}
              theme="outline"
              shape="pill"
              width="300"
            />
          </div>

          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-black/[0.06]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-[0.1em]">
              <span className="bg-[#f8f9f6] px-3 text-gray-400">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
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
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    strength >= level
                      ? strength <= 2 ? "bg-red-400" : strength === 3 ? "bg-yellow-400" : "bg-emerald-500"
                      : "bg-black/[0.06]"
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
              className="w-full py-2.5 mt-3 rounded-2xl bg-emerald-900 hover:bg-emerald-800 text-white text-[15px] font-medium tracking-[-0.01em] shadow-lg shadow-emerald-900/15 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </button>
          </form>

          <div className="mt-3 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-700 hover:text-emerald-900 transition-colors">
              Log in
            </Link>
          </div>

        </div>
    </div>
  );
};

export default Signup;
