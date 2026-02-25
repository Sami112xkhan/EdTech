import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { curriculum } from "../data/curriculum";
import { cybersecurityCurriculum } from "../data/cybersecurityCurriculum";
import { getPhasesStatus } from "../utils/progress";
import { ChevronLeft, ChevronRight, CheckCircle, FileText, Save, Lock } from "lucide-react";
import type { Module } from "../data/curriculum";

const CoursePlayer: React.FC = () => {
    const { user, markLessonComplete, addXp } = useAuth();
    const navigate = useNavigate();
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
    const [note, setNote] = useState("");
    const [activeTab, setActiveTab] = useState<"notes" | "material">("notes");
    const [isCompleting, setIsCompleting] = useState(false);

    // Resolve which curriculum to use based on moduleId prefix
    const activeCurriculum: Module[] = moduleId?.startsWith('cyber-') ? cybersecurityCurriculum : curriculum;

    // Find current lesson and module
    const currentModule = activeCurriculum.find(m => m.id === moduleId);
    const currentLessonIndex = currentModule?.lessons.findIndex(l => l.id === lessonId) ?? -1;
    const currentLesson = currentModule?.lessons[currentLessonIndex];

    const isCompleted = user?.completedLessons.includes(lessonId || "");

    // Check if phase is locked
    const phasesStatus = user ? getPhasesStatus(activeCurriculum, user.completedLessons) : [];
    const currentPhaseStatus = phasesStatus.find(p => p.id === moduleId);
    const isPhaseLocked = currentPhaseStatus?.locked ?? false;

    // Navigation logic
    const nextLesson = currentModule?.lessons[currentLessonIndex + 1];
    const prevLesson = currentModule?.lessons[currentLessonIndex - 1];

    useEffect(() => {
        const loadNote = async () => {
            if (!user?.email || !lessonId) return;

            // 1. Check Local Storage first (for immediate responsiveness)
            const savedNote = localStorage.getItem(`note-${moduleId}-${lessonId}`);
            if (savedNote) setNote(savedNote);

            // 2. Fetch from SQL (Source of truth)
            try {
                const response = await fetch(`/api/notes/list?email=${encodeURIComponent(user.email)}`);
                if (response.ok) {
                    const notes = await response.json();
                    const currentNote = notes.find((n: any) => n.lessonId === lessonId);
                    if (currentNote) {
                        setNote(currentNote.content);
                        localStorage.setItem(`note-${moduleId}-${lessonId}`, currentNote.content);
                    }
                }
            } catch (error) {
                console.error("Failed to load note from SQL:", error);
            }
        };

        loadNote();

        // Default to material tab if lesson has notes
        if (currentLesson?.notesPath) setActiveTab("material");
    }, [moduleId, lessonId, currentLesson, user?.email]);

    const handleSaveNote = async () => {
        if (!user?.email || !lessonId) return;

        // Save locally for speed
        localStorage.setItem(`note-${moduleId}-${lessonId}`, note);

        // Sync to Backend
        try {
            await fetch('/api/notes/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    lessonId,
                    content: note
                })
            });
        } catch (error) {
            console.warn("Failed to sync note to SQL backend", error);
        }
    };

    const handleComplete = async () => {
        if (!lessonId || isCompleting || isCompleted) return;

        setIsCompleting(true);
        try {
            await markLessonComplete(lessonId);
            await addXp(20);

            // Auto-navigate logic
            if (nextLesson) {
                // Next lesson in current module
                navigate(`/learn/${moduleId}/${nextLesson.id}`);
            } else {
                // End of current module, find next module
                const currentModuleIndex = activeCurriculum.findIndex(m => m.id === moduleId);
                const nextModule = activeCurriculum[currentModuleIndex + 1];

                if (nextModule && nextModule.lessons.length > 0) {
                    navigate(`/learn/${nextModule.id}/${nextModule.lessons[0].id}`);
                } else {
                    // All modules done or no next module
                    navigate("/curriculum");
                }
            }
        } catch (error) {
            console.error("Failed to complete lesson:", error);
        } finally {
            setIsCompleting(false);
        }
    };

    if (!currentLesson) return <div className="p-12 text-center text-muted-foreground">Lesson not found</div>;

    return (
        <div className="min-h-0 flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-120px)]">
            {/* Main Content: Video */}
            <div className="flex-1 flex flex-col min-h-0 bg-background/50 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                <div className="w-full bg-black shadow-inner relative" style={{ aspectRatio: '16/9' }}>
                    <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${currentLesson.youtubeId}?modestbranding=1&rel=0&autoplay=1`}
                        title="Course Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    ></iframe>
                </div>

                <div className="p-4 md:p-6 flex-1 overflow-auto bg-gradient-to-b from-transparent to-secondary/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider border border-primary/20">
                                    {currentModule?.id.toUpperCase()}
                                </span>
                                <span className="text-zinc-500 text-xs tracking-wide">Lesson {currentLessonIndex + 1}</span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 leading-tight">
                                {currentLesson.title}
                            </h1>
                        </div>
                        <button
                            disabled={isCompleting || isCompleted}
                            onClick={handleComplete}
                            className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 font-medium text-sm border
                                ${isCompleted
                                    ? "bg-green-500/20 text-green-500 border-green-500/20 cursor-default"
                                    : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                                }
                                ${isCompleting ? "opacity-50 cursor-wait" : ""}
                            `}
                        >
                            <CheckCircle className={`w-4 h-4 ${isCompleted ? "fill-green-500" : ""}`} />
                            {isCompleted ? "Lesson Completed" : isCompleting ? "Syncing..." : "Complete Lesson"}
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between border-t border-white/5 pt-6 mt-auto gap-4">
                        {prevLesson ? (
                            <Link to={`/learn/${moduleId}/${prevLesson.id}`} className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground hover:text-white transition-all group max-w-[45%]">
                                <span className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors shrink-0">
                                    <ChevronLeft className="w-4 h-4" />
                                </span>
                                <span className="truncate">{prevLesson.title}</span>
                            </Link>
                        ) : <div />}

                        {nextLesson ? (
                            <Link to={`/learn/${moduleId}/${nextLesson.id}`} className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground hover:text-white transition-all group max-w-[45%] text-right justify-end">
                                <span className="truncate">{nextLesson.title}</span>
                                <span className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 text-primary transition-colors shrink-0">
                                    <ChevronRight className="w-4 h-4" />
                                </span>
                            </Link>
                        ) : (
                            <Link to="/curriculum" className="flex items-center gap-2 text-xs md:text-sm font-medium text-primary hover:text-primary/80 transition-all font-bold uppercase tracking-wider">
                                Finish Roadmap <CheckCircle className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar: Notes & Course Material */}
            <div className="w-full lg:w-80 flex flex-col shrink-0 min-h-[400px] lg:h-full">
                <div className="flex-1 bg-secondary/20 border border-white/5 rounded-2xl flex flex-col overflow-hidden backdrop-blur-sm shadow-xl">
                    {/* Tabs Header */}
                    <div className="flex border-b border-white/5 bg-white/5">
                        <button
                            onClick={() => setActiveTab("notes")}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'notes' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                        >
                            <FileText className="w-4 h-4" />
                            Your Notes
                        </button>
                        <button
                            onClick={() => setActiveTab("material")}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'material' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                        >
                            <Save className="w-4 h-4" />
                            Material
                            {currentLesson.notesPath && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-1" />}
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        {activeTab === "notes" ? (
                            <div className="h-full flex flex-col min-h-[300px]">
                                <textarea
                                    className="flex-1 bg-transparent resize-none focus:outline-none text-sm leading-relaxed placeholder:text-muted-foreground/30 text-white/90 font-medium"
                                    placeholder="Study notes you write here are private and saved automatically..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                                <div className="pt-4 flex justify-between items-center border-t border-white/5">
                                    <span className="text-[10px] text-muted-foreground italic font-mono font-bold">Autosaved</span>
                                    <button onClick={handleSaveNote} className="text-[10px] px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all font-black uppercase tracking-widest">
                                        Save Now
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 text-center py-8">
                                {currentLesson.notesPath ? (
                                    <div className="w-full space-y-6">
                                        <div className="p-8 rounded-[2rem] bg-primary/10 border border-primary/20 inline-block shadow-inner relative">
                                            <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full" />
                                            <FileText className="w-12 h-12 text-primary relative z-10" />
                                        </div>
                                        <div className="space-y-2 px-4">
                                            <h3 className="text-xl font-black text-white">Concept Notes</h3>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                                                Official PDF material for "{currentLesson.title}".
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-3 px-4">
                                            {!user?.isPaid || isPhaseLocked ? (
                                                <div className="w-full py-6 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 group relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-black/40 z-10" />
                                                    <Lock className="w-6 h-6 text-white/50 relative z-20 mb-1" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-white/70 relative z-20">Downloads Locked</span>
                                                    <p className="text-[10px] text-muted-foreground relative z-20">
                                                        {!user?.isPaid ? "Available in Full Version" : "Complete previous phases to unlock"}
                                                    </p>
                                                    <Link to="/curriculum" className="absolute inset-0 z-30" />
                                                </div>
                                            ) : (
                                                <>
                                                    <a
                                                        href={currentLesson.notesPath}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="w-full py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                    >
                                                        View Online
                                                    </a>
                                                    <a
                                                        href={currentLesson.notesPath}
                                                        download
                                                        className="w-full py-4 bg-white/5 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98]"
                                                    >
                                                        Download PDF
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 opacity-30">
                                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-sm font-black uppercase tracking-widest">No material.</p>
                                        <p className="text-[10px] mt-2 font-bold italic">Check back later or use private notes!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursePlayer;
