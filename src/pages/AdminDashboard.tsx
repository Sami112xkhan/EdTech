import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { useOffer } from '../context/OfferContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import {
    Trash2, Search, CheckCircle, XCircle, Reply, Award, MessageSquare,
    LogOut, Clock, Users, Zap, TrendingUp, ShieldCheck, ShieldAlert,
    ChevronRight, ChevronDown, AlertTriangle, Eye, User as UserIcon,
    BookOpen, BarChart3, Settings, CreditCard, Activity, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { getPhasesStatus } from "../utils/progress";
import CourseManager from "../components/admin/CourseManager";
import { useAllCurricula } from "../hooks/useCourses";

const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    return new Date().getTime() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
};

type Tab = 'overview' | 'members' | 'courses' | 'feedback' | 'codes' | 'progress' | 'activity';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'codes', label: 'Access Codes', icon: CreditCard },
    { id: 'progress', label: 'Progress', icon: Award },
    { id: 'activity', label: 'Activity', icon: Activity },
];

// Theme helper: returns theme-aware class strings
function t(isRich: boolean) {
    return {
        // Surfaces
        page: isRich ? 'bg-gray-50' : 'bg-background',
        sidebar: isRich ? 'bg-white border-black/[0.06]' : 'bg-secondary/20 border-white/5 backdrop-blur-xl',
        card: isRich ? 'bg-white border-black/[0.06]' : 'bg-secondary/20 border-white/5',
        cardHover: isRich ? 'hover:shadow-lg hover:shadow-black/[0.03]' : 'hover:bg-secondary/40',
        muted: isRich ? 'bg-gray-50' : 'bg-white/5',
        inset: isRich ? 'bg-gray-50/50 border-black/[0.04]' : 'bg-white/5 border-white/5',
        input: isRich ? 'bg-white border-black/[0.06] text-gray-900 placeholder:text-gray-400 focus:ring-emerald-300/40 focus:border-emerald-300' : 'bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:ring-primary/40 focus:border-primary/40',
        inputMuted: isRich ? 'bg-gray-100' : 'bg-white/5',
        pill: isRich ? 'bg-gray-100' : 'bg-white/5',
        pillActive: isRich ? 'bg-white text-gray-900 shadow-sm' : 'bg-secondary/40 text-white shadow-sm',
        pillInactive: isRich ? 'text-gray-400 hover:text-gray-600' : 'text-muted-foreground hover:text-white',
        divider: isRich ? 'divide-black/[0.04]' : 'divide-white/5',
        border: isRich ? 'border-black/[0.06]' : 'border-white/5',
        borderSubtle: isRich ? 'border-black/[0.04]' : 'border-white/[0.04]',
        // Text
        text: isRich ? 'text-gray-900' : 'text-white',
        textSub: isRich ? 'text-gray-500' : 'text-muted-foreground',
        textMuted: isRich ? 'text-gray-400' : 'text-muted-foreground',
        textDim: isRich ? 'text-gray-300' : 'text-muted-foreground/50',
        // Hover
        hover: isRich ? 'hover:bg-gray-50' : 'hover:bg-white/5',
        hoverStrong: isRich ? 'hover:bg-gray-100' : 'hover:bg-white/10',
        // Avatars
        avatar: isRich ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400',
        avatarAmber: isRich ? 'bg-amber-50 text-amber-700' : 'bg-amber-500/10 text-amber-400',
        avatarRed: isRich ? 'bg-red-50 text-red-600' : 'bg-red-500/10 text-red-400',
        avatarBlue: isRich ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/10 text-blue-400',
        // Badges
        badgeGreen: isRich ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400',
        badgeAmber: isRich ? 'bg-amber-50 text-amber-700' : 'bg-amber-500/10 text-amber-400',
        badgeGray: isRich ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-muted-foreground',
        badgeRed: isRich ? 'bg-red-50 text-red-500' : 'bg-red-500/10 text-red-400',
        badgeBlue: isRich ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-400',
        // Buttons
        btnPrimary: isRich ? 'bg-emerald-900 text-white hover:bg-emerald-800' : 'bg-primary text-white hover:bg-primary/80',
        btnGreen: isRich ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-white hover:bg-emerald-600',
        btnGhost: isRich ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
        btnMuted: isRich ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/5 text-muted-foreground hover:bg-white/10',
        btnDangerIcon: isRich ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-muted-foreground hover:text-red-400 hover:bg-red-500/10',
        btnToggleIcon: isRich ? 'text-gray-400 hover:text-gray-900 hover:bg-gray-100' : 'text-muted-foreground hover:text-white hover:bg-white/10',
        btnRed: isRich ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-red-400 bg-red-500/10 hover:bg-red-500/20',
        btnAmber: isRich ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20',
        // Progress
        progressBg: isRich ? 'bg-gray-100' : 'bg-white/10',
        progressFill: isRich ? 'bg-emerald-400' : 'bg-primary',
        progressFillFull: isRich ? 'bg-emerald-500' : 'bg-emerald-400',
        // Misc
        emptyIcon: isRich ? 'text-gray-300' : 'text-muted-foreground/50',
        link: isRich ? 'text-emerald-600 hover:text-emerald-800' : 'text-emerald-400 hover:text-emerald-300',
        sectionHead: isRich ? 'text-gray-900' : 'text-white',
        dot: isRich ? 'bg-gray-300' : 'bg-muted-foreground/50',
        dotOnline: 'bg-green-500',
        replyBg: isRich ? 'bg-emerald-50 rounded-xl' : 'bg-emerald-500/10 rounded-xl',
        replyText: isRich ? 'text-emerald-800' : 'text-emerald-300',
        replyLabel: isRich ? 'text-emerald-600' : 'text-emerald-400',
        codeMono: isRich ? 'text-emerald-800' : 'text-emerald-300',
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, sub, icon: Icon, color, isRich = true }: {
    label: string; value: number | string; sub?: string;
    icon: React.ElementType; color: string; isRich?: boolean;
}) {
    const c = t(isRich);
    return (
        <div className={`rounded-2xl border p-5 transition-all ${c.card} ${c.cardHover}`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {sub && <span className={`text-[10px] font-bold uppercase tracking-wider ${c.textMuted}`}>{sub}</span>}
            </div>
            <div className={`text-2xl font-black tracking-tight ${c.text}`}>{value}</div>
            <div className={`text-xs font-medium mt-0.5 ${c.textMuted}`}>{label}</div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ users, feedback, codes, sqlStats, isRich }: any) {
    const { isOfferActive, toggleOffer } = useOffer();
    const c = t(isRich);
    const totalUsers = sqlStats?.totalUsers ?? users.length;
    const proUsers = sqlStats?.proMembers ?? users.filter((u: any) => u.purchasedCourses?.length > 0).length;
    const activeTrials = users.filter((u: any) => u.trialExpiresAt && u.trialExpiresAt !== 'EXPIRED').length;
    const pendingFeedback = feedback.filter((f: any) => f.status === 'pending').length;
    const pendingCerts = users.filter((u: any) => u.certificateStatus === 'pending').length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={totalUsers} icon={Users} color="bg-blue-50 text-blue-600" isRich={isRich} />
                <StatCard label="Paid Members" value={proUsers} sub="Lifetime" icon={Award} color="bg-emerald-50 text-emerald-600" isRich={isRich} />
                <StatCard label="Active Trials" value={activeTrials} icon={Clock} color="bg-amber-50 text-amber-600" isRich={isRich} />
                <StatCard label="Pending Items" value={pendingFeedback + pendingCerts} sub={`${pendingFeedback} feedback · ${pendingCerts} certs`} icon={AlertTriangle} color="bg-rose-50 text-rose-600" isRich={isRich} />
            </div>

            <div className={`rounded-2xl border p-6 ${c.card}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${c.sectionHead}`}>Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Link to="/dashboard" className={`flex items-center gap-3 p-4 rounded-xl border transition-all group ${c.muted} ${c.borderSubtle} ${c.hoverStrong}`}>
                        <Eye className={`w-5 h-5 ${isRich ? 'text-gray-400 group-hover:text-emerald-600' : 'text-muted-foreground group-hover:text-primary'} transition-colors`} />
                        <div>
                            <div className={`text-sm font-bold ${c.text}`}>Preview Site</div>
                            <div className={`text-[11px] ${c.textMuted}`}>View as user</div>
                        </div>
                    </Link>
                    <button onClick={() => toggleOffer(!isOfferActive)} className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${isOfferActive ? (isRich ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'bg-primary/10 border-primary/20 hover:bg-primary/20') : `${c.muted} ${c.borderSubtle} ${c.hoverStrong}`}`}>
                        <Zap className={`w-5 h-5 ${isOfferActive ? (isRich ? 'text-emerald-600' : 'text-primary') : c.textMuted}`} />
                        <div>
                            <div className={`text-sm font-bold ${c.text}`}>Flash Offer</div>
                            <div className={`text-[11px] font-medium ${isOfferActive ? (isRich ? 'text-emerald-600' : 'text-primary') : c.textMuted}`}>{isOfferActive ? 'Active' : 'Inactive'}</div>
                        </div>
                    </button>
                </div>
            </div>

            <div className={`rounded-2xl border p-6 ${c.card}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${c.sectionHead}`}>Platform Snapshot</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[{ label: 'Total Users', value: totalUsers }, { label: 'Conversion', value: `${totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0}%` }, { label: 'Access Codes', value: codes.length }].map((s, i) => (
                        <div key={i} className={`p-4 rounded-xl ${c.muted}`}>
                            <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${c.textMuted}`}>{s.label}</div>
                            <div className={`text-lg font-black ${c.text}`}>{s.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBERS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function MembersTab({ users, searchTerm, setSearchTerm, filterRole, setFilterRole, expandedUser, setExpandedUser, handleStatusUpdate, handleDelete, fetchUserActivity, setActiveTab, isRich }: any) {
    const c = t(isRich);
    const filteredUsers = useMemo(() => {
        let result = users;
        if (filterRole === 'pro') result = result.filter((u: any) => u.purchasedCourses?.length > 0);
        else if (filterRole === 'online') result = result.filter((u: any) => u.isOnline || isOnline(u.lastSeen));
        if (searchTerm) result = result.filter((u: any) => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
        return result;
    }, [users, searchTerm, filterRole]);

    return (
        <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${c.textMuted}`} />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by name or email..."
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${c.input}`}
                    />
                </div>
                <div className={`flex gap-1.5 p-1 rounded-xl ${c.pill}`}>
                    {(['all', 'pro', 'online'] as const).map(f => (
                        <button key={f} onClick={() => setFilterRole(f)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filterRole === f ? c.pillActive : c.pillInactive}`}>
                            {f === 'all' ? 'All' : f === 'pro' ? 'Paid' : 'Online'}
                        </button>
                    ))}
                </div>
            </div>

            {/* User List */}
            <div className={`rounded-2xl border overflow-hidden ${c.card}`}>
                <div className={`divide-y ${c.divider}`}>
                    {filteredUsers.slice(0, 50).map((u: any) => (
                        <div key={u.email}>
                            <div className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 transition-colors cursor-pointer ${c.hover}`} onClick={() => setExpandedUser(expandedUser === u.email ? null : u.email)}>
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 ${c.avatar}`}>
                                    {u.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-xs sm:text-sm truncate ${c.text}`}>{u.name}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${(u.isOnline || isOnline(u.lastSeen)) ? c.dotOnline : c.dot}`} />
                                    </div>
                                    <span className={`text-[10px] sm:text-xs truncate block ${c.textMuted}`}>{u.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                    {u.purchasedCourses?.length > 0 && (
                                        <span className={`hidden sm:inline px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${c.badgeGreen}`}>Paid</span>
                                    )}
                                    <button onClick={e => { e.stopPropagation(); handleStatusUpdate(u.email, u.status); }}
                                        className={`p-1.5 sm:p-2 rounded-lg transition-all ${c.btnToggleIcon}`} title={u.status === 'active' ? 'Suspend' : 'Activate'}>
                                        {u.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); handleDelete(u.email); }}
                                        className={`p-1.5 sm:p-2 rounded-lg transition-all ${c.btnDangerIcon}`}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronDown className={`w-4 h-4 ${c.textMuted} transition-transform ${expandedUser === u.email ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            <AnimatePresence>
                                {expandedUser === u.email && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                        <div className={`px-4 sm:px-5 pb-4 border-t ${c.inset}`}>
                                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-4">
                                                <div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${c.textMuted}`}>Role</div>
                                                    <div className={`text-sm font-bold capitalize ${c.text}`}>{u.role || 'student'}</div>
                                                </div>
                                                <div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${c.textMuted}`}>Courses</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {u.purchasedCourses?.length > 0 ? u.purchasedCourses.map((course: string) => (
                                                            <span key={course} className={`px-2 py-0.5 text-[10px] font-bold rounded ${c.badgeGreen}`}>{course}</span>
                                                        )) : <span className={`text-xs ${c.textMuted}`}>None</span>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${c.textMuted}`}>XP / Level</div>
                                                    <div className={`text-sm font-bold ${c.text}`}>{u.xp || 0} XP · LVL {u.level || 1}</div>
                                                </div>
                                                <div>
                                                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${c.textMuted}`}>Certificate</div>
                                                    <div className={`text-sm font-bold capitalize ${c.text}`}>{u.certificateStatus || 'locked'}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => { fetchUserActivity(u.id); setActiveTab('activity'); }}
                                                className={`text-xs font-bold transition-colors ${c.link}`}>
                                                View Activity History →
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
                {filteredUsers.length === 0 && (
                    <div className="py-16 text-center">
                        <Users className={`w-10 h-10 mx-auto mb-3 ${c.emptyIcon}`} />
                        <p className={`text-sm ${c.textMuted}`}>No users found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK TAB
// ═══════════════════════════════════════════════════════════════════════════════

function FeedbackTab({ feedback, updateFeedbackStatus, deleteFeedback, replyToFeedback, users, getAllUsers, approveCertificate, rejectCertificate, isRich }: any) {
    const c = t(isRich);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    const feedbackItems = feedback.filter((f: any) => f.type === 'feedback');
    const requestItems = feedback.filter((f: any) => f.type === 'access_request');
    const pendingCerts = users.filter((u: any) => u.certificateStatus === 'pending');

    const handleReply = async (id: string) => {
        if (!replyText.trim()) return;
        await replyToFeedback(id, replyText);
        setReplyText('');
        setReplyingTo(null);
        toast.success('Reply sent');
    };

    return (
        <div className="space-y-6">
            {/* Certificate Requests */}
            {pendingCerts.length > 0 && (
                <div>
                    <h3 className={`text-sm font-black uppercase tracking-widest mb-3 ${c.sectionHead}`}>Certificate Requests ({pendingCerts.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pendingCerts.map((u: any) => (
                            <div key={u.email} className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${c.card}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm ${c.avatarAmber}`}>{u.name?.charAt(0)}</div>
                                    <div>
                                        <div className={`font-bold text-xs sm:text-sm ${c.text}`}>{u.name}</div>
                                        <div className={`text-[10px] sm:text-xs ${c.textMuted}`}>{u.email}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={async () => { await approveCertificate(u.email); toast.success('Certificate approved'); }}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${c.btnGreen}`}>Approve</button>
                                    <button onClick={async () => { await rejectCertificate(u.email); toast.success('Certificate rejected'); }}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${c.btnMuted}`}>Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Appeal Requests */}
            {requestItems.length > 0 && (
                <div>
                    <h3 className={`text-sm font-black uppercase tracking-widest mb-3 ${c.sectionHead}`}>Account Appeals ({requestItems.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requestItems.map((item: any) => (
                            <div key={item.id} className={`rounded-2xl border p-5 ${c.card}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${c.avatarRed}`}>{item.userName?.charAt(0)}</div>
                                    <div className="flex-1">
                                        <div className={`font-bold text-sm ${c.text}`}>{item.userName}</div>
                                        <div className={`text-xs ${c.textMuted}`}>{item.userId}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${c.badgeAmber}`}>Appeal</span>
                                </div>
                                <p className={`text-sm italic mb-4 ${isRich ? 'text-gray-600' : 'text-muted-foreground'}`}>"{item.content}"</p>
                                <div className="flex gap-2">
                                    <button onClick={async () => {
                                        await fetch(`/api/admin/users/${encodeURIComponent(item.userId)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active' }) });
                                        await updateFeedbackStatus(item.id, 'implemented');
                                        toast.success('User unblocked');
                                    }} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${c.btnGreen}`}>Unblock</button>
                                    <button onClick={async () => { await updateFeedbackStatus(item.id, 'ignored'); toast.success('Appeal dismissed'); }}
                                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${c.btnMuted}`}>Dismiss</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Feedback Items */}
            <div>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-3 ${c.sectionHead}`}>User Feedback</h3>
                {feedbackItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {feedbackItems.map((item: any) => (
                            <div key={item.id} className={`rounded-2xl border p-5 ${c.card}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${c.avatarBlue}`}>{item.userName?.charAt(0)}</div>
                                    <div className="flex-1">
                                        <div className={`font-bold text-sm ${c.text}`}>{item.userName}</div>
                                        <div className={`text-xs ${c.textMuted}`}>{new Date(item.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.status === 'implemented' ? c.badgeGreen : item.status === 'ignored' ? c.badgeGray : c.badgeAmber}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <p className={`text-sm mb-3 ${isRich ? 'text-gray-600' : 'text-muted-foreground'}`}>"{item.content}"</p>

                                {item.reply && (
                                    <div className={`p-3 rounded-xl mb-3 ${c.replyBg}`}>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${c.replyLabel}`}>Reply</div>
                                        <p className={`text-xs ${c.replyText}`}>{item.reply}</p>
                                    </div>
                                )}

                                {replyingTo === item.id ? (
                                    <div className="flex gap-2">
                                        <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..."
                                            className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${c.input}`}
                                            onKeyDown={e => e.key === 'Enter' && handleReply(item.id)} />
                                        <button onClick={() => handleReply(item.id)} className={`p-2 rounded-lg ${c.btnGreen}`}><Send className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => updateFeedbackStatus(item.id, 'implemented')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${c.btnGhost}`}>Implement</button>
                                        <button onClick={() => { setReplyingTo(item.id); setReplyText(''); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${c.btnMuted}`}>Reply</button>
                                        <button onClick={() => deleteFeedback(item.id)} className={`p-2 rounded-lg transition-all ${c.btnDangerIcon}`}><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={`rounded-2xl border py-16 text-center ${c.card}`}>
                        <MessageSquare className={`w-10 h-10 mx-auto mb-3 ${c.emptyIcon}`} />
                        <p className={`text-sm ${c.textMuted}`}>No feedback yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function CodesTab({ codes, codeType, setCodeType, generatedCode, handleGenerateCode, revokeAccessCode, deleteAccessCode, isRich }: any) {
    const c = t(isRich);
    return (
        <div className="space-y-6">
            {/* Generator */}
            <div className={`rounded-2xl border p-6 ${c.card}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${c.sectionHead}`}>Generate Access Code</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className={`flex gap-1.5 p-1 rounded-xl ${c.pill}`}>
                        {(['3days', '5mins'] as const).map(t2 => (
                            <button key={t2} onClick={() => setCodeType(t2)}
                                className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${codeType === t2 ? c.pillActive : c.pillInactive}`}>
                                {t2 === '3days' ? '3 Day Trial' : '5 Min Preview'}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleGenerateCode}
                        className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${c.btnPrimary}`}>
                        Generate
                    </button>
                </div>
                {generatedCode && (
                    <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${isRich ? 'bg-emerald-50 border border-emerald-200' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                        <span className={`font-mono text-lg font-black ${c.codeMono}`}>{generatedCode}</span>
                        <button onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('Copied!'); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${c.btnGreen}`}>Copy</button>
                    </div>
                )}
            </div>

            {/* Codes List */}
            <div className={`rounded-2xl border overflow-hidden ${c.card}`}>
                <div className={`px-5 py-4 border-b ${c.border}`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${c.sectionHead}`}>All Codes ({codes.length})</h3>
                </div>
                <div className={`divide-y ${c.divider}`}>
                    {codes.slice(0, 30).map((code: any) => (
                        <div key={code.id} className={`px-4 sm:px-5 py-3 transition-colors ${c.hover}`}>
                            <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                <span className={`font-mono text-xs sm:text-sm font-bold truncate min-w-0 ${c.text}`}>{code.code}</span>
                                <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${code.type === 'lifetime' ? c.badgeGreen : code.type === '3days' ? c.badgeBlue : c.badgeAmber}`}>
                                    {code.type}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${code.isRevoked ? c.badgeRed : code.isUsed ? c.badgeGray : c.badgeGreen}`}>
                                    {code.isRevoked ? 'Revoked' : code.isUsed ? `Used by ${code.usedBy || '?'}` : 'Available'}
                                </span>
                                <div className="flex-1" />
                                <div className="flex gap-1.5">
                                    {!code.isUsed && !code.isRevoked && (
                                        <button onClick={() => { revokeAccessCode(code.code); toast.success('Code revoked'); }}
                                            className={`px-3 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${c.btnAmber}`}>Revoke</button>
                                    )}
                                    <button onClick={() => { if (confirm('Permanently delete this code?')) { deleteAccessCode(code.code); toast.success('Code deleted'); } }}
                                        className={`px-3 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${c.btnRed}`}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}]
                </div>
                {codes.length === 0 && (
                    <div className="py-16 text-center">
                        <CreditCard className={`w-10 h-10 mx-auto mb-3 ${c.emptyIcon}`} />
                        <p className={`text-sm ${c.textMuted}`}>No codes generated yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ProgressTab({ users, defaultCurriculum, isRich }: any) {
    const c = t(isRich);
    const [expandedProgressUser, setExpandedProgressUser] = useState<string | null>(null);
    const paidUsers = users.filter((u: any) => u.purchasedCourses?.length > 0);

    return (
        <div className="space-y-4">
            <h3 className={`text-sm font-black uppercase tracking-widest ${c.sectionHead}`}>Student Progress ({paidUsers.length})</h3>
            <div className={`rounded-2xl border overflow-hidden ${c.card}`}>
                <div className={`divide-y ${c.divider}`}>
                    {paidUsers.map((u: any) => {
                        const totalLessons = defaultCurriculum.reduce((acc: number, m: any) => acc + m.lessons.length, 0);
                        const completed = u.completedLessons?.length || 0;
                        const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

                        return (
                            <div key={u.email}>
                                <div className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 transition-colors cursor-pointer ${c.hover}`} onClick={() => setExpandedProgressUser(expandedProgressUser === u.email ? null : u.email)}>
                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 ${c.avatar}`}>{u.name?.charAt(0)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-bold text-xs sm:text-sm truncate ${c.text}`}>{u.name}</div>
                                        <div className={`text-[10px] sm:text-xs truncate ${c.textMuted}`}>{u.purchasedCourses?.join(', ')}</div>
                                    </div>
                                    <div className="w-24 sm:w-32 shrink-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] sm:text-xs font-bold ${c.textMuted}`}>{completed}/{totalLessons}</span>
                                            <span className={`text-[10px] sm:text-xs font-bold ${c.text}`}>{pct}%</span>
                                        </div>
                                        <div className={`w-full h-2 rounded-full overflow-hidden ${c.progressBg}`}>
                                            <div className={`h-full rounded-full transition-all ${pct === 100 ? c.progressFillFull : c.progressFill}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 ${c.textMuted} transition-transform ${expandedProgressUser === u.email ? 'rotate-180' : ''}`} />
                                </div>

                                <AnimatePresence>
                                    {expandedProgressUser === u.email && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                            <div className={`px-5 pb-4 border-t ${c.inset}`}>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
                                                    {defaultCurriculum.map((m: any) => {
                                                        const mDone = m.lessons.filter((l: any) => u.completedLessons?.includes(l.id)).length;
                                                        const mTotal = m.lessons.length;
                                                        const mPct = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;
                                                        return (
                                                            <div key={m.id} className={`p-3 rounded-xl border ${c.muted} ${c.borderSubtle}`}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${c.textMuted}`}>{m.title.split('—')[0]}</span>
                                                                    <span className={`text-[10px] font-bold ${c.text}`}>{mDone}/{mTotal}</span>
                                                                </div>
                                                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${c.progressBg}`}>
                                                                    <div className={`h-full rounded-full ${mPct === 100 ? c.progressFillFull : c.progressFill}`} style={{ width: `${mPct}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
                {paidUsers.length === 0 && (
                    <div className="py-16 text-center">
                        <BarChart3 className={`w-10 h-10 mx-auto mb-3 ${c.emptyIcon}`} />
                        <p className={`text-sm ${c.textMuted}`}>No paid students yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ActivityTab({ activityLogs, viewingUserActivity, setViewingUserActivity, isRich }: any) {
    const c = t(isRich);
    const logs = viewingUserActivity ? (activityLogs || []) : activityLogs;
    const groupedLogs: Record<string, any[]> = {};
    logs.forEach((log: any) => {
        const key = log.email || 'anonymous';
        if (!groupedLogs[key]) groupedLogs[key] = [];
        groupedLogs[key].push(log);
    });

    return (
        <div className="space-y-4">
            {viewingUserActivity && (
                <button onClick={() => setViewingUserActivity(null)} className={`text-xs font-bold transition-colors ${c.link}`}>← Back to all activity</button>
            )}
            <div className={`rounded-2xl border overflow-hidden ${c.card}`}>
                <div className={`divide-y ${c.divider}`}>
                    {Object.entries(groupedLogs).slice(0, 30).map(([email, items]) => (
                        <div key={email} className="px-5 py-4">
                            <div className={`font-bold text-sm mb-2 ${c.text}`}>{email}</div>
                            <div className="space-y-1">
                                {items.slice(0, 5).map((log: any, i: number) => (
                                    <div key={i} className={`flex items-center gap-3 text-xs ${c.textMuted}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                                        <span className="font-medium">{log.type}</span>
                                        <span className="truncate">{log.description || log.path}</span>
                                        <span className={`ml-auto shrink-0 ${c.textMuted}`}>{log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {Object.keys(groupedLogs).length === 0 && (
                    <div className="py-16 text-center">
                        <Activity className={`w-10 h-10 mx-auto mb-3 ${c.emptyIcon}`} />
                        <p className={`text-sm ${c.textMuted}`}>No activity yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

const AdminDashboard: React.FC = () => {
    const { user: currentUser, getAllUsers, updateUserStatus, deleteUser, logout, generateAccessCode, getAllAccessCodes, revokeAccessCode, deleteAccessCode, approveCertificate, rejectCertificate } = useAuth();
    const { feedback, updateFeedbackStatus, deleteFeedback, replyToFeedback } = useFeedback();
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    const { curricula } = useAllCurricula();
    const defaultCurriculum = curricula.length > 0 ? curricula[0].modules.map(m => ({
        id: m.slug, title: m.title, description: m.description || '',
        lessons: m.lessons.map(l => ({ id: l.slug, title: l.title, duration: l.duration || '', youtubeId: l.youtubeId || '', free: l.free })),
    })) : [];

    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'pro' | 'online'>('all');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [codeType, setCodeType] = useState<'3days' | '5mins'>('3days');
    const [generatedCode, setGeneratedCode] = useState('');
    const [codes, setCodes] = useState<any[]>([]);
    const [sqlStats, setSqlStats] = useState<any>(null);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [viewingUserActivity, setViewingUserActivity] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Close mobile menu when tab changes
    const switchTab = (tab: Tab) => { setActiveTab(tab); setMobileMenuOpen(false); };

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') { navigate('/dashboard'); return; }
        const fetchUsers = async () => { const dbUsers = await getAllUsers(); setUsers(dbUsers); };
        fetchUsers();
        const interval = setInterval(fetchUsers, 5000);
        return () => clearInterval(interval);
    }, [currentUser, navigate]);

    useEffect(() => {
        const fetchStats = async () => { try { const r = await fetch('/api/admin/stats'); setSqlStats(await r.json()); } catch {} };
        fetchStats();
        const i = setInterval(fetchStats, 5000);
        return () => clearInterval(i);
    }, []);

    useEffect(() => {
        const fetchLogs = async () => { try { const r = await fetch('/api/admin/activity'); setActivityLogs(await r.json()); } catch {} };
        fetchLogs();
        const i = setInterval(fetchLogs, 3000);
        return () => clearInterval(i);
    }, []);

    useEffect(() => {
        const fetchCodes = async () => { const dbCodes = await getAllAccessCodes(); setCodes(dbCodes); };
        fetchCodes();
        const i = setInterval(fetchCodes, 5000);
        return () => clearInterval(i);
    }, []);

    const handleStatusUpdate = async (email: string, currentStatus: string) => {
        await updateUserStatus(email, currentStatus === 'active' ? 'inactive' : 'active');
        setUsers(await getAllUsers());
    };

    const handleDelete = async (email: string) => {
        if (confirm('Delete this user?')) { await deleteUser(email); setUsers(await getAllUsers()); }
    };

    const handleGenerateCode = async () => {
        const code = await generateAccessCode(codeType);
        setGeneratedCode(code);
        setCodes(await getAllAccessCodes());
    };

    const fetchUserActivity = async (userId: string) => {
        try { const r = await fetch(`/api/admin/users/${userId}/activity`); setViewingUserActivity(await r.json()); } catch {}
    };

    const unreadFeedback = feedback.filter((f: any) => f.status === 'pending').length;
    const c = t(isRich);

    const SidebarContent = () => (
        <>
            <div className={`p-5 border-b ${c.border}`}>
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className={`w-5 h-5 ${isRich ? 'text-emerald-600' : 'text-primary'}`} />
                    <span className={`text-sm font-black ${c.text}`}>Admin Panel</span>
                </div>
                <p className={`text-[11px] ${c.textMuted}`}>DevMastery Control Center</p>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const badge = tab.id === 'feedback' ? unreadFeedback : 0;
                    return (
                        <button key={tab.id} onClick={() => switchTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                    ? isRich ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-primary/10 text-primary font-bold'
                                    : isRich ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-50' : 'text-muted-foreground hover:text-white hover:bg-white/5'
                            }`}>
                            <Icon className="w-4 h-4" />
                            <span className="flex-1 text-left truncate">{tab.label}</span>
                            {badge > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{badge}</span>}
                        </button>
                    );
                })}
            </nav>

            <div className={`p-3 border-t space-y-2 ${c.border}`}>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isRich ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-50' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}>
                    <Eye className="w-4 h-4" /> View Site
                </Link>
                <button onClick={() => { logout(); navigate('/'); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isRich ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'}`}>
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>
        </>
    );

    return (
        <div className={`min-h-screen ${c.page} pb-20 lg:pb-0`}>
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex w-64 flex-col shrink-0 fixed h-full border-r ${c.sidebar}`}>
                <SidebarContent />
            </aside>

            {/* Mobile Slide-Over Sidebar */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`fixed top-0 left-0 h-full w-72 flex flex-col z-50 lg:hidden shadow-2xl ${c.sidebar}`}
                        >
                            <div className={`flex items-center justify-between p-4 border-b ${c.border}`}>
                                <span className={`text-sm font-black ${c.text}`}>Menu</span>
                                <button onClick={() => setMobileMenuOpen(false)} className={`p-2 rounded-lg ${c.btnGhost}`}>
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Mobile Top Bar */}
            <div className={`lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b backdrop-blur-xl ${c.sidebar}`}>
                <button onClick={() => setMobileMenuOpen(true)} className={`p-2 rounded-xl ${c.hoverStrong}`}>
                    <svg className={`w-5 h-5 ${c.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 shrink-0 ${isRich ? 'text-emerald-600' : 'text-primary'}`} />
                        <span className={`text-sm font-black truncate ${c.text}`}>{TABS.find(t2 => t2.id === activeTab)?.label}</span>
                    </div>
                </div>
                {unreadFeedback > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{unreadFeedback}</span>
                )}
            </div>

            {/* Main Content */}
            <main className="lg:ml-64 p-4 sm:p-6">
                <div className="max-w-6xl">
                    <div className="mb-4 sm:mb-6 hidden lg:block">
                        <h1 className={`text-2xl font-black tracking-tight ${c.text}`}>
                            {TABS.find(t2 => t2.id === activeTab)?.label}
                        </h1>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                            {activeTab === 'overview' && <OverviewTab users={users} feedback={feedback} codes={codes} sqlStats={sqlStats} isRich={isRich} />}
                            {activeTab === 'members' && <MembersTab users={users} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterRole={filterRole} setFilterRole={setFilterRole} expandedUser={expandedUser} setExpandedUser={setExpandedUser} handleStatusUpdate={handleStatusUpdate} handleDelete={handleDelete} fetchUserActivity={fetchUserActivity} setActiveTab={setActiveTab} isRich={isRich} />}
                            {activeTab === 'courses' && <CourseManager />}
                            {activeTab === 'feedback' && <FeedbackTab feedback={feedback} updateFeedbackStatus={updateFeedbackStatus} deleteFeedback={deleteFeedback} replyToFeedback={replyToFeedback} users={users} getAllUsers={getAllUsers} approveCertificate={approveCertificate} rejectCertificate={rejectCertificate} isRich={isRich} />}
                            {activeTab === 'codes' && <CodesTab codes={codes} codeType={codeType} setCodeType={setCodeType} generatedCode={generatedCode} handleGenerateCode={handleGenerateCode} revokeAccessCode={revokeAccessCode} deleteAccessCode={deleteAccessCode} isRich={isRich} />}
                            {activeTab === 'progress' && <ProgressTab users={users} defaultCurriculum={defaultCurriculum} isRich={isRich} />}
                            {activeTab === 'activity' && <ActivityTab activityLogs={activityLogs} viewingUserActivity={viewingUserActivity} setViewingUserActivity={setViewingUserActivity} isRich={isRich} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Mobile Bottom Tab Bar */}
            <nav className={`lg:hidden fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-xl ${c.sidebar}`}>
                <div className="flex items-center justify-around px-1 py-1.5 safe-area-bottom">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const badge = tab.id === 'feedback' ? unreadFeedback : 0;
                        return (
                            <button key={tab.id} onClick={() => switchTab(tab.id)}
                                className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all min-w-0 ${
                                    isActive
                                        ? isRich ? 'text-emerald-700' : 'text-primary'
                                        : c.textMuted
                                }`}>
                                <Icon className="w-5 h-5" />
                                <span className="text-[9px] font-bold truncate w-full text-center">
                                    {tab.id === 'codes' ? 'Codes' : tab.label.length > 8 ? tab.label.slice(0, 7) + '…' : tab.label}
                                </span>
                                {badge > 0 && (
                                    <span className="absolute -top-0.5 right-0 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full">{badge}</span>
                                )}
                                {isActive && (
                                    <motion.div layoutId="activeTab" className={`absolute -bottom-1 w-5 h-0.5 rounded-full ${isRich ? 'bg-emerald-600' : 'bg-primary'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default AdminDashboard;
