
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import { CreditCard, Save } from 'lucide-react';

const Settings: React.FC = () => {
    const { user, deleteUser, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Account Settings</h1>
                <p className="text-muted-foreground">Manage your profile and subscription.</p>
            </div>

            {/* Profile Form */}
            <div className="bg-secondary/30 border border-white/5 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Profile Information</h2>
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

                <div className="grid gap-4">
                    <Input label="Full Name" defaultValue={user?.name} />
                    <Input label="Username" defaultValue={user?.username} />
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
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary rounded-lg text-white text-sm font-medium hover:bg-primary/90 transition-colors">
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-secondary/30 border border-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Lifetime Access</h3>
                        <p className="text-sm text-green-400 font-medium">Active • Paid via Razorpay</p>
                    </div>
                </div>
                <div className="text-2xl font-bold">₹10,000</div>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-500/10 rounded-xl p-6 space-y-4 bg-red-500/5">
                <h3 className="text-xl font-bold text-red-400">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back. Please be certain.</p>
                <button
                    onClick={() => {
                        if (confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) {
                            if (user?.email) {
                                deleteUser(user.email);
                                logout();
                                navigate('/');
                            }
                        }
                    }}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-bold transition-colors"
                >
                    Delete Account
                </button>
            </div>
        </div>
    );
};

export default Settings;
