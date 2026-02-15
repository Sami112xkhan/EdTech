
import { Module } from "../data/curriculum";

export interface PhaseStatus extends Module {
    locked: boolean;
    completed: boolean;
}

export const isPhaseComplete = (phase: Module, completedLessons: string[]): boolean => {
    return phase.lessons.every(l => completedLessons.includes(l.id));
};

export const getPhasesStatus = (curriculum: Module[], completedLessons: string[]): PhaseStatus[] => {
    return curriculum.map((phase, index) => {
        // Phase 0 is always unlocked
        if (index === 0) return { ...phase, locked: false, completed: isPhaseComplete(phase, completedLessons) };

        // For subsequent phases, check if previous phase is complete
        const prevPhase = curriculum[index - 1];
        const isPrevComplete = isPhaseComplete(prevPhase, completedLessons);

        return {
            ...phase,
            locked: !isPrevComplete,
            completed: isPhaseComplete(phase, completedLessons)
        };
    });
};

export const getCurrentPhase = (phasesStatus: PhaseStatus[]): PhaseStatus | null => {
    // Find the first unlocked but not completed phase
    const active = phasesStatus.find(p => !p.locked && !p.completed);
    if (active) return active;

    // If all are completed, return the last one
    if (phasesStatus.every(p => p.completed)) return phasesStatus[phasesStatus.length - 1];

    // Default to first if none match (should cover fresh user)
    return phasesStatus[0];
};
