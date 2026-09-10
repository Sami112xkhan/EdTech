import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useInView } from 'motion/react';
import { Lock, PlayCircle, ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import * as Accordion from '@radix-ui/react-accordion';
import { useOffer } from '../context/OfferContext';
import { useActiveCourse } from '../hooks/useActiveCourse';
import { useCourses, useAllCurricula, type CourseData, type CourseWithModules } from '../hooks/useCourses';
import ElasticMesh from '../components/ElasticMesh';
import GradualBlur from '../components/GradualBlur';
import SylvaBackground from '../components/SylvaBackground';

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1) ${delay}s, transform 0.7s cubic-bezier(0.23, 1, 0.32, 1) ${delay}s`,
            }}
        >
            {children}
        </div>
    );
};

const Marquee: React.FC<{ items: string[]; speed?: number; reverse?: boolean }> = ({ items, speed = 40, reverse = false }) => {
    const content = items.join('  ·  ');
    const doubled = `${content}  ·  ${content}  ·  ${content}`;
    return (
        <div className="overflow-hidden whitespace-nowrap py-5 border-y border-black/[0.06]">
            <div
                className="inline-block"
                style={{
                    animation: `marquee ${speed}s linear infinite${reverse ? ' reverse' : ''}`,
                }}
            >
                <span className="text-[13px] tracking-[0.04em] text-black/20 font-medium uppercase">
                    {doubled}
                </span>
            </div>
        </div>
    );
};

const Landing: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const { isOfferActive } = useOffer();
    const [activeCourse, setActiveCourse] = useActiveCourse();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user) {
            const hasActiveTrial = user.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED' && new Date(user.trialExpiresAt) > new Date();
            if ((user.purchasedCourses && user.purchasedCourses.length > 0) || hasActiveTrial) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [isAuthenticated, user, navigate]);

    const { courses: dbCourses } = useCourses();
    const { curricula } = useAllCurricula();

    const activeCurriculumObj = curricula.find(c => c.slug === activeCourse);
    const activeCurriculumModules = activeCurriculumObj?.modules || [];

    // Build course info dynamically from DB courses
    const courseInfo: Record<string, { title: string; sub: string }> = {};
    dbCourses.forEach(c => {
        courseInfo[c.slug] = {
            title: c.landingDescription || c.subtitle || c.title,
            sub: c.description || c.landingDescription || '',
        };
    });
    // Fallbacks for courses not yet in DB
    if (!courseInfo['fullstack']) courseInfo['fullstack'] = { title: 'Master the Modern Stack', sub: "From 'Hello World' to deployed SaaS application." };
    if (!courseInfo['cyber']) courseInfo['cyber'] = { title: 'Master Cybersecurity in 90 Days', sub: 'From networking fundamentals to ethical hacking -- your complete cybersecurity journey.' };
    if (!courseInfo['datascience']) courseInfo['datascience'] = { title: 'Data Science for Beginners', sub: 'Learn the concepts behind data science, visualization, and real-world deployment.' };
    if (!courseInfo['cloudcomputing']) courseInfo['cloudcomputing'] = { title: 'Master Cloud Computing', sub: 'From cloud fundamentals to Azure & GCP deployment — architecture, virtualization, OpenStack, and more.' };

    // Build course tabs from published DB courses
    const courseTabs = dbCourses
        .filter(c => c.isPublished && c.slug !== 'ai')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(c => ({ id: c.slug as any, label: c.title.split(' ').slice(0, 2).join(' ') }));
    // Fallback if DB is empty
    if (courseTabs.length === 0) {
        courseTabs.push(
            { id: 'fullstack' as const, label: 'Full Stack' },
            { id: 'cyber' as const, label: 'Cyber Security' },
            { id: 'datascience' as const, label: 'Data Science' },
            { id: 'cloudcomputing' as const, label: 'Cloud Computing' }
        );
    }

    return (
        <>
        <div className="min-h-screen bg-[#f8f9f6] text-gray-900" style={{ fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif" }}>

            <style>{`
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-33.333%); }
                }
                .numbered-row {
                    transition: padding-left 0.35s cubic-bezier(0.23, 1, 0.32, 1), background 0.35s ease, box-shadow 0.35s ease;
                    padding-left: 0;
                    border-radius: 12px;
                    margin-left: 0;
                    margin-right: 0;
                    padding-right: 0;
                }
                .numbered-row:hover {
                    padding-left: 12px;
                    background: rgba(16, 185, 129, 0.04);
                    box-shadow: inset 3px 0 0 #10b981;
                }
            `}</style>

            {/* ══════ NAV ══════ */}
            <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(248, 249, 246, 0.92)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between border-b border-black/[0.06]">
                    <Link to="/" onClick={(e) => { if (window.location.pathname === '/') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }} className="flex items-center gap-2">
                        <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-emerald-800">DevMastery</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-7">
                        <a href="#why" className="text-[13px] text-gray-400 hover:text-gray-900 transition-colors duration-300">Why</a>
                        <a href="#courses" className="text-[13px] text-gray-400 hover:text-gray-900 transition-colors duration-300">Courses</a>
                        <a href="#curriculum" className="text-[13px] text-gray-400 hover:text-gray-900 transition-colors duration-300">Curriculum</a>
                        <Link to="/about" className="text-[13px] text-gray-400 hover:text-gray-900 transition-colors duration-300">About</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="hidden md:block text-[13px] text-gray-400 hover:text-gray-900 transition-colors duration-300">
                            Log in
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-1.5 -mr-1.5 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-black/[0.06] bg-[#f8f9f6]/95 backdrop-blur-xl">
                        <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col gap-1">
                            <a href="#why" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Why</a>
                            <a href="#courses" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Courses</a>
                            <a href="#curriculum" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Curriculum</a>
                            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-[14px] text-gray-500 hover:text-gray-900 transition-colors">About</Link>
                            <div className="border-t border-black/[0.04] mt-2 pt-3">
                                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-[14px] text-gray-900 font-medium">Log in</Link>
                            </div>
                            <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="mt-2 py-2.5 text-center rounded-full bg-emerald-900 text-white text-[14px] font-semibold">Sign up</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* ══════ HERO ══════ */}
            <section className="relative pt-24 pb-12 md:pt-20 md:pb-16 overflow-hidden min-h-[70vh] md:min-h-[85vh] flex flex-col justify-center z-10">
                {/* 3D Living Green background */}
                <div className="absolute inset-0 z-0">
                    <SylvaBackground />
                </div>

                <div className="absolute inset-0 opacity-20 pointer-events-auto hidden md:block z-10">
                    <ElasticMesh
                        color1="#d1fae5"
                        color2="#ecfdf5"
                        highlight="#10b981"
                        showGrid
                        gridDensity={24}
                        gridOpacity={0.06}
                        gridColor="#059669"
                        borderRadius={0}
                        stiffness={0.03}
                        damping={0.3}
                        grabRadius={0.5}
                        pull={0.2}
                        wobble={3}
                        tilt={8}
                        shading={0.3}
                        resolution={20}
                        interaction="hover"
                        enabled
                    />
                </div>

                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[400px] md:w-[800px] h-[300px] md:h-[600px] opacity-[0.06] pointer-events-none" style={{
                    background: 'radial-gradient(ellipse, #10b981 0%, transparent 60%)'
                }} />

                <div className="max-w-[1000px] mx-auto px-6 relative z-10 pt-8">
                    <Reveal>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/60 mb-8">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[12px] tracking-[0.08em] uppercase text-emerald-700/70 font-medium">New AI-Powered Curriculum 2026</span>
                        </div>
                    </Reveal>

                    <Reveal delay={0.1}>
                        <h1 className="text-[clamp(36px,9vw,96px)] font-bold leading-[0.92] tracking-[-0.045em] mb-6 md:mb-8 text-gray-900">
                            Become a<br />
                            <span className="text-emerald-700">Developer.</span>
                        </h1>
                    </Reveal>

                    <Reveal delay={0.2}>
                        <p className="text-[17px] text-gray-400 max-w-[520px] leading-relaxed mb-10">
                            Master Full Stack, Data Science, Cybersecurity, or Cloud Computing with expert curriculum and AI mentorship. From beginner to job-ready.
                        </p>
                    </Reveal>

                    <Reveal delay={0.3}>
                        <div className="flex items-center gap-4">
                            <Link
                                to="/checkout?course=fullstack"
                                className="px-7 py-3 rounded-full bg-emerald-900 text-white text-[14px] font-semibold hover:bg-emerald-800 active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/15"
                            >
                                Get Started
                            </Link>
                            <a href="#courses" className="text-[14px] text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-2">
                                Explore courses <ChevronRight className="w-4 h-4" />
                            </a>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ══════ MARQUEE ══════ */}
            <Marquee
                items={[
                    'Full Stack Development', 'Cyber Security', 'Data Science', 'Cloud Computing',
                    'AI Mentorship', 'Lifetime Access', 'Real-World Projects',
                    '500+ Students', '100+ Video Lessons', 'Verified Certificate',
                    'Active Community', 'Structured Curriculum', 'Job-Ready Skills',
                ]}
                speed={35}
            />

            {/* ══════ I · WHY WE EXIST ══════ */}
            <section id="why" className="py-28 md:py-36">
                <div className="max-w-[900px] mx-auto px-6">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-4 font-semibold">I · Why we exist</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(28px,5vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] mb-6 text-gray-900">
                            Traditional education is too slow for the modern tech landscape.
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="text-[16px] text-gray-400 leading-relaxed max-w-[640px]">
                            The gap between learning syntax and shipping production code is massive. We bridge that gap by putting you directly into complex, real-world architectures with an ever-present AI mentor.
                        </p>
                    </Reveal>

                    <div className="mt-16 space-y-0">
                        {[
                            { num: '01', title: 'Fast-Tracked', desc: 'Skip the academic fluff. Learn exactly what the industry demands and get production-ready in record time.' },
                            { num: '02', title: 'Elite Network', desc: 'Code alongside ambitious builders. Share architectures, review code, and grow together in a high-signal environment.' },
                            { num: '03', title: 'Production Ready', desc: 'Build systems, not scripts. Master Docker, CI/CD, and scalable cloud architectures from day one.' },
                        ].map((item, i) => (
                            <Reveal key={i} delay={i * 0.08}>
                                <div className="numbered-row flex gap-6 md:gap-10 py-8 border-t border-black/[0.06] cursor-default px-3 -mx-3">
                                    <span className="text-[13px] text-emerald-600/50 font-medium mt-1 shrink-0">{item.num}</span>
                                    <div>
                                        <h3 className="text-[18px] font-semibold tracking-tight mb-2 text-gray-900">{item.title}</h3>
                                        <p className="text-[15px] text-gray-400 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════ MARQUEE ══════ */}
            <Marquee
                items={[
                    'Frontend & Backend', 'Ethical Hacking', 'Machine Learning',
                    'Python & Data', 'Cloud Architecture', 'Cloud Computing',
                    'Portfolio Projects', 'AI Code Review', 'Lifetime Updates',
                    'Azure & GCP', 'OpenStack', 'MapReduce',
                ]}
                speed={40}
                reverse
            />

            {/* ══════ II · COURSES ══════ */}
            <section id="courses" className="py-28 md:py-36">
                <div className="max-w-[900px] mx-auto px-6">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-4 font-semibold">II · What we teach</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(28px,5vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-gray-900">
                            Four paths. One goal.
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="text-[16px] text-gray-400 leading-relaxed max-w-[480px] mb-16">
                            Each track is designed to take you from beginner to job-ready with real projects and mentorship.
                        </p>
                    </Reveal>

                    <div className="space-y-0">
                        {(dbCourses.length > 0 ? dbCourses.filter(c => c.isPublished && c.slug !== 'ai') : [
                            { id: '1', slug: 'fullstack', title: 'Full Stack + AI', subtitle: 'Web Development', description: 'Master frontend, backend, databases, and deploy real applications. Includes the complete AI & Machine Learning course.', features: ['Frontend & Backend Deep Dive', 'AI & ML Included', '5+ Real Projects', 'Lifetime Access'], price: 15000, salePrice: 10000, sortOrder: 0 },
                            { id: '2', slug: 'cyber', title: 'Cyber Security', subtitle: '90 Day Program', description: 'Ethical hacking, penetration testing, network security, and defensive strategies used by industry professionals.', features: ['Ethical Hacking Workshops', 'Linux & Networking', 'Penetration Testing Labs', 'Certificate'], price: 8000, salePrice: 5000, sortOrder: 1 },
                            { id: '3', slug: 'datascience', title: 'Data Science', subtitle: 'Analytics & ML', description: 'Python, statistics, data visualization, machine learning, and real-world data projects from scratch.', features: ['ML & Math Foundation', 'Python & Data Wrangling', 'Advanced Visualization', 'Certificate'], price: 12000, salePrice: 8000, sortOrder: 2 },
                            { id: '4', slug: 'cloudcomputing', title: 'Cloud Computing', subtitle: 'NPTEL Cloud Computing', description: 'Master cloud computing from fundamentals to platform deployment — covering architecture, virtualization, XML & web services, MapReduce, OpenStack, Azure, and GCP.', features: ['25+ Video Lessons', 'Cloud Architecture & Deployment', 'Azure & GCP Hands-On', 'OpenStack & MapReduce', 'Certificate of Completion'], price: 11500, salePrice: null, sortOrder: 3 },
                        ] as CourseData[]).sort((a, b) => a.sortOrder - b.sortOrder).map((course, i) => (
                            <Reveal key={course.id || i} delay={i * 0.08}>
                                <div className="numbered-row py-10 border-t border-black/[0.06] group cursor-default px-3 -mx-3">
                                    <div className="flex items-start gap-6 md:gap-10">
                                        <span className="text-[13px] text-emerald-600/50 font-medium mt-1.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                        <div className="flex-1">
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                                                <div>
                                                    <h3 className="text-[22px] font-bold tracking-tight text-gray-900">{course.title}</h3>
                                                    <p className="text-[13px] text-gray-400 mt-0.5">{course.subtitle || ''}</p>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[24px] font-bold text-gray-900">Rs.{(course.salePrice || course.price).toLocaleString()}</span>
                                                    {course.salePrice && course.salePrice !== course.price && (
                                                        <span className="text-[14px] text-gray-300 line-through">Rs.{course.price.toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[15px] text-gray-400 leading-relaxed mb-5 max-w-[560px]">{course.description || ''}</p>
                                            <div className="flex flex-wrap gap-3 mb-6">
                                                {(course.features || []).map((f, fi) => (
                                                    <span key={fi} className="px-3 py-1.5 rounded-full border border-emerald-200/60 text-[12px] text-emerald-700/60 bg-emerald-50/40">
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                            <Link
                                                to={`/checkout?course=${course.slug}`}
                                                className="inline-flex items-center gap-2 text-[14px] text-emerald-700/60 hover:text-emerald-700 transition-colors duration-300 font-medium"
                                            >
                                                Enroll now <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════ III · FEATURES ══════ */}
            <section className="py-28 md:py-36 border-t border-black/[0.06]">
                <div className="max-w-[900px] mx-auto px-6">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-4 font-semibold">III · What you get</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(28px,5vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] mb-16 text-gray-900">
                            Built for results.
                        </h2>
                    </Reveal>

                    <div className="space-y-0">
                        {[
                            { num: '01', title: 'Structured Curriculum', desc: 'Guided phases from zero to professional. No filler, no fluff.' },
                            { num: '02', title: 'Real-World Projects', desc: 'Build production-grade portfolios that impress hiring managers.' },
                            { num: '03', title: 'AI Mentorship', desc: '24/7 AI-powered support, code review, and instant feedback.' },
                            { num: '04', title: 'Active Community', desc: 'Connect and collaborate with 500+ ambitious developers.' },
                            { num: '05', title: 'Lifetime Access', desc: 'Every update, every lesson, every project -- forever.' },
                            { num: '06', title: 'Verified Certificate', desc: 'Earn a certificate recognized by industry professionals.' },
                        ].map((f, i) => (
                            <Reveal key={i} delay={i * 0.06}>
                                <div className="numbered-row flex gap-6 md:gap-10 py-7 border-t border-black/[0.06] cursor-default px-3 -mx-3">
                                    <span className="text-[13px] text-emerald-600/50 font-medium mt-0.5 shrink-0">{f.num}</span>
                                    <div>
                                        <h3 className="text-[17px] font-semibold tracking-tight mb-1 text-gray-900">{f.title}</h3>
                                        <p className="text-[14px] text-gray-400 leading-relaxed">{f.desc}</p>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════ IV · CURRICULUM ══════ */}
            <section id="curriculum" className="py-28 md:py-36 border-t border-black/[0.06]">
                <div className="max-w-[800px] mx-auto px-6">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-4 font-semibold">IV · The curriculum</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(28px,5vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] mb-3 text-gray-900">
                            {courseInfo[activeCourse]?.title}
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="text-[15px] text-gray-400 max-w-[460px] leading-relaxed mb-12">
                            {courseInfo[activeCourse]?.sub}
                        </p>
                    </Reveal>

                    <Reveal delay={0.15}>
                        <div className="flex gap-1 p-1 rounded-full bg-gray-200/50 mb-10 w-fit">
                            {courseTabs.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setActiveCourse(c.id)}
                                    className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all duration-300 ${
                                        activeCourse === c.id
                                            ? 'bg-emerald-900 text-white shadow-lg shadow-emerald-900/15'
                                            : 'text-gray-400 hover:text-gray-700'
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </Reveal>

                    <Accordion.Root type="multiple" className="space-y-0">
                        {activeCurriculumModules.map((mod, index) => (
                            <Accordion.Item
                                key={mod.id}
                                value={mod.id}
                                className="border-t border-black/[0.06] data-[state=open]:border-emerald-200 transition-colors"
                            >
                                <Accordion.Header>
                                    <Accordion.Trigger className="w-full flex items-center justify-between py-6 text-left cursor-pointer group">
                                        <div className="flex items-center gap-5">
                                            <span className="text-[13px] text-emerald-600/50 font-medium">{String(index + 1).padStart(2, '0')}</span>
                                            <div>
                                                <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-emerald-800 transition-colors">{mod.title}</h3>
                                                <p className="text-[12px] text-gray-400 mt-0.5">{mod.lessons.length} Lessons</p>
                                            </div>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-gray-300 transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:text-emerald-500" />
                                    </Accordion.Trigger>
                                </Accordion.Header>
                                <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                                    <div className="pb-6 pl-[42px]">
                                        {mod.lessons.map((lesson, li) => (
                                            <div
                                                key={lesson.id}
                                                className={`flex items-center justify-between py-2.5 ${
                                                    li < mod.lessons.length - 1 ? 'border-b border-black/[0.04]' : ''
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {lesson.free ? (
                                                        <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Lock className="w-3 h-3 text-gray-300" />
                                                    )}
                                                    <span className={`text-[13px] ${lesson.free ? 'text-gray-700' : 'text-gray-300'}`}>
                                                        {lesson.title}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-gray-300 font-medium">{lesson.duration || ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Accordion.Content>
                            </Accordion.Item>
                        ))}
                    </Accordion.Root>
                </div>
            </section>

            {/* ══════ MARQUEE ══════ */}
            <Marquee
                items={[
                    'Structured Curriculum', 'Real-World Projects', 'AI Mentorship',
                    'Lifetime Access', 'Verified Certificate', 'Active Community',
                    'Full Stack', 'Cyber Security', 'Data Science', 'Cloud Computing',
                ]}
                speed={30}
            />

            {/* ══════ V · SOCIAL PROOF ══════ */}
            <section className="py-28 md:py-36 border-t border-black/[0.06]">
                <div className="max-w-[900px] mx-auto px-6">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-4 font-semibold">V · Trusted by developers</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(28px,5vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] mb-16 text-gray-900">
                            Numbers speak for themselves.
                        </h2>
                    </Reveal>

                    <div className="grid grid-cols-2 md:grid-cols-4">
                        {[
                            { num: '500+', label: 'Active Students' },
                            { num: '100+', label: 'Video Lessons' },
                            { num: '15+', label: 'Real Projects' },
                            { num: '4.9/5', label: 'Average Rating' },
                        ].map((s, i) => (
                            <Reveal key={i} delay={i * 0.08}>
                                <div className={`py-8 ${i % 2 !== 0 ? 'border-l border-black/[0.06]' : ''} ${i >= 2 ? 'border-t md:border-t-0 border-black/[0.06]' : ''}`}>
                                    <div className="text-[36px] font-bold tracking-tight text-gray-900 mb-1">{s.num}</div>
                                    <div className="text-[11px] text-emerald-700/50 uppercase tracking-[0.15em] font-medium">{s.label}</div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════ VI · CTA ══════ */}
            <section className="py-32 md:py-44 border-t border-black/[0.06] relative">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
                    background: 'radial-gradient(ellipse at 50% 50%, #10b981, transparent 60%)'
                }} />
                <div className="max-w-[700px] mx-auto px-6 text-center relative z-10">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-6 font-semibold">VI · Start now</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(36px,7vw,64px)] font-bold leading-[1.0] tracking-[-0.04em] mb-6 text-gray-900">
                            Start your journey<br />
                            <span className="text-emerald-700">today.</span>
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="text-[16px] text-gray-400 mb-10 leading-relaxed">
                            Join 500+ developers who transformed their careers with DevMastery.
                        </p>
                    </Reveal>
                    <Reveal delay={0.15}>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/checkout?course=fullstack"
                                className="px-8 py-3.5 rounded-full bg-emerald-900 text-white text-[15px] font-semibold hover:bg-emerald-800 active:scale-[0.98] transition-all shadow-lg shadow-emerald-900/15"
                            >
                                Get Started
                            </Link>
                            <Link
                                to="/about"
                                className="px-8 py-3.5 rounded-full border border-black/[0.1] text-gray-400 text-[15px] font-medium hover:text-gray-700 hover:border-black/[0.2] transition-all"
                            >
                                Learn More
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ══════ FOOTER ══════ */}
            <footer className="py-8 border-t border-black/[0.06]">
                <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[12px] text-gray-300">&copy; {new Date().getFullYear()} DevMastery. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="text-[12px] text-gray-300 hover:text-gray-500 transition-colors">Privacy</a>
                        <a href="#" className="text-[12px] text-gray-300 hover:text-gray-500 transition-colors">Terms</a>
                        <a href="#" className="text-[12px] text-gray-300 hover:text-gray-500 transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>

        {/* Fixed bottom blur on viewport */}
        <GradualBlur
            position="bottom"
            height="7rem"
            strength={1.5}
            divCount={10}
            curve="bezier"
            exponential
            opacity={0.6}
            target="page"
        />
        </>
    );
};

export default Landing;
