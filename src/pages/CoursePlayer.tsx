
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { curriculum } from "../data/curriculum";
import { ChevronLeft, ChevronRight, CheckCircle, FileText, Save } from "lucide-react";

const CoursePlayer: React.FC = () => {
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
    const [note, setNote] = useState("");
    const [activeTab, setActiveTab] = useState<"notes" | "material">("notes");

    // Find current lesson and module
    const currentModule = curriculum.find(m => m.id === moduleId);
    const currentLessonIndex = currentModule?.lessons.findIndex(l => l.id === lessonId) ?? -1;
    const currentLesson = currentModule?.lessons[currentLessonIndex];

    // Navigation logic
    const nextLesson = currentModule?.lessons[currentLessonIndex + 1];
    const prevLesson = currentModule?.lessons[currentLessonIndex - 1];

    useEffect(() => {
        // Load note from localstorage
        const savedNote = localStorage.getItem(`note-${moduleId}-${lessonId}`);
        if (savedNote) setNote(savedNote);
        else setNote("");

        // Default to material tab if lesson has notes
        if (currentLesson?.notesPath) setActiveTab("material");
    }, [moduleId, lessonId, currentLesson]);

    const handleSaveNote = () => {
        localStorage.setItem(`note-${moduleId}-${lessonId}`, note);
    };

    if (!currentLesson) return <div className="p-12 text-center text-muted-foreground">Lesson not found</div>;

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6">
            {/* Main Content: Video */}
            <div className="flex-1 flex flex-col min-h-0 bg-background/50 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                <div className="relative aspect-video bg-black w-full shadow-inner">
                    <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${currentLesson.youtubeId}?modestbranding=1&rel=0&autoplay=1`}
                        title="Course Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    ></iframe>
                </div>

                <div className="p-6 flex-1 overflow-auto bg-gradient-to-b from-transparent to-secondary/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider border border-primary/20">
                                    {currentModule?.id.toUpperCase()}
                                </span>
                                <span className="text-zinc-500 text-xs tracking-wide">Lesson {currentLessonIndex + 1}</span>
                            </div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 leading-tight">
                                {currentLesson.title}
                            </h1>
                        </div>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-all hover:scale-105 active:scale-95 font-medium text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Complete Lesson
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between border-t border-white/5 pt-6 mt-auto">
                        {prevLesson ? (
                            <Link to={`/learn/${moduleId}/${prevLesson.id}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white transition-all group">
                                <span className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </span>
                                {prevLesson.title}
                            </Link>
                        ) : <div />}

                        {nextLesson ? (
                            <Link to={`/learn/${moduleId}/${nextLesson.id}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white transition-all group">
                                {nextLesson.title}
                                <span className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 text-primary transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </span>
                            </Link>
                        ) : (
                            <Link to="/curriculum" className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-all">
                                Finish Roadmap <CheckCircle className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar: Notes & Course Material */}
            <div className="w-full lg:w-80 flex flex-col gap-4 h-full min-h-[400px]">
                <div className="flex-1 bg-secondary/20 border border-white/5 rounded-2xl flex flex-col overflow-hidden backdrop-blur-sm shadow-xl">
                    {/* Tabs Header */}
                    <div className="flex border-b border-white/5 bg-white/5">
                        <button
                            onClick={() => setActiveTab("notes")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'notes' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Your Notes
                        </button>
                        <button
                            onClick={() => setActiveTab("material")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'material' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                        >
                            <Save className="w-3.5 h-3.5" />
                            Material
                            {currentLesson.notesPath && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        {activeTab === "notes" ? (
                            <div className="h-full flex flex-col">
                                <textarea
                                    className="flex-1 bg-transparent resize-none focus:outline-none text-sm leading-relaxed placeholder:text-muted-foreground/30 text-white/90"
                                    placeholder="Study notes you write here are private and saved automatically..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                                <div className="pt-4 flex justify-between items-center border-t border-white/5">
                                    <span className="text-[10px] text-muted-foreground italic font-mono">Last saved: {new Date().toLocaleTimeString()}</span>
                                    <button onClick={handleSaveNote} className="text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-all font-semibold">
                                        Save Now
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
                                {currentLesson.notesPath ? (
                                    <div className="w-full space-y-6">
                                        <div className="p-8 rounded-2xl bg-primary/10 border border-primary/20 inline-block shadow-inner">
                                            <FileText className="w-12 h-12 text-primary" />
                                        </div>
                                        <div className="space-y-2 px-4">
                                            <h3 className="text-lg font-bold">Concept Notes Ready</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Download or view the official PDF material for "{currentLesson.title}".
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-3 px-4">
                                            <a
                                                href={currentLesson.notesPath}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                View Online
                                            </a>
                                            <a
                                                href={currentLesson.notesPath}
                                                download
                                                className="w-full py-3 bg-secondary/50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-white/10 hover:bg-secondary transition-all"
                                            >
                                                Download PDF
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 opacity-40 grayscale">
                                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-sm font-medium">No official material available for this lesson.</p>
                                        <p className="text-xs mt-2">Use the "Your Notes" tab to take study notes!</p>
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
