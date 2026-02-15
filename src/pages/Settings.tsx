
import React from 'react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import { CreditCard, Save } from 'lucide-react';

const Settings: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Account Settings</h1>
                <p className="text-muted-foreground">Manage your profile and subscription.</p>
            </div>

            {/* Profile Form */}
            <div className="bg-secondary/30 border border-white/5 rounded-xl p-6 space-y-6">
                <h2 className="text-xl font-semibold">Profile Information</h2>
                <div className="grid gap-4">
                    <Input label="Full Name" defaultValue={user?.name} />
                    <Input label="Username" defaultValue={user?.username} />
                    <Input label="Email" defaultValue={user?.email} disabled className="opacity-50 cursor-not-allowed" />
                </div>
                <div className="flex justify-end">
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
                        <p className="text-sm text-green-400 font-medium">Active • Paid via Gumroad</p>
                    </div>
                </div>
                <div className="text-2xl font-bold">₹10,000</div>
            </div>
        </div>
    );
};

export default Settings;
