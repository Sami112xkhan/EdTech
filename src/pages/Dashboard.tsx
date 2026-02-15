
import React, { useEffect } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { curriculum } from "../data/curriculum";
import { PlayCircle, Award, Clock, Lock, ShieldAlert, Flame } from "lucide-react";

const Dashboard: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { completePurchase, user, redeemCode } = useAuth();
    const location = useLocation();
    const [accessCode, setAccessCode] = React.useState("");
    const [isRedeeming, setIsRedeeming] = React.useState(false);

    // Handle scroll for /curriculum route
    useEffect(() => {
        if (location.pathname === "/curriculum") {
            const curriculumSection = document.getElementById("curriculum-section");
            if (curriculumSection) {
                curriculumSection.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [location.pathname]);

    useEffect(() => {
        if (searchParams.get("payment") === "success") {
            completePurchase();
        }
    }, [searchParams, completePurchase]);

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessCode) return;
        setIsRedeeming(true);
        const result = await redeemCode(accessCode);
        alert(result.message);
        if (result.success) setAccessCode("");
        setIsRedeeming(false);
    };

    // Calculate Progress
    const completedLessons = user?.completedLessons || [];
    const totalLessons = curriculum.reduce((acc, phase) => acc + phase.lessons.length, 0);
    const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

    // Trial Stats
    const isOnTrial = user?.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED';
    const isExpired = user?.trialExpiresAt === 'EXPIRED';

    // ... rest of logic for nextLesson etc. ...
    // Determine Logic for Locking and Next Lesson
    let nextLesson = null;
    let nextPhaseId = null;

    // We verify each phase sequentially
    const phasesStatus = curriculum.map((phase, index) => {
        // Phase 0 is always unlocked
        if (index === 0) return { ...phase, locked: false, completed: isPhaseComplete(phase) };

        // For subsequent phases, check if previous phase is complete
        const prevPhase = curriculum[index - 1];
        const isPrevComplete = isPhaseComplete(prevPhase);

        return {
            ...phase,
            locked: !isPrevComplete,
            completed: isPhaseComplete(phase)
        };
    });

    function isPhaseComplete(phase: typeof curriculum[0]) {
        return phase.lessons.every(l => completedLessons.includes(l.id));
    }

    // Find "Continue Learning" lesson
    for (const phase of phasesStatus) {
        if (!phase.locked && !phase.completed) {
            const firstIncomplete = phase.lessons.find(l => !completedLessons.includes(l.id));
            if (firstIncomplete) {
                nextLesson = firstIncomplete;
                nextPhaseId = phase.id;
                break;
            }
        }
    }

    if (!nextLesson && phasesStatus.every(p => p.completed)) {
        const lastPhase = phasesStatus[phasesStatus.length - 1];
        nextLesson = lastPhase.lessons[lastPhase.lessons.length - 1];
        nextPhaseId = lastPhase.id;
    }


    return (
        <div className="space-y-8">
            {/* Verification Reminder */}
            {!user?.isVerified && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 relative overflow-hidden animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/20">
                            <ShieldAlert className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">Email Not Verified</h3>
                            <p className="text-[10px] text-muted-foreground font-medium">Please verify your email to secure your account and unlock all features.</p>
                        </div>
                    </div>
                    <Link to={`/verify?email=${encodeURIComponent(user?.email || '')}`} className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
                        Verify Now
                    </Link>
                </div>
            )}

            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                        Command: <span className="text-primary italic">Welcome</span>, {user?.name.split(" ")[0]}
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xl">
                        {progress === 100 ? "Level Max! You've mastered the entire architecture." : "Your trajectory as a Full Stack Developer is looking exceptional."}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                    {!user?.isPaid && !isOnTrial && (
                        <form onSubmit={handleRedeem} className="flex flex-1 sm:flex-none gap-2">
                            <input
                                type="text"
                                placeholder="ACCESS CODE"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                className="flex-1 sm:w-40 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:opacity-30"
                            />
                            <button
                                disabled={isRedeeming}
                                className="bg-primary hover:bg-primary/80 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-primary/20"
                            >
                                ACTIVATE
                            </button>
                        </form>
                    )}
                    <div className="p-1 px-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-4 shadow-xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">System Progress</span>
                            <span className="text-xl font-black text-primary leading-none">{progress}%</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Award className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                </div>
            </div>

            {isExpired && (
                <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10">
                            <Clock className="w-7 h-7 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Access Locked</h3>
                            <p className="text-xs text-muted-foreground font-medium mt-1">Trial period expired. Restore access to continue your journey.</p>
                        </div>
                    </div>
                    <Link to="/curriculum" className="w-full md:w-auto px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5">
                        Upgrade Now
                    </Link>
                </div>
            )}

            {/* Continue Learning */}
            {nextLesson && (
                <div className="bg-secondary/30 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-full md:w-64 h-36 bg-black rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                            <PlayCircle className="w-12 h-12 text-white/50" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="text-xs font-semibold text-primary uppercase tracking-wider">Continue Learning</div>
                            <h3 className="text-xl font-bold">
                                {phasesStatus.find(p => p.id === nextPhaseId)?.title.split(" — ")[0]}: {nextLesson.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {phasesStatus.find(p => p.id === nextPhaseId)?.description}
                            </p>
                            <div className="pt-2">
                                <Link
                                    to={`/learn/${nextPhaseId}/${nextLesson.id}`}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-gray-200 transition-colors"
                                >
                                    Resume Lesson
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Shortcuts / Recent Activity could go here instead of full roadmap */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Quick Stats</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-xl border border-white/5 bg-secondary/20">
                        <div className="text-sm text-muted-foreground mb-1">Total Lessons</div>
                        <div className="text-2xl font-bold">{totalLessons}</div>
                    </div>
                    <div className="p-5 rounded-xl border border-white/5 bg-secondary/20">
                        <div className="text-sm text-muted-foreground mb-1">Completed</div>
                        <div className="text-2xl font-bold">{completedLessons.length}</div>
                    </div>
                    <div className="p-5 rounded-xl border border-white/5 bg-secondary/20">
                        <div className="text-sm text-muted-foreground mb-1">Current Streak</div>
                        <div className="flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                            <div className="text-2xl font-bold text-orange-500">{user?.streak || 0}</div>
                        </div>
                    </div>
                    <div className="p-5 rounded-xl border border-white/5 bg-secondary/20">
                        <div className="text-sm text-muted-foreground mb-1">XP Earned</div>
                        <div className="text-2xl font-bold text-indigo-400">{user?.xp || 0}</div>
                    </div>
                </div>
            </div>

            {/* CTA to Full Curriculum */}
            <div className="mt-8 flex justify-center">
                <Link to="/curriculum" className="text-sm text-primary hover:underline">
                    View Full Curriculum &rarr;
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;
