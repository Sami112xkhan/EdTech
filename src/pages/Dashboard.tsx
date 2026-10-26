
import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPhasesStatus } from "../utils/progress";
import { useAllCurricula } from "../hooks/useCourses";
import { PlayCircle, Award, Clock, Lock, ShieldAlert, Flame, Download, BookOpen, Shield, Bot, Zap, ArrowRight, Cloud, ShoppingBag } from "lucide-react";
import { jsPDF } from "jspdf";
import type { Module } from "../data/curriculum";
import type { CourseWithModules } from "../hooks/useCourses";
import { motion, AnimatePresence } from "motion/react";
import GlassSurface from "../components/GlassSurface";
import { useActiveCourse } from "../hooks/useActiveCourse";
import { useOffer } from "../context/OfferContext";

import DarkVeil from "../components/DarkVeil";
import MagicBento from "../components/MagicBento";
import { useTheme, ACCENT_COLORS, BACKGROUND_CALIBRATION, ACCENT_RGB } from "../context/ThemeContext";

const dashboardCourseIcons: Record<string, React.ElementType> = {
    fullstack: BookOpen,
    cyber: Shield,
    datascience: Award,
    ai: Bot,
    cloudcomputing: Cloud,
};
const dashboardCourseLabels: Record<string, string> = {
    cyber: 'Cyber Security',
    datascience: 'Data Science',
    ai: 'AI Course',
    cloudcomputing: 'Cloud Computing',
};

