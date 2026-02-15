
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { curriculum } from "../data/curriculum";
import { PlayCircle, Award, Clock, Lock } from "lucide-react";

const CurriculumPage: React.FC = () => {
    const { user } = useAuth();

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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Full Stack Curriculum</h1>
                <p className="text-muted-foreground mb-8">Your step-by-step roadmap to professional development.</p>
            </div>

            {/* Curriculum Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {phasesStatus.map((phase, i) => (
                    <div
                        key={phase.id}
                        className={`p-6 rounded-2xl border border-white/5 bg-secondary/20 backdrop-blur-sm transition-all flex flex-col relative overflow-hidden group
                            ${phase.locked ? 'opacity-60 grayscale-[0.8]' : 'hover:border-primary/20 hover:bg-secondary/40 hover:shadow-lg hover:shadow-primary/5'}
                        `}
                    >
                        {/* Locking Overlay */}
                        {phase.locked && (
                            <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="bg-background/80 p-3 rounded-full border border-white/10 shadow-xl">
                                    <Lock className="w-6 h-6 text-muted-foreground" />
                                </div>
                            </div>
                        )}

                        <Link
                            to={phase.locked ? "#" : `/learn/${phase.id}/${phase.lessons[0].id}`}
                            className={`flex-1 flex flex-col ${phase.locked ? "pointer-events-none" : ""}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-mono transition-colors
                                    ${phase.completed
                                        ? 'bg-green-500/20 text-green-400'
                                        : phase.locked
                                            ? 'bg-zinc-800 text-zinc-500'
                                            : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                                    }`}>
                                    {phase.completed ? <Award className="w-5 h-5" /> : i}
                                </div>
                                <div className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-medium text-muted-foreground border border-white/5">
                                    {phase.lessons.length} Lessons
                                </div>
                            </div>

                            <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{phase.title}</h3>
                            <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed flex-1">{phase.description}</p>

                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                        {(() => {
                                            const totalMinutes = phase.lessons.reduce((acc, lesson) => {
                                                const [mins, secs] = lesson.duration.split(':').map(Number);
                                                return acc + mins + (secs / 60);
                                            }, 0);
                                            return `~${(totalMinutes / 60).toFixed(1)}h`;
                                        })()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    Start Phase
                                </div>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CurriculumPage;
