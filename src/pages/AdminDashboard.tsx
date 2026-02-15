import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { motion } from 'motion/react';
import { Trash2, UserCheck, UserX, Activity, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const { user, getAllUsers, updateUserStatus, deleteUser, logout } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [usedCodes, setUsedCodes] = useState<any>({});

    useEffect(() => {
        // Security check
        if (!user || user.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        setUsers(getAllUsers());
        setUsedCodes(JSON.parse(localStorage.getItem('used_access_codes') || '{}'));
    }, [user, navigate, getAllUsers]);

    const handleStatusUpdate = (email: string, currentStatus: 'active' | 'inactive') => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const updatedList = updateUserStatus(email, newStatus);
        setUsers(updatedList);
    };

    // New: Toggle Premium Status manually
    const handlePremiumToggle = (email: string, currentIsPaid: boolean) => {
        const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const updatedUsers = storedUsers.map((u: User) => {
            if (u.email === email) {
                return { ...u, isPaid: !currentIsPaid, unlockedBy: !currentIsPaid ? 'admin_grant' : u.unlockedBy };
            }
            return u;
        });
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        setUsers(updatedUsers); // Refresh state
        alert(`User premium status ${!currentIsPaid ? 'granted' : 'revoked'}.`);
    };

    const handleDelete = (email: string) => {
        if (confirm('Are you sure you want to delete this user?')) {
            const updatedList = deleteUser(email);
            setUsers(updatedList);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Admin Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage users, access codes, and monitor activity</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium"
                        >
                            Back to Dashboard
                        </button>
                        <button
                            onClick={logout}
                            className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors text-sm font-medium"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="p-6 rounded-2xl bg-secondary/30 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/20 text-primary">
                                <Activity />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                                <h3 className="text-2xl font-bold">{users.length}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-secondary/30 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-500/20 text-green-400">
                                <UserCheck />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Users</p>
                                <h3 className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-secondary/30 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                                <Activity />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Paid Members</p>
                                <h3 className="text-2xl font-bold">{users.filter(u => u.isPaid).length}</h3>
                            </div>
                        </div>
                    </div>
                    {/* Access Code Stats */}
                    <div className="p-6 rounded-2xl bg-secondary/30 border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-yellow-500/20 text-yellow-400">
                                <Activity />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Codes Used</p>
                                <div className="text-xs space-y-1 mt-1">
                                    <div className="flex justify-between">
                                        <span>AIFNNC9:</span>
                                        <span className={usedCodes['AIFNNC9'] ? "text-red-400" : "text-green-400"}>{usedCodes['AIFNNC9'] ? 'Used' : 'Avail'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>MASTER:</span>
                                        <span className={usedCodes['MASTER'] ? "text-red-400" : "text-green-400"}>{usedCodes['MASTER'] ? 'Used' : 'Avail'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Table */}
                <div className="bg-secondary/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="p-6 border-b border-white/5 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-primary/50 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-muted-foreground text-sm font-medium">
                                <tr>
                                    <th className="p-4 pl-6">User</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Membership</th>
                                    <th className="p-4">Unlocked By</th>
                                    <th className="p-4 text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((u) => (
                                    <motion.tr
                                        key={u.email}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-4 pl-6">
                                            <div>
                                                <p className="font-medium text-white">{u.name}</p>
                                                <p className="text-xs text-muted-foreground">{u.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${u.isPaid ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                {u.isPaid ? 'Premium' : 'Free'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs text-muted-foreground">
                                            {u.unlockedBy || '-'}
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            {u.role !== 'admin' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Premium Toggle */}
                                                    <button
                                                        onClick={() => handlePremiumToggle(u.email, !!u.isPaid)}
                                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${u.isPaid ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}
                                                    >
                                                        {u.isPaid ? 'Revoke' : 'Grant'}
                                                    </button>

                                                    <button
                                                        onClick={() => handleDelete(u.email)}
                                                        className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground">
                            No users found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
