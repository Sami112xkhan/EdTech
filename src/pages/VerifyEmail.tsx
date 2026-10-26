import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const VerifyEmail: React.FC = () => {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const { verifyEmail, resendVerificationCode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const autoVerifyStarted = useRef(false);
    const resendInFlight = useRef(false);

    const queryParams = new URLSearchParams(location.search);
    const email = queryParams.get("email");
    const urlCode = queryParams.get("code");
    const redirectTo = queryParams.get("redirect") || "/dashboard";
    const emailSent = queryParams.get("emailSent");
    const [emailDeliveryStatus, setEmailDeliveryStatus] = useState<string | null>(emailSent);

    useEffect(() => {
        if (!email) navigate("/login");
    }, [email, navigate]);

    useEffect(() => {
        setEmailDeliveryStatus(emailSent);
    }, [emailSent]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => window.clearTimeout(timer);
    }, [resendCooldown]);

    useEffect(() => {
        if (!email || !urlCode || !/^\d{6}$/.test(urlCode) || autoVerifyStarted.current) return;
        autoVerifyStarted.current = true;
        setCode(urlCode);
        setIsLoading(true);

        void (async () => {
            try {
                const result = await verifyEmail(email, urlCode);
                if (result.success) {
                    navigate(redirectTo);
                } else {
                    setError(result.message);
                    setIsLoading(false);
                }
            } catch {
                setError("Verification failed. Please enter the code and try again.");
                setIsLoading(false);
            }
        })();
    }, [email, navigate, redirectTo, urlCode, verifyEmail]);

    const handleVerify = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!email || code.length !== 6) return;

        setError("");
        setIsLoading(true);
        try {
            const result = await verifyEmail(email, code);
            if (result.success) {
                navigate(redirectTo);
            } else {
                setError(result.message);
                setIsLoading(false);
            }
        } catch {
            setError("Verification failed. Please try again.");
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email || resendCooldown > 0 || resendInFlight.current) return;

        resendInFlight.current = true;
        setIsResending(true);
        const sent = await resendVerificationCode(email);
        resendInFlight.current = false;
        setIsResending(false);
        setEmailDeliveryStatus(sent ? "true" : "false");
        if (sent) setResendCooldown(30);
    };

    if (!email) return null;

    return (
        <main className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#070a12] px-4 py-8 text-white">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -left-40 -top-44 h-[32rem] w-[32rem] rounded-full bg-blue-600/25 blur-[130px]" />
                <div className="absolute -bottom-52 -right-40 h-[34rem] w-[34rem] rounded-full bg-cyan-500/20 blur-[140px]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,#070a12_82%)]" />
            </div>

            <section className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-5 flex items-center justify-between px-1">
                    <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-lg font-black text-white shadow-lg shadow-orange-950/30">m</span>
                        <span className="text-[15px] font-semibold tracking-tight text-white">DevMastery</span>
                    </Link>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-300">
                        <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" /> Account security
                    </span>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-[#101522]/95 p-6 shadow-[0_32px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-9">
                    <Link to="/login" className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                        <ArrowLeft className="h-4 w-4" /> Back to login
                    </Link>

                    <div className="mt-8 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-inner shadow-cyan-100/5">
                            {emailDeliveryStatus === "true" ? <Check className="h-7 w-7" /> : <Mail className="h-7 w-7" />}
                        </div>
                        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">One last step</p>
                        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-white sm:text-[32px]">
                            {emailDeliveryStatus === "false" ? "Email not sent yet" : emailDeliveryStatus === "true" ? "Check your inbox" : "Verify your email"}
                        </h1>
                        <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-slate-300">
                            {emailDeliveryStatus === "true"
                                ? "The email service accepted a verification message. Check your inbox or spam folder."
                                : emailDeliveryStatus === "false"
                                    ? "We couldn’t send the message. You can retry below; your current code remains valid."
                                    : "Enter the six-digit code we sent to finish creating your account."}
                        </p>
                    </div>

                    <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Verification email</p>
                        <p className="mt-1 break-all text-sm font-medium text-slate-100">{email}</p>
                    </div>

                    <form onSubmit={handleVerify} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="verification-code" className="mb-2 block text-sm font-medium text-slate-200">Verification code</label>
                            <input
                                id="verification-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                placeholder="000000"
                                value={code}
                                onChange={(event) => {
                                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                                    if (error) setError("");
                                }}
                                maxLength={6}
                                aria-describedby={error ? "verification-error" : "verification-help"}
                                aria-invalid={Boolean(error)}
                                className="w-full rounded-2xl border border-white/15 bg-[#090d16] px-4 py-4 text-center font-mono text-[26px] font-semibold tracking-[0.42em] text-white placeholder:text-slate-600 focus:border-cyan-300/70 focus:outline-none focus:ring-4 focus:ring-cyan-300/10"
                            />
                            {error ? (
                                <p id="verification-error" role="alert" className="mt-2 text-sm text-rose-300">{error}</p>
                            ) : (
                                <p id="verification-help" className="mt-2 text-center text-xs text-slate-400">The code is six digits and expires after 15 minutes.</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || code.length !== 6}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/25 transition hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/30 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 disabled:shadow-none"
                        >
                            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : "Verify email"}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-col items-center justify-center gap-2 border-t border-white/[0.08] pt-5 text-center sm:flex-row sm:gap-3">
                        <span className="text-sm text-slate-400">Didn’t get the email?</span>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendCooldown > 0 || isResending}
                            className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-cyan-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:text-slate-500"
                        >
                            {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            {isResending ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
                        </button>
                    </div>
                    <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">Never share your verification code with anyone.</p>
                </div>
                <p className="mt-5 px-4 text-center text-xs text-slate-500">Secure access to your DevMastery account</p>
            </section>
        </main>
    );
};

export default VerifyEmail;
