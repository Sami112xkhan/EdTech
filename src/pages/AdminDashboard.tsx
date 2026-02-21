import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
    Trash2,
    UserCheck,
    Search,
    CheckCircle,
    XCircle,
    Reply,
    Award,
    MessageSquare,
    LogOut,
    PanelLeft,
    Clock,
    Users,
    Zap,
    TrendingUp,
    ShieldCheck,
    ShieldAlert,
    ChevronRight,
    AlertTriangle,
    Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { curriculum } from "../data/curriculum";
import { getPhasesStatus } from "../utils/progress";

// Helper to check online status (within last 5 mins)
const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes
};

const AdminDashboard: React.FC = () => {
    const {
        user: currentUser,
        getAllUsers,
        updateUserStatus,
        deleteUser,
        logout,
        generateAccessCode,
        getAllAccessCodes,
        revokeAccessCode,
        approveCertificate,
        rejectCertificate
    } = useAuth();

    const {
        feedback,
        updateFeedbackStatus,
        deleteFeedback,
        replyToFeedback
    } = useFeedback();

    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'feedback' | 'codes' | 'requests' | 'content' | 'activity'>('users');
    const [codeType, setCodeType] = useState<'3days' | '5mins'>('3days');
    const [generatedCode, setGeneratedCode] = useState("");
    const [codes, setCodes] = useState<any[]>([]);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [expandedProgressUser, setExpandedProgressUser] = useState<string | null>(null);
    const [sqlStats, setSqlStats] = useState<{
        totalUsers: number;
        proMembers: number;
        activeUsers: number;
        newToday: number;
        recentLogins: any[];
    } | null>(null);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [selectedUserActivity, setSelectedUserActivity] = useState<any[] | null>(null);
    const [viewingUserActivity, setViewingUserActivity] = useState<string | null>(null);

    useEffect(() => {
        const fetchSqlStats = async () => {
            try {
                const response = await fetch('/api/admin/stats');
                const data = await response.json();
                setSqlStats(data);
            } catch (e) {
                console.error("Failed to fetch SQL stats", e);
            }
        };

        fetchSqlStats();
        const interval = setInterval(fetchSqlStats, 5000); // Pulse every 5s for live feel
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const response = await fetch('/api/admin/activity');
                const data = await response.json();
                setActivityLogs(data);
            } catch (e) {
                console.error("Failed to fetch activity logs", e);
            }
        };

        fetchActivity();
        const interval = setInterval(fetchActivity, 3000); // Faster pulse for activity stream
        return () => clearInterval(interval);
    }, []);

    const fetchUserActivity = async (userId: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}/activity`);
            const data = await response.json();
            setSelectedUserActivity(data);
            setViewingUserActivity(userId);
        } catch (e) {
            console.error("Failed to fetch user activity", e);
        }
    };

    useEffect(() => {
        // Security check
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        // Fetch users from DB
        const fetchUsers = async () => {
            const dbUsers = await getAllUsers();
            setUsers(dbUsers);
        };
        fetchUsers();
        // Auto-refresh users every 5s for live online status
        const usersInterval = setInterval(fetchUsers, 5000);
        return () => clearInterval(usersInterval);
    }, [currentUser, navigate]);

    const handleStatusUpdate = async (email: string, currentStatus: 'active' | 'inactive') => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        await updateUserStatus(email, newStatus);
        // Re-fetch users from DB
        const dbUsers = await getAllUsers();
        setUsers(dbUsers);
    };

    const handleDelete = async (email: string) => {
        if (confirm('Are you sure you want to delete this user?')) {
            await deleteUser(email);
            // Re-fetch users from DB
            const dbUsers = await getAllUsers();
            setUsers(dbUsers);
        }
    };

    const handleGenerateCode = async () => {
        const code = await generateAccessCode(codeType);
        setGeneratedCode(code);
        const updatedCodes = await getAllAccessCodes();
        setCodes(updatedCodes);
    };

    // Fetch access codes from DB
    useEffect(() => {
        const fetchCodes = async () => {
            const dbCodes = await getAllAccessCodes();
            setCodes(dbCodes);
        };
        fetchCodes();
        const codesInterval = setInterval(fetchCodes, 5000);
        return () => clearInterval(codesInterval);
    }, []);

    const [filterRole, setFilterRole] = useState<'all' | 'pro' | 'online'>('all');

    const filteredUsers = useMemo(() => {
        let result = users;

        // 1. Apply category filter
        if (filterRole === 'pro') {
            result = result.filter(u => u.isPaid);
        } else if (filterRole === 'online') {
            result = result.filter(u => u.isOnline || isOnline(u.lastSeen));
        }

        // 2. Apply search text filter
        if (searchTerm) {
            result = result.filter(u =>
                u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return result;
    }, [users, searchTerm, filterRole]);

    // Statistics
    const stats = useMemo(() => {
        const totalUsers = users.length;
        const proUsers = users.filter(u => u.isPaid).length;
        const activeTrials = users.filter(u => u.trialExpiresAt && u.trialExpiresAt !== 'EXPIRED').length;
        const pendingFeedback = feedback.filter(f => f.status === 'pending').length;

        return [
            { id: 'all', label: 'Total Members', value: sqlStats?.totalUsers ?? totalUsers, icon: Users, color: 'indigo', trend: sqlStats ? 'SQL' : '+12%' },
            { id: 'pro', label: 'PRO Members', value: sqlStats?.proMembers ?? proUsers, icon: Award, color: 'primary', trend: sqlStats ? 'SQL' : '+5%' },
            { id: 'online', label: 'Live Active', value: sqlStats?.activeUsers ?? activeTrials, icon: Clock, color: 'amber', trend: 'Live' },
            { id: 'today', label: 'New Today', value: sqlStats?.newToday ?? pendingFeedback, icon: MessageSquare, color: 'rose', trend: 'Today' }
        ];
    }, [users, feedback, sqlStats]);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 mb-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">System Command</span>
                        </div>
                        <h1 className="text-2xl font-black text-white">Admin Control Center</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-2 px-5 py-2.5 bg-secondary/50 text-white font-bold rounded-xl hover:bg-secondary transition-all border border-white/5 active:scale-95"
                        >
                            <PanelLeft className="w-4 h-4" /> Learner View
                        </Link>
                        <button
                            onClick={() => { logout(); navigate('/'); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20 active:scale-95"
                        >
                            <LogOut className="w-4 h-4" /> Exit
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 space-y-10">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => {
                                setActiveTab('users');
                                setFilterRole(stat.id as 'all' | 'pro' | 'online');
                            }}
                            className="p-6 rounded-[2.5rem] bg-secondary/10 border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-all cursor-pointer"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-${stat.color}-500/10 transition-colors`} />

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400 border border-${stat.color}-500/20`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black px-2 py-1 rounded bg-white/5 text-muted-foreground uppercase tracking-widest">{stat.trend}</span>
                                </div>
                                <h3 className="text-3xl font-black text-white mb-1">{stat.value}</h3>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-white/5 pb-8">
                    <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl w-full xl:w-fit overflow-x-auto no-scrollbar">
                        {[
                            { id: 'users', icon: Users, label: 'Members' },
                            { id: 'feedback', icon: MessageSquare, label: 'Feedback' },
                            { id: 'requests', icon: ShieldAlert, label: 'Appeals' },
                            { id: 'codes', icon: Zap, label: 'Trials' },
                            { id: 'content', icon: Award, label: 'Progress' },
                            { id: 'activity', icon: TrendingUp, label: 'Activity' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.id === 'requests' && feedback.filter(f => f.type === 'access_request' && f.status === 'pending').length > 0 && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded-full">{feedback.filter(f => f.type === 'access_request' && f.status === 'pending').length}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'users' && (
                        <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/10 group focus-within:border-primary/40 transition-all w-full xl:max-w-md shadow-inner">
                            <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="ACCESS IDENTIFIER SEARCH..."
                                className="bg-transparent border-none outline-none text-[10px] font-black tracking-widest uppercase w-full placeholder:text-muted-foreground/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'users' && (
                        <motion.div
                            key="users"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-secondary/10 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[900px]">
                                    <thead className="bg-white/5 border-b border-white/5">
                                        <tr>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Entity Details</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Activity</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Current Phase</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Progress</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.map((u) => (
                                            <React.Fragment key={u.email}>
                                                <tr
                                                    className="group hover:bg-white/[0.02] transition-colors relative cursor-pointer"
                                                    onClick={() => setExpandedUser(expandedUser === u.email ? null : u.email)}
                                                >
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 group-hover:from-indigo-500/30 group-hover:to-purple-500/30 flex items-center justify-center font-black text-white border border-white/10 transition-all scale-100 group-hover:scale-110">
                                                                {u.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-white text-base group-hover:text-primary transition-colors flex items-center gap-2">
                                                                    {u.name}
                                                                    <ChevronRight className={`w-3 h-3 transition-transform ${expandedUser === u.email ? 'rotate-90' : ''}`} />
                                                                </div>
                                                                <div className="text-xs font-bold text-muted-foreground">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-1">
                                                            <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest w-fit ${(u.isOnline || isOnline(u.lastSeen)) ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-muted-foreground border border-white/5'}`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${(u.isOnline || isOnline(u.lastSeen)) ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                                                                {(u.isOnline || isOnline(u.lastSeen)) ? 'Online' : 'Offline'}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                {u.lastSeen ? new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="text-xs font-bold text-white">
                                                            {(() => {
                                                                const stats = getPhasesStatus(curriculum, u.completedLessons);
                                                                const current = stats.find(p => !p.locked && !p.completed) || stats[stats.length - 1];
                                                                if (stats.every(p => p.completed)) return <span className="text-primary">GRADUATED</span>;
                                                                return current?.title.split(" — ")[0] || "Phase 0";
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-1">
                                                            {getPhasesStatus(curriculum, u.completedLessons).map((p, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`w-1.5 h-6 rounded-full transition-all ${p.completed ? 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]' : p.locked ? 'bg-white/5' : 'bg-white/20 animate-pulse'}`}
                                                                    title={p.title}
                                                                />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(u.email, u.status as any); }}
                                                                className="p-3 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl transition-all active:scale-95"
                                                                title={u.status === 'active' ? 'Hold Access' : 'Restore Access'}
                                                            >
                                                                {u.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(u.email); }}
                                                                className="p-3 bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-xl transition-all active:scale-95"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Expanded Detail Panel */}
                                                {expandedUser === u.email && (
                                                    <tr>
                                                        <td colSpan={5} className="px-0 py-0">
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="bg-white/[0.02] border-t border-b border-white/5"
                                                            >
                                                                <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Role</div>
                                                                        <div className="text-sm font-bold text-white uppercase">{u.role || 'student'}</div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Plan</div>
                                                                        <div className={`text-sm font-bold ${u.isPaid ? 'text-yellow-400' : 'text-zinc-500'}`}>
                                                                            {u.isPaid ? (
                                                                                (() => {
                                                                                    const usedCode = codes.find(c => c.usedBy === u.email && c.type === 'lifetime');
                                                                                    return usedCode ? `⭐ PRO (CODE: ${usedCode.code})` : '⭐ PRO (PURCHASE)';
                                                                                })()
                                                                            ) : 'FREE'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Account Status</div>
                                                                        <div className={`text-sm font-bold ${u.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                                                                            {(u.status || 'active').toUpperCase()}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Certificate</div>
                                                                        <div className="text-sm font-bold text-white">{(u.certificateStatus || 'locked').toUpperCase()}</div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">XP</div>
                                                                        <div className="text-sm font-bold text-primary">{u.xp || 0} XP</div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Level</div>
                                                                        <div className="text-sm font-bold text-white">LVL {u.level || 1}</div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Streak</div>
                                                                        <div className="text-sm font-bold text-orange-400">🔥 {u.streak || 0} days</div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Lessons Done</div>
                                                                        <div className="text-sm font-bold text-white">{(u.completedLessons || []).length}</div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Joined</div>
                                                                        <div className="text-sm font-bold text-zinc-400">
                                                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Last Login</div>
                                                                        <div className="text-sm font-bold text-zinc-400">
                                                                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Last Seen</div>
                                                                        <div className="text-sm font-bold text-zinc-400">
                                                                            {u.lastSeen ? new Date(u.lastSeen).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Online Status</div>
                                                                        <div className={`text-sm font-bold ${(u.isOnline || isOnline(u.lastSeen)) ? 'text-green-400' : 'text-red-400'}`}>
                                                                            {(u.isOnline || isOnline(u.lastSeen)) ? '🟢 LIVE NOW' : '🔴 OFFLINE'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Actions</div>
                                                                        <button
                                                                            onClick={() => {
                                                                                fetchUserActivity(u.id);
                                                                                setActiveTab('activity');
                                                                            }}
                                                                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all"
                                                                        >
                                                                            <Eye className="w-3 h-3" />
                                                                            View History
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'feedback' && (
                        <motion.div
                            key="feedback"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                        >
                            {feedback.filter(f => f.type === 'feedback').length > 0 ? feedback.filter(f => f.type === 'feedback').map((item, i) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-8 rounded-[2.5rem] bg-secondary/10 border border-white/5 relative group hover:border-primary/30 transition-all shadow-xl"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-xl text-primary shadow-inner">
                                                {item.userName?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors">{item.userName}</h3>
                                                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">{new Date(item.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${item.status === 'implemented' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            item.status === 'ignored' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </div>

                                    <div className="p-6 bg-black/40 rounded-3xl border border-white/5 min-h-[100px] relative overflow-hidden mb-6">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <MessageSquare className="w-16 h-16" />
                                        </div>
                                        <p className="relative z-10 text-zinc-300 font-medium leading-relaxed italic">"{item.content}"</p>
                                    </div>

                                    {item.reply && (
                                        <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 mb-8 relative">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Reply className="w-4 h-4 text-primary" />
                                                <span className="text-[10px] uppercase font-black text-primary tracking-[0.3em]">Official Transmutation</span>
                                            </div>
                                            <p className="text-sm text-zinc-400 font-bold leading-relaxed">{item.reply}</p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => updateFeedbackStatus(item.id, 'implemented')}
                                            className="flex-1 py-4 bg-green-500 text-black font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-500/10"
                                        >
                                            Implement
                                        </button>
                                        <button
                                            onClick={() => {
                                                const reply = prompt("Enter the official response:");
                                                if (reply) replyToFeedback(item.id, reply);
                                            }}
                                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all border border-white/10"
                                        >
                                            Transmit
                                        </button>
                                        <button
                                            onClick={() => deleteFeedback(item.id)}
                                            className="p-4 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-2xl transition-all border border-red-500/10"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="lg:col-span-2 py-32 text-center bg-secondary/5 rounded-[3rem] border border-dashed border-white/10 opacity-30">
                                    <TrendingUp className="w-16 h-16 mx-auto mb-6" />
                                    <h4 className="text-xl font-black text-white italic">Silence on the airwaves.</h4>
                                    <p className="text-sm font-bold uppercase tracking-widest">Waiting for user signal.</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'requests' && (
                        <motion.div
                            key="requests"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* --- Certificate Appeals --- */}
                            <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem] mb-8">
                                <h4 className="text-primary font-black text-xs uppercase tracking-widest mb-1">Certificate Requests</h4>
                                <p className="text-primary/60 text-[10px] font-medium">Students who have completed the course and are requesting their certificate.</p>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {users.filter(u => u.certificateStatus === 'pending').length > 0 ? users.filter(u => u.certificateStatus === 'pending').map((u: any) => {
                                    const totalLessons = 31;
                                    const completedCount = u.completedLessons?.length || 0;
                                    const progress = Math.round((completedCount / totalLessons) * 100);

                                    return (
                                        <motion.div
                                            key={u.email}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-8 rounded-[2.5rem] bg-secondary/10 border border-white/5 group hover:border-primary/30 transition-all"
                                        >
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-xl text-primary shadow-inner">
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-white">{u.name}</h3>
                                                        <p className="text-[10px] text-zinc-500 font-mono">{u.email}</p>
                                                    </div>
                                                </div>
                                                <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                                    Pending Review
                                                </span>
                                            </div>

                                            <div className="p-5 bg-black/40 rounded-2xl border border-white/5 mb-6">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Course Progress</span>
                                                    <span className="text-sm font-black text-white">{progress}%</span>
                                                </div>
                                                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-primary'}`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[10px] text-zinc-500">{completedCount} / {totalLessons} lessons</span>
                                                    <span className="text-[10px] text-zinc-500">Level {u.level} · {u.xp} XP</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={async () => {
                                                        await approveCertificate(u.email);
                                                        const dbUsers = await getAllUsers();
                                                        setUsers(dbUsers);
                                                    }}
                                                    className="flex-1 py-4 bg-green-500 text-black font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-500/10"
                                                >
                                                    GRANT CERTIFICATE
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        await rejectCertificate(u.email);
                                                        const dbUsers = await getAllUsers();
                                                        setUsers(dbUsers);
                                                    }}
                                                    className="flex-1 py-4 bg-red-500/10 text-red-400 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20"
                                                >
                                                    DENY
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                }) : (
                                    <div className="lg:col-span-2 py-20 text-center opacity-20">
                                        <ShieldCheck className="w-12 h-12 mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">No certificate requests pending.</p>
                                    </div>
                                )}
                            </div>

                            {/* --- Account Suspensions Appeals --- */}
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] mt-12 mb-8">
                                <h4 className="text-red-400 font-black text-xs uppercase tracking-widest mb-1">Account Suspensions</h4>
                                <p className="text-red-400/60 text-[10px] font-medium">Appeals from suspended users requesting account reactivation.</p>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {feedback.filter(f => f.type === 'access_request' && f.status === 'pending').length > 0 ? feedback.filter(f => f.type === 'access_request' && f.status === 'pending').map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-8 rounded-[2.5rem] bg-secondary/10 border border-white/5 group hover:border-red-500/30 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center font-black text-xl text-red-500 shadow-inner">
                                                    {item.userName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-white">{item.userName}</h3>
                                                    <p className="text-[10px] text-zinc-500 font-mono">{item.userId}</p>
                                                </div>
                                            </div>
                                            <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                                                Review Appeal
                                            </span>
                                        </div>

                                        <div className="p-5 bg-black/40 rounded-2xl border border-white/5 mb-6 relative">
                                            <div className="absolute top-2 right-4 opacity-10">
                                                <AlertTriangle className="w-8 h-8 text-red-500" />
                                            </div>
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Message from user</span>
                                            <p className="text-sm text-zinc-300 italic">"{item.content}"</p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={async () => {
                                                    // Unblock User -> Sets status to active
                                                    try {
                                                        const res = await fetch(`/api/admin/users/${encodeURIComponent(item.userId)}/status`, {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ status: 'active' })
                                                        });
                                                        if (res.ok) {
                                                            await updateFeedbackStatus(item.id, 'implemented');
                                                            const dbUsers = await getAllUsers();
                                                            setUsers(dbUsers);
                                                            toast.success('User unblocked seamlessly.');
                                                        }
                                                    } catch (error) {
                                                        toast.error('Failed to unblock user.');
                                                    }
                                                }}
                                                className="flex-1 py-4 bg-white hover:bg-white/90 text-black font-black rounded-2xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                UNBLOCK USER
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    // 10-Day Timeout -> Replies and resolves ticket without changing unblock
                                                    const officialReply = "Your appeal has been reviewed. A 10-day timeout has been issued for violating community guidelines. Your access will remain restricted during this period.";
                                                    await replyToFeedback(item.id, officialReply);
                                                    await updateFeedbackStatus(item.id, 'ignored');
                                                    toast.success('Timeout issued and user notified.');
                                                }}
                                                className="flex-1 py-4 bg-red-500/10 text-red-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20"
                                            >
                                                10-DAY TIMEOUT
                                            </button>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="lg:col-span-2 py-20 text-center opacity-20">
                                        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">No account appeals pending.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'content' && (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-secondary/10 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[900px]">
                                    <thead className="bg-white/5 border-b border-white/5">
                                        <tr>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Student</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Progress</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Certificate Status</th>
                                            <th className="px-6 md:px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {users.filter(u => u.role !== 'admin').map((u) => {
                                            const totalLessons = 31;
                                            const completedCount = u.completedLessons?.length || 0;
                                            const progress = Math.round((completedCount / totalLessons) * 100);

                                            return (
                                                <React.Fragment key={u.email}>
                                                    <tr className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setExpandedProgressUser(expandedProgressUser === u.email ? null : u.email)}>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${expandedProgressUser === u.email ? 'rotate-90' : ''}`} />
                                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-white border border-white/10">
                                                                    {u.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-white text-sm">{u.name}</div>
                                                                    <div className="text-xs text-muted-foreground">{u.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                                                                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                                                                </div>
                                                                <span className="text-xs font-bold text-white">{progress}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            {u.certificateStatus === 'approved' && (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black uppercase tracking-wider">
                                                                    <CheckCircle className="w-3 h-3" /> Issued
                                                                </span>
                                                            )}
                                                            {u.certificateStatus === 'pending' && (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                                                    <Clock className="w-3 h-3" /> Pending Review
                                                                </span>
                                                            )}
                                                            {(!u.certificateStatus || u.certificateStatus === 'locked' || u.certificateStatus === 'eligible') && (
                                                                <span className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-wider">Not Issued</span>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                                                            {u.certificateStatus === 'pending' ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={async () => {
                                                                            await approveCertificate(u.email);
                                                                            const dbUsers = await getAllUsers();
                                                                            setUsers(dbUsers);
                                                                        }}
                                                                        className="px-4 py-2 bg-green-500 text-black font-bold rounded-lg text-xs hover:scale-105 transition-transform"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            await rejectCertificate(u.email);
                                                                            const dbUsers = await getAllUsers();
                                                                            setUsers(dbUsers);
                                                                        }}
                                                                        className="px-4 py-2 bg-red-500/10 text-red-400 font-bold rounded-lg text-xs border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground/20 text-xs">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {expandedProgressUser === u.email && (
                                                        <tr>
                                                            <td colSpan={4} className="px-8 py-6 bg-black/30">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                    {curriculum.map((phase) => {
                                                                        const phaseCompleted = phase.lessons.filter(l => u.completedLessons?.includes(l.id)).length;
                                                                        const phaseTotal = phase.lessons.length;
                                                                        const phaseProgress = Math.round((phaseCompleted / phaseTotal) * 100);
                                                                        return (
                                                                            <div key={phase.id} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{phase.title}</span>
                                                                                    <span className={`text-[10px] font-black ${phaseProgress === 100 ? 'text-green-400' : 'text-zinc-500'}`}>{phaseCompleted}/{phaseTotal}</span>
                                                                                </div>
                                                                                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
                                                                                    <div className={`h-full rounded-full ${phaseProgress === 100 ? 'bg-green-500' : 'bg-primary/60'}`} style={{ width: `${phaseProgress}%` }} />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    {phase.lessons.map(lesson => (
                                                                                        <div key={lesson.id} className="flex items-center gap-2 text-[10px]">
                                                                                            {u.completedLessons?.includes(lesson.id) ? (
                                                                                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                                                                            ) : (
                                                                                                <div className="w-3 h-3 rounded-full border border-zinc-700 flex-shrink-0" />
                                                                                            )}
                                                                                            <span className={u.completedLessons?.includes(lesson.id) ? 'text-zinc-400' : 'text-zinc-600'}>{lesson.title}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'codes' && (
                        <motion.div
                            key="codes"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            className="space-y-12"
                        >
                            <div className="bg-white/5 backdrop-blur-3xl p-8 md:p-14 rounded-[3.5rem] border border-white/10 shadow-3xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-64 -mt-64" />
                                <div className="relative z-10 max-w-4xl mx-auto">
                                    <div className="text-center mb-12">
                                        <div className="inline-flex p-5 md:p-6 bg-primary/10 rounded-3xl border border-primary/20 mb-8 shadow-2xl shadow-primary/10 rotate-3">
                                            <Zap className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                                        </div>
                                        <h3 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tighter uppercase">PROGENITOR <span className="text-primary italic">X</span></h3>
                                        <p className="text-muted-foreground text-sm md:text-lg font-medium opacity-60">Authorize high-sync architectural access across the grid.</p>
                                    </div>

                                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-center gap-6 bg-black/40 p-6 md:p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
                                        <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5 w-full lg:w-auto">
                                            {[
                                                { id: '3days', label: '72H LEVEL' },
                                                { id: '5mins', label: '5M FLASH' },
                                                { id: 'lifetime', label: 'LIFETIME' }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setCodeType(t.id as any)}
                                                    className={`flex-1 lg:flex-none px-8 py-5 rounded-xl text-[10px] font-black tracking-widest transition-all ${codeType === t.id ? 'bg-primary text-white shadow-2xl shadow-primary/30' : 'text-muted-foreground hover:text-white'}`}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleGenerateCode}
                                            className="px-10 py-5 bg-white text-black font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-white/10 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.2em]"
                                        >
                                            REVEAL ESSENCE <Zap className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {generatedCode && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                className="mt-12 p-8 md:p-12 bg-primary/5 border border-primary/20 rounded-[3rem] shadow-inner flex flex-col items-center gap-8 text-center"
                                            >
                                                <div className="text-3xl md:text-6xl font-black font-mono tracking-[0.3em] text-white bg-black/60 px-8 md:px-12 py-6 md:py-8 rounded-3xl border border-white/5 select-all shadow-2xl">
                                                    {generatedCode}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(generatedCode);
                                                        alert("Sequence stored in buffer.");
                                                    }}
                                                    className="w-full md:w-auto px-16 py-5 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.3em] hover:bg-primary/80 transition-all shadow-2xl shadow-primary/40 active:scale-95"
                                                >
                                                    COPY SEQUENCE
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="bg-secondary/10 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                                <div className="px-10 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                    <h4 className="font-black text-xs uppercase tracking-[0.3em] text-muted-foreground">Essence Log</h4>
                                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{codes.length} Entries Recorded</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[700px]">
                                        <thead>
                                            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-white/5">
                                                <th className="px-8 py-6">Unique identifier</th>
                                                <th className="px-8 py-6">Potency</th>
                                                <th className="px-8 py-6">State</th>
                                                <th className="px-8 py-6">Timelog</th>
                                                <th className="px-8 py-6">Linked Entity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {codes.map((c: any) => (
                                                <tr key={c.code} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-10 py-6 font-mono font-black text-white text-xl tracking-[0.2em]">{c.code}</td>
                                                    <td className="px-10 py-6">
                                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ${c.type === 'lifetime' ? 'text-green-400 bg-green-400/10 border border-green-500/20' :
                                                            c.type === '5mins' ? 'text-amber-400 bg-amber-400/5' :
                                                                'text-indigo-400 bg-indigo-400/5'
                                                            }`}>
                                                            {c.type === 'lifetime' ? <Award className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                                                            {c.type === 'lifetime' ? 'Progenitor Core' : c.type === '5mins' ? 'Low-Orbit' : 'High-Sync'}
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        {c.isUsed ? (
                                                            <div className="flex items-center gap-2 text-muted-foreground/40 font-black text-[10px] uppercase tracking-widest">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" /> Claimed
                                                            </div>
                                                        ) : c.isRevoked ? (
                                                            <div className="flex items-center gap-2 text-red-500/50 font-black text-[10px] uppercase tracking-widest">
                                                                <XCircle className="w-3 h-3" /> Revoked
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-green-400 font-black text-[10px] uppercase tracking-widest animate-pulse">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Radiant
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-10 py-6 text-xs text-muted-foreground/60 font-black tracking-tighter">
                                                        {new Date(c.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center justify-between">
                                                            {c.usedBy ? (
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                                                                        {c.usedBy.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="text-sm font-black text-white/50">{c.usedBy}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground/10">—</span>
                                                            )}
                                                            {!c.isUsed && !c.isRevoked && (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm("Revoke this code?")) {
                                                                            await revokeAccessCode(c.code);
                                                                            const updatedCodes = await getAllAccessCodes();
                                                                            setCodes(updatedCodes);
                                                                        }
                                                                    }}
                                                                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                                                                >
                                                                    REVOKE
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'activity' && (
                        <motion.div
                            key="activity"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-secondary/10 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
                                        {viewingUserActivity ? 'User Activity History' : 'Live Action Stream'}
                                    </h3>
                                    {viewingUserActivity && (
                                        <button
                                            onClick={() => setViewingUserActivity(null)}
                                            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
                                        >
                                            ← Back to Live Stream
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-[9px] font-black uppercase border border-green-500/20">
                                    <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                                    {viewingUserActivity ? 'History Loaded' : 'Live Tracking'}
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5">
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                            <th className="px-8 py-5">User</th>
                                            <th className="px-8 py-5">Action</th>
                                            <th className="px-8 py-5">Path</th>
                                            <th className="px-8 py-5 text-right">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(viewingUserActivity ? (selectedUserActivity || []) : activityLogs).map((log: any, i: number) => (
                                            <tr key={log.id || i} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white uppercase text-xs">{log.name || 'User'}</span>
                                                        <span className="font-mono text-zinc-500 text-[10px]">{log.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${log.type === 'NAVIGATE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            log.type === 'CLICK' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                            }`}>
                                                            {log.type}
                                                        </span>
                                                        <span className="text-xs text-white/80 font-medium">{log.description}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-[10px] font-mono text-zinc-500">{log.path}</td>
                                                <td className="px-8 py-5 text-right text-xs text-zinc-400 font-medium whitespace-nowrap">
                                                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {((viewingUserActivity ? selectedUserActivity : activityLogs)?.length === 0) && (
                                    <div className="p-20 text-center opacity-30">
                                        <Clock className="w-12 h-12 mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest italic">Signal buffer empty.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
};

export default AdminDashboard;
