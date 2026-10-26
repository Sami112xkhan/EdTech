import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, Bot, Check, Cloud, Shield, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOffer } from '../context/OfferContext';
import { useCourses } from '../hooks/useCourses';
import { useTheme } from '../context/ThemeContext';
import { formatRupees, getEffectiveCoursePrice } from '../utils/coursePricing';

const courseIcons: Record<string, React.ElementType> = {
    BookOpen,
    Shield,
    Award,
    Bot,
    Cloud,
};

const courseAccents: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-400',
    blue: 'from-blue-500/20 to-cyan-500/5 text-blue-400',
    purple: 'from-violet-500/20 to-fuchsia-500/5 text-violet-400',
    cyan: 'from-cyan-500/20 to-sky-500/5 text-cyan-400',
    sky: 'from-sky-500/20 to-blue-500/5 text-sky-400',
};

const Shop: React.FC = () => {
    const { user } = useAuth();
    const { courses, loading } = useCourses();
    const { isOfferActive } = useOffer();
    const { theme } = useTheme();
    const [searchParams] = useSearchParams();
    const isRich = theme === 'rich';

    // Trial access is temporary, so it must not hide the course from the shop.
    const ownedCourses = new Set(user?.trialExpiresAt ? [] : (user?.purchasedCourses || []));
    const availableCourses = courses
        .filter(course => course.isPublished && !ownedCourses.has(course.slug))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    const focusedCourse = searchParams.get('course');

    return (
        <div className="space-y-8">
            <section className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-9 ${isRich ? 'border-emerald-900/10 bg-gradient-to-br from-white to-emerald-50' : 'border-white/10 bg-gradient-to-br from-[#101018] via-[#111027] to-[#0b0b12]'}`}>
                {!isRich && <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-blue-600/20 blur-[90px]" />}
                <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${isRich ? 'border-emerald-800/10 bg-emerald-900/5 text-emerald-800' : 'border-blue-400/20 bg-blue-400/10 text-blue-300'}`}>
                            <ShoppingBag className="h-3.5 w-3.5" /> Course Shop
                        </div>
                        <h1 className={`text-3xl font-black tracking-tight sm:text-4xl ${isRich ? 'text-gray-900' : 'text-white'}`}>
                            Build your learning library
                        </h1>
                        <p className={`mt-3 max-w-xl text-sm leading-relaxed sm:text-base ${isRich ? 'text-gray-600' : 'text-white/55'}`}>
                            Pick up any course you don’t own yet. Each purchase unlocks that course for your account permanently.
                        </p>
                    </div>
                    <div className={`rounded-2xl border px-5 py-4 ${isRich ? 'border-black/[0.06] bg-white' : 'border-white/10 bg-black/20'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isRich ? 'text-gray-400' : 'text-white/40'}`}>Your library</p>
                        <p className={`mt-1 text-2xl font-black ${isRich ? 'text-gray-900' : 'text-white'}`}>
                            {ownedCourses.size}<span className={`text-base font-semibold ${isRich ? 'text-gray-400' : 'text-white/40'}`}> / {courses.length} owned</span>
                        </p>
                    </div>
                </div>
            </section>

            {loading && courses.length === 0 ? (
                <div className={`rounded-2xl border p-12 text-center ${isRich ? 'border-black/[0.06] bg-white text-gray-500' : 'border-white/10 bg-white/[0.03] text-white/50'}`}>
                    Loading courses…
                </div>
            ) : availableCourses.length === 0 ? (
                <div className={`rounded-3xl border px-6 py-14 text-center ${isRich ? 'border-black/[0.06] bg-white' : 'border-white/10 bg-white/[0.03]'}`}>
                    <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isRich ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-300'}`}>
                        <Check className="h-7 w-7" />
                    </div>
                    <h2 className={`text-xl font-black ${isRich ? 'text-gray-900' : 'text-white'}`}>You own every course</h2>
                    <p className={`mx-auto mt-2 max-w-md text-sm ${isRich ? 'text-gray-500' : 'text-white/50'}`}>Your full learning library is ready. Head back to your dashboard and keep making progress.</p>
                    <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500">
                        Go to dashboard <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {availableCourses.map(course => {
                        const Icon = courseIcons[course.icon || ''] || BookOpen;
                        const accent = courseAccents[course.color || ''] || courseAccents.blue;
                        const isBundle = course.slug === 'fullstack';
                        const originalPrice = course.price || 0;
                        const price = isOfferActive && isBundle ? 10000 : getEffectiveCoursePrice(course.price, course.salePrice);
                        const features = course.features?.slice(0, 4) || [];

                        return (
                            <article
                                key={course.slug}
                                className={`group flex flex-col overflow-hidden rounded-3xl border transition duration-300 hover:-translate-y-1 ${focusedCourse === course.slug ? 'ring-2 ring-blue-500/70' : ''} ${isRich ? 'border-black/[0.06] bg-white shadow-sm hover:shadow-xl hover:shadow-black/[0.06]' : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]'}`}
                            >
                                <div className={`relative flex h-36 items-end bg-gradient-to-br p-6 ${accent}`}>
                                    <div className="absolute right-5 top-5 rounded-2xl border border-white/10 bg-black/10 p-3 backdrop-blur-sm">
                                        <Icon className="h-7 w-7" />
                                    </div>
                                    <div>
                                        {isBundle && isOfferActive && (
                                            <span className="mb-2 inline-flex rounded-full bg-blue-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">Bundle offer</span>
                                        )}
                                        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${isRich ? 'text-gray-500' : 'text-white/50'}`}>{course.subtitle || 'DevMastery course'}</p>
                                    </div>
                                </div>
                                <div className="flex flex-1 flex-col p-6">
                                    <div>
                                        <h2 className={`text-xl font-black ${isRich ? 'text-gray-900' : 'text-white'}`}>{course.title}</h2>
                                        <p className={`mt-2 min-h-10 text-sm leading-relaxed ${isRich ? 'text-gray-500' : 'text-white/50'}`}>
                                            {course.landingDescription || course.description || 'Explore the course curriculum and build practical skills.'}
                                        </p>
                                    </div>

                                    {features.length > 0 && (
                                        <ul className="my-5 space-y-2.5">
                                            {features.map((feature, index) => (
                                                <li key={`${course.slug}-${index}`} className={`flex items-start gap-2.5 text-xs ${isRich ? 'text-gray-600' : 'text-white/65'}`}>
                                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className={`mt-auto flex items-end justify-between border-t pt-5 ${isRich ? 'border-black/[0.06]' : 'border-white/10'}`}>
                                        <div>
                                            {originalPrice > price && <p className={`text-xs line-through ${isRich ? 'text-gray-400' : 'text-white/35'}`}>{formatRupees(originalPrice)}</p>}
                                            <p className={`text-2xl font-black ${isRich ? 'text-gray-900' : 'text-white'}`}>{formatRupees(price)}</p>
                                            <p className={`text-[10px] ${isRich ? 'text-gray-400' : 'text-white/35'}`}>One-time · Lifetime access</p>
                                        </div>
                                        <Link
                                            to={`/checkout?course=${encodeURIComponent(course.slug)}`}
                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-blue-500"
                                        >
                                            Get course <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Shop;
