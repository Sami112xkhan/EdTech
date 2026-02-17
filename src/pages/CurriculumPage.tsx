
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { curriculum } from "../data/curriculum";
import { getPhasesStatus } from "../utils/progress";
import { PlayCircle, Award, Clock, Lock, FileText, Download, Search, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CurriculumPage: React.FC = () => {
    const { user } = useAuth();
    const [activeView, setActiveView] = useState<'roadmap' | 'notes'>('roadmap');
    const [noteSearch, setNoteSearch] = useState("");
    const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
    const searchQuery = noteSearch; // Align variable names

    // Calculate Progress logic reused for display
    const completedLessons = user?.completedLessons || [];

    // Get status of all phases (locked/completed)
    const phasesStatus = getPhasesStatus(curriculum, completedLessons);

    // Filter notes for the library
    const allNotes = phasesStatus.flatMap(phase =>
        phase.lessons.filter(l => l.notesPath).map(l => ({
            ...l,
            phaseTitle: phase.title,
            isLocked: phase.locked // Pass locking status
        }))
    );

    const filteredNotes = allNotes.filter(n =>
        n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
        n.phaseTitle.toLowerCase().includes(noteSearch.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2 md:px-0">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white leading-none">
                        CURRICULUM <span className="text-primary italic">CORE</span>
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-xl font-medium leading-relaxed opacity-80">
                        Master the full stack architecture through our structured, performance-driven transition roadmap.
                    </p>
                </div>

                {/* View Switcher */}
                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl w-full lg:w-auto">
                    <button
                        onClick={() => setActiveView('roadmap')}
                        className={`flex-1 lg:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${activeView === 'roadmap' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Roadmap
                    </button>
                    <button
                        onClick={() => setActiveView('notes')}
                        className={`flex-1 lg:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${activeView === 'notes' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                    >
                        <FileText className="w-4 h-4" />
                        Library
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
                                                    const parseDuration = (timeStr: string) => {
                                                        if (timeStr.includes(':')) {
                                                            const parts = timeStr.split(':').map(Number);
                                                            if (parts.length === 2) return parts[0] + parts[1] / 60;
                                                            if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
                                                            return 0;
                                                        }

                                                        let totalMinutes = 0;
                                                        const hours = timeStr.match(/(\d+)h/);
                                                        const minutes = timeStr.match(/(\d+)m/);
                                                        const seconds = timeStr.match(/(\d+)s/);

                                                        if (hours) totalMinutes += parseInt(hours[1]) * 60;
                                                        if (minutes) totalMinutes += parseInt(minutes[1]);
                                                        if (seconds) totalMinutes += parseInt(seconds[1]) / 60;

                                                        return totalMinutes;
                                                    };

                                                    const totalMinutes = phase.lessons.reduce((acc, lesson) => {
                                                        return acc + parseDuration(lesson.duration);
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
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-280px)] min-h-[500px] overflow-hidden">
                            {/* Phase Navigation (Sidebar) */}
                            <div
                                data-lenis-prevent
                                className="w-full md:w-72 flex-shrink-0 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto pb-4 md:pb-0 pr-0 md:pr-2 custom-scrollbar snap-x"
                            >
                                <button
                                    onClick={() => {
                                        setActivePhaseId(null);
                                        setNoteSearch("");
                                    }}
                                    className={`min-w-[200px] md:min-w-0 w-auto md:w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border snap-start ${!activePhaseId && !noteSearch
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                        : "bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10 hover:text-white"
                                        }`}
                                >
                                    All Resources
                                </button>

                                {phasesStatus.map((phase) => (
                                    <button
                                        key={phase.id}
                                        onClick={() => {
                                            if (!phase.locked) {
                                                setActivePhaseId(phase.id);
                                                setNoteSearch("");
                                            }
                                        }}
                                        className={`min-w-[260px] md:min-w-0 w-auto md:w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-between group snap-start ${activePhaseId === phase.id
                                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                            : phase.locked
                                                ? "bg-zinc-900/50 text-zinc-600 border-white/5 cursor-not-allowed"
                                                : "bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10 hover:text-white"
                                            }`}
                                    >
                                        <span className="truncate mr-2 font-black">{phase.title.split(" — ")[0]}</span>
                                        {phase.locked ? (
                                            <Lock className="w-3.5 h-3.5 text-zinc-700" />
                                        ) : (
                                            <div className={`w-1.5 h-1.5 rounded-full transition-all ${activePhaseId === phase.id ? 'bg-white scale-125' : 'bg-primary/40 group-hover:bg-primary/80'}`} />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Notes Content Grid */}
                            <div className="flex-1 bg-secondary/10 rounded-[2.5rem] border border-white/5 flex flex-col overflow-hidden backdrop-blur-sm h-full">
                                {/* Search Header */}
                                <div className="p-6 border-b border-white/5 bg-secondary/20">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Quick search notes & resources..."
                                            value={noteSearch}
                                            onChange={(e) => {
                                                setNoteSearch(e.target.value);
                                                setActivePhaseId(null);
                                            }}
                                            className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-600"
                                        />
                                    </div>
                                </div>

                                {/* Scrollable Grid Area */}
                                <div
                                    data-lenis-prevent
                                    className="flex-1 overflow-y-auto p-6 custom-scrollbar"
                                >
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
                                        {(() => {
                                            let displayNotes = filteredNotes;
                                            if (activePhaseId) {
                                                const phase = phasesStatus.find(p => p.id === activePhaseId);
                                                displayNotes = filteredNotes.filter(n => n.phaseTitle === phase?.title);
                                            }

                                            if (displayNotes.length === 0) return (
                                                <div className="col-span-full py-20 text-center animate-in fade-in zoom-in duration-300">
                                                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-white/5">
                                                        <FileText className="w-10 h-10 text-muted-foreground opacity-30" />
                                                    </div>
                                                    <h3 className="text-white font-bold mb-1">No notes found</h3>
                                                    <p className="text-muted-foreground text-xs uppercase tracking-widest font-black opacity-60">Try selecting another phase</p>
                                                </div>
                                            );

                                            return displayNotes.map((note) => (
                                                <motion.div
                                                    layout
                                                    key={note.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className={`p-5 rounded-3xl border transition-all flex items-center gap-4 group relative overflow-hidden
                                                        ${note.isLocked
                                                            ? 'bg-zinc-900/50 border-white/5 opacity-50 grayscale select-none'
                                                            : 'bg-zinc-950/50 border-white/5 hover:border-primary/30 hover:bg-zinc-900/50 hover:shadow-xl hover:shadow-primary/5'
                                                        }`}
                                                >
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
                                                        ${note.isLocked
                                                            ? 'bg-zinc-800 text-zinc-600'
                                                            : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_0_20px_rgba(109,40,217,0.4)]'
                                                        }`}>
                                                        {note.isLocked ? <Lock className="w-5 h-5" /> : <FileText className="w-6 h-6" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`font-black text-sm truncate leading-tight tracking-tight ${note.isLocked ? 'text-zinc-600' : 'text-zinc-100'}`}>
                                                            {note.title}
                                                        </h4>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.15em] mt-1.5 opacity-40">
                                                            {note.phaseTitle.split(" — ")[0]}
                                                        </p>
                                                    </div>

                                                    {!note.isLocked && user?.isPaid && (
                                                        <div className="flex gap-2">
                                                            <a href={note.notesPath} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95" title="View Online">
                                                                <BookOpen className="w-4 h-4" />
                                                            </a>
                                                            <a href={note.notesPath} download className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all hover:scale-105 active:scale-95" title="Download">
                                                                <Download className="w-4 h-4" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
            `}</style>
        </div >
    );
};

export default CurriculumPage;