const Dashboard: React.FC = () => {
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    const { accentColor } = useTheme();
    const { isOfferActive } = useOffer();
    // ... rest of component ...
    const { user, redeemCode, requestCertificate } = useAuth();
    const location = useLocation();
    const [accessCode, setAccessCode] = React.useState("");
    const [isRedeeming, setIsRedeeming] = React.useState(false);
    const [activeCourse, setActiveCourse] = useActiveCourse();

    const { curricula } = useAllCurricula();
    useEffect(() => {
        if (curricula.length > 0 && !curricula.some(course => course.slug === activeCourse)) {
            setActiveCourse(curricula[0].slug);
        }
    }, [curricula, activeCourse, setActiveCourse]);

    const activeCourseObj = curricula.find(c => c.slug === activeCourse);
    const activeCurriculum: Module[] = (activeCourseObj?.modules || []).map(m => ({
        id: m.slug,
        title: m.title,
        description: m.description || '',
        lessons: m.lessons.map(l => ({
            id: l.slug,
            title: l.title,
            duration: l.duration || '',
            youtubeId: l.youtubeId || '',
            free: l.free,
            notesPath: l.notesPath || undefined,
        })),
    }));

    // AI upgrade logic: user has any course but not ai
    const hasAnyCourse = (user?.purchasedCourses || []).some(courseSlug => courseSlug !== 'ai');
    const hasAI = user?.purchasedCourses.includes('ai');
    const showAIUpgrade = user?.role !== 'admin' && isOfferActive && activeCourse === 'ai' && hasAnyCourse && !hasAI;

    // Determine if user has any purchased course (vs trial-only or no access)
    const userHasAnyPurchasedCourse = (user?.purchasedCourses?.length || 0) > 0;
    const currentCourseData = curricula.find(c => c.slug === activeCourse);

    const generateCertificate = (courseId?: string) => {
        if (!user) return;
        const targetCourse = courseId || activeCourse;

        // Course display names
        const courseNames: Record<string, string> = {
            fullstack: 'Full Stack Developer Architecture',
            cyber: 'Cyber Security Specialist',
            datascience: 'Data Science & Analytics',
            ai: 'AI & Machine Learning',
            cloudcomputing: 'Cloud Computing Architecture',
        };
        const courseDisplayName = curricula.find(course => course.slug === targetCourse)?.title || courseNames[targetCourse] || 'Premium Course';

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [1200, 800]
        });

        // --- Palette ---
        const deepBlue = [10, 25, 47];       // Sidebar (Dark Navy)
        const gold = [212, 175, 55];         // Badge Gold
        const textDark = [33, 33, 33];      // Main Text
        const textLight = [255, 255, 255];  // Sidebar Text
        const textMuted = [100, 100, 100];  // Secondary Text

        // 1. Background (White)
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 1200, 800, 'F');

        // 2. Sidebar (Left Panel)
        doc.setFillColor(deepBlue[0], deepBlue[1], deepBlue[2]);
        doc.rect(0, 0, 350, 800, 'F'); // 350px width

        // Sidebar Content - Logo Area
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        doc.setFontSize(40);
        doc.setFont("helvetica", "bold");
        doc.text("DMA", 175, 100, { align: 'center' }); // Logo shortcut

        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.setCharSpace(2);
        doc.text("DEVMASTERY", 175, 130, { align: 'center' });
        doc.text("ACADEMY", 175, 150, { align: 'center' });

        // Sidebar Content - QR Code Placeholder
        doc.setFillColor(255, 255, 255);
        doc.rect(100, 600, 150, 150, 'F');
        // Simple QR Pattern Mock
        doc.setFillColor(deepBlue[0], deepBlue[1], deepBlue[2]);
        doc.rect(110, 610, 50, 50, 'F'); doc.rect(190, 610, 50, 50, 'F');
        doc.rect(110, 690, 50, 50, 'F');
        doc.circle(215, 715, 20, 'F');

        // 3. Main Content Area (Right Side)
        const contentX = 775; // Center of the remaining 850px area (350 + 850/2)

        // Certificate Title
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFontSize(65);
        doc.setFont("times", "bold"); // Serif
        doc.text("CERTIFICATE", contentX, 150, { align: 'center' });

        doc.setFontSize(30);
        doc.setFont("helvetica", "normal");
        doc.setCharSpace(3);
        doc.text("OF COMPLETION", contentX, 200, { align: 'center' });

        // Presented To
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.setFontSize(22);
        doc.setCharSpace(0);
        doc.text("We proudly present this certificate to", contentX, 300, { align: 'center' });

        // Recipients Name
        doc.setTextColor(deepBlue[0], deepBlue[1], deepBlue[2]); // Name in Brand Color
        doc.setFontSize(70);
        doc.setFont("times", "italic");
        doc.text(user.name, contentX, 380, { align: 'center' });
        doc.setLineWidth(1);
        doc.setDrawColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.line(contentX - 250, 390, contentX + 250, 390); // Underline

        // Course Info
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFontSize(22);
        doc.setFont("helvetica", "normal");
        doc.text("For successfully completing the comprehensive course:", contentX, 460, { align: 'center' });

        doc.setFontSize(35);
        doc.setFont("helvetica", "bold");
        doc.text(courseDisplayName, contentX, 510, { align: 'center' });

        // 4. Gold Badge (Top Right)
        doc.setFillColor(gold[0], gold[1], gold[2]);
        doc.circle(1050, 120, 60, 'F'); // Main Circle
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(2);
        doc.circle(1050, 120, 54, 'S'); // Inner Ring

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("DEVMASTERY", 1050, 100, { align: 'center' });
        doc.text("AWARDED", 1050, 155, { align: 'center' });
        doc.setFontSize(30);
        doc.text("2026", 1050, 130, { align: 'center' });

        // Ribbons for Badge
        doc.setFillColor(deepBlue[0], deepBlue[1], deepBlue[2]);
        // Left Ribbon
        doc.triangle(1020, 170, 1050, 170, 1010, 240, 'F');
        // Right Ribbon
        doc.triangle(1050, 170, 1080, 170, 1090, 240, 'F');

        // 5. Signatures
        const sigY = 680;

        // Center Signature
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFont("times", "italic");
        doc.setFontSize(30);
        doc.text("DevMastery", 775, sigY, { align: 'center' }); // Mock Sig
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text("DEVMASTERY ACADEMY", 775, sigY + 20, { align: 'center' });
        doc.text("OFFICIAL CERTIFICATION", 775, sigY + 35, { align: 'center' });

        const issueDate = user.certifiedCourses?.[targetCourse]?.issueDate || user.certificateIssueDate;
        const date = issueDate ? new Date(issueDate).toLocaleDateString() : new Date().toLocaleDateString();
        doc.text(`Issued: ${date}`, contentX, 750, { align: 'center' });

        doc.save(`${user.name.split(' ')[0]}_Certificate_${courseDisplayName.replace(/\s+/g, '_')}.pdf`);
    };

    // Handle scroll for /curriculum route
    useEffect(() => {
        if (location.pathname === "/curriculum") {
            const curriculumSection = document.getElementById("curriculum-section");
            if (curriculumSection) {
                curriculumSection.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [location.pathname]);

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessCode) return;
        setIsRedeeming(true);
        const result = await redeemCode(accessCode, activeCourse);
        alert(result.message);
        if (result.success) setAccessCode("");
        setIsRedeeming(false);
    };

    // Calculate Progress
    // Calculate Progress
    const completedLessons = user?.completedLessons || [];
    const totalLessons = activeCurriculum.reduce((acc: number, phase: Module) => acc + phase.lessons.length, 0);
    const courseCompletedLessons = completedLessons.filter(id =>
        activeCurriculum.some((phase: Module) => phase.lessons.some(l => l.id === id))
    );
    const progress = totalLessons > 0 ? Math.round((courseCompletedLessons.length / totalLessons) * 100) : 0;

    // Trial Stats
    const hasActiveTrialForCourse = user?.trialCourseId === activeCourse
        && !!user.trialExpiresAt
        && user.trialExpiresAt !== 'EXPIRED'
        && new Date(user.trialExpiresAt) > new Date();
    const isExpired = user?.role !== 'admin'
        && user?.trialCourseId === activeCourse
        && !user.purchasedCourses.includes(activeCourse)
        && (user?.trialExpiresAt === 'EXPIRED' || (!!user?.trialExpiresAt && new Date(user.trialExpiresAt) <= new Date()));

    // ... rest of logic for nextLesson etc. ...
    // Determine Logic for Locking and Next Lesson
    let nextLesson = null;
    let nextPhaseId = null;

    // We verify each phase sequentially
    const phasesStatus = getPhasesStatus(activeCurriculum, completedLessons);

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

    if (!nextLesson && phasesStatus.length > 0 && phasesStatus.every(p => p.completed)) {
        const lastPhase = phasesStatus[phasesStatus.length - 1];
        nextLesson = lastPhase.lessons[lastPhase.lessons.length - 1];
        nextPhaseId = lastPhase.id;
    }


    const accentRGB = ACCENT_RGB[accentColor] || ACCENT_RGB.blue;

    // Shared swipe-to-navigate config for course selector pills
    const makeSwipeHandler = (next: string | null, prev: string | null) => (_: any, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
        const dx = info.offset.x;
        const vx = info.velocity.x;
        const SWIPE_THRESHOLD = 30;
        const VELOCITY_THRESHOLD = 0.3;
        if (next && (dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD)) {
            setActiveCourse(next);
        } else if (prev && (dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD)) {
            setActiveCourse(prev);
        }
    };

    const swipeDragProps = {
        drag: "x" as const,
        dragDirectionLock: true,
        dragSnapToOrigin: true,
        dragTransition: { bounceStiffness: 300, bounceDamping: 30 },
        whileDrag: { scale: 1.04, opacity: 0.95 },
        transition: { type: "spring" as const, stiffness: 400, damping: 30 },
    };

    return (
        <div className="relative min-h-screen">
            {!isRich && (
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <DarkVeil
                        accentColor={accentRGB}
                        noiseIntensity={0}
                        scanlineIntensity={0}
                        speed={1.9}
                        scanlineFrequency={0.5}
                        warpAmount={2.2}
                    />
                </div>
            )}

            <div className="relative z-10 space-y-8">
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

                {/* Published courses come from the catalogue, including courses added by an admin. */}
                {curricula.length > 0 && (
                    <div className="flex z-10 w-full relative overflow-x-auto scrollbar-hide">
                        <div className={`flex min-w-max p-1 rounded-full ${isRich ? 'bg-gray-100 border border-black/[0.06] w-full md:w-auto' : 'bg-white/10 border border-white/10 backdrop-blur-xl w-full md:w-auto'}`}>
                            {curricula.map((course, index) => {
                                const selected = activeCourse === course.slug;
                                const Icon = dashboardCourseIcons[course.slug] || BookOpen;
                                const label = course.slug === 'fullstack' && isOfferActive
                                    ? 'Full Stack + AI'
                                    : (dashboardCourseLabels[course.slug] || course.title);
                                const pillClass = isRich
                                    ? 'bg-white border border-black/[0.06] shadow-sm'
                                    : 'bg-white/20 backdrop-blur-2xl border border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8_32_rgba(0,0,0,0.3)]';
                                return (
                                    <button
                                        key={course.slug}
                                        onClick={() => setActiveCourse(course.slug)}
                                        className={`relative flex-none px-3 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selected ? (isRich ? 'text-emerald-800' : 'text-white') : (isRich ? 'text-gray-400 hover:text-gray-900' : 'text-white/40 hover:text-white')}`}
                                    >
                                        {selected && (
                                            <motion.div
                                                layoutId="dashboard-active-pill"
                                                {...swipeDragProps}
                                                onDragEnd={makeSwipeHandler(curricula[index + 1]?.slug || null, curricula[index - 1]?.slug || null)}
                                                className={`absolute inset-0 rounded-full cursor-grab active:cursor-grabbing z-0 ${pillClass}`}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center justify-center gap-1.5 pointer-events-none whitespace-nowrap">
                                            <Icon className="w-3.5 h-3.5" />
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
                    <div className="space-y-1">
                        <h1 className={`text-2xl md:text-3xl font-black tracking-tight leading-tight ${isRich ? "text-gray-900" : "text-white"}`}>
                            Command: <span className="text-primary italic">Welcome</span>, {user?.name.split(" ")[0]}
                        </h1>
                        <p className={`text-sm font-black leading-relaxed max-w-xl ${isRich ? "text-gray-500" : "text-white/60"}`}>
                            {progress === 100
                                ? "Level Max! You've mastered the entire architecture."
                                : (user?.streak || 0) >= 3
                                    ? `Impressive ${user?.streak} day streak! You're building incredible momentum.`
                                    : progress === 0
                                        ? "The journey of a thousand lines of code begins with a single commit. Let's start building!"
                                        : "Your trajectory as a Full Stack Developer is looking exceptional."
                            }
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                        {!user?.purchasedCourses.includes(activeCourse) && !hasActiveTrialForCourse && (
                            <form onSubmit={handleRedeem} className="flex flex-1 sm:flex-none gap-2">
                                <input
                                    type="text"
                                    placeholder="ACCESS CODE"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    className={`flex-1 sm:w-40 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest focus:outline-none transition-all ${isRich ? "bg-gray-100 border border-black/[0.06] text-gray-900 placeholder:text-gray-400" : "bg-white/5 border border-white/10 focus:border-primary/50 focus:bg-white/10 placeholder:opacity-30"}`}
                                />
                                <button
                                    disabled={isRedeeming}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 ${isRich ? "bg-emerald-900 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-900/15" : "bg-primary hover:bg-primary/80 text-white shadow-lg shadow-primary/20"}`}
                                >
                                    ACTIVATE
                                </button>
                            </form>
                        )}
                        <div className={`p-1 px-4 rounded-2xl flex items-center gap-4 ${isRich ? "bg-gray-100 border border-black/[0.06]" : "bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl"}`}>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-tighter ${isRich ? "text-gray-400" : "text-muted-foreground"}`}>System Progress</span>
                                <span className="text-xl font-black text-primary leading-none">{progress}%</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Award className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Upgrade Offer for existing fullstack users */}
                {showAIUpgrade && (
                    <div className="bg-gradient-to-r from-[#2997ff]/10 via-[#06b6d4]/10 to-[#2997ff]/10 border border-[#2997ff]/30 p-4 md:p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden animate-in slide-in-from-top duration-500">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#2997ff]/60 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-br from-[#2997ff]/5 via-transparent to-[#06b6d4]/5 pointer-events-none" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2997ff]/30 to-[#06b6d4]/30 flex items-center justify-center border border-[#2997ff]/30 shadow-lg shadow-[#2997ff]/20">
                                <Zap className="w-7 h-7 text-[#2997ff]" />
                            </div>
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tight flex items-center gap-2 ${isRich ? "text-gray-900" : "text-white"}`}>
                                    Unlock AI Course <span className="text-xs font-bold text-[#2997ff] bg-[#2997ff]/20 px-2 py-0.5 rounded-full normal-case">Special Offer</span>
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium mt-1">As an existing Full Stack student, upgrade to the AI Course for just <span className={`font-black ${isRich ? "text-gray-900" : "text-white"}`}>₹2,000</span>!</p>
                            </div>
                        </div>
                        <Link to="/checkout?course=ai_upgrade" className="w-full md:w-auto px-8 py-4 bg-[#2997ff] hover:bg-[#0071e3] text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#2997ff]/20">
                            Upgrade Now — ₹2,000 <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {(isExpired || (!user?.purchasedCourses.includes(activeCourse) && !hasActiveTrialForCourse && user?.role !== 'admin')) && !showAIUpgrade && (
                    <div className="bg-red-500/5 border border-red-500/20 p-4 md:p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10">
                                <Clock className="w-7 h-7 text-red-400" />
                            </div>
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isRich ? "text-gray-900" : "text-white"}`}>Access Locked</h3>
                                <p className="text-xs text-muted-foreground font-medium mt-1">
                                    {activeCourse === 'ai'
                                        ? (isOfferActive ? 'Get the Full Stack + AI Bundle to unlock this course.' : 'Get the Full Stack Web Dev course to unlock.')
                                        : userHasAnyPurchasedCourse
                                            ? `You don't own this course yet. Purchase ${currentCourseData?.title || activeCourse} to unlock all lessons.`
                                            : 'Trial period expired. Purchase this course to continue your journey.'
                                    }
                                </p>
                            </div>
                        </div>
                        <Link to={`/shop?course=${encodeURIComponent(activeCourse)}`} className="w-full md:w-auto px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5">
                            <ShoppingBag className="w-4 h-4" />
                            Browse course shop <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {!(isExpired || (!user?.purchasedCourses.includes(activeCourse) && !hasActiveTrialForCourse && user?.role !== 'admin')) && !showAIUpgrade && (
                    <div className="space-y-6">
                        {/* Continue Learning */}
                        {nextLesson && (
                            <div className={`p-4 md:p-6 rounded-2xl relative overflow-hidden group ${isRich ? "bg-white border border-black/[0.06]" : "bg-secondary/30 backdrop-blur-xl border border-white/10"}`}>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                                    <Link
                                        to={`/learn/${nextPhaseId}/${nextLesson.id}`}
                                        className={`w-full md:w-64 h-36 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 ${isRich ? "bg-gray-100 border border-black/[0.06]" : "bg-black border border-white/10"}`}
                                    >
                                        <img
                                            src={`https://img.youtube.com/vi/${nextLesson.youtubeId}/hqdefault.jpg`}
                                            alt={nextLesson.title}
                                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                        <PlayCircle className="w-12 h-12 text-white relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform" />
                                    </Link>
                                    <div className="flex-1 space-y-2">
                                        <div className="text-xs font-semibold text-primary uppercase tracking-wider">Continue Learning</div>
                                        <h3 className={`text-xl font-bold ${isRich ? 'text-gray-900' : ''}`}>
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

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className={`text-xl font-bold ${isRich ? 'text-gray-900' : ''}`}>Quick Stats</h2>
                            </div>

                            {isRich ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
                                    <div className="px-5 py-4">
                                        <div className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">Lessons</div>
                                        <div className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter">{totalLessons}</div>
                                    </div>
                                    <div className="px-5 py-4">
                                        <div className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">Completed</div>
                                        <div className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter">{courseCompletedLessons.length}</div>
                                    </div>
                                    <div className="px-5 py-4">
                                        <div className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">Streak</div>
                                        <div className="flex items-baseline gap-1">
                                            <div className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter">{user?.streak || 0}</div>
                                            <Flame className="w-4 h-4 text-orange-400" />
                                        </div>
                                    </div>
                                    <div className="px-5 py-4">
                                        <div className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-1">Certificate</div>
                                        <div>
                                            {user?.certifiedCourses?.[activeCourse]?.status === 'approved' ? (
                                                <button onClick={() => generateCertificate(activeCourse)} className="text-xs font-bold text-primary hover:underline">
                                                    Download
                                                </button>
                                            ) : user?.certifiedCourses?.[activeCourse]?.status === 'pending' || user?.certificateStatus === 'pending' ? (
                                                <div className="text-xs font-bold text-gray-400">
                                                    Pending
                                                </div>
                                            ) : progress === 100 ? (
                                                <button onClick={() => requestCertificate(activeCourse)} className="text-xs font-bold text-primary hover:underline">
                                                    Request
                                                </button>
                                            ) : (
                                                <div className="text-xs font-bold text-gray-300">
                                                    Locked
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <MagicBento
                                    items={[
                                        {
                                            content: (
                                                <>
                                                    <div className="text-sm text-muted-foreground mb-1 relative z-10">Total Lessons</div>
                                                    <div className="text-2xl font-bold relative z-10">{totalLessons}</div>
                                                </>
                                            )
                                        },
                                        {
                                            content: (
                                                <>
                                                    <div className="text-sm text-muted-foreground mb-1 relative z-10">Completed</div>
                                                    <div className="text-2xl font-bold relative z-10">{courseCompletedLessons.length}</div>
                                                </>
                                            )
                                        },
                                        {
                                            content: (
                                                <>
                                                    <div className="text-sm text-muted-foreground mb-1 relative z-10">Current Streak</div>
                                                    <div className="flex items-center gap-2 relative z-10">
                                                        <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                                                        <div className="text-2xl font-bold text-orange-500">{user?.streak || 0}</div>
                                                    </div>
                                                </>
                                            )
                                        },
                                        {
                                            content: (
                                                <>
                                                    <div className="text-sm text-muted-foreground mb-1 relative z-10">Certificate</div>
                                                    <div className="relative z-10">
                                                        {user?.certifiedCourses?.[activeCourse]?.status === 'approved' ? (
                                                            <button onClick={() => generateCertificate(activeCourse)} className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-bold transition-all border border-primary/20 pointer-events-auto">
                                                                <Download className="w-3 h-3" /> Download
                                                            </button>
                                                        ) : user?.certifiedCourses?.[activeCourse]?.status === 'pending' || user?.certificateStatus === 'pending' ? (
                                                            <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm animate-pulse">
                                                                <Clock className="w-4 h-4" /> Pending
                                                            </div>
                                                        ) : progress === 100 ? (
                                                            <button onClick={() => requestCertificate(activeCourse)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all border border-white/10 pointer-events-auto">
                                                                <Award className="w-3 h-3" /> Request
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-muted-foreground/50 font-bold text-sm">
                                                                <Lock className="w-4 h-4" /> Locked
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )
                                        }
                                    ]}
                                    textAutoHide={false}
                                />
                            )}
                        </div>

                        {/* CTA to Full Curriculum */}
                        <div className="mt-8 flex justify-center">
                            <Link
                                to="/curriculum"
                                className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${isRich ? "bg-gray-100 border border-black/[0.06] text-gray-700 hover:bg-gray-200" : "bg-white/5 backdrop-blur-md border border-white/10 text-white/90 hover:bg-white/10 shadow-lg shadow-[#2997ff]/5"} hover:scale-105 group relative overflow-hidden`}
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    View Full Curriculum <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
