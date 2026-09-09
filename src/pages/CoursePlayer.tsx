import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPhasesStatus } from "../utils/progress";
import { useAllCurricula, type CourseWithModules } from "../hooks/useCourses";
import { ChevronLeft, ChevronRight, CheckCircle, FileText, Save, Lock } from "lucide-react";
import type { Module } from "../data/curriculum";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "../context/ThemeContext";
import { soundLessonComplete, pushNotification } from "../utils/notifications";

const CoursePlayer: React.FC = () => {
    const { user, markLessonComplete, addXp } = useAuth();
    const navigate = useNavigate();
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    const [note, setNote] = useState("");
    const [activeTab, setActiveTab] = useState<"notes" | "material">("notes");
    const [isCompleting, setIsCompleting] = useState(false);
    const [markdownContent, setMarkdownContent] = useState<string | null>(null);

    const { curricula } = useAllCurricula();

    // Resolve which curriculum to use by finding the module across all courses
    let activeCourseSlug = 'fullstack';
    let activeCurriculum: Module[] = [];
    for (const course of curricula) {
        const foundMod = course.modules.find(m => m.slug === moduleId);
        if (foundMod) {
            activeCourseSlug = course.slug;
            activeCurriculum = course.modules.map(m => ({
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
            break;
        }
    }

    // Find current lesson and module
    const currentModule = activeCurriculum.find(m => m.id === moduleId);
    const currentLessonIndex = currentModule?.lessons.findIndex(l => l.id === lessonId) ?? -1;
    const currentLesson = currentModule?.lessons[currentLessonIndex];

    const isCompleted = user?.completedLessons.includes(lessonId || "");

    // Check if phase is locked
    const phasesStatus = user ? getPhasesStatus(activeCurriculum, user.completedLessons) : [];
    const currentPhaseStatus = phasesStatus.find(p => p.id === moduleId);
    const isPhaseLocked = user?.role === 'admin' ? false : (currentPhaseStatus?.locked ?? false);

    // Navigation logic
    const nextLesson = currentModule?.lessons[currentLessonIndex + 1];
    const prevLesson = currentModule?.lessons[currentLessonIndex - 1];

    // Access Check
    const hasAccess = user?.role === 'admin' || user?.purchasedCourses?.includes(activeCourseSlug);

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

        // Fetch markdown content if there is no video and notes path is markdown
        if (!currentLesson?.youtubeId && currentLesson?.notesPath?.endsWith('.md')) {
            fetch(currentLesson.notesPath)
                .then(res => res.text())
                .then(text => setMarkdownContent(text))
                .catch(err => console.error("Failed to load markdown:", err));
        } else {
            setMarkdownContent(null);
        }
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

            // Sound + notification feedback
            soundLessonComplete();
            pushNotification('🎉 Lesson Complete!', '+20 XP earned. Keep up the momentum!', 'lesson-complete');

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
            {/* Main Content: Video or Markdown */}
            <div className={`flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden ${isRich ? 'bg-white border border-gray-200' : 'bg-background/50 border border-white/5 shadow-2xl'} ${!currentLesson.youtubeId ? (isRich ? 'bg-gray-50' : 'bg-secondary/10') : ''}`}>
                {currentLesson.youtubeId && (
                    <div className="w-full bg-black shadow-inner relative" style={{ aspectRatio: '16/9' }}>
                        {(!hasAccess || (user?.role !== 'admin' && (user?.trialExpiresAt === 'EXPIRED' || (user?.trialExpiresAt && new Date(user.trialExpiresAt) <= new Date())))) ? (
                            <div className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
                                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-20" />
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                                    <Lock className="w-10 h-10 text-primary relative z-10" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Access Locked</h3>
                                <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
                                    {user?.trialExpiresAt === 'EXPIRED' || (user?.trialExpiresAt && new Date(user.trialExpiresAt) <= new Date())
                                        ? "Your trial period has ended. Get the full version to unlock all videos and resources."
                                        : "This course track is not included in your current subscription. Upgrade now to gain access."}
                                </p>
                                <Link
                                    to="/checkout"
                                    className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                                >
                                    Unlock Everything
                                </Link>
                            </div>
                        ) : (
                            <iframe
                                className="absolute inset-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${currentLesson.youtubeId}?modestbranding=1&rel=0&autoplay=1`}
                                title="Course Video"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            ></iframe>
                        )}
                    </div>
                )}

                <div className="p-4 md:p-6 flex-1 overflow-auto bg-gradient-to-b from-transparent to-secondary/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider border border-primary/20">
                                    {currentModule?.id.toUpperCase()}
                                </span>
                                <span className="text-zinc-500 text-xs tracking-wide">Lesson {currentLessonIndex + 1}</span>
                            </div>
                            <h1 className={`text-xl md:text-2xl font-bold leading-tight ${isRich ? 'text-gray-900' : 'bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400'}`}>
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
                    <div className={`flex justify-between pt-6 mt-auto gap-4 ${isRich ? 'border-t border-gray-100' : 'border-t border-white/5'}`}>
                        {prevLesson ? (
                            <Link to={`/learn/${moduleId}/${prevLesson.id}`} className={`flex items-center gap-2 text-xs md:text-sm font-medium transition-all group max-w-[45%] ${isRich ? 'text-gray-500 hover:text-gray-900' : 'text-muted-foreground hover:text-white'}`}>
                                <span className={`p-2 rounded-lg transition-colors shrink-0 ${isRich ? 'bg-gray-100 group-hover:bg-gray-200' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                    <ChevronLeft className="w-4 h-4" />
                                </span>
                                <span className="truncate">{prevLesson.title}</span>
                            </Link>
                        ) : <div />}

                        {nextLesson ? (
                            <Link to={`/learn/${moduleId}/${nextLesson.id}`} className={`flex items-center gap-2 text-xs md:text-sm font-medium transition-all group max-w-[45%] text-right justify-end ${isRich ? 'text-gray-500 hover:text-gray-900' : 'text-muted-foreground hover:text-white'}`}>
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

                    {/* Markdown Content Block */}
                    {!currentLesson.youtubeId && markdownContent && (
                        <div className={`${isRich ? 'text-gray-900' : 'text-white/90'} leading-relaxed max-w-4xl mx-auto rounded-2xl mt-4`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <div className="relative group rounded-xl overflow-hidden my-4 shadow-xl border border-white/10">
                                                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(String(children))}
                                                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-xs font-medium text-white/90 transition-all backdrop-blur-md"
                                                    >
                                                        Copy Code
                                                    </button>
                                                </div>
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.9rem', backgroundColor: '#0d0d12' }}
                                                    {...props}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            </div>
                                        ) : (
                                            <code className={`bg-primary/20 text-primary px-1.5 py-0.5 rounded-md text-sm font-mono whitespace-nowrap`} {...props}>
                                                {children}
                                            </code>
                                        );
                                    },
                                    p: ({ children }: any) => <p className="mb-6 text-base text-muted-foreground leading-loose">{children}</p>,
                                    ul: ({ children }: any) => <ul className="list-disc pl-6 mb-6 space-y-2 text-muted-foreground marker:text-primary">{children}</ul>,
                                    ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-muted-foreground marker:text-primary">{children}</ol>,
                                    li: ({ children }: any) => <li className="pl-2">{children}</li>,
                                    h1: ({ children }: any) => <h1 className={`text-3xl md:text-4xl font-black mb-6 mt-12 first:mt-2 tracking-tight ${isRich ? 'text-gray-900' : 'text-white'}`}>{children}</h1>,
                                    h2: ({ children }: any) => <h2 className={`text-2xl mt-12 mb-5 font-bold tracking-tight ${isRich ? 'text-gray-900' : 'text-white'}`}>{children}</h2>,
                                    h3: ({ children }: any) => <h3 className={`text-xl mt-8 mb-4 font-bold ${isRich ? 'text-gray-900' : 'text-white'}`}>{children}</h3>,
                                    h4: ({ children }: any) => <h4 className={`text-lg mt-6 mb-3 font-semibold ${isRich ? 'text-gray-700' : 'text-white/90'}`}>{children}</h4>,
                                    blockquote: ({ children }: any) => (
                                        <blockquote className="border-l-4 border-primary/50 pl-6 py-2 my-8 bg-primary/5 rounded-r-2xl italic text-muted-foreground">
                                            {children}
                                        </blockquote>
                                    ),
                                    a: ({ children, href }: any) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-foreground underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all font-medium">
                                            {children}
                                        </a>
                                    ),
                                    strong: ({ children }: any) => <strong className={`font-bold ${isRich ? 'text-gray-900' : 'text-white'}`}>{children}</strong>,
                                    hr: () => <hr className={`my-10 ${isRich ? 'border-gray-200' : 'border-white/10'}`} />,
                                    img: (props: any) => (
                                        <div className="my-8 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                            <img className="w-full h-auto object-cover" {...props} />
                                        </div>
                                    ),
                                }}
                            >
                                {markdownContent}
                            </ReactMarkdown>
                        </div>
                    )}

                </div>
            </div>

            {/* Sidebar: Notes & Course Material */}
            <div className="w-full lg:w-80 flex flex-col shrink-0 min-h-[400px] lg:h-full">
                <div className={`flex-1 rounded-2xl flex flex-col overflow-hidden ${isRich ? 'bg-white border border-gray-200' : 'bg-secondary/20 border border-white/5 backdrop-blur-sm shadow-xl'}`}>
                    {/* Tabs Header */}
                    <div className={`flex ${isRich ? 'border-b border-gray-100 bg-gray-50' : 'border-b border-white/5 bg-white/5'}`}>
                        <button
                            onClick={() => setActiveTab("notes")}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'notes' ? 'text-primary border-b-2 border-primary bg-primary/5' : isRich ? 'text-gray-400 hover:text-gray-900 hover:bg-gray-100' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                        >
                            <FileText className="w-4 h-4" />
                            Your Notes
                        </button>
                        <button
                            onClick={() => setActiveTab("material")}
                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'material' ? 'text-primary border-b-2 border-primary bg-primary/5' : isRich ? 'text-gray-400 hover:text-gray-900 hover:bg-gray-100' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
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
                                    className={`flex-1 bg-transparent resize-none focus:outline-none text-sm leading-relaxed placeholder:text-muted-foreground/30 font-medium ${isRich ? 'text-gray-900' : 'text-white/90'}`}
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
                                            <h3 className={`text-xl font-black ${isRich ? 'text-gray-900' : 'text-white'}`}>Concept Notes</h3>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed ${isRich ? 'text-gray-500' : 'text-muted-foreground'}`}>
                                                Official PDF material for "{currentLesson.title}".
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-3 px-4">
                                            {!hasAccess || isPhaseLocked ? (
                                                <div className={`w-full py-6 rounded-2xl flex flex-col items-center justify-center gap-2 group relative overflow-hidden ${isRich ? 'bg-gray-50 border border-gray-200' : 'bg-white/5 border border-white/10'}`}>
                                                    <div className="absolute inset-0 bg-black/40 z-10" />
                                                    <Lock className="w-6 h-6 text-white/50 relative z-20 mb-1" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-white/70 relative z-20">Downloads Locked</span>
                                                    <p className="text-[10px] text-muted-foreground relative z-20">
                                                        {!hasAccess ? "Available in Full Version" : "Complete previous phases to unlock"}
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
                                                        className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isRich ? 'bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
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
