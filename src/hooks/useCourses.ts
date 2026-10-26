import { useState, useEffect, useCallback } from 'react';
import { curriculum } from '../data/curriculum';
import { cybersecurityCurriculum } from '../data/cybersecurityCurriculum';
import { dataScienceCurriculum } from '../data/dataScienceCurriculum';
import { aiCurriculum } from '../data/aiCurriculum';
import { cloudComputingCurriculum } from '../data/cloudComputingCurriculum';

// ── Types matching the DB schema ──────────────────────────────────────────────

export interface CourseData {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    landingDescription: string | null;
    price: number;
    salePrice: number | null;
    features: string[];
    badge: string | null;
    icon: string | null;
    color: string | null;
    sortOrder: number;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LessonData {
    id: string;
    moduleId: string;
    slug: string;
    title: string;
    duration: string | null;
    youtubeId: string | null;
    notesPath: string | null;
    free: boolean;
    sortOrder: number;
}

export interface ModuleData {
    id: string;
    courseId: string;
    slug: string;
    title: string;
    description: string | null;
    sortOrder: number;
    lessons: LessonData[];
}

export interface CourseWithModules extends CourseData {
    modules: ModuleData[];
}

// ── Course config: bundle rules, slug→key mapping ─────────────────────────────

export const COURSE_BUNDLE_RULES: Record<string, string[]> = {
    fullstack: ['fullstack', 'ai'],  // buying fullstack grants ai too
};

/** Convert course slug to the key stored in user.purchasedCourses */
export function slugToCourseKey(slug: string): string {
    return slug;
}

/** Get the courses granted when purchasing a given course slug */
export function getCoursesGrantedOnPurchase(slug: string): string[] {
    return COURSE_BUNDLE_RULES[slug] || [slug];
}

// ── Simple in-memory cache ────────────────────────────────────────────────────

let cachedCourses: CourseData[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

// ── Static fallback data (used when API is unavailable) ───────────────────────

function staticModulesToCourseModules(
    staticModules: { id: string; title: string; description: string; lessons: { id: string; title: string; duration: string; youtubeId?: string; free?: boolean; notesPath?: string }[] }[],
    courseId: string
): ModuleData[] {
    return staticModules.map((m, i) => ({
        id: m.id,
        courseId,
        slug: m.id,
        title: m.title,
        description: m.description,
        sortOrder: i,
        lessons: m.lessons.map((l, j) => ({
            id: l.id,
            moduleId: m.id,
            slug: l.id,
            title: l.title,
            duration: l.duration,
            youtubeId: l.youtubeId || null,
            notesPath: l.notesPath || null,
            free: l.free || false,
            sortOrder: j,
        })),
    }));
}

const STATIC_COURSES: CourseWithModules[] = [
    {
        id: 'static-fullstack', slug: 'fullstack', title: 'Full Stack Web Dev',
        subtitle: 'Master the Modern Stack',
        description: 'Master frontend, backend, databases, and deploy real applications.',
        landingDescription: "From 'Hello World' to deployed SaaS application.",
        price: 15000, salePrice: 8000,
        features: ['Lifetime Access to Full Stack Content', 'Frontend & Backend Deep Dive', 'AI Mentor Support (Beta)', '5+ Real World Projects', 'Certificate of Completion', 'Discord Community Access'],
        badge: null, icon: 'BookOpen', color: 'emerald', sortOrder: 0, isPublished: true,
        createdAt: '', updatedAt: '',
        modules: staticModulesToCourseModules(curriculum as any, 'static-fullstack'),
    },
    {
        id: 'static-cyber', slug: 'cyber', title: '90 Days Cyber Security',
        subtitle: '90 Day Program',
        description: 'Master cybersecurity in 90 days — from networking and Linux to ethical hacking and cloud security.',
        landingDescription: 'Ethical hacking, penetration testing, network security, and defensive strategies.',
        price: 8000, salePrice: 5000,
        features: ['90 Days Intensive Training', 'Ethical Hacking Workshops', 'Linux & Networking Deep Dive', 'Certificate of Completion', 'Discord Community Access'],
        badge: null, icon: 'Shield', color: 'blue', sortOrder: 1, isPublished: true,
        createdAt: '', updatedAt: '',
        modules: staticModulesToCourseModules(cybersecurityCurriculum as any, 'static-cyber'),
    },
    {
        id: 'static-datascience', slug: 'datascience', title: 'Data Science Specialization',
        subtitle: 'Analytics & ML',
        description: 'Unlock the power of data through Python, math, machine learning, and visualization.',
        landingDescription: 'Python, statistics, data visualization, machine learning, and real-world data projects.',
        price: 12000, salePrice: 8000,
        features: ['Complete ML & Math Foundation', 'Python & Data Wrangling Projects', 'Advanced Data Visualization', 'Certificate of Completion', 'Discord Community Access'],
        badge: null, icon: 'Award', color: 'purple', sortOrder: 2, isPublished: true,
        createdAt: '', updatedAt: '',
        modules: staticModulesToCourseModules(dataScienceCurriculum as any, 'static-datascience'),
    },
    {
        id: 'static-ai', slug: 'ai', title: 'AI & Machine Learning',
        subtitle: 'AI Course',
        description: 'Complete AI & Machine Learning course.',
        landingDescription: 'Complete AI & Machine Learning course.',
        price: 5000, salePrice: 2000,
        features: ['Complete AI & ML Course Content', 'Builds on Your Full Stack Skills', 'Hands-on AI Projects', 'Early Access to New AI Modules', 'Discord Community Access'],
        badge: null, icon: 'Bot', color: 'cyan', sortOrder: 3, isPublished: true,
        createdAt: '', updatedAt: '',
        modules: staticModulesToCourseModules(aiCurriculum as any, 'static-ai'),
    },
    {
        id: 'static-cloudcomputing', slug: 'cloudcomputing', title: 'Cloud Computing',
        subtitle: 'NPTEL Cloud Computing',
        description: 'Master cloud computing from fundamentals to platform deployment — covering architecture, virtualization, XML & web services, MapReduce, OpenStack, Azure, and GCP.',
        landingDescription: 'From cloud fundamentals to Azure & GCP deployment.',
        price: 12000, salePrice: null,
        features: ['25+ Video Lessons', 'Cloud Architecture & Deployment', 'Azure & GCP Hands-On', 'OpenStack & MapReduce', 'Certificate of Completion', 'Discord Community Access'],
        badge: null, icon: 'Cloud', color: 'sky', sortOrder: 4, isPublished: true,
        createdAt: '', updatedAt: '',
        modules: staticModulesToCourseModules(cloudComputingCurriculum as any, 'static-cloudcomputing'),
    },
];

// ── Hook: List all courses (lightweight, no modules) ──────────────────────────

export function useCourses() {
    const [courses, setCourses] = useState<CourseData[]>(cachedCourses || []);
    const [loading, setLoading] = useState(!cachedCourses);
    const [error, setError] = useState<string | null>(null);

    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/courses');
            if (!res.ok) throw new Error('Failed to fetch courses');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                cachedCourses = data;
                cacheTimestamp = Date.now();
                setCourses(data);
                setError(null);
            } else {
                throw new Error('Empty response');
            }
        } catch (e: any) {
            // Fall back to static course data when API is unavailable
            if (!cachedCourses) {
                cachedCourses = STATIC_COURSES.map(({ modules, ...rest }) => rest);
                cacheTimestamp = Date.now();
                setCourses(cachedCourses);
            }
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (cachedCourses && Date.now() - cacheTimestamp < CACHE_TTL) {
            setCourses(cachedCourses);
            setLoading(false);
            return;
        }
        fetchCourses();
    }, [fetchCourses]);

    return { courses, loading, error, refetch: fetchCourses };
}

