import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronDown, CreditCard, Lock, ShieldCheck, Tag } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useOffer } from '../context/OfferContext';
import { initializePayment } from '../utils/razorpay';
import { useActiveCourse } from '../hooks/useActiveCourse';
import { useCourses } from '../hooks/useCourses';
import { formatRupees, getEffectiveCoursePrice } from '../utils/coursePricing';
import { getPermanentlyOwnedCourseSlugs } from '../utils/courseOwnership';

type CouponQuote = { code: string; baseAmount: number; amountOff: number; discountAmount: number; finalAmount: number; discountCapped: boolean };

const Checkout: React.FC = () => {
    const { user, completePurchase, redeemCode } = useAuth();
    const { isOfferActive } = useOffer();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { courses: dbCourses } = useCourses();
    const [activeCourse, setActiveCourse] = useActiveCourse();
    const [selectedCourse, setSelectedCourse] = React.useState(searchParams.get('course') || '');
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [accessCode, setAccessCode] = React.useState('');
    const [accessLoading, setAccessLoading] = React.useState(false);
    const [redeemMessage, setRedeemMessage] = React.useState('');
    const [couponInput, setCouponInput] = React.useState('');
    const [appliedCoupon, setAppliedCoupon] = React.useState<CouponQuote | null>(null);
    const [couponMessage, setCouponMessage] = React.useState('');
    const [couponLoading, setCouponLoading] = React.useState(false);
    const [paymentLoading, setPaymentLoading] = React.useState(false);
    const [paymentError, setPaymentError] = React.useState('');

    React.useEffect(() => {
        const requestedCourse = searchParams.get('course');
        if (requestedCourse) setSelectedCourse(requestedCourse);
    }, [searchParams]);

    const courseDetails: Record<string, any> = {};
    dbCourses.filter((course) => course.isPublished).forEach((course) => {
        courseDetails[course.slug] = {
            title: isOfferActive && course.slug === 'fullstack' ? 'Full Stack + AI Course Bundle' : course.title,
            price: course.price,
            salePrice: isOfferActive && course.slug === 'fullstack' ? 10000 : getEffectiveCoursePrice(course.price, course.salePrice),
            features: isOfferActive && course.slug === 'fullstack' ? [
                'Lifetime Access to Full Stack Content', 'AI & Machine Learning Course Included',
                'Frontend & Backend Deep Dive', 'AI Mentor Support (Beta)', '5+ Real World Projects',
                'Certificate of Completion', 'Discord Community Access',
            ] : (course.features || []),
        };
    });
    courseDetails.ai_upgrade = {
        title: 'AI Course Upgrade', price: 5000, salePrice: 2000,
        features: ['Complete AI & ML Course Content', 'Builds on Your Full Stack Skills', 'Hands-on AI Projects', 'Early Access to New AI Modules', 'Discord Community Access'],
    };

    const ownedCourses = getPermanentlyOwnedCourseSlugs(user);
    const currentCourse = courseDetails[selectedCourse] || null;
    const selectedCourseKey = selectedCourse === 'ai_upgrade' ? 'ai' : selectedCourse;
    const isSelectedCourseOwned = !!selectedCourse && ownedCourses.has(selectedCourseKey);
    const baseAmount = currentCourse ? getEffectiveCoursePrice(currentCourse.price, currentCourse.salePrice) : 0;
    const payableAmount = appliedCoupon?.finalAmount ?? baseAmount;

    React.useEffect(() => {
        setAppliedCoupon(null);
        setCouponMessage('');
    }, [selectedCourse]);

    const apiRequest = async (url: string, body: Record<string, unknown>) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('sessionId') || ''}`,
            },
            body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    };

    const handleApplyCoupon = async () => {
        if (!user) { navigate('/login'); return; }
        if (!couponInput.trim() || !selectedCourse) return;
        setCouponLoading(true);
        setCouponMessage('');
        setAppliedCoupon(null);
        try {
            const quote: CouponQuote = await apiRequest('/api/coupons/preview', {
                couponCode: couponInput.trim(), courseId: selectedCourse,
            });
            setAppliedCoupon(quote);
            setCouponInput(quote.code);
            setCouponMessage(quote.discountCapped
                ? `Coupon applied. Discount adjusted to leave ₹1 payable.`
                : 'Coupon applied successfully.');
        } catch (error) {
            setCouponMessage(error instanceof Error ? error.message : 'Could not validate coupon');
        } finally {
            setCouponLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!currentCourse || isSelectedCourseOwned) return;
        if (!user) { navigate('/login'); return; }
        setPaymentLoading(true);
        setPaymentError('');
        let orderId = '';
        try {
            const order = await apiRequest('/api/payments/create-order', {
                courseId: selectedCourse,
                couponCode: appliedCoupon?.code || undefined,
            });
            orderId = order.orderId;
            await initializePayment(
                order,
                { name: user.name, email: user.email },
                async (response) => {
                    try {
                        const verified = await apiRequest('/api/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        if (!verified.success) throw new Error('Payment could not be confirmed');
                        const purchasedCourse = selectedCourse === 'ai_upgrade' ? 'ai_upgrade' : selectedCourse;
                        await completePurchase(purchasedCourse);
                        setActiveCourse((selectedCourse === 'ai_upgrade' ? 'ai' : selectedCourse) as any);
                        navigate('/dashboard');
                    } catch (error) {
                        setPaymentError(error instanceof Error ? error.message : 'Payment verification failed. Contact support if you were charged.');
                        setPaymentLoading(false);
                    }
                },
                async (error) => {
                    console.error('Razorpay payment failed:', error);
                    await apiRequest('/api/payments/release', { orderId }).catch(() => undefined);
                    setPaymentError(error?.description || 'Payment failed. Please try again.');
                    setPaymentLoading(false);
                },
                async () => {
                    await apiRequest('/api/payments/release', { orderId }).catch(() => undefined);
                    setPaymentLoading(false);
                },
            );
        } catch (error) {
            if (orderId) await apiRequest('/api/payments/release', { orderId }).catch(() => undefined);
            setPaymentError(error instanceof Error ? error.message : 'Could not start checkout');
            setPaymentLoading(false);
        }
    };

    const handleRedeem = async () => {
        if (!accessCode || !selectedCourse) return;
        setAccessLoading(true);
        setRedeemMessage('');
        const result = await redeemCode(accessCode, selectedCourse);
        setAccessLoading(false);
        setRedeemMessage(result.message);
        if (result.success) {
            setActiveCourse((selectedCourse === 'ai_upgrade' ? 'ai' : selectedCourse) as any);
            window.setTimeout(() => navigate('/dashboard'), 1000);
        }
    };

    const currency = formatRupees;

    return (
        <div className="min-h-[100dvh] bg-[#f8f9f6]">
            <Navbar />
            <Link to="/shop" className="fixed left-4 top-[72px] z-[60] flex items-center gap-1.5 rounded-xl border border-black/[0.05] bg-white/70 px-3 py-2 text-[13px] font-medium text-gray-500 shadow-sm backdrop-blur-2xl transition hover:bg-white hover:text-gray-900 md:left-6 md:px-4 md:py-2.5">
                <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Course Shop</span>
            </Link>

            <div className="flex min-h-[100dvh] items-center justify-center p-4 pb-10 pt-28 sm:p-6 sm:pt-28">
                <div className="grid w-full max-w-5xl items-start gap-8 md:grid-cols-2 md:gap-10">
                    <section className="space-y-6">
                        <div className="relative z-20 w-full sm:max-w-sm">
                            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-gray-400">Select track</label>
                            <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex w-full items-center justify-between rounded-2xl border border-black/[0.06] bg-white px-5 py-3.5 text-left shadow-sm">
                                <span className={`text-[15px] font-medium ${currentCourse ? 'text-gray-900' : 'text-gray-400'}`}>{currentCourse?.title || 'Choose course…'}</span>
                                <ChevronDown className={`h-4 w-4 text-gray-400 transition ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isDropdownOpen && <>
                                <button aria-label="Close course list" className="fixed inset-0 z-20 cursor-default" onClick={() => setIsDropdownOpen(false)} />
                                <div className="absolute left-0 top-[calc(100%+6px)] z-30 flex max-h-72 w-full flex-col overflow-y-auto rounded-2xl border border-black/[0.06] bg-white p-2 shadow-xl">
                                    {Object.entries(courseDetails).filter(([key]) => {
                                        if (key === 'ai_upgrade') return isOfferActive && !user?.trialExpiresAt && [...ownedCourses].some(course => course !== 'ai') && !ownedCourses.has('ai');
                                        return !ownedCourses.has(key);
                                    }).map(([key, course]: [string, any]) => <button key={key} type="button" onClick={() => { setSelectedCourse(key); setIsDropdownOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-emerald-50">
                                        <span className="text-sm font-medium text-gray-900">{course.title}</span>
                                        <span className="text-sm text-gray-500">{currency(getEffectiveCoursePrice(course.price, course.salePrice))}</span>
                                    </button>)}
                                </div>
                            </>}
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 md:text-[40px]">Complete your <span className="text-emerald-700">enrollment</span></h1>
                            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-500">
                                {isSelectedCourseOwned ? 'You already own this course. Choose another course or visit the shop for your remaining courses.' : currentCourse ? 'You are one step away from becoming a job-ready developer.' : 'Select a track above to view the course details and checkout.'}
                            </p>
                        </div>
                        <div className="space-y-3 border-t border-black/[0.04] pt-5">
                            {(currentCourse?.features || []).map((feature: string, index: number) => <div key={index} className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></span>
                                <span className="text-sm text-gray-700">{feature}</span>
                            </div>)}
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-gray-400"><ShieldCheck className="h-4 w-4" /><span>Secure checkout powered by Razorpay</span></div>
                    </section>

                    <section className="h-fit rounded-2xl border border-black/[0.06] bg-white p-5 shadow-lg shadow-black/[0.04] sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0"><h2 className="max-w-[240px] text-xl font-bold leading-tight text-gray-900">{currentCourse?.title || 'Course title'}</h2><p className="mt-1.5 text-[13px] text-gray-400">One-time payment · Lifetime access</p></div>
                            <div className="shrink-0 text-right"><div className="text-2xl font-bold text-gray-900">{currentCourse ? currency(payableAmount) : '—'}</div>{currentCourse && (appliedCoupon || baseAmount < currentCourse.price) && <div className="mt-0.5 text-sm text-gray-400 line-through">{currency(appliedCoupon ? baseAmount : currentCourse.price)}</div>}</div>
                        </div>

                        <div className="my-6 h-px bg-black/[0.05]" />
                        {currentCourse && appliedCoupon && <div className="mb-4 space-y-2 rounded-xl bg-emerald-50 p-3 text-sm">
                            <div className="flex justify-between text-gray-600"><span>Course price</span><span>{currency(appliedCoupon.baseAmount)}</span></div>
                            <div className="flex justify-between font-semibold text-emerald-800"><span>Coupon ({appliedCoupon.code})</span><span>−{currency(appliedCoupon.discountAmount)}</span></div>
                            <div className="flex justify-between border-t border-emerald-900/10 pt-2 font-bold text-gray-900"><span>Total</span><span>{currency(appliedCoupon.finalAmount)}</span></div>
                        </div>}

                        {user && currentCourse && !isSelectedCourseOwned && <div className="mb-4">
                            <label className="mb-2 block text-xs font-semibold text-gray-600">Discount coupon</label>
                            <div className="flex gap-2">
                                <input value={couponInput} onChange={(event) => { setCouponInput(event.target.value.toUpperCase()); setAppliedCoupon(null); setCouponMessage(''); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleApplyCoupon(); } }} placeholder="Enter coupon code" className="min-w-0 flex-1 rounded-xl border border-black/[0.08] bg-white px-3 py-3 text-sm font-mono uppercase text-gray-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30 sm:px-4" />
                                {appliedCoupon ? <button type="button" onClick={() => { setAppliedCoupon(null); setCouponMessage('Coupon removed.'); }} className="rounded-xl bg-gray-100 px-4 text-sm font-semibold text-gray-700">Remove</button> : <button type="button" onClick={() => void handleApplyCoupon()} disabled={couponLoading || !couponInput.trim()} className="shrink-0 rounded-xl bg-gray-100 px-4 text-sm font-semibold text-gray-800 disabled:opacity-50">{couponLoading ? '…' : 'Apply'}</button>}
                            </div>
                            {couponMessage && <p className={`mt-2 text-xs ${appliedCoupon ? 'text-emerald-700' : 'text-red-600'}`}>{couponMessage}</p>}
                        </div>}

                        <button type="button" onClick={() => void handlePayment()} disabled={!currentCourse || isSelectedCourseOwned || paymentLoading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-900 py-4 text-[15px] font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                            <CreditCard className="h-5 w-5" />{paymentLoading ? 'Starting secure checkout…' : isSelectedCourseOwned ? 'Already enrolled' : `Pay now — ${currentCourse ? currency(payableAmount) : '₹0'}`}
                        </button>
                        {paymentError && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{paymentError}</p>}
                        {isSelectedCourseOwned && <Link to="/shop" className="mt-3 flex w-full items-center justify-center rounded-xl border border-emerald-900/10 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Browse remaining courses</Link>}

                        <div className="mt-7 border-t border-black/[0.04] pt-5 text-center">
                            <p className="mb-4 text-sm font-medium text-gray-400">Or redeem an access code</p>
                            {user ? <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input aria-label="Access code" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Enter access code" className="min-w-0 flex-1 rounded-xl border border-black/[0.08] px-4 py-2.5 text-center font-mono text-[15px] uppercase text-gray-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/30 md:text-left" />
                                    <button type="button" onClick={() => void handleRedeem()} disabled={accessLoading || !accessCode || !currentCourse || isSelectedCourseOwned} className="shrink-0 rounded-xl bg-black/[0.04] px-5 py-2.5 text-[15px] font-medium text-gray-900 disabled:opacity-50">{accessLoading ? '…' : 'Apply'}</button>
                                </div>
                                {redeemMessage && <p className={`mt-2 text-sm ${/granted|activated/i.test(redeemMessage) ? 'text-emerald-700' : 'text-red-600'}`}>{redeemMessage}</p>}
                            </div> : <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 px-5 py-2.5 text-[15px] font-medium text-emerald-700"><Lock className="h-4 w-4" />Login to redeem code</Link>}
                        </div>
                        <p className="mt-6 text-center text-[11px] text-gray-400">By purchasing, you agree to our Terms of Service &amp; Privacy Policy.</p>
                        <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-gray-400"><Tag className="h-3.5 w-3.5" /> Coupons are single-use and available across courses</div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
