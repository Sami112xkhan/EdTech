
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Module, curriculum } from "../data/curriculum";
import { cybersecurityCurriculum } from "../data/cybersecurityCurriculum";
import { dataScienceCurriculum } from "../data/dataScienceCurriculum";
import { aiCurriculum } from "../data/aiCurriculum";
import { getPhasesStatus } from "../utils/progress";
import { PlayCircle, Award, Clock, Lock, FileText, Download, Search, BookOpen, Shield, Bot } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import GlassSurface from "../components/GlassSurface";
import { useActiveCourse } from "../hooks/useActiveCourse";
import { useOffer } from "../context/OfferContext";
import { useTheme } from "../context/ThemeContext";

const CurriculumPage: React.FC = () => {
    const { user } = useAuth();
    const { isOfferActive } = useOffer();
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    const [activeView, setActiveView] = useState<'roadmap' | 'notes'>('roadmap');
    const [activeCourse, setActiveCourse] = useActiveCourse();
    const [noteSearch, setNoteSearch] = useState("");
    const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
    const searchQuery = noteSearch; // Align variable names

    const activeCurriculum =
        activeCourse === 'cyber' ? cybersecurityCurriculum
            : activeCourse === 'datascience' ? dataScienceCurriculum
                : activeCourse === 'ai' ? aiCurriculum
                    : curriculum;

    // Calculate Progress logic reused for display
    const completedLessons = user?.completedLessons || [];

    // Get status of all phases (locked/completed)
    const phasesStatus = getPhasesStatus(activeCurriculum, completedLessons).map(phase => {
        const isExpired = user?.role !== 'admin' && (user?.trialExpiresAt === 'EXPIRED' ||
            (user?.trialExpiresAt && new Date(user.trialExpiresAt) <= new Date()));

        return {
            ...phase,
            locked: user?.role === 'admin' ? false : (phase.locked || isExpired || !user?.purchasedCourses.includes(activeCourse))
        };
    });

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
            {/* Course Selector Tabs */}
            <div className="flex justify-center mb-2 overflow-x-auto scrollbar-hide">
                {isRich ? (
                    <div className="flex p-1 rounded-full bg-gray-100 border border-black/[0.06] w-full md:w-auto">
                        <button
                            onClick={() => { setActiveCourse('fullstack'); setActivePhaseId(null); }}
                            className={`relative flex-1 md:flex-none px-2 md:px-8 py-3 md:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap min-w-0 md:min-w-[160px] ${activeCourse === 'fullstack' ? (isRich ? 'bg-emerald-900 text-white' : 'text-white') : (isRich ? 'text-gray-400 hover:text-gray-900' : 'text-white/40 hover:text-white')}`}
                        >
                            <span className="flex items-center justify-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" />
                                {isOfferActive ? 'Full Stack + AI' : 'Full Stack'}
                            </span>
                        </button>
                        <button
                            onClick={() => { setActiveCourse('cyber'); setActivePhaseId(null); }}
                            className={`relative flex-1 md:flex-none px-2 md:px-8 py-3 md:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap min-w-0 md:min-w-[160px] ${activeCourse === 'cyber' ? (isRich ? 'bg-emerald-900 text-white' : 'text-white') : (isRich ? 'text-gray-400 hover:text-gray-900' : 'text-white/40 hover:text-white')}`}
                        >
                            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <Shield className="w-3.5 h-3.5" />
                                Cybersecurity
                            </span>
                        </button>
                        <button
                            onClick={() => { setActiveCourse('datascience'); setActivePhaseId(null); }}
                            className={`relative flex-1 md:flex-none px-2 md:px-8 py-3 md:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap min-w-0 md:min-w-[160px] ${activeCourse === 'datascience' ? (isRich ? 'bg-emerald-900 text-white' : 'text-white') : (isRich ? 'text-gray-400 hover:text-gray-900' : 'text-white/40 hover:text-white')}`}
                        >
                            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <Award className="w-3.5 h-3.5" />
                                Data Science
                            </span>
                        </button>
                        <button
                            onClick={() => { setActiveCourse('ai'); setActivePhaseId(null); }}
                            className={`relative flex-1 md:flex-none px-2 md:px-8 py-3 md:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap min-w-0 md:min-w-[160px] ${activeCourse === 'ai' ? (isRich ? 'bg-emerald-900 text-white' : 'text-white') : (isRich ? 'text-gray-400 hover:text-gray-900' : 'text-white/40 hover:text-white')}`}
                        >
                            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <Bot className="w-3.5 h-3.5" />
                                AI Course
                            </span>
                        </button>
                    </div>
                ) : (
                    <GlassSurface
                        borderRadius={50}
                        borderWidth={0.5}
                        opacity={0.4}
                        blur={10}
                        className="p-1 w-full md:w-auto"
                    >
                        <div className="flex w-full md:w-auto">
                            <button onClick={() => { setActiveCourse('fullstack'); setActivePhaseId(null); }} className={`relative flex-1 md:flex-none px-4 md:px-8 py-3 md:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all text-center min-w-[120px] md:min-w-[160px] ${activeCourse === 'fullstack' ? 'text-white' : 'text-white/40 hover:text-white'}`}>{activeCourse === 'fullstack' && <motion.div layoutId="curriculum-active-pill" className="absolute inset-0 bg-white/20 backdrop-blur-2xl rounded-full border border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8_32_rgba(0,0,0,0.3)] z-0" />}<span className="relative z-10 flex items-center justify-center gap-1.5 pointer-events-none"><BookOpen className="w-3.5 h-3.5" />{isOfferActive ? 'Full Stack + AI' : 'Full Stack'}</span></button>
                            <button onClick={() => { setActiveCourse('cyber'); setActivePhaseId(null); }} className={`relative flex-1 md:flex-none px-4 md:px-8 py-3 md:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all text-center min-w-[120px] md:min-w-[160px] ${activeCourse === 'cyber' ? 'text-white' : 'text-white/40 hover:text-white'}`}>{activeCourse === 'cyber' && <motion.div layoutId="curriculum-active-pill" className="absolute inset-0 bg-white/20 backdrop-blur-2xl rounded-full border border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8_32_rgba(0,0,0,0.3)] z-0" />}<span className="relative z-10 flex items-center justify-center gap-1.5 pointer-events-none whitespace-nowrap"><Shield className="w-3.5 h-3.5" />Cybersecurity</span></button>
                            <button onClick={() => { setActiveCourse('datascience'); setActivePhaseId(null); }} className={`relative flex-1 md:flex-none px-4 md:px-8 py-3 md:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all text-center min-w-[120px] md:min-w-[160px] ${activeCourse === 'datascience' ? 'text-white' : 'text-white/40 hover:text-white'}`}>{activeCourse === 'datascience' && <motion.div layoutId="curriculum-active-pill" className="absolute inset-0 bg-white/20 backdrop-blur-2xl rounded-full border border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8_32_rgba(0,0,0,0.3)] z-0" />}<span className="relative z-10 flex items-center justify-center gap-1.5 pointer-events-none whitespace-nowrap"><Award className="w-3.5 h-3.5" />Data Science</span></button>
                            <button onClick={() => { setActiveCourse('ai'); setActivePhaseId(null); }} className={`relative flex-1 md:flex-none px-4 md:px-8 py-3 md:py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all text-center min-w-[120px] md:min-w-[160px] ${activeCourse === 'ai' ? 'text-white' : 'text-white/40 hover:text-white'}`}>{activeCourse === 'ai' && <motion.div layoutId="curriculum-active-pill" className="absolute inset-0 bg-white/20 backdrop-blur-2xl rounded-full border border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8_32_rgba(0,0,0,0.3)] z-0" />}<span className="relative z-10 flex items-center justify-center gap-1.5 pointer-events-none whitespace-nowrap"><Bot className="w-3.5 h-3.5" />AI Course</span></button>
                        </div>
                    </GlassSurface>
                )}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2 md:px-0">
                <div className="space-y-2">
                    <h1 className={`text-3xl md:text-5xl font-black tracking-tighter leading-none ${isRich ? 'text-gray-900' : 'text-white'}`}>
                        {activeCourse === 'cyber' ? (<>CYBER <span className="text-primary italic">SECURITY</span></>) : activeCourse === 'datascience' ? (<>DATA <span className="text-primary italic">SCIENCE</span></>) : (<>CURRICULUM <span className="text-primary italic">CORE</span></>)}
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-xl font-medium leading-relaxed opacity-80">
                        {activeCourse === 'cyber'
                            ? 'Master cybersecurity in 90 days — from networking and Linux to ethical hacking and cloud security.'
                            : activeCourse === 'datascience'
                                ? 'Unlock the power of data through Python, math, machine learning, and visualization.'
                                : 'Master the full stack architecture through our structured, performance-driven transition roadmap.'}
                    </p>
                </div>

                {/* View Switcher */}
                <div className={`flex p-1 rounded-2xl w-full lg:w-auto ${isRich ? 'bg-gray-100 border border-black/[0.06]' : 'bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl'}`}>
                    <button
                        onClick={() => setActiveView('roadmap')}
                        className={`flex-1 lg:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${activeView === 'roadmap' ? (isRich ? 'bg-emerald-900 text-white' : 'bg-primary text-white shadow-xl shadow-primary/20') : isRich ? 'text-gray-400 hover:text-gray-900' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Roadmap
                    </button>
                    <button
                        onClick={() => setActiveView('notes')}
                        className={`flex-1 lg:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${activeView === 'notes' ? (isRich ? 'bg-emerald-900 text-white' : 'bg-primary text-white shadow-xl shadow-primary/20') : isRich ? 'text-gray-400 hover:text-gray-900' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
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
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                    >
                        {phasesStatus.map((phase, i) => (
                            <div
                                key={phase.id}                                className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all flex flex-col relative overflow-hidden group
                                    ${isRich ? 'border-gray-200 bg-white' : 'border-white/5 bg-secondary/20 backdrop-blur-md'}
                                    ${phase.locked ? 'opacity-60 grayscale-[0.8]' : isRich ? 'hover:border-gray-300 hover:shadow-lg' : 'hover:border-primary/30 hover:bg-secondary/40 hover:shadow-2xl hover:shadow-primary/5'}`}
                            >
                                {/* Locking Overlay */}
                                {phase.locked && (
                                    <div className="absolute inset-0 bg-background/60 z-20 flex items-center justify-center backdrop-blur-[2px]">
                                        <div className={`${isRich ? 'bg-white border border-black/[0.06]' : 'bg-black/80 border border-white/10'} p-4 rounded-full shadow-2xl scale-110`}>
                                            <Lock className="w-6 h-6 text-zinc-500" />
                                        </div>
                                    </div>
                                )}

                                <Link
                                    to={phase.locked ? "#" : `/learn/${phase.id}/${phase.lessons[0].id}`}
                                    className={`flex-1 flex flex-col ${phase.locked ? "pointer-events-none" : ""}`}
                                >
                                    <div className="flex justify-between items-start mb-4 md:mb-6">
                                        <div className={`transition-all ${
                                            isRich
                                                ? phase.completed
                                                    ? 'text-emerald-600'
                                                    : phase.locked
                                                        ? 'text-gray-300'
                                                        : 'text-gray-900'
                                                : phase.completed
                                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 w-12 h-12 rounded-2xl flex items-center justify-center'
                                                    : phase.locked
                                                        ? 'bg-zinc-800 text-zinc-600 w-12 h-12 rounded-2xl flex items-center justify-center'
                                                        : 'bg-primary text-white shadow-lg shadow-primary/30 w-12 h-12 rounded-2xl flex items-center justify-center'
                                        }`}>
                                            {isRich ? (
                                                <span className="text-xl md:text-4xl font-black tracking-tighter">
                                                    {phase.completed ? <Award className="w-8 h-8" /> : i}
                                                </span>
                                            ) : (
                                                <div className="text-lg font-black">
                                                    {phase.completed ? <Award className="w-6 h-6" /> : i}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isRich ? 'text-gray-400' : 'bg-white/5 text-zinc-400 border border-white/5 px-3 py-1 rounded-full'}`}>
                                                {phase.lessons.length} Lessons
                                            </span>
                                            {phase.lessons.some(l => l.notesPath) && (
                                                <span className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-tighter">
                                                    <FileText className="w-3 h-3" /> Notes Incl.
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className={`mb-2 md:mb-3 leading-tight ${isRich ? 'text-base md:text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors' : 'text-lg md:text-xl font-bold text-white group-hover:text-primary transition-colors'}`}>{phase.title}</h3>
                                    <p className={`mb-5 md:mb-8 line-clamp-2 leading-relaxed flex-1 ${isRich ? 'text-xs md:text-sm text-gray-500' : 'text-xs md:text-sm text-muted-foreground opacity-80'}`}>{phase.description}</p>

                                    <div className={`mt-auto pt-4 md:pt-5 flex items-center gap-4 md:gap-5 text-[11px] md:text-xs font-bold ${isRich ? 'border-t border-gray-100 text-gray-400' : 'border-t border-white/5 text-zinc-400'}`}>
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
                                        <div className={`flex items-center gap-2 ml-auto group-hover:translate-x-1 transition-transform ${isRich ? 'text-primary' : 'text-primary'}`}>
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
                                {isRich && (
                                <>
                                <button
                                    onClick={() => {
                                        setActivePhaseId(null);
                                        setNoteSearch("");
                                    }}                                        className={`min-w-[160px] md:min-w-0 w-auto md:w-full text-left px-3 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border snap-start ${!activePhaseId && !noteSearch
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                        : isRich ? 'bg-gray-100 text-gray-500 border-black/[0.06] hover:bg-gray-200 hover:text-gray-900' : 'bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10 hover:text-white'
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
                                        className={`min-w-[180px] md:min-w-0 w-auto md:w-full text-left px-3 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-between group snap-start ${activePhaseId === phase.id
                                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                            : phase.locked
                                                ? isRich ? 'bg-gray-100 text-gray-300 border-black/[0.06] cursor-not-allowed' : 'bg-zinc-900/50 text-zinc-600 border-white/5 cursor-not-allowed'
                                                : isRich ? 'bg-gray-100 text-gray-500 border-black/[0.06] hover:bg-gray-200 hover:text-gray-900' : 'bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10 hover:text-white'
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
                                </>
                                )}
                            </div>

                            {/* Notes Content Grid */}
                            <div className={`flex-1 rounded-[2.5rem] flex flex-col overflow-hidden h-full ${isRich ? 'bg-white border border-black/[0.06]' : 'bg-secondary/10 border border-white/5 backdrop-blur-sm'}`}>
                                {/* Search Header */}
                                <div className={`p-6 border-b ${isRich ? 'border-black/[0.06] bg-gray-50' : 'border-white/5 bg-secondary/20'}`}>
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
                                            className={`w-full rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all ${isRich ? 'bg-gray-100 border border-black/[0.06] placeholder:text-gray-400 text-gray-900' : 'bg-zinc-950/50 border border-white/10 placeholder:text-zinc-600'}`}
                                        />
                                    </div>
                                </div>

                                {/* Scrollable Grid Area */}
                                <div
                                    data-lenis-prevent
                                    className="flex-1 overflow-y-auto p-6 custom-scrollbar"
                                >
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-3 md:gap-4">
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
                                                    <h3 className={`font-bold mb-1 ${isRich ? 'text-gray-900' : 'text-white'}`}>No notes found</h3>
                                                    <p className="text-muted-foreground text-xs uppercase tracking-widest font-black opacity-60">Try selecting another phase</p>
                                                </div>
                                            );

                                            return displayNotes.map((note) => (
                                                <motion.div
                                                    layout
                                                    key={note.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className={`p-3 md:p-5 rounded-2xl md:rounded-3xl border transition-all flex items-center gap-3 md:gap-4 group relative overflow-hidden
                                                        ${note.isLocked
                                                            ? isRich ? 'bg-gray-100 border-black/[0.06] opacity-50 grayscale select-none' : 'bg-zinc-900/50 border-white/5 opacity-50 grayscale select-none'
                                                            : isRich ? 'bg-gray-50 border-black/[0.06] hover:border-primary/30 hover:bg-white hover:shadow-xl hover:shadow-primary/5' : 'bg-zinc-950/50 border-white/5 hover:border-primary/30 hover:bg-zinc-900/50 hover:shadow-xl hover:shadow-primary/5'
                                                        }`}
                                                >
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
                                                        ${note.isLocked
                                                            ? isRich ? 'bg-gray-200 text-gray-400' : 'bg-zinc-800 text-zinc-600'
                                                            : isRich ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-[0_0_20px_rgba(109,40,217,0.4)]'
                                                        }`}>
                                                        {note.isLocked ? <Lock className="w-5 h-5" /> : <FileText className="w-6 h-6" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={`font-black text-sm truncate leading-tight tracking-tight ${note.isLocked ? (isRich ? 'text-gray-300' : 'text-zinc-600') : (isRich ? 'text-gray-900' : 'text-zinc-100')}`}>
                                                            {note.title}
                                                        </h4>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.15em] mt-1.5 opacity-40">
                                                            {note.phaseTitle.split(" — ")[0]}
                                                        </p>
                                                    </div>

                                                    {!note.isLocked && user?.purchasedCourses.includes(activeCourse) && (
                                                        <div className="flex gap-2">
                                                            <a href={note.notesPath} target="_blank" rel="noreferrer" className={`p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${isRich ? 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'}`} title="View Online">
                                                                <BookOpen className="w-4 h-4" />
                                                            </a>
                                                            <a href={note.notesPath} download className={`p-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${isRich ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200' : 'bg-primary/10 hover:bg-primary text-primary hover:text-white'}`} title="Download">
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
