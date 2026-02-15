import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Input from "../components/ui/Input";
import { ArrowLeft, Loader2, Mail, RefreshCw } from "lucide-react";
import Aurora from "../components/Aurora";
import GlassSurface from "../components/GlassSurface";

const VerifyEmail: React.FC = () => {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const { verifyEmail, resendVerificationCode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Get email and code from query params
    const queryParams = new URLSearchParams(location.search);
    const email = queryParams.get("email");
    const urlCode = queryParams.get("code");

    useEffect(() => {
        if (!email) {
            navigate("/login");
        }
    }, [email, navigate]);

    // Auto-verify if code is in URL
    useEffect(() => {
        if (email && urlCode && urlCode.length === 6 && !isLoading) {
            setCode(urlCode);
            handleAutoVerify(email, urlCode);
        }
    }, [email, urlCode]);

    const handleAutoVerify = async (emailAddr: string, verificationCode: string) => {
        setIsLoading(true);
        // Add a small delay for visual feedback
        setTimeout(() => {
            const result = verifyEmail(emailAddr, verificationCode);
            if (result.success) {
                navigate("/dashboard");
            } else {
                setError(result.message);
                setIsLoading(false);
            }
        }, 800);
    };

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        if (!email) return;

        // Simulate network delay
        setTimeout(() => {
            const result = verifyEmail(email, code);

            if (result.success) {
                navigate("/dashboard");
            } else {
                setError(result.message);
                setIsLoading(false);
            }
        }, 1000);
    };

    const handleResend = () => {
        if (!email || resendCooldown > 0) return;

        resendVerificationCode(email);
        setResendCooldown(30); // 30 seconds cooldown
    };

    if (!email) return null;

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
                className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500"
                borderRadius={24}
                opacity={0.6}
            >
                <div className="w-full">
                    <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-white mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                    </Link>

                    <div className="mb-8 text-center">
                        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                            <Mail className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Check your inbox</h1>
                        <p className="text-muted-foreground">
                            We've sent a verification code to <br />
                            <span className="text-white font-medium">{email}</span>
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-6">
                        <div>
                            <Input
                                label="Verification Code"
                                placeholder="123456"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                maxLength={6}
                                className="text-center text-2xl tracking-widest"
                                error={error}
                            />
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                Enter the 6-digit code mentioned in the alert.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || code.length !== 6}
                            className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Email"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-muted-foreground mb-3">Didn't receive the code?</p>
                        <button
                            onClick={handleResend}
                            disabled={resendCooldown > 0}
                            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center mx-auto gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-4 h-4 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Click to Resend"}
                        </button>
                    </div>
                </div>
            </GlassSurface>
        </div>
    );
};

export default VerifyEmail;
