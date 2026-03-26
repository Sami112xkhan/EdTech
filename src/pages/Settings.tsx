
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/ui/Input';
import {
    CreditCard, Save, Bell, Globe, BookOpen,
    Shield, Download, Monitor, Volume2, VolumeX, Palette,
    Eye, Zap, ChevronDown, Check, Trash2, LogOut,
    GraduationCap, Code, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

// ─── Toggle Switch ───
const Toggle: React.FC<{
    enabled: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}> = ({ enabled, onChange, label, description, icon }) => (
    <div className="flex items-center justify-between py-3.5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
            <div className="min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
        <button
            onClick={() => onChange(!enabled)}
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

// ─── Select Dropdown ───
const Select: React.FC<{
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    label: string;
    icon?: React.ReactNode;
}> = ({ value, onChange, options, label, icon }) => {
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
                <p className="text-sm font-medium text-white">{label}</p>
            </div>
            <div className="relative w-full sm:w-auto" ref={ref}>
                <button
                    onClick={() => setOpen(!open)}
                    className="w-full sm:w-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors min-w-[150px] justify-between"
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
                            className="absolute right-0 top-full mt-1 w-full bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden"
                        >
                            {options.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center justify-between ${value === opt.value ? 'text-primary' : 'text-white/80'}`}
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
}> = ({ title, icon, children, badge }) => (
    <div className="bg-secondary/30 border border-white/5 rounded-xl p-6 space-y-1">
        <div className="flex items-center gap-3 mb-4">
            <div className="text-primary">{icon}</div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {badge && (
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">{badge}</span>
            )}
        </div>
        <div className="divide-y divide-white/5">{children}</div>
    </div>
);

// ─── Main Component ───
const Settings: React.FC = () => {
    const { user, deleteUser, logout, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(user?.name || "");
    const [username, setUsername] = useState(user?.username || "");
    const [isSaving, setIsSaving] = useState(false);

    // ─── Load / Save helpers ───
    const loadPref = <T,>(key: string, fallback: T): T => {
        try {
            const val = localStorage.getItem(`settings_${key}`);
            return val !== null ? JSON.parse(val) : fallback;
        } catch { return fallback; }
    };

    // Appearance (Global Theme Context)
    const { 
        fontSize, setFontSize, 
        accentColor, setAccentColor, 
        codeFont, setCodeFont,
        frostedMode, setFrostedMode
    } = useTheme();

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
        if (permission === 'granted') {
            toast.success('Push notifications enabled! 🔔');
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
        toast.success(value ? 'Push notifications enabled 🔔' : 'Push notifications disabled', { duration: 1200 });
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
        toast.success(value ? 'Sound effects enabled 🔊' : 'Sound effects muted 🔇', { duration: 1200 });
    };

    useEffect(() => { if (user) { setName(user.name); setUsername(user.username || ""); } }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateProfile({ name, username });
            toast.success("Profile updated! ✨");
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
        toast.success("Data exported! 📦");
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
                    <h1 className="text-3xl font-bold">Account Settings</h1>
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
                    <Toggle
                        label="Frosted Glass Mode"
                        description="Disables heavy backgrounds for a high-performance, frosted glass look"
                        icon={<Monitor className="w-4 h-4" />}
                        enabled={frostedMode}
                        onChange={setFrostedMode}
                    />
                    {!frostedMode && (
                        <Select
                            label="Accent Color"
                            icon={<Palette className="w-4 h-4" />}
                            value={accentColor}
                            onChange={setAccentColor}
                            options={[
                                { value: 'purple', label: '💜 Purple' },
                                { value: 'blue', label: '💙 Blue' },
                                { value: 'green', label: '💚 Green' },
                                { value: 'orange', label: '🧡 Orange' },
                                { value: 'pink', label: '💗 Pink' },
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
                            { value: 'public', label: '🌍 Public' },
                            { value: 'friends', label: '👥 Friends Only' },
                            { value: 'private', label: '🔒 Private' },
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

                {/* ─── Subscription ─── */}
                <div className="bg-secondary/30 border border-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user?.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED'
                            ? 'bg-amber-500/20 text-amber-400'
                            : (user?.purchasedCourses?.length || 0) > 0
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-white/10 text-white/40'
                            }`}>
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">
                                {user?.trialExpiresAt === 'EXPIRED'
                                    ? "Trial Expired"
                                    : (user?.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED')
                                        ? "Trial Access"
                                        : (user?.purchasedCourses?.length || 0) > 0
                                            ? "Lifetime Access"
                                            : "Free Plan"}
                            </h3>
                            <p className={`text-sm font-medium ${user?.trialExpiresAt === 'EXPIRED'
                                    ? 'text-red-400'
                                    : (user?.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED')
                                        ? 'text-amber-400'
                                        : (user?.purchasedCourses?.length || 0) > 0
                                            ? 'text-green-400'
                                            : 'text-zinc-500'
                                }`}>
                                {user?.trialExpiresAt === 'EXPIRED'
                                    ? "Access limited. Upgrade to continue."
                                    : (user?.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED')
                                        ? "Limited Time Access • All Features"
                                        : (user?.purchasedCourses?.length || 0) > 0
                                            ? "Active • Paid via Razorpay"
                                            : "Upgrade to unlock all courses"}
                            </p>
                        </div>
                    </div>
                    {(user?.purchasedCourses?.length || 0) > 0 && !(user?.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED') && (
                        <div className="text-2xl font-bold text-white">₹10,000</div>
                    )}
                </div>

                {/* ─── Data & Storage ─── */}
                <SettingsSection title="Data & Storage" icon={<Download className="w-5 h-5" />}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 sm:gap-0">
                        <div className="flex items-center gap-3">
                            <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-white">Export My Data</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Download all settings & progress as JSON</p>
                            </div>
                        </div>
                        <button
                            onClick={handleExportData}
                            className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors font-medium"
                        >
                            Export
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3 sm:gap-0">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-white">Reset Preferences</p>
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
