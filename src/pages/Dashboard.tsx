
import React, { useEffect } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { curriculum } from "../data/curriculum";
import { getPhasesStatus } from "../utils/progress";
import { PlayCircle, Award, Clock, Lock, ShieldAlert, Flame, Download } from "lucide-react";
import { jsPDF } from "jspdf";



import DarkVeil from "../components/DarkVeil";
import MagicBento from "../components/MagicBento";
import { useTheme, ACCENT_COLORS, BACKGROUND_CALIBRATION, ACCENT_RGB } from "../context/ThemeContext";

const Dashboard: React.FC = () => {
    const { accentColor } = useTheme();
    // ... rest of component ...
    const [searchParams] = useSearchParams();
    const { completePurchase, user, redeemCode, requestCertificate } = useAuth();
    const location = useLocation();
    const [accessCode, setAccessCode] = React.useState("");
    const [isRedeeming, setIsRedeeming] = React.useState(false);

    const generateCertificate = () => {
        if (!user) return;
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
        doc.text("Full Stack Developer Architecture", contentX, 510, { align: 'center' });

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

        const date = user.certificateIssueDate ? new Date(user.certificateIssueDate).toLocaleDateString() : new Date().toLocaleDateString();
        doc.text(`Issued: ${date}`, contentX, 750, { align: 'center' });

        doc.save(`${user.name.split(' ')[0]}_Certificate_Premium.pdf`);
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
    const phasesStatus = getPhasesStatus(curriculum, completedLessons);

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


    const accentRGB = ACCENT_RGB[accentColor] || ACCENT_RGB.purple;

    return (
        <div className="relative min-h-screen">
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

                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                            Command: <span className="text-primary italic">Welcome</span>, {user?.name.split(" ")[0]}
                        </h1>
                        <p className={`text-sm font-black leading-relaxed max-w-xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-primary animate-pulse`}>
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
                            <div className="w-full md:w-64 h-36 bg-black rounded-lg flex items-center justify-center border border-white/10 shrink-0 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                                <img
                                    src={`https://img.youtube.com/vi/${nextLesson.youtubeId}/hqdefault.jpg`}
                                    alt={nextLesson.title}
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <PlayCircle className="w-12 h-12 text-white relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform" />
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

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Quick Stats</h2>
                    </div>

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
                                        <div className="text-2xl font-bold relative z-10">{completedLessons.length}</div>
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
                                            {user?.certificateStatus === 'approved' ? (
                                                <button
                                                    onClick={generateCertificate}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-bold transition-all border border-primary/20 pointer-events-auto"
                                                >
                                                    <Download className="w-3 h-3" /> Download
                                                </button>
                                            ) : user?.certificateStatus === 'pending' ? (
                                                <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm animate-pulse">
                                                    <Clock className="w-4 h-4" /> Pending
                                                </div>
                                            ) : progress === 100 ? (
                                                <button
                                                    onClick={requestCertificate}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all border border-white/10 pointer-events-auto"
                                                >
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
                </div>


                {/* CTA to Full Curriculum */}
                <div className="mt-8 flex justify-center">
                    <Link
                        to="/curriculum"
                        className="px-8 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-sm font-medium text-white/90 hover:bg-white/10 hover:scale-105 transition-all shadow-lg shadow-purple-500/5 group relative overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            View Full Curriculum <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </Link>
                </div>
            </div>
        </div >

    );
};

export default Dashboard;
