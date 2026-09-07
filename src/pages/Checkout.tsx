import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, CreditCard, Lock, ChevronDown } from "lucide-react";
import Navbar from "../components/Navbar";

import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOffer } from "../context/OfferContext";
import { initializePayment } from "../utils/razorpay";
import { useActiveCourse } from "../hooks/useActiveCourse";
import { useCourses, getCoursesGrantedOnPurchase, type CourseData } from "../hooks/useCourses";

const Checkout: React.FC = () => {
  const { user, completePurchase, redeemCode } = useAuth();
  const { isOfferActive } = useOffer();
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [redeemMessage, setRedeemMessage] = React.useState("");

  const [searchParams] = useSearchParams();
  const courseParam = searchParams.get('course') || '';
  const [selectedCourse, setSelectedCourse] = React.useState(courseParam);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get('course')) {
      setSelectedCourse(searchParams.get('course')!);
    }
  }, [searchParams]);    const { courses: dbCourses } = useCourses();

    // Build course details from DB courses + fallback for ai_upgrade
    const buildCourseDetails = () => {
        const details: Record<string, any> = {};
        dbCourses.forEach(c => {
            details[c.slug] = {
                title: isOfferActive && c.slug === 'fullstack' ? "Full Stack + AI Course Bundle" : c.title,
                badge: isOfferActive && c.slug === 'fullstack' ? "Limited 2-Day Offer" : c.badge || undefined,
                price: c.price,
                salePrice: isOfferActive && c.slug === 'fullstack' ? 10000 : (c.salePrice || c.price),
                features: isOfferActive && c.slug === 'fullstack' ? [
                    "Lifetime Access to Full Stack Content",
                    "AI & Machine Learning Course Included",
                    "Frontend & Backend Deep Dive",
                    "AI Mentor Support (Beta)",
                    "5+ Real World Projects",
                    "Certificate of Completion",
                    "Discord Community Access"
                ] : (c.features || []),
            };
        });
        // ai_upgrade is a virtual course (not in DB)
        if (!details['ai_upgrade']) {
            details['ai_upgrade'] = {
                title: "AI Course Upgrade",
                badge: "Exclusive for Full Stack Students",
                price: 5000,
                salePrice: 2000,
                features: [
                    "Complete AI & ML Course Content",
                    "Builds on Your Full Stack Skills",
                    "Hands-on AI Projects",
                    "Early Access to New AI Modules",
                    "Discord Community Access"
                ],
            };
        }
        return details;
    };
    const courseDetails = buildCourseDetails();

  const [, setActiveCourse] = useActiveCourse();
  const currentCourse = selectedCourse ? courseDetails[selectedCourse as keyof typeof courseDetails] : null;

  const handleRedeem = async () => {
    if (!accessCode || !selectedCourse) return;
    setLoading(true);
    setRedeemMessage("");

    await new Promise(r => setTimeout(r, 600));

    const result = await redeemCode(accessCode, selectedCourse);
    setLoading(false);
    setRedeemMessage(result.message);

    if (result.success) {
      setActiveCourse(selectedCourse as any);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    }
  };

  const handlePayment = async () => {
    if (!currentCourse) return;

    if (!user) {
      navigate('/login');
      return;
    }

    await initializePayment(
      currentCourse.salePrice || currentCourse.price,
      {
        name: user.name,
        email: user.email,
      },
      (response) => {
        console.log("Payment Success:", response);
        completePurchase(selectedCourse === 'ai_upgrade' ? 'ai_upgrade' : selectedCourse);
        navigate('/dashboard');
      },
      (error) => {
        console.error("Payment Failed:", error);
        alert("Payment Failed. Please try again.");
      },
      currentCourse.title
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#f8f9f6]">
      <Navbar />

      {/* Back link */}
      <Link
        to="/"
        className="fixed top-6 left-6 z-[60] flex items-center gap-2 px-5 py-2.5 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-full text-gray-500 hover:text-gray-900 hover:bg-white transition-all text-xs font-medium"
      >
        Back to Home
      </Link>

      <div className="flex items-center justify-center p-4 pt-28 min-h-[100dvh]">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-10 items-start">

          {/* Left: Product Info */}
          <div className="space-y-6">
            <div className="relative w-full sm:w-80 z-50">
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.1em] mb-2 block">
                Select Track
              </label>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full flex items-center justify-between px-5 py-3.5 bg-white border border-black/[0.06] rounded-2xl hover:border-black/[0.12] transition-all shadow-sm ${isDropdownOpen ? 'ring-2 ring-emerald-300/40 border-emerald-300' : ''}`}
              >
                <span className={`font-medium text-[15px] ${!currentCourse ? 'text-gray-400' : 'text-gray-900'}`}>
                  {currentCourse ? currentCourse.title : "Choose Course..."}
                </span>
                <div className={`p-1 rounded-lg transition-colors ${isDropdownOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-black/[0.04] text-gray-400'}`}>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white border border-black/[0.06] rounded-2xl shadow-xl shadow-black/[0.06] z-50 flex flex-col py-2 px-2">
                    {Object.entries(courseDetails)
                      .filter(([key]) => {
                        const purchased = user?.purchasedCourses || [];
                        const isTrialUser = user?.trialExpiresAt;
                        if (!isTrialUser) {
                          if (key === 'fullstack' && purchased.includes('fullstack')) return false;
                          if (key === 'cyber' && purchased.includes('cyber')) return false;
                          if (key === 'datascience' && purchased.includes('datascience')) return false;
                        }
                        if (key === 'ai_upgrade') {
                          if (!isOfferActive) return false;
                          if (isTrialUser) return false;
                          const hasAnyCourse = purchased.includes('fullstack') || purchased.includes('cyber') || purchased.includes('datascience') || purchased.includes('cloudcomputing');
                          return hasAnyCourse && !purchased.includes('ai');
                        }
                        return true;
                      })
                      .map(([key, course]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedCourse(key);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 transition-all rounded-xl flex justify-between items-center group ${
                          selectedCourse === key
                            ? 'bg-emerald-50 border border-emerald-200/60'
                            : 'hover:bg-black/[0.02] border border-transparent'
                        }`}
                      >
                        <div className={`font-medium text-[15px] transition-colors ${selectedCourse === key ? 'text-emerald-800' : 'text-gray-900'}`}>
                          {course.title}
                        </div>
                        <div className="text-sm text-gray-400 font-medium">₹{(course.salePrice || course.price || 0).toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="pt-2">
              <h1 className="text-3xl md:text-[40px] font-bold leading-[1.05] tracking-[-0.04em] text-gray-900">
                Complete your{" "}
                <span className="text-emerald-700">enrollment</span>
              </h1>
              <p className="text-gray-500 text-[15px] mt-3 max-w-md leading-relaxed tracking-[-0.01em]">
                {currentCourse
                  ? "You are one step away from becoming a job-ready developer."
                  : "Select a track above to view the curriculum features and proceed with your secure enrollment."}
              </p>
            </div>

            <div className="relative">
              {!currentCourse && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#f8f9f6]/80 backdrop-blur-[2px] rounded-2xl border border-black/[0.04]">
                  <Lock className="w-7 h-7 text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-400">Course track required</p>
                </div>
              )}
              <div className={`space-y-3 pt-1 transition-all duration-500 ${!currentCourse ? 'opacity-30 pointer-events-none blur-[2px]' : 'opacity-100'}`}>
                {((currentCourse ? currentCourse.features : courseDetails.fullstack?.features) || []).map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[15px] text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-gray-400 pt-4 border-t border-black/[0.04] mt-4">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure checkout powered by Razorpay AES-256 encryption</span>
            </div>
          </div>

          {/* Right: Payment Card */}
          <div className="relative h-fit">
            {!currentCourse && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[4px] rounded-2xl border border-black/[0.04]">
                <div className="w-14 h-14 rounded-full bg-gray-100 border border-black/[0.04] flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Checkout Locked</h3>
                <p className="text-gray-400 text-center max-w-[220px] text-sm">Select a course track on the left to unlock payment options.</p>
              </div>
            )}

            <div className={`bg-white border border-black/[0.06] p-8 sm:p-10 rounded-2xl shadow-lg shadow-black/[0.04] transition-all duration-500 ${!currentCourse ? 'opacity-30 blur-[2px] pointer-events-none scale-[0.98]' : ''}`}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-xl font-bold leading-tight tracking-[-0.03em] text-gray-900 max-w-[220px]">
                    {currentCourse ? currentCourse.title : "Course Title"}
                  </h3>
                  <p className="text-[13px] text-gray-400 mt-1.5">One-time payment · Lifetime access</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tracking-[-0.03em] text-gray-900">₹{currentCourse ? (currentCourse.salePrice || currentCourse.price || 0).toLocaleString() : "—"}</div>
                  <div className="text-sm text-gray-400 line-through decoration-gray-300 mt-0.5">₹{currentCourse ? currentCourse.price.toLocaleString() : "—"}</div>
                </div>
              </div>

              <div className="w-full h-px bg-black/[0.04] mb-8" />

              {/* Razorpay Button */}
              <button
                onClick={handlePayment}
                disabled={!currentCourse}
                className="w-full py-4 rounded-2xl bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-[15px] tracking-[-0.01em] shadow-lg shadow-emerald-900/15 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Pay Now — ₹{currentCourse ? (currentCourse.salePrice || currentCourse.price || 0).toLocaleString() : "0"}
              </button>

              <div className="text-center mt-8">
                <p className="text-sm font-medium text-gray-400 mb-4">Or redeem an access code</p>
                {user ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Code"
                        className="flex-1 bg-white border border-black/[0.08] rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-emerald-300 font-mono uppercase text-center md:text-left text-[15px]"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                      />
                      <button
                        onClick={handleRedeem}
                        disabled={loading || !accessCode || !currentCourse}
                        className="bg-black/[0.04] hover:bg-black/[0.08] text-gray-900 rounded-xl px-6 py-2.5 font-medium text-[15px] transition-colors disabled:opacity-50"
                      >
                        {loading ? "..." : "Apply"}
                      </button>
                    </div>
                    {redeemMessage && (
                      <p className={`mt-2 text-sm ${redeemMessage.includes("Granted") || redeemMessage.includes("Activated") ? "text-emerald-700" : "text-red-600"}`}>
                        {redeemMessage}
                      </p>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="text-emerald-700 hover:text-emerald-900 font-medium text-[15px] inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    Login to Redeem Code
                  </Link>
                )}
              </div>

              <p className="text-center text-[11px] text-gray-400 mt-8 border-t border-black/[0.04] pt-5">
                By purchasing, you agree to our Terms of Service & Privacy Policy.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Checkout;
