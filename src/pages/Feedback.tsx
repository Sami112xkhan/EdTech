import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTheme } from '../context/ThemeContext';
import { MessageSquarePlus, Send, CheckCircle2, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

const Feedback: React.FC = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    const { addFeedback, feedback } = useFeedback();
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const userFeedback = feedback.filter(f => f.userId === user?.id);

    const handleSubmit = (e: React.FormEvent) => {
        // ... (existing submit logic)
        e.preventDefault();
        if (!content.trim()) return;

        if (!user) {
            setStatus('error');
            return;
        }

        try {
            addFeedback(user.username, user.name, content);
            setStatus('success');
            setContent('');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            setStatus('error');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-12 mb-20">
            <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary">
                    <MessageSquarePlus className="w-8 h-8" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] font-sans">User Voice Program</span>
                </div>
                <h1 className={`text-2xl md:text-4xl font-black tracking-tight ${isRich ? 'text-gray-900' : 'text-white'}`}>Help Us Build the Future</h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                    Your suggestions directly influence our roadmap. Tell us what you want to see next.
                </p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-8 rounded-[2.5rem] relative overflow-hidden ${isRich ? 'bg-white border border-black/[0.06]' : 'bg-secondary/10 border border-white/5 backdrop-blur-xl'}`}
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />

                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    <div className="space-y-3">
                        <label htmlFor="feedback" className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            Proposal Description
                        </label>
                        <textarea
                            id="feedback"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="I would love to see a module on..."
                            className={`w-full min-h-[160px] p-6 rounded-[2rem] border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none text-base placeholder:text-zinc-700 font-medium ${isRich ? 'bg-gray-50 border-black/[0.06] text-gray-900' : 'bg-black/40 border-white/10 text-white'}`}
                            required
                        />
                    </div>

                    <div className={`flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t ${isRich ? 'border-black/[0.06]' : 'border-white/5'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${isRich ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#2997ff]/20 text-white border border-white/10'}`}>
                                {user?.name.charAt(0)}
                            </div>
                            <div className="text-xs">
                                <span className="text-zinc-500 font-bold block uppercase tracking-tighter">Authenticated as</span>
                                <span className={`font-black ${isRich ? 'text-gray-900' : 'text-white'}`}>{user?.name}</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!content.trim() || status === 'success'}
                            className={`w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${status === 'success'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/20 cursor-default'
                                : 'bg-white text-black hover:scale-105 active:scale-95 shadow-xl shadow-white/10'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {status === 'success' ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Proposal Sent
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Proposal
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Previous Feedback List */}
            {userFeedback.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Your Submission History</h2>
                    </div>

                    <div className="space-y-4">
                        {userFeedback.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-6 rounded-3xl flex flex-col gap-4 group transition-all ${isRich ? 'bg-gray-50 border border-black/[0.06] hover:bg-gray-100' : 'bg-secondary/5 border border-white/5 hover:bg-white/[0.02]'}`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="space-y-2 w-full">
                                        <p className={`text-sm font-medium transition-colors ${isRich ? 'text-gray-700 group-hover:text-gray-900' : 'text-zinc-300 group-hover:text-white'}`}>
                                            {item.content}
                                        </p>
                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest block">
                                            Submitted {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0">
                                        {item.status === 'implemented' ? (
                                            <div className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                <CheckCircle2 className="w-3 h-3" /> Implemented
                                            </div>
                                        ) : item.status === 'ignored' ? (
                                            <div className="px-3 py-1 bg-zinc-800 text-zinc-500 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                <AlertCircle className="w-3 h-3" /> Reviewed
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                                <Clock className="w-3 h-3" /> Under Review
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {item.reply && (
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 w-full animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                            <span className="text-[10px] uppercase font-black text-primary tracking-[0.2em]">Official Response</span>
                                        </div>
                                        <p className="text-xs text-zinc-400 font-bold leading-relaxed">{item.reply}</p>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default Feedback;
