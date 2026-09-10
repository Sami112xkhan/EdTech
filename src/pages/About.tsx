import React, { useRef, useState } from 'react';
import { useInView } from 'motion/react';
import { ChevronLeft, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import ElasticMesh from '../components/ElasticMesh';
import GradualBlur from '../components/GradualBlur';
import Noise from '../components/Noise';

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

const About: React.FC = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    return (
        <>
        <div className="min-h-screen bg-[#f8f9f6] text-gray-900 relative" style={{ fontFamily: "'SF Pro Display', system-ui, -apple-system, sans-serif" }}>
            {/* Noise overlay for subtle texture */}
            <Noise patternAlpha={12} patternRefreshInterval={3} />

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
                    <Link to="/" className="flex items-center gap-2">
                        <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-emerald-800">DevMastery</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-7">
                        <Link to="/" className="text-[13px] text-gray-400 hover:text-gray-900 transition-colors duration-300">Home</Link>
                        <Link to="/about" className="text-[13px] text-gray-900 font-semibold transition-colors duration-300">About</Link>
                        <a href="/#courses" className="text-[13px] text-gray-400 hover:text-gray-900 transition-colors duration-300">Courses</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="hidden md:block text-[13px] text-gray-400 hover:text-gray-900 transition-colors duration-300">Log in</Link>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-1.5 -mr-1.5 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-black/[0.06] bg-[#f8f9f6]/95 backdrop-blur-xl">
                        <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col gap-1">
                            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Home</Link>
                            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-[14px] text-gray-900 font-medium">About</Link>
                            <a href="/#courses" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-[14px] text-gray-500 hover:text-gray-900 transition-colors">Courses</a>
                            <div className="border-t border-black/[0.04] mt-2 pt-3">
                                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-[14px] text-gray-900 font-medium">Log in</Link>
                            </div>
                            <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="mt-2 py-2.5 text-center rounded-full bg-emerald-900 text-white text-[14px] font-semibold">Sign up</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* ══════ HERO ══════ */}
            <section className="relative pt-24 pb-12 md:pt-20 md:pb-16 overflow-hidden min-h-[60vh] md:min-h-[75vh] flex flex-col justify-center">
                <div className="absolute inset-0 opacity-20 pointer-events-auto hidden md:block">
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

                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-[0.05] pointer-events-none" style={{
                    background: 'radial-gradient(ellipse, #10b981 0%, transparent 60%)'
                }} />

                <div className="max-w-[900px] mx-auto px-6 relative z-10 pt-8">
                    <Reveal>
                        <Link to="/" className="inline-flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-700 mb-12 transition-colors duration-300">
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Home
                        </Link>
                    </Reveal>

                    <Reveal delay={0.05}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/60 mb-8">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[12px] tracking-[0.08em] uppercase text-emerald-700/70 font-medium">Our mission</span>
                        </div>
                    </Reveal>

                    <Reveal delay={0.1}>
                        <h1 className="text-[clamp(40px,8vw,80px)] font-bold leading-[0.92] tracking-[-0.045em] mb-8 text-gray-900">
                            Building the next<br />
                            <span className="text-emerald-700">generation</span> of<br />
                            developers.
                        </h1>
                    </Reveal>

                    <Reveal delay={0.15}>
                        <p className="text-[17px] text-gray-400 max-w-[520px] leading-relaxed">
                            DevMastery Academy was founded on a simple premise: traditional education is too slow for the modern tech landscape. We combine elite curriculum with AI to accelerate your path.
                        </p>
                    </Reveal>
                </div>
            </section>

            {/* ══════ MARQUEE ══════ */}
            <Marquee
                items={[
                    'Outcome Focused', 'Depth Over Breadth', 'Ship Real Code',
                    'Student First', 'AI Mentorship', 'Lifetime Access',
                    'Production Ready', 'Elite Network',
                ]}
                speed={35}
            />

            {/* ══════ I · WHY WE EXIST ══════ */}
            <section className="py-28 md:py-36">
                <div className="max-w-[900px] mx-auto px-6">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-4 font-semibold">I · Why we exist</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(28px,5vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] mb-6 text-gray-900">
                            The gap between learning<br />
                            <span className="text-emerald-700/60">and building is massive.</span>
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="text-[16px] text-gray-400 leading-relaxed max-w-[600px] mb-16">
                            Most bootcamps leave you knowing how to write a loop, but completely lost when configuring a scalable backend or managing global state. We bridge that gap.
                        </p>
                    </Reveal>

                    <div className="space-y-0">
                        {[
                            { num: '01', title: 'Fast-Tracked Learning', desc: 'Skip the academic fluff. Learn exactly what the industry demands and get production-ready in record time. Every lesson is designed for maximum practical impact.' },
                            { num: '02', title: 'Elite Network', desc: 'Code alongside ambitious builders. Share architectures, review code, and grow together in a high-signal environment where everyone is pushing forward.' },
                            { num: '03', title: 'Production Ready', desc: 'Build systems, not scripts. Master Docker, CI/CD, and scalable cloud architectures from day one. You will ship code that runs in the real world.' },
                            { num: '04', title: 'AI Mentorship', desc: 'Stuck on a bug? Your personal AI Senior Developer is available 24/7 to unblock you and review your approach with expert-level guidance.' },
                        ].map((item, i) => (
                            <Reveal key={i} delay={i * 0.06}>
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
                    'Outcome Focused', 'Depth Over Breadth', 'Ship Real Code',
                    'Student First', 'Continuous Updates', 'Real Projects',
                    'Industry Professionals', 'AI Powered',
                ]}
                speed={40}
                reverse
            />

            {/* ══════ II · OUR VALUES ══════ */}
            <section className="py-28 md:py-36 border-t border-black/[0.06]">
                <div className="max-w-[900px] mx-auto px-6">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-4 font-semibold">II · Our values</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(28px,5vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] mb-16 text-gray-900">
                            What drives everything<br />
                            <span className="text-emerald-700/60">we build.</span>
                        </h2>
                    </Reveal>

                    <div className="space-y-0">
                        {[
                            { num: '01', title: 'Outcome Focused', desc: 'Every decision optimizes for student results, not engagement metrics.' },
                            { num: '02', title: 'Depth Over Breadth', desc: 'We go deep on the skills that matter most in production environments.' },
                            { num: '03', title: 'Ship Real Code', desc: 'Projects built here are deployed and used. No toy apps, no throwaway code.' },
                            { num: '04', title: 'Student First', desc: 'If it does not help you get hired or promoted, it does not belong in the curriculum.' },
                        ].map((v, i) => (
                            <Reveal key={i} delay={i * 0.06}>
                                <div className="numbered-row flex gap-6 md:gap-10 py-8 border-t border-black/[0.06] cursor-default px-3 -mx-3">
                                    <span className="text-[13px] text-emerald-600/50 font-medium mt-1 shrink-0">{v.num}</span>
                                    <div>
                                        <h3 className="text-[18px] font-semibold tracking-tight mb-2 text-gray-900">{v.title}</h3>
                                        <p className="text-[15px] text-gray-400 leading-relaxed">{v.desc}</p>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════ III · OUR STORY ══════ */}
            <section className="py-28 md:py-36 border-t border-black/[0.06]">
                <div className="max-w-[900px] mx-auto px-6">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-4 font-semibold">III · Our story</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(28px,5vw,44px)] font-bold leading-[1.05] tracking-[-0.03em] mb-6 text-gray-900">
                            From frustration to a solution.
                        </h2>
                    </Reveal>

                    <Reveal delay={0.1}>
                        <div className="py-10 border-t border-black/[0.06] space-y-6">
                            <p className="text-[16px] text-gray-500 leading-relaxed">
                                DevMastery started when our founders realized that the traditional path to becoming a developer was fundamentally broken. Students were spending years in programs that taught theory without practice, graduating with certificates but no portfolio.
                            </p>
                            <p className="text-[16px] text-gray-500 leading-relaxed">
                                The industry was moving faster than education could keep up. By the time a curriculum was updated, the tools and frameworks it taught were already outdated.
                            </p>
                            <p className="text-[16px] text-gray-500 leading-relaxed">
                                We built DevMastery to solve this: a curriculum that is continuously updated by industry professionals, powered by AI that gives every student the attention of a personal senior mentor, and structured around real projects that prepare you for actual engineering roles.
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid grid-cols-3 gap-0 mt-4">
                        {[
                            { num: '2024', label: 'Founded', sub: 'Started with 50 students' },
                            { num: '500+', label: 'Students', sub: 'Across 12 countries' },
                            { num: '90%', label: 'Completion', sub: 'Industry leading' },
                        ].map((s, i) => (
                            <Reveal key={i} delay={i * 0.08}>
                                <div className={`py-8 ${i > 0 ? 'border-l border-black/[0.06]' : ''}`}>
                                    <div className="text-[32px] font-bold tracking-tight text-gray-900 mb-1">{s.num}</div>
                                    <div className="text-[13px] text-emerald-700/60 font-medium mb-0.5">{s.label}</div>
                                    <div className="text-[12px] text-gray-300">{s.sub}</div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════ MARQUEE ══════ */}
            <Marquee
                items={[
                    'AI-Powered Learning', 'Real Projects Only', 'Industry Experts',
                    'Lifetime Access', 'Job-Ready Skills', 'Active Community',
                    'Verified Certificate', 'Continuous Updates',
                ]}
                speed={35}
            />

            {/* ══════ IV · CTA ══════ */}
            <section className="py-32 md:py-44 border-t border-black/[0.06] relative">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
                    background: 'radial-gradient(ellipse at 50% 50%, #10b981, transparent 60%)'
                }} />
                <div className="max-w-[700px] mx-auto px-6 text-center relative z-10">
                    <Reveal>
                        <p className="text-[12px] tracking-[0.2em] uppercase text-emerald-600/60 mb-6 font-semibold">IV · Begin</p>
                    </Reveal>
                    <Reveal delay={0.05}>
                        <h2 className="text-[clamp(36px,7vw,64px)] font-bold leading-[1.0] tracking-[-0.04em] mb-6 text-gray-900">
                            Ready to join<br />
                            <span className="text-emerald-700">the elite?</span>
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
                                Enroll Now
                            </Link>
                            <Link
                                to="/"
                                className="px-8 py-3.5 rounded-full border border-black/[0.1] text-gray-400 text-[15px] font-medium hover:text-gray-700 hover:border-black/[0.2] transition-all"
                            >
                                Explore Courses
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

export default About;
