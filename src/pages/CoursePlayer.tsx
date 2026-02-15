
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { curriculum } from "../data/curriculum";
import { ChevronLeft, ChevronRight, CheckCircle, FileText, Save } from "lucide-react";

const CoursePlayer: React.FC = () => {
    const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
    const [note, setNote] = useState("");

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
    }, [moduleId, lessonId]);

    const handleSaveNote = () => {
        localStorage.setItem(`note-${moduleId}-${lessonId}`, note);
        // Visual feedback could be added here
    };

    if (!currentLesson) return <div>Lesson not found</div>;

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6">
            {/* Main Content: Video */}
            <div className="flex-1 flex flex-col min-h-0 bg-background/50 rounded-2xl overflow-hidden border border-white/5">
                <div className="relative aspect-video bg-black w-full">
                    <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${currentLesson.youtubeId}?modestbranding=1&rel=0`}
                        title="Course Video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    ></iframe>
                </div>

                <div className="p-6 flex-1 overflow-auto">
                    {/* Mobile Back Button */}
                    <div className="md:hidden mb-4">
                        <Link to="/curriculum" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
                            <ChevronLeft className="w-4 h-4" /> Back to Curriculum
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">{currentLesson.title}</h1>
                            <p className="text-muted-foreground">{currentModule?.title}</p>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-full transition-colors">
                            <CheckCircle className="w-4 h-4" />
                            Mark as Completed
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between border-t border-white/10 pt-6">
                        {prevLesson ? (
                            <Link to={`/learn/${moduleId}/${prevLesson.id}`} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                                Previous: {prevLesson.title}
                            </Link>
                        ) : <div />}

                        {nextLesson ? (
                            <Link to={`/learn/${moduleId}/${nextLesson.id}`} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                                Next: {nextLesson.title}
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <Link to="/dashboard" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                                Complete Module <CheckCircle className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar: Notes & Playlist (Ideally tabbed) */}
            <div className="w-full lg:w-80 flex flex-col gap-4 h-full">
                <div className="flex-1 bg-secondary/20 border border-white/5 rounded-2xl p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        <FileText className="w-4 h-4" />
                        Lesson Notes
                    </div>
                    <textarea
                        className="flex-1 bg-transparent resize-none focus:outline-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
                        placeholder="Type your notes here... they autosave locally."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="pt-2 flex justify-end">
                        <button onClick={handleSaveNote} className="text-xs flex items-center gap-1 text-primary hover:text-primary/80">
                            <Save className="w-3 h-3" /> Save Note
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursePlayer;
