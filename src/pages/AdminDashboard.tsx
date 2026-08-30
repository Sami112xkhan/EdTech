import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { useOffer } from '../context/OfferContext';
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

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ label, value, sub, icon: Icon, color }: {
    label: string; value: number | string; sub?: string;
    icon: React.ElementType; color: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 hover:shadow-lg hover:shadow-black/[0.03] transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {sub && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{sub}</span>}
            </div>
            <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
            <div className="text-xs font-medium text-gray-400 mt-0.5">{label}</div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ users, feedback, codes, sqlStats }: any) {
    const { isOfferActive, toggleOffer } = useOffer();
    const totalUsers = sqlStats?.totalUsers ?? users.length;
    const proUsers = sqlStats?.proMembers ?? users.filter((u: any) => u.purchasedCourses?.length > 0).length;
    const activeTrials = users.filter((u: any) => u.trialExpiresAt && u.trialExpiresAt !== 'EXPIRED').length;
    const pendingFeedback = feedback.filter((f: any) => f.status === 'pending').length;
    const pendingCerts = users.filter((u: any) => u.certificateStatus === 'pending').length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={totalUsers} icon={Users} color="bg-blue-50 text-blue-600" />
                <StatCard label="Paid Members" value={proUsers} sub="Lifetime" icon={Award} color="bg-emerald-50 text-emerald-600" />
                <StatCard label="Active Trials" value={activeTrials} icon={Clock} color="bg-amber-50 text-amber-600" />
                <StatCard label="Pending Items" value={pendingFeedback + pendingCerts} sub={`${pendingFeedback} feedback · ${pendingCerts} certs`} icon={AlertTriangle} color="bg-rose-50 text-rose-600" />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Link to="/dashboard" className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 border border-black/[0.04] transition-all group">
                        <Eye className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        <div>
                            <div className="text-sm font-bold text-gray-900">Preview Site</div>
                            <div className="text-[11px] text-gray-400">View as user</div>
                        </div>
                    </Link>
                    <button onClick={() => toggleOffer(!isOfferActive)} className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${isOfferActive ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'bg-gray-50 border-black/[0.04] hover:bg-gray-100'}`}>
                        <Zap className={`w-5 h-5 ${isOfferActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <div>
                            <div className="text-sm font-bold text-gray-900">Flash Offer</div>
                            <div className={`text-[11px] font-medium ${isOfferActive ? 'text-emerald-600' : 'text-gray-400'}`}>{isOfferActive ? 'Active' : 'Inactive'}</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Platform Snapshot</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-gray-50">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Users</div>
                        <div className="text-lg font-black text-gray-900">{totalUsers}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Conversion</div>
                        <div className="text-lg font-black text-gray-900">{totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0}%</div>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Access Codes</div>
                        <div className="text-lg font-black text-gray-900">{codes.length}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBERS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function MembersTab({ users, searchTerm, setSearchTerm, filterRole, setFilterRole, expandedUser, setExpandedUser, handleStatusUpdate, handleDelete, fetchUserActivity, setActiveTab }: any) {
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
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-black/[0.06] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-emerald-300 transition-all"
                    />
                </div>
                <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
                    {(['all', 'pro', 'online'] as const).map(f => (
                        <button key={f} onClick={() => setFilterRole(f)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filterRole === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                            {f === 'all' ? 'All' : f === 'pro' ? 'Paid' : 'Online'}
                        </button>
                    ))}
                </div>
            </div>

            {/* User List */}
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                <div className="divide-y divide-black/[0.04]">
                    {filteredUsers.slice(0, 50).map((u: any) => (
                        <div key={u.email}>
                            <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedUser(expandedUser === u.email ? null : u.email)}>
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center font-black text-emerald-700 text-sm shrink-0">
                                    {u.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-900 truncate">{u.name}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full ${(u.isOnline || isOnline(u.lastSeen)) ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    </div>
                                    <span className="text-xs text-gray-400 truncate block">{u.email}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {u.purchasedCourses?.length > 0 && (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Paid</span>
                                    )}
                                    {u.trialExpiresAt && u.trialExpiresAt !== 'EXPIRED' && (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full uppercase">Trial</span>
                                    )}
                                    <button onClick={e => { e.stopPropagation(); handleStatusUpdate(u.email, u.status); }}
                                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all" title={u.status === 'active' ? 'Suspend' : 'Activate'}>
                                        {u.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); handleDelete(u.email); }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${expandedUser === u.email ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            <AnimatePresence>
                                {expandedUser === u.email && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                        <div className="px-5 pb-4 bg-gray-50/50 border-t border-black/[0.04]">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Role</div>
                                                    <div className="text-sm font-bold text-gray-900 capitalize">{u.role || 'student'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Courses</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {u.purchasedCourses?.length > 0 ? u.purchasedCourses.map((c: string) => (
                                                            <span key={c} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">{c}</span>
                                                        )) : <span className="text-xs text-gray-400">None</span>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">XP / Level</div>
                                                    <div className="text-sm font-bold text-gray-900">{u.xp || 0} XP · LVL {u.level || 1}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Certificate</div>
                                                    <div className="text-sm font-bold text-gray-900 capitalize">{u.certificateStatus || 'locked'}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => { fetchUserActivity(u.id); setActiveTab('activity'); }}
                                                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors">
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
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No users found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK TAB
// ═══════════════════════════════════════════════════════════════════════════════

function FeedbackTab({ feedback, updateFeedbackStatus, deleteFeedback, replyToFeedback, users, getAllUsers, approveCertificate, rejectCertificate }: any) {
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
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Certificate Requests ({pendingCerts.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pendingCerts.map((u: any) => (
                            <div key={u.email} className="bg-white rounded-2xl border border-black/[0.06] p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center font-black text-amber-700 text-sm">{u.name?.charAt(0)}</div>
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">{u.name}</div>
                                        <div className="text-xs text-gray-400">{u.email}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={async () => { await approveCertificate(u.email); toast.success('Certificate approved'); }}
                                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all">Approve</button>
                                    <button onClick={async () => { await rejectCertificate(u.email); toast.success('Certificate rejected'); }}
                                        className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-all">Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Appeal Requests */}
            {requestItems.length > 0 && (
                <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Account Appeals ({requestItems.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requestItems.map((item: any) => (
                            <div key={item.id} className="bg-white rounded-2xl border border-black/[0.06] p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center font-black text-red-600 text-sm">{item.userName?.charAt(0)}</div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-gray-900">{item.userName}</div>
                                        <div className="text-xs text-gray-400">{item.userId}</div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full">Appeal</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-4 italic">"{item.content}"</p>
                                <div className="flex gap-2">
                                    <button onClick={async () => {
                                        await fetch(`/api/admin/users/${encodeURIComponent(item.userId)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active' }) });
                                        await updateFeedbackStatus(item.id, 'implemented');
                                        toast.success('User unblocked');
                                    }} className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all">Unblock</button>
                                    <button onClick={async () => { await updateFeedbackStatus(item.id, 'ignored'); toast.success('Appeal dismissed'); }}
                                        className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-all">Dismiss</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Feedback Items */}
            <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">User Feedback</h3>
                {feedbackItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {feedbackItems.map((item: any) => (
                            <div key={item.id} className="bg-white rounded-2xl border border-black/[0.06] p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-black text-blue-600 text-sm">{item.userName?.charAt(0)}</div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-gray-900">{item.userName}</div>
                                        <div className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.status === 'implemented' ? 'bg-emerald-50 text-emerald-700' : item.status === 'ignored' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700'}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">"{item.content}"</p>

                                {item.reply && (
                                    <div className="p-3 bg-emerald-50 rounded-xl mb-3">
                                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Reply</div>
                                        <p className="text-xs text-emerald-800">{item.reply}</p>
                                    </div>
                                )}

                                {replyingTo === item.id ? (
                                    <div className="flex gap-2">
                                        <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..."
                                            className="flex-1 px-3 py-2 bg-gray-50 border border-black/[0.06] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                                            onKeyDown={e => e.key === 'Enter' && handleReply(item.id)} />
                                        <button onClick={() => handleReply(item.id)} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"><Send className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => updateFeedbackStatus(item.id, 'implemented')} className="flex-1 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-all">Implement</button>
                                        <button onClick={() => { setReplyingTo(item.id); setReplyText(''); }} className="flex-1 py-2 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition-all">Reply</button>
                                        <button onClick={() => deleteFeedback(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-black/[0.06] py-16 text-center">
                        <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No feedback yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function CodesTab({ codes, codeType, setCodeType, generatedCode, handleGenerateCode, revokeAccessCode }: any) {
    return (
        <div className="space-y-6">
            {/* Generator */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Generate Access Code</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
                        {(['3days', '5mins'] as const).map(t => (
                            <button key={t} onClick={() => setCodeType(t)}
                                className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${codeType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                {t === '3days' ? '3 Day Trial' : '5 Min Preview'}
                            </button>
                        ))}
                    </div>
                    <button onClick={handleGenerateCode}
                        className="px-6 py-2.5 bg-emerald-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-800 transition-all">
                        Generate
                    </button>
                </div>
                {generatedCode && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                        <span className="font-mono text-lg font-black text-emerald-800">{generatedCode}</span>
                        <button onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success('Copied!'); }}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all">Copy</button>
                    </div>
                )}
            </div>

            {/* Codes List */}
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.04]">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">All Codes ({codes.length})</h3>
                </div>
                <div className="divide-y divide-black/[0.04]">
                    {codes.slice(0, 30).map((code: any) => (
                        <div key={code.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                            <span className="font-mono text-sm font-bold text-gray-900 w-40 truncate">{code.code}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${code.type === 'lifetime' ? 'bg-emerald-50 text-emerald-700' : code.type === '3days' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                                {code.type}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${code.isUsed ? 'bg-gray-100 text-gray-500' : code.isRevoked ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                {code.isRevoked ? 'Revoked' : code.isUsed ? `Used by ${code.usedBy || '?'}` : 'Available'}
                            </span>
                            <div className="flex-1" />
                            {!code.isUsed && !code.isRevoked && (
                                <button onClick={() => { revokeAccessCode(code.code); toast.success('Code revoked'); }}
                                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">Revoke</button>
                            )}
                        </div>
                    ))}
                </div>
                {codes.length === 0 && (
                    <div className="py-16 text-center">
                        <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No codes generated yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ProgressTab({ users, defaultCurriculum }: any) {
    const [expandedProgressUser, setExpandedProgressUser] = useState<string | null>(null);
    const paidUsers = users.filter((u: any) => u.purchasedCourses?.length > 0);

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Student Progress ({paidUsers.length})</h3>
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                <div className="divide-y divide-black/[0.04]">
                    {paidUsers.map((u: any) => {
                        const totalLessons = defaultCurriculum.reduce((acc: number, m: any) => acc + m.lessons.length, 0);
                        const completed = u.completedLessons?.length || 0;
                        const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

                        return (
                            <div key={u.email}>
                                <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedProgressUser(expandedProgressUser === u.email ? null : u.email)}>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center font-black text-emerald-700 text-sm">{u.name?.charAt(0)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-gray-900">{u.name}</div>
                                        <div className="text-xs text-gray-400">{u.purchasedCourses?.join(', ')}</div>
                                    </div>
                                    <div className="w-32">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-gray-500">{completed}/{totalLessons}</span>
                                            <span className="text-xs font-bold text-gray-900">{pct}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${expandedProgressUser === u.email ? 'rotate-180' : ''}`} />
                                </div>

                                <AnimatePresence>
                                    {expandedProgressUser === u.email && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                            <div className="px-5 pb-4 bg-gray-50/50 border-t border-black/[0.04]">
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
                                                    {defaultCurriculum.map((m: any) => {
                                                        const mDone = m.lessons.filter((l: any) => u.completedLessons?.includes(l.id)).length;
                                                        const mTotal = m.lessons.length;
                                                        const mPct = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : 0;
                                                        return (
                                                            <div key={m.id} className="p-3 bg-white rounded-xl border border-black/[0.04]">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{m.title.split('—')[0]}</span>
                                                                    <span className="text-[10px] font-bold text-gray-900">{mDone}/{mTotal}</span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${mPct === 100 ? 'bg-emerald-500' : 'bg-emerald-400'}`} style={{ width: `${mPct}%` }} />
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
                        <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No paid students yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ActivityTab({ activityLogs, viewingUserActivity, setViewingUserActivity }: any) {
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
                <button onClick={() => setViewingUserActivity(null)} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors">← Back to all activity</button>
            )}
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                <div className="divide-y divide-black/[0.04]">
                    {Object.entries(groupedLogs).slice(0, 30).map(([email, items]) => (
                        <div key={email} className="px-5 py-4">
                            <div className="font-bold text-sm text-gray-900 mb-2">{email}</div>
                            <div className="space-y-1">
                                {items.slice(0, 5).map((log: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                                        <span className="font-medium">{log.type}</span>
                                        <span className="truncate">{log.description || log.path}</span>
                                        <span className="ml-auto text-gray-400 shrink-0">{log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {Object.keys(groupedLogs).length === 0 && (
                    <div className="py-16 text-center">
                        <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No activity yet</p>
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
    const { user: currentUser, getAllUsers, updateUserStatus, deleteUser, logout, generateAccessCode, getAllAccessCodes, revokeAccessCode, approveCertificate, rejectCertificate } = useAuth();
    const { feedback, updateFeedbackStatus, deleteFeedback, replyToFeedback } = useFeedback();
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

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-black/[0.06] flex flex-col shrink-0 fixed h-full">
                <div className="p-5 border-b border-black/[0.06]">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm font-black text-gray-900">Admin Panel</span>
                    </div>
                    <p className="text-[11px] text-gray-400">DevMastery Control Center</p>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const badge = tab.id === 'feedback' ? unreadFeedback : 0;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                                <Icon className="w-4 h-4" />
                                <span className="flex-1 text-left">{tab.label}</span>
                                {badge > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{badge}</span>}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-black/[0.06] space-y-2">
                    <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
                        <Eye className="w-4 h-4" /> View Site
                    </Link>
                    <button onClick={() => { logout(); navigate('/'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 transition-all">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-6">
                <div className="max-w-6xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </h1>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                            {activeTab === 'overview' && <OverviewTab users={users} feedback={feedback} codes={codes} sqlStats={sqlStats} />}
                            {activeTab === 'members' && <MembersTab users={users} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterRole={filterRole} setFilterRole={setFilterRole} expandedUser={expandedUser} setExpandedUser={setExpandedUser} handleStatusUpdate={handleStatusUpdate} handleDelete={handleDelete} fetchUserActivity={fetchUserActivity} setActiveTab={setActiveTab} />}
                            {activeTab === 'courses' && <CourseManager />}
                            {activeTab === 'feedback' && <FeedbackTab feedback={feedback} updateFeedbackStatus={updateFeedbackStatus} deleteFeedback={deleteFeedback} replyToFeedback={replyToFeedback} users={users} getAllUsers={getAllUsers} approveCertificate={approveCertificate} rejectCertificate={rejectCertificate} />}
                            {activeTab === 'codes' && <CodesTab codes={codes} codeType={codeType} setCodeType={setCodeType} generatedCode={generatedCode} handleGenerateCode={handleGenerateCode} revokeAccessCode={revokeAccessCode} />}
                            {activeTab === 'progress' && <ProgressTab users={users} defaultCurriculum={defaultCurriculum} />}
                            {activeTab === 'activity' && <ActivityTab activityLogs={activityLogs} viewingUserActivity={viewingUserActivity} setViewingUserActivity={setViewingUserActivity} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
