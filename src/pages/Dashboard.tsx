
import React, { useEffect } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { curriculum } from "../data/curriculum";
import { PlayCircle, Award, Clock, Lock } from "lucide-react";

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
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name.split(" ")[0]}!</h1>
                    <p className="text-muted-foreground mt-1">
                        {progress === 100 ? "You've successfully completed the course!" : "You're making great progress towards becoming a Full Stack Developer."}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {!user?.isPaid && !isOnTrial && (
                        <form onSubmit={handleRedeem} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter Access Code"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                className="bg-secondary/30 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/50 w-40"
                            />
                            <button
                                disabled={isRedeeming}
                                className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                            >
                                Redeem
                            </button>
                        </form>
                    )}
                    <div className="bg-gradient-to-r from-primary/20 to-purple-600/20 px-6 py-3 rounded-xl border border-primary/20 flex flex-col items-center">
                        <span className="text-2xl font-bold text-primary">{progress}%</span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Complete</span>
                    </div>
                </div>
            </div>

            {isExpired && (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Trial Access Expired</h3>
                            <p className="text-sm text-muted-foreground">Your trial period has ended. Buy the full course to continue learning.</p>
                        </div>
                    </div>
                    <Link to="/curriculum" className="w-full md:w-auto px-8 py-3 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                        Buy Now
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl border border-white/5 bg-secondary/20">
                        <div className="text-sm text-muted-foreground mb-1">Total Lessons</div>
                        <div className="text-2xl font-bold">{totalLessons}</div>
                    </div>
                    <div className="p-5 rounded-xl border border-white/5 bg-secondary/20">
                        <div className="text-sm text-muted-foreground mb-1">Completed</div>
                        <div className="text-2xl font-bold">{completedLessons.length}</div>
                    </div>
                    <div className="p-5 rounded-xl border border-white/5 bg-secondary/20">
                        <div className="text-sm text-muted-foreground mb-1">Certificate</div>
                        <div className="text-2xl font-bold text-muted-foreground/50">Locked</div>
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
