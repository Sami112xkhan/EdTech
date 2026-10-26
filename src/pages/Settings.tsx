
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/ui/Input';
import {
    CreditCard, Save, Bell, Globe, BookOpen,
    Shield, Download, Monitor, Volume2, VolumeX, Palette,
    Eye, Zap, ChevronDown, Check, Trash2, LogOut,
    GraduationCap, Code, AlertTriangle, RefreshCw, ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useCourses } from '../hooks/useCourses';
import { formatRupees, getEffectiveCoursePrice } from '../utils/coursePricing';

// ─── Toggle Switch ───
const Toggle: React.FC<{
    enabled: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}> = ({ enabled, onChange, label, description, icon }) => {
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    const [justChanged, setJustChanged] = React.useState(false);
    const handleChange = () => {
        onChange(!enabled);
        setJustChanged(true);
        setTimeout(() => setJustChanged(false), 1500);
    };
    return (
    <div className="flex items-center justify-between py-3.5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${isRich ? "text-gray-900" : "text-white"}`}>{label}</p>
                    <AnimatePresence>
                        {justChanged && (
                            <motion.span
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 8 }}
                                className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full"
                            >
                                Synced ✓
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
        <button
            onClick={handleChange}
            className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ml-4 ${enabled ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-white/10'}`}
        >
            <motion.div
                layout
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                animate={{ left: enabled ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </button>
    </div>
);
};

// ─── Select Dropdown ───
const Select: React.FC<{
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    label: string;
    icon?: React.ReactNode;
}> = ({ value, onChange, options, label, icon }) => {
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    const [open, setOpen] = useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
                {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
                <p className={`text-sm font-medium ${isRich ? "text-gray-900" : "text-white"}`}>{label}</p>
            </div>
            <div className="relative w-full sm:w-auto" ref={ref}>
                <button
                    onClick={() => setOpen(!open)}
                    className={`w-full sm:w-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isRich ? 'bg-gray-100 border border-black/[0.06] text-gray-900 hover:bg-gray-200' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'} transition-colors min-w-[120px] sm:min-w-[150px] justify-between`}
                >
                    {options.find(o => o.value === value)?.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className={`absolute right-0 top-full mt-1 w-full rounded-lg shadow-2xl z-50 overflow-hidden ${isRich ? "bg-white border border-black/[0.06]" : "bg-[#1a1a1a] border border-white/10"}`}
                        >
                            {options.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${isRich ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white/80'} ${value === opt.value ? 'text-primary' : ''}`}
                                >
                                    {opt.label}
                                    {value === opt.value && <Check className="w-3.5 h-3.5" />}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// ─── Section Card ───
const SettingsSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    badge?: string;
}> = ({ title, icon, children, badge }) => {
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    return (
    <div className={`p-6 space-y-1 rounded-xl ${isRich ? "bg-white border border-black/[0.06]" : "bg-secondary/30 border border-white/5"}`}>
        <div className="flex items-center gap-3 mb-4">
            <div className="text-primary">{icon}</div>
            <h2 className={`text-lg font-bold ${isRich ? "text-gray-900" : "text-white"}`}>{title}</h2>
            {badge && (
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">{badge}</span>
            )}
        </div>
        <div className="divide-y divide-white/5">{children}</div>
    </div>
    );
};

// ─── Main Component ───
const Settings: React.FC = () => {
    const { user, deleteUser, logout, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(user?.name || "");
    const [username, setUsername] = useState(user?.username || "");
    const [isSaving, setIsSaving] = useState(false);
    const [showSubDetails, setShowSubDetails] = useState(false);

    // ─── Load / Save helpers ───
    const loadPref = <T,>(key: string, fallback: T): T => {
        try {
            const val = localStorage.getItem(`settings_${key}`);
            return val !== null ? JSON.parse(val) : fallback;
        } catch { return fallback; }
    };

    const { courses: dbCourses } = useCourses();
    const totalPaid = (user?.purchasedCourses || []).reduce((sum, slug) => {
        const course = dbCourses.find(c => c.slug === slug);
        return sum + (course ? getEffectiveCoursePrice(course.price, course.salePrice) : 0);
    }, 0);

    // Appearance (Global Theme Context)
    const { 
        theme, setTheme,
        fontSize, setFontSize, 
        accentColor, setAccentColor, 
        codeFont, setCodeFont,
        frostedMode, setFrostedMode
    } = useTheme();
    const isRich = theme === 'rich';
    const isDark = theme === 'dark-gamer';

    // Notifications
    const [emailNotifs, setEmailNotifs] = useState(() => user?.emailNotifs ?? loadPref('emailNotifs', true));
    const [pushNotifs, setPushNotifs] = useState(() => user?.pushNotifs ?? loadPref('pushNotifs', true));
    const [courseUpdates, setCourseUpdates] = useState(() => user?.courseUpdates ?? loadPref('courseUpdates', true));
    const [soundEffects, setSoundEffects] = useState(() => user?.soundEffects ?? loadPref('soundEffects', true));

    // Privacy
    const [profileVisibility, setProfileVisibility] = useState(() => user?.profileVisibility ?? loadPref('profileVisibility', 'public'));
    const [showProgress, setShowProgress] = useState(() => user?.showProgress ?? loadPref('showProgress', true));
    const [showStreak, setShowStreak] = useState(() => user?.showStreak ?? loadPref('showStreak', true));

    // ─── Request push notification permission ───
    const requestPushPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            toast.error('Push notifications are not supported in this browser');
            return false;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {                            toast.success('Push notifications enabled!');
            return true;
        } else {
            toast.error('Push notification permission denied');
            return false;
        }
    }, []);

    // ─── Generic pref updater ───
    const updatePref = <T,>(key: string, setter: React.Dispatch<React.SetStateAction<T>>) => (value: T) => {
        setter(value);
        localStorage.setItem(`settings_${key}`, JSON.stringify(value));
        updateProfile({ [key]: value }).catch(() => toast.error('Failed to sync setting', { duration: 1200 }));
        toast.success('Setting saved', { duration: 1200 });
    };

    // ─── Push notification handler (requests permission) ───
    const handlePushToggle = async (value: boolean) => {
        if (value) {
            const granted = await requestPushPermission();
            if (!granted) return;
        }
        setPushNotifs(value);
        localStorage.setItem('settings_pushNotifs', JSON.stringify(value));
        updateProfile({ pushNotifs: value }).catch(() => { });
        toast.success(value ? 'Push notifications enabled' : 'Push notifications disabled', { duration: 1200 });
    };

    // ─── Sound effect (play a sample beep) ───
    const handleSoundToggle = (value: boolean) => {
        setSoundEffects(value);
        localStorage.setItem('settings_soundEffects', JSON.stringify(value));
        updateProfile({ soundEffects: value }).catch(() => { });
        if (value) {
            try {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.value = 0.1;
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
                setTimeout(() => ctx.close(), 300);
            } catch { /* silent fallback */ }
        }
        toast.success(value ? 'Sound effects enabled' : 'Sound effects muted', { duration: 1200 });
    };

    useEffect(() => { if (user) { setName(user.name); setUsername(user.username || ""); } }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateProfile({ name, username });
            toast.success("Profile updated!");
        } catch {
            toast.error("Failed to save. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportData = () => {
        const data = {
            profile: { name: user?.name, email: user?.email, username: user?.username },
            preferences: {
                accentColor, fontSize, codeFont, emailNotifs, pushNotifs,
                courseUpdates, soundEffects, profileVisibility, showProgress, showStreak,
            },
            progress: {
                completedLessons: user?.completedLessons?.length || 0,
                streak: user?.streak || 0,
                xp: user?.xp || 0,
                level: user?.level || 1,
            },
            exportedAt: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devmastery-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Data exported!");
    };

    const handleResetPreferences = () => {
        if (!confirm("Reset all preferences to default? This won't affect your profile or progress.")) return;
        [
            'accentColor', 'fontSize', 'codeFont', 'emailNotifs', 'pushNotifs',
            'courseUpdates', 'soundEffects', 'profileVisibility', 'showProgress', 'showStreak',
        ].forEach(k => localStorage.removeItem(`settings_${k}`));
        document.documentElement.style.fontSize = '';
        toast.success("Preferences reset to defaults");
        setTimeout(() => window.location.reload(), 600);
    };

    return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-4xl space-y-6 pb-12">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold">Account Settings</h1>
                    <p className="text-muted-foreground">Manage your profile, preferences, and privacy.</p>
                </div>

                {/* ─── Profile ─── */}
                <SettingsSection title="Profile Information" icon={<GraduationCap className="w-5 h-5" />}>
                    <div className="flex items-center justify-between pb-3">
                        <span />
                        {user?.isVerified ? (
                            <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Verified</span>
                            </div>
                        ) : (
                            <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Unverified</span>
                            </div>
                        )}
                    </div>
                    <div className="grid gap-4 pt-2">
                        <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        <div className="space-y-2">
                            <Input label="Email" defaultValue={user?.email} disabled className="opacity-50 cursor-not-allowed" />
                            {!user?.isVerified && (
                                <button
                                    onClick={() => navigate(`/verify?email=${encodeURIComponent(user?.email || '')}`)}
                                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
                                >
                                    Verify Email Now &rarr;
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-5 py-2.5 bg-primary rounded-lg text-white text-sm font-semibold hover:bg-primary/90 transition-colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </SettingsSection>

                {/* ─── Appearance (no Theme) ─── */}
                <SettingsSection title="Appearance" icon={<Palette className="w-5 h-5" />}>
                    <Select
                        label="Theme"
                        icon={<Palette className="w-4 h-4" />}
                        value={theme}
                        onChange={(v) => setTheme(v as any)}
                        options={[
                            { value: 'dark-gamer', label: 'Dark Gamer' },
                            { value: 'rich', label: 'Rich' },
                        ]}
                    />
                    {isDark && (
                        <Toggle
                            label="Frosted Glass Mode"
                            description="Disables heavy backgrounds for a high-performance, frosted glass look"
                            icon={<Monitor className="w-4 h-4" />}
                            enabled={frostedMode}
                            onChange={setFrostedMode}
                        />
                    )}
                    {isDark && !frostedMode && (
                        <Select
                            label="Accent Color"
                            icon={<Palette className="w-4 h-4" />}
                            value={accentColor}
                            onChange={setAccentColor}
                            options={[
                                { value: 'blue', label: 'Blue' },
                                { value: 'green', label: 'Green' },
                                { value: 'orange', label: 'Orange' },
                                { value: 'red', label: 'Red' },
                                { value: 'teal', label: 'Teal' },
                            ]}
                        />
                    )}
                    <Select
                        label="Font Size"
                        icon={<Globe className="w-4 h-4" />}
                        value={fontSize}
                        onChange={setFontSize}
                        options={[
                            { value: 'small', label: 'Small' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'large', label: 'Large' },
                        ]}
                    />
                    <Select
                        label="Code Font"
                        icon={<Code className="w-4 h-4" />}
                        value={codeFont}
                        onChange={setCodeFont}
                        options={[
                            { value: 'fira', label: 'Fira Code' },
                            { value: 'jetbrains', label: 'JetBrains Mono' },
                            { value: 'cascadia', label: 'Cascadia Code' },
                            { value: 'mono', label: 'System Mono' },
                        ]}
                    />
                </SettingsSection>

                {/* ─── Notifications (no Weekly Digest) ─── */}
                <SettingsSection title="Notifications" icon={<Bell className="w-5 h-5" />}>
                    <Toggle
                        label="Email Notifications"
                        description="Receive updates about new courses and features via email"
                        icon={<Bell className="w-4 h-4" />}
                        enabled={emailNotifs}
                        onChange={updatePref('emailNotifs', setEmailNotifs)}
                    />
                    <Toggle
                        label="Push Notifications"
                        description="Browser push notifications for learning reminders"
                        icon={<Monitor className="w-4 h-4" />}
                        enabled={pushNotifs}
                        onChange={handlePushToggle}
                    />
                    <Toggle
                        label="Course Update Alerts"
                        description="Get notified when enrolled courses are updated"
                        icon={<BookOpen className="w-4 h-4" />}
                        enabled={courseUpdates}
                        onChange={updatePref('courseUpdates', setCourseUpdates)}
                    />
                    <Toggle
                        label="Sound Effects"
                        description="Play sounds for XP gains, streaks, and achievements"
                        icon={soundEffects ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        enabled={soundEffects}
                        onChange={handleSoundToggle}
                    />
                </SettingsSection>

                {/* ─── Privacy & Security (no 2FA) ─── */}
                <SettingsSection title="Privacy & Security" icon={<Shield className="w-5 h-5" />}>
                    <Select
                        label="Profile Visibility"
                        icon={<Eye className="w-4 h-4" />}
                        value={profileVisibility}
                        onChange={updatePref('profileVisibility', setProfileVisibility)}
                        options={[
                            { value: 'public', label: 'Public' },
                            { value: 'friends', label: 'Friends Only' },
                            { value: 'private', label: 'Private' },
                        ]}
                    />
                    <Toggle
                        label="Show Learning Progress"
                        description="Let others see your course completion status"
                        icon={<BookOpen className="w-4 h-4" />}
                        enabled={showProgress}
                        onChange={updatePref('showProgress', setShowProgress)}
                    />
                    <Toggle
                        label="Show Streak Publicly"
                        description="Display your daily streak on your profile"
                        icon={<Zap className="w-4 h-4" />}
                        enabled={showStreak}
                        onChange={updatePref('showStreak', setShowStreak)}
                    />
                </SettingsSection>

                {/* ─── Subscription (Expandable) ─── */}
                {(() => {
                    const hasPurchased = (user?.purchasedCourses?.length || 0) > 0;
                    const isTrial = user?.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED';
                    const isExpired = user?.trialExpiresAt === 'EXPIRED';
                    return (
                        <div className={`${isRich ? "bg-white border border-black/[0.06] rounded-xl" : "bg-secondary/30 border border-white/5 rounded-xl"} relative overflow-hidden transition-all duration-300`}>
                            {/* Header — always visible, clickable if has courses */}
                            <button
                                onClick={() => hasPurchased && setShowSubDetails(!showSubDetails)}
                                className={`w-full p-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${hasPurchased ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isTrial ? 'bg-amber-500/20 text-amber-400' : hasPurchased ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-semibold text-white">
                                            {isExpired ? "Trial Expired" : isTrial ? "Trial Access" : hasPurchased ? "Lifetime Access" : "Free Plan"}
                                        </h3>
                                        <p className={`text-sm font-medium ${isExpired ? 'text-red-400' : isTrial ? 'text-amber-400' : hasPurchased ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {isExpired ? "Access limited. Upgrade to continue." : isTrial ? "Limited Time Access \u2022 All Features" : hasPurchased ? `Active \u2022 ${(user?.purchasedCourses?.length || 0)} course${(user?.purchasedCourses?.length || 0) > 1 ? 's' : ''} purchased` : "Upgrade to unlock all courses"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {hasPurchased && !isTrial && (
                                        <span className="text-2xl font-bold text-white">\u20B9{totalPaid.toLocaleString()}</span>
                                    )}
                                    {hasPurchased && (
                                        <ChevronDown className={`w-5 h-5 text-white/40 transition-transform duration-300 ${showSubDetails ? 'rotate-180' : ''}`} />
                                    )}
                                </div>
                            </button>

                            <div className="px-6 pb-5">
                                <button
                                    onClick={() => navigate('/shop')}
                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${isRich ? 'bg-emerald-900 text-white hover:bg-emerald-800' : 'bg-white/10 text-white hover:bg-white/15'}`}
                                >
                                    <ShoppingBag className="h-4 w-4" /> Browse Course Shop
                                </button>
                            </div>

                            {/* Expandable Course Breakdown */}
                            <AnimatePresence>
                                {showSubDetails && hasPurchased && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className={`px-6 pb-5 pt-0 space-y-3 ${isRich ? 'border-t border-black/[0.04]' : 'border-t border-white/5'}`}>
                                            <div className="pt-4 flex items-center gap-2">
                                                <GraduationCap className="w-4 h-4 text-green-400" />
                                                <span className="text-xs font-bold uppercase tracking-widest text-white/50">Your Courses</span>
                                            </div>
                                            {(user?.purchasedCourses || []).map(slug => {
                                                const course = dbCourses.find(c => c.slug === slug);
                                                const price = course ? getEffectiveCoursePrice(course.price, course.salePrice) : 0;
                                                return (
                                                    <div key={slug} className={`flex items-center justify-between py-3 px-4 rounded-xl ${isRich ? 'bg-gray-50' : 'bg-white/[0.03]'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                                                                <Check className="w-4 h-4 text-green-500" />
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-semibold ${isRich ? 'text-gray-900' : 'text-white'}`}>{course?.title || slug}</p>
                                                                <p className="text-[11px] text-white/40">Lifetime Access</p>
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-bold ${isRich ? 'text-gray-700' : 'text-white/70'}`}>
                                                            {formatRupees(price)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex items-center justify-between pt-2 px-4">
                                                <span className="text-xs font-bold uppercase tracking-widest text-white/40">Total Investment</span>
                                                <span className="text-lg font-black text-green-400">\u20B9{totalPaid.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })()}

                {/* ─── Data & Storage ─── */}
                <SettingsSection title="Data & Storage" icon={<Download className="w-5 h-5" />}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 sm:gap-0">
                        <div className="flex items-center gap-3">
                            <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className={`text-sm font-medium ${isRich ? "text-gray-900" : "text-white"}`}>Export My Data</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Download all settings & progress as JSON</p>
                            </div>
                        </div>
                        <button
                            onClick={handleExportData}
                            className={`w-full sm:w-auto px-4 py-1.5 rounded-lg text-sm ${isRich ? 'bg-gray-100 border-black/[0.06] text-gray-900 hover:bg-gray-200' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'} transition-colors font-medium`}
                        >
                            Export
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 sm:gap-0">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className={`text-sm font-medium ${isRich ? "text-gray-900" : "text-white"}`}>Reset Preferences</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Restore all settings to their defaults</p>
                            </div>
                        </div>
                        <button
                            onClick={handleResetPreferences}
                            className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400 hover:bg-yellow-500/20 transition-colors font-medium"
                        >
                            Reset
                        </button>
                    </div>
                </SettingsSection>

                {/* ─── Danger Zone ─── */}
                <div className="border border-red-500/10 rounded-xl p-6 space-y-5 bg-red-500/5">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">These actions are irreversible. Proceed with caution.</p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => {
                                if (confirm("Sign out of your account?")) { logout(); navigate('/'); }
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-sm font-medium transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("Are you absolutely sure? This cannot be undone.")) {
                                    if (user?.email) { deleteUser(user.email); logout(); navigate('/'); }
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-bold transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
