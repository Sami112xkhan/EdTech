import { useCallback, useState } from 'react';

export function useActiveCourse() {
    const [activeCourse, setActiveCourseState] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('activeCourse');
            if (saved) return saved;
        }
        return 'fullstack';
    });

    const setActiveCourse = useCallback((course: string) => {
        setActiveCourseState(course);
        if (typeof window !== 'undefined') {
            localStorage.setItem('activeCourse', course);
        }
    }, []);

    return [activeCourse, setActiveCourse] as const;
}
