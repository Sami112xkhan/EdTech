import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Send, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { useNavigate } from 'react-router-dom';

const Suspended: React.FC = () => {
    const { user, logout } = useAuth();
    const { addFeedback } = useFeedback();
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (user && message.trim()) {
            addFeedback(user.email, user.name, message, 'access_request');
            setSubmitted(true);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-black to-black" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 max-w-lg w-full bg-zinc-900/50 border border-red-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-3 uppercase tracking-tight">Access Suspended</h1>
                    <p className="text-zinc-400">Your account has been temporarily restricted by the administration. Access to course materials is currently blocked.</p>
                </div>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Appeal Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Please explain why your access should be restored..."
                                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-white text-black font-black rounded-xl uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 group"
                        >
                            Submit Appeal <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 bg-green-500/5 rounded-2xl border border-green-500/20"
                    >
                        <p className="text-green-400 font-bold mb-2">Request Submitted</p>
                        <p className="text-zinc-500 text-sm">The administration has been notified. You will be contacted via email once your status is reviewed.</p>
                    </motion.div>
                )}

                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        className="text-xs font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Lock className="w-3 h-3" /> Sign Out
                    </button>
                    <a href="mailto:admin@devmastery.com" className="text-xs font-bold text-zinc-500 hover:text-white transition-colors">
                        Contact Support
                    </a>
                </div>
            </motion.div>
        </div>
    );
};

export default Suspended;
