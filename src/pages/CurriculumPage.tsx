
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { curriculum } from "../data/curriculum";
import { PlayCircle, Award, Clock, Lock, FileText, Download, Search, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CurriculumPage: React.FC = () => {
    const { user } = useAuth();
    const [activeView, setActiveView] = useState<'roadmap' | 'notes'>('roadmap');
    const [noteSearch, setNoteSearch] = useState("");

    // Calculate Progress logic reused for display
    const completedLessons = user?.completedLessons || [];

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

    // Filter notes for the library
    const allNotes = curriculum.flatMap(phase =>
        phase.lessons.filter(l => l.notesPath).map(l => ({
            ...l,
            phaseTitle: phase.title
        }))
    );

    const filteredNotes = allNotes.filter(n =>
        n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
        n.phaseTitle.toLowerCase().includes(noteSearch.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                        Course Curriculum
                    </h1>
                    <p className="text-muted-foreground max-w-2xl leading-relaxed">
                        Master Full Stack Development with our structured roadmap and comprehensive study materials.
                    </p>
                </div>

                {/* View Switcher */}
                <div className="flex p-1 bg-secondary/30 rounded-xl border border-white/5 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveView('roadmap')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'roadmap' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'}`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Roadmap
                    </button>
                    <button
                        onClick={() => setActiveView('notes')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'notes' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'}`}
                    >
                        <FileText className="w-4 h-4" />
                        Notes Library
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeView === 'roadmap' ? (
                    <motion.div
                        key="roadmap"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {phasesStatus.map((phase, i) => (
                            <div
                                key={phase.id}
                                className={`p-6 rounded-3xl border border-white/5 bg-secondary/20 backdrop-blur-md transition-all flex flex-col relative overflow-hidden group
                                    ${phase.locked ? 'opacity-60 grayscale-[0.8]' : 'hover:border-primary/30 hover:bg-secondary/40 hover:shadow-2xl hover:shadow-primary/5'}
                                `}
                            >
                                {/* Locking Overlay */}
                                {phase.locked && (
                                    <div className="absolute inset-0 bg-background/60 z-20 flex items-center justify-center backdrop-blur-[2px]">
                                        <div className="bg-black/80 p-4 rounded-full border border-white/10 shadow-2xl scale-110">
                                            <Lock className="w-6 h-6 text-zinc-500" />
                                        </div>
                                    </div>
                                )}

                                <Link
                                    to={phase.locked ? "#" : `/learn/${phase.id}/${phase.lessons[0].id}`}
                                    className={`flex-1 flex flex-col ${phase.locked ? "pointer-events-none" : ""}`}
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all transform group-hover:scale-110
                                            ${phase.completed
                                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                                : phase.locked
                                                    ? 'bg-zinc-800 text-zinc-600'
                                                    : 'bg-primary text-white shadow-lg shadow-primary/30'
                                            }`}>
                                            {phase.completed ? <Award className="w-6 h-6" /> : i}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] uppercase font-bold text-zinc-400 border border-white/5 tracking-wider">
                                                {phase.lessons.length} Lessons
                                            </span>
                                            {phase.lessons.some(l => l.notesPath) && (
                                                <span className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-tighter">
                                                    <FileText className="w-3 h-3" /> Notes Incl.
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors leading-tight">{phase.title}</h3>
                                    <p className="text-sm text-muted-foreground mb-8 line-clamp-2 leading-relaxed flex-1 opacity-80">{phase.description}</p>

                                    <div className="mt-auto pt-5 border-t border-white/5 flex items-center gap-5 text-xs font-bold text-zinc-400">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary/60" />
                                            <span>
                                                {(() => {
                                                    const totalMinutes = phase.lessons.reduce((acc, lesson) => {
                                                        const [mins, secs] = lesson.duration.split(':').map(Number);
                                                        return acc + (isNaN(mins) ? 0 : mins) + (isNaN(secs) ? 0 : secs / 60);
                                                    }, 0);
                                                    return `~${(totalMinutes / 60).toFixed(1)}h`;
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 ml-auto text-primary group-hover:translate-x-1 transition-transform">
                                            <span>Explore Phase</span>
                                            <PlayCircle className="w-4 h-4" />
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="notes"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by topic or tech..."
                                value={noteSearch}
                                onChange={(e) => setNoteSearch(e.target.value)}
                                className="w-full bg-secondary/20 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredNotes.length > 0 ? filteredNotes.map((note) => (
                                <motion.div
                                    layout
                                    key={note.id}
                                    className="p-5 rounded-2xl bg-secondary/10 border border-white/5 hover:border-primary/20 transition-all flex items-center gap-4 group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm truncate mb-1">{note.title}</h4>
                                        <p className="text-[10px] text-muted-foreground uppercase font-medium">{note.phaseTitle}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <a
                                            href={note.notesPath}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                                            title="View Online"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                        </a>
                                        <a
                                            href={note.notesPath}
                                            download
                                            className="p-2 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all"
                                            title="Download PDF"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="col-span-full py-20 text-center opacity-50">
                                    <FileText className="w-12 h-12 mx-auto mb-4" />
                                    <p>No notes found matching your search.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CurriculumPage;