// ── Hook: Single course with modules + lessons ────────────────────────────────

export function useCourse(slug: string | null) {
    const [course, setCourse] = useState<CourseWithModules | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCourse = useCallback(async () => {
        if (!slug) { setLoading(false); return; }
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/courses/${slug}`, {
                headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
            });
            if (!res.ok) throw new Error('Course not found');
            const data = await res.json();
            setCourse(data);
            setError(null);
        } catch (e: any) {
            // Fall back to static data
            const fallback = STATIC_COURSES.find(c => c.slug === slug);
            if (fallback) setCourse(fallback);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchCourse();
    }, [fetchCourse]);

    return { course, loading, error, refetch: fetchCourse };
}

// ── Hook: All published courses with full curriculum (for CurriculumPage) ─────

export function useAllCurricula() {
    const [curricula, setCurricula] = useState<CourseWithModules[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCurricula = useCallback(async () => {
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/courses/all/curriculum', {
                headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
            });
            if (!res.ok) throw new Error('Failed to fetch curricula');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setCurricula(data);
                setError(null);
            } else {
                throw new Error('Empty response');
            }
        } catch (e: any) {
            // Do not expose static lesson/video data when the access-controlled API fails.
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCurricula(); }, [fetchCurricula]);
    useEffect(() => {
        window.addEventListener('devmastery:access-changed', fetchCurricula);
        return () => window.removeEventListener('devmastery:access-changed', fetchCurricula);
    }, [fetchCurricula]);

    return { curricula, loading, error, refetch: fetchCurricula };
}
