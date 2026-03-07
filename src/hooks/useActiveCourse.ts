import { useState } from 'react';

type CourseType = 'fullstack' | 'cyber' | 'datascience';

export function useActiveCourse() {
    const [activeCourse, setActiveCourseState] = useState<CourseType>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('activeCourse');
            if (saved === 'fullstack' || saved === 'cyber' || saved === 'datascience') {
                return saved;
            }
        }
        return 'fullstack';
    });

    const setActiveCourse = (course: CourseType) => {
        setActiveCourseState(course);
        if (typeof window !== 'undefined') {
            localStorage.setItem('activeCourse', course);
        }
    };

    return [activeCourse, setActiveCourse] as const;
}
