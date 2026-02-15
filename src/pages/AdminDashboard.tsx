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
    ShieldCheck
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const {
        user: currentUser,
        getAllUsers,
        updateUserStatus,
        deleteUser,
        logout,
        generateAccessCode,
        getAllAccessCodes
    } = useAuth();

    const {
        feedback,
        updateFeedbackStatus,
        deleteFeedback,
        replyToFeedback
    } = useFeedback();

    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'feedback' | 'codes'>('users');
    const [codeType, setCodeType] = useState<'3days' | '5mins'>('3days');
    const [generatedCode, setGeneratedCode] = useState("");

    useEffect(() => {
        // Security check
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        setUsers(getAllUsers());
    }, [currentUser, navigate, getAllUsers]);

    const handleStatusUpdate = (email: string, currentStatus: 'active' | 'inactive') => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const updatedList = updateUserStatus(email, newStatus);
        setUsers(updatedList);
    };

    const handleDelete = (email: string) => {
        if (confirm('Are you sure you want to delete this user?')) {
            const updatedList = deleteUser(email);
            setUsers(updatedList);
        }
    };

    const handleGenerateCode = () => {
        const code = generateAccessCode(codeType);
        setGeneratedCode(code);
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    // Statistics
    const stats = useMemo(() => {
        const totalUsers = users.length;
        const proUsers = users.filter(u => u.isPaid).length;
        const activeTrials = users.filter(u => u.trialExpiresAt && u.trialExpiresAt !== 'EXPIRED').length;
        const pendingFeedback = feedback.filter(f => f.status === 'pending').length;
        const usedCodes = getAllAccessCodes().filter(c => c.isUsed).length;

        return [
            { label: 'Total Members', value: totalUsers, icon: Users, color: 'indigo', trend: '+12%' },
            { label: 'PRO Members', value: proUsers, icon: Award, color: 'primary', trend: '+5%' },
            { label: 'Active Trials', value: activeTrials, icon: Clock, color: 'amber', trend: 'Live' },
            { label: 'Pending Feedback', value: pendingFeedback, icon: MessageSquare, color: 'rose', trend: 'Action' }
        ];
    }, [users, feedback, getAllAccessCodes]);

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
                            className="p-6 rounded-[2.5rem] bg-secondary/10 border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-all"
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
                    <div className="flex p-1.5 bg-secondary/30 rounded-2xl border border-white/5 w-fit h-fit">
                        {[
                            { id: 'users', icon: Users, label: 'Membership' },
                            { id: 'feedback', icon: MessageSquare, label: 'Voice of User' },
                            { id: 'codes', icon: Zap, label: 'Trial Factory' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.05]' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'users' && (
                        <div className="flex items-center gap-4 bg-secondary/20 px-5 py-3 rounded-2xl border border-white/5 group focus-within:border-primary/50 transition-all flex-1 md:max-w-md">
                            <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name or identity..."
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/50 font-bold"
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
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-white/5">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Entity Details</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Privilege</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Temporal Access</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Direct Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.map((u) => (
                                            <tr key={u.email} className="group hover:bg-white/[0.02] transition-colors relative">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 group-hover:from-indigo-500/30 group-hover:to-purple-500/30 flex items-center justify-center font-black text-white border border-white/10 transition-all scale-100 group-hover:scale-110">
                                                            {u.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-white text-base group-hover:text-primary transition-colors">{u.name}</div>
                                                            <div className="text-xs font-bold text-muted-foreground">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${u.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                                                        {u.status}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {u.isPaid ? (
                                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-xl border border-primary/20 font-black text-xs shadow-lg shadow-primary/5">
                                                            <Award className="w-4 h-4" /> PRO ELITE
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-black text-muted-foreground/40 italic">BASIC TIER</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6">
                                                    {u.trialExpiresAt ? (
                                                        u.trialExpiresAt === 'EXPIRED' ? (
                                                            <div className="flex items-center gap-2 text-rose-400/50 font-black text-[10px] uppercase">
                                                                <XCircle className="w-3 h-3" /> Duration Ended
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    {new Date(u.trialExpiresAt).toLocaleDateString()}
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground/60 font-black tracking-widest">TRIAL PHASE</span>
                                                            </div>
                                                        )
                                                    ) : <span className="text-muted-foreground/30">—</span>}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleStatusUpdate(u.email, u.status as any)}
                                                            className="p-3 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl transition-all active:scale-95"
                                                            title={u.status === 'active' ? 'Hold Access' : 'Restore Access'}
                                                        >
                                                            {u.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(u.email)}
                                                            className="p-3 bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-xl transition-all active:scale-95"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && (
                                    <div className="p-20 text-center">
                                        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
                                        <p className="text-muted-foreground font-bold italic">No entities match your search parameters.</p>
                                    </div>
                                )}
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
                            {feedback.length > 0 ? feedback.map((item, i) => (
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

                    {activeTab === 'codes' && (
                        <motion.div
                            key="codes"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            className="space-y-12"
                        >
                            {/* Generation Tool */}
                            <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-12 rounded-[3.5rem] border border-primary/20 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-[80px] -ml-32 -mb-32" />

                                <div className="relative z-10 max-w-4xl mx-auto">
                                    <div className="text-center mb-10">
                                        <div className="inline-flex p-4 bg-primary/20 rounded-3xl border border-primary/20 mb-6 shadow-xl shadow-primary/10">
                                            <Award className="w-10 h-10 text-primary" />
                                        </div>
                                        <h3 className="text-4xl font-black text-white mb-2 tracking-tight">Access Progenitor</h3>
                                        <p className="text-muted-foreground text-lg font-bold">Transmute standard users into elite learners.</p>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-black/40 p-10 rounded-[2.5rem] border border-white/10">
                                        <div className="flex p-2 bg-zinc-900 rounded-[2rem] border border-white/5 w-full md:w-auto">
                                            {[
                                                { id: '3days', label: '72 HOURS' },
                                                { id: '5mins', label: '5 MINUTES' }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setCodeType(t.id as any)}
                                                    className={`px-10 py-5 rounded-2xl text-xs font-black tracking-widest transition-all ${codeType === t.id ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-105' : 'text-muted-foreground hover:text-white'}`}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="w-px h-12 bg-white/10 hidden md:block" />

                                        <button
                                            onClick={handleGenerateCode}
                                            className="w-full md:w-auto px-12 py-6 bg-white text-black font-black rounded-[2rem] hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] flex items-center justify-center gap-4 text-xs uppercase tracking-widest"
                                        >
                                            Generate Essence <Zap className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {generatedCode && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.8, y: 40 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                className="mt-12 p-8 bg-primary/20 border-2 border-primary/40 rounded-[3rem] shadow-2xl flex flex-col items-center gap-8"
                                            >
                                                <div className="text-center">
                                                    <span className="text-[10px] uppercase font-black text-primary tracking-[0.5em] mb-4 block">Cryptographic Key Authorized</span>
                                                    <div className="text-6xl font-black font-mono tracking-[0.4em] text-white bg-black/60 px-12 py-6 rounded-3xl border border-white/10 select-all shadow-inner">
                                                        {generatedCode}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(generatedCode);
                                                        alert("Key captured. Ready for transmission.");
                                                    }}
                                                    className="px-16 py-6 bg-primary text-white font-black rounded-2xl text-sm uppercase tracking-[0.2em] hover:bg-primary/80 transition-all shadow-xl shadow-primary/40 active:scale-95"
                                                >
                                                    Secure Copy
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Inventory */}
                            <div className="bg-secondary/10 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
                                <div className="px-10 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                    <h4 className="font-black text-xs uppercase tracking-[0.3em] text-muted-foreground">Essence Log</h4>
                                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{getAllAccessCodes().length} Entries Recorded</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-white/5">
                                                <th className="px-10 py-6">Unique identifier</th>
                                                <th className="px-10 py-6">Potency</th>
                                                <th className="px-10 py-6">State</th>
                                                <th className="px-10 py-6">Timelog</th>
                                                <th className="px-10 py-6">Linked Entity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {getAllAccessCodes().slice().reverse().map((c: any) => (
                                                <tr key={c.code} className="group hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-10 py-6 font-mono font-black text-white text-xl tracking-[0.2em]">{c.code}</td>
                                                    <td className="px-10 py-6">
                                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ${c.type === '5mins' ? 'text-amber-400 bg-amber-400/5' : 'text-indigo-400 bg-indigo-400/5'}`}>
                                                            <Zap className="w-3.5 h-3.5" />
                                                            {c.type === '5mins' ? 'Low-Orbit' : 'High-Sync'}
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        {c.isUsed ? (
                                                            <div className="flex items-center gap-2 text-muted-foreground/40 font-black text-[10px] uppercase tracking-widest">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" /> Claimed
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
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {getAllAccessCodes().length === 0 && (
                                        <div className="p-32 text-center">
                                            <Zap className="w-16 h-16 mx-auto mb-6 text-muted-foreground/10" />
                                            <p className="text-muted-foreground/30 font-black uppercase tracking-widest">The factory is silent.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminDashboard;
