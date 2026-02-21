
import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types"; // Will create types next
import emailjs from '@emailjs/browser';
import { toast } from "sonner";
import { curriculum } from "../data/curriculum";
import { isPhaseComplete } from "../utils/progress";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (userData: User) => Promise<void>;
    signup: (userData: User) => Promise<void>;
    logout: () => void;
    completePurchase: () => void;
    getAllUsers: () => Promise<any[]>;
    updateUserStatus: (email: string, status: 'active' | 'inactive') => Promise<void>;
    deleteUser: (email: string) => Promise<void>;
    markLessonComplete: (lessonId: string) => void;
    verifyEmail: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
    resendVerificationCode: (email: string) => Promise<void>;
    loginWithGoogle: (credential: string) => Promise<void>;
    // Trial System
    generateAccessCode: (type: '3days' | '5mins') => Promise<string>;
    redeemCode: (code: string) => Promise<{ success: boolean; message: string }>;
    getAllAccessCodes: () => Promise<any[]>;
    revokeAccessCode: (code: string) => Promise<void>;
    addXp: (amount: number) => void;
    updateProfile: (updates: Partial<User>) => Promise<void>;
    // Certificate System
    requestCertificate: () => Promise<void>;
    approveCertificate: (email: string) => Promise<void>;
    rejectCertificate: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return !!localStorage.getItem('user');
    });
    const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('sessionId'));

    useEffect(() => {
        // Validate Session with SQL Backend
        const validateSession = async () => {
            const storedSessionId = localStorage.getItem('sessionId');
            const storedUserStr = localStorage.getItem("user");

            // 1. Bypass for Hardcoded Admin (Client-side persistence)
            if (storedUserStr) {
                const storedUser = JSON.parse(storedUserStr);
                if (storedUser.email === 'admin@devmastery.com') {
                    setUser(storedUser);
                    setIsAuthenticated(true);
                    return; // Skip backend validation for hardcoded admin
                }
            }

            if (storedSessionId) {
                try {
                    const response = await fetch('/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${storedSessionId}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setUser(data.user);
                        setIsAuthenticated(true);
                        localStorage.setItem("user", JSON.stringify(data.user)); // Sync fresh data
                    } else if (response.status === 401 || response.status === 403) {
                        // Session invalid or expired -> Logout
                        console.warn("Session invalid, logging out");
                        localStorage.removeItem("user");
                        localStorage.removeItem("sessionId");
                        setUser(null);
                        setIsAuthenticated(false);
                        setSessionId(null);
                    } else {
                        console.warn("Session validation failed with status:", response.status, "keeping local session");
                    }
                } catch (error) {
                    console.error("Session validation network error", error);
                    // Do not log out on network errors
                }
            } else if (!storedUserStr) {
                // No session and no local user, ensure logout state
                setUser(null);
                setIsAuthenticated(false);
            }
        };

        validateSession();

        const storedUser = localStorage.getItem("user");
    }, []);

    // Periodic check for trial expiry (every 10 seconds)
    useEffect(() => {
        if (!user) return;

        // Heartbeat for lastSeen (every 1 minute)
        const heartbeatInterval = setInterval(async () => {
            const now = new Date().toISOString();
            const updatedUser = { ...user, lastSeen: now };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            // Sync with SQL Backend
            const storedSessionId = localStorage.getItem('sessionId');
            if (storedSessionId) {
                try {
                    await fetch('/api/auth/heartbeat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId: storedSessionId }),
                    });
                } catch (e) {
                    console.warn("Heartbeat sync failed", e);
                }
            }
        }, 5000);

        if (user.isPaid || !user.trialExpiresAt || user.trialExpiresAt === 'EXPIRED') {
            return () => clearInterval(heartbeatInterval);
        }

        const interval = setInterval(() => {
            const now = new Date();
            const expiry = new Date(user.trialExpiresAt!);
            if (now > expiry) {
                const expiredUser = { ...user, trialExpiresAt: 'EXPIRED' };
                setUser(expiredUser);
                localStorage.setItem("user", JSON.stringify(expiredUser));

                clearInterval(interval);
            }
        }, 10000);

        // Heartbeat for SQL Backend Session
        const sqlHeartbeatInterval = setInterval(async () => {
            if (sessionId) {
                try {
                    await fetch('/api/auth/heartbeat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId }),
                    });
                } catch (e) {
                    console.error("SQL heartbeat failed", e);
                }
            }
        }, 5000); // Every 5 seconds

        return () => {
            clearInterval(interval);
            clearInterval(heartbeatInterval);
            clearInterval(sqlHeartbeatInterval);
        };
    }, [user]);

    // Initialize databases if empty
    useEffect(() => {
        const storedCodes = localStorage.getItem("codes_db");
        if (!storedCodes) {
            localStorage.setItem("codes_db", JSON.stringify([]));
        }
    }, []);

    const generateAccessCode = async (type: '3days' | '5mins'): Promise<string> => {
        try {
            const response = await fetch('/api/admin/codes/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });
            if (response.ok) {
                const newCode = await response.json();
                return newCode.code;
            }
            return '';
        } catch (error) {
            console.error('Failed to generate code:', error);
            return '';
        }
    };

    const redeemCode = async (code: string): Promise<{ success: boolean; message: string }> => {
        if (!user) return { success: false, message: "Please login first" };

        const normalizedCode = code.toUpperCase().trim();

        // Admin-generated codes — check via API
        try {
            const response = await fetch('/api/codes/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: normalizedCode, email: user.email }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                // Update local user state with new tier
                const updatedUser = {
                    ...user,
                    trialExpiresAt: data.trialExpiresAt,
                    isPaid: data.isPaid !== undefined ? data.isPaid : user.isPaid
                };
                setUser(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));

                return { success: true, message: data.message };
            }
            return { success: false, message: data.error || "Invalid, used, or revoked code" };
        } catch (error) {
            console.error('Code redeem failed:', error);
            return { success: false, message: "Failed to redeem code" };
        }
    };

    const getAllAccessCodes = async (): Promise<any[]> => {
        try {
            const response = await fetch('/api/admin/codes');
            if (response.ok) return await response.json();
            return [];
        } catch (error) {
            console.error('Failed to fetch codes:', error);
            return [];
        }
    };

    const revokeAccessCode = async (code: string): Promise<void> => {
        try {
            await fetch(`/api/admin/codes/${code}/revoke`, { method: 'POST' });
        } catch (error) {
            console.error('Failed to revoke code:', error);
        }
    };

    const login = async (userData: User) => {
        // Admin Check (Keep hardcoded for safety)
        if (userData.username === 'admin' && (userData as any).password === 'admin@12345') {
            const adminUser: User = {
                id: 'admin-id',
                name: 'Administrator',
                username: 'admin',
                email: 'admin@devmastery.com',
                isPaid: true,
                role: 'admin',
                status: 'active',
                isVerified: true,
                lastLogin: new Date().toISOString(),
                completedLessons: []
            };
            setUser(adminUser);
            setIsAuthenticated(true);
            localStorage.setItem("user", JSON.stringify(adminUser));
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userData.email, password: userData.password }),
            });
            const data = await response.json();

            if (response.ok) {
                setUser(data.user);
                setIsAuthenticated(true);
                setSessionId(data.sessionId);
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("sessionId", data.sessionId);
                toast.success(`Welcome back, ${data.user.name}!`);
            } else {
                toast.error(data.error || "Login failed");
            }
        } catch (error) {
            console.error("Login failed:", error);
            toast.error("Login failed. Please check your connection.");
        }
    };

    const loginWithGoogle = async (credential: string) => {
        try {
            // 1. Decode JWT safely
            let payload: any;
            try {
                const base64Url = credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                payload = JSON.parse(jsonPayload);
            } catch (decodeError) {
                console.error("JWT Decode Error:", decodeError);
                throw new Error("Invalid login token. Please try again or use another method.");
            }

            const { email, name, picture } = payload;

            // Set local state immediately for instant login (temp state until synced)
            const tempUser: User = {
                id: 'google-sync-id',
                name: name || 'Learner',
                username: email.split('@')[0],
                email: email,
                isPaid: false,
                role: 'user',
                status: 'active',
                isVerified: true,
                lastLogin: new Date().toISOString(),
                completedLessons: [],
                photoURL: picture,
                streak: 1,
                xp: 50,
                level: 1
            };
            setUser(tempUser);
            setIsAuthenticated(true);
            localStorage.setItem("user", JSON.stringify(tempUser));

            // 2. Sync with Analytics Backend (Crucial for Roles and Purchase Status)
            try {
                const response = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ credential }),
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.sessionId) {
                        setSessionId(data.sessionId);
                        localStorage.setItem('sessionId', data.sessionId);
                    }

                    // Priority: If backend has detailed user data, update local state
                    if (data.user) {
                        const finalUser = data.user;
                        setUser(finalUser);
                        localStorage.setItem('user', JSON.stringify(finalUser));
                    }
                } else {
                    console.warn("Backend sync returned status:", response.status);
                }
            } catch (syncError) {
                console.warn("Failed to sync with SQL backend - continuing in temp mode.", syncError);
            }

        } catch (error: any) {
            console.error("Critical Google Login Error:", error);
            alert(`Google Login Failure: ${error.message || 'Unknown Error'}`);
        }
    };

    const signup = async (userData: User) => {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userData.email,
                    password: userData.password,
                    name: userData.name
                }),
            });
            const data = await response.json();

            if (response.ok) {
                // Send Verification Email via EmailJS
                const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
                const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
                const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

                if (serviceId && templateId && publicKey) {
                    emailjs.send(serviceId, templateId, {
                        to_email: userData.email,
                        to_name: userData.name,
                        email: userData.email,
                        passcode: data.verificationCode,
                        time: new Date(Date.now() + 15 * 60000).toLocaleTimeString(),
                        verify_url: `${window.location.origin}/verify?email=${encodeURIComponent(userData.email)}&code=${data.verificationCode}`
                    }, publicKey).catch(err => console.error("EmailJS Failed", err));
                } else {
                    alert(`[DEV MODE] Verification Code: ${data.verificationCode}`);
                }
            } else {
                toast.error(data.error || "Signup failed");
                throw new Error(data.error);
            }
        } catch (error: any) {
            console.error("Signup error:", error);
            throw error;
        }
    };

    const verifyEmail = async (email: string, code: string) => {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });
            const data = await response.json();

            if (response.ok && data.success) {
                setUser(data.user);
                setIsAuthenticated(true);
                setSessionId(data.sessionId);
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("sessionId", data.sessionId);
                return { success: true, message: "Email verified successfully!" };
            } else {
                return { success: false, message: data.error || "Verification failed" };
            }
        } catch (error) {
            return { success: false, message: "Connection error" };
        }
    };

    const resendVerificationCode = async (email: string) => {
        try {
            const response = await fetch('/api/auth/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();

            if (response.ok) {
                const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
                const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
                const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

                if (serviceId && templateId && publicKey) {
                    await emailjs.send(serviceId, templateId, {
                        to_email: email,
                        email: email,
                        passcode: data.verificationCode,
                        time: new Date(Date.now() + 15 * 60000).toLocaleTimeString(),
                        verify_url: `${window.location.origin}/verify?email=${encodeURIComponent(email)}&code=${data.verificationCode}`
                    }, publicKey);
                    toast.success("New verification code sent!");
                } else {
                    alert(`[DEV] New Code: ${data.verificationCode}`);
                }
            } else {
                toast.error(data.error || "Failed to resend");
            }
        } catch (error) {
            toast.error("Failed to resend code");
        }
    };

    const logout = async () => {
        if (sessionId) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                });
            } catch (e) {
                console.error("Backend logout failed", e);
            }
        }
        setUser(null);
        setIsAuthenticated(false);
        setSessionId(null);
        localStorage.removeItem("user");
        localStorage.removeItem("sessionId");
    };

    const completePurchase = async () => {
        if (user) {
            const updatedUser = { ...user, isPaid: true };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser)); // Update session

            // Sync Purchase to SQL
            try {
                await fetch('/api/auth/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email }),
                });
            } catch (e) {
                console.warn("Failed to sync purchase to SQL backend", e);
            }
        }
    };

    const getAllUsers = async (): Promise<any[]> => {
        try {
            const response = await fetch('/api/admin/users');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to fetch users from API', error);
        }
        return [];
    };

    const updateUserStatus = async (email: string, newStatus: 'active' | 'inactive'): Promise<void> => {
        try {
            await fetch(`/api/admin/users/${encodeURIComponent(email)}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (error) {
            console.error('Failed to update user status via API', error);
        }
    };

    const deleteUser = async (email: string): Promise<void> => {
        try {
            await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
                method: 'DELETE',
            });
        } catch (error) {
            console.error('Failed to delete user via API', error);
        }
    };

    const markLessonComplete = async (lessonId: string) => {
        if (!user) return;

        // 1. Sync with SQL Backend First (Strict Mode)
        try {
            const response = await fetch('/api/progress/lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, lessonId })
            });
            const data = await response.json();

            if (!response.ok) {
                toast.error("Failed to sync progress. Please check connection.");
                return;
            }

            if (data.message === "Already completed") {
                toast.info("Lesson already marked as complete!");
                return;
            }

            // 2. Update Local State with Server Response
            setUser(prev => {
                if (!prev) return prev;

                // Use server's lesson list if available, or append locally
                const updatedLessons = data.lessons || [...prev.completedLessons, lessonId];
                const updatedUser = { ...prev, completedLessons: updatedLessons };

                // Update Local Storage
                localStorage.setItem("user", JSON.stringify(updatedUser));

                // Visual Feedback
                toast.success("Lesson Completed! 🔥", {
                    description: "Progress synced to cloud."
                });

                // Check for Module Unlock
                curriculum.forEach((module, index) => {
                    const nextModule = curriculum[index + 1];
                    if (nextModule && isPhaseComplete(module, updatedLessons)) {
                        if (!isPhaseComplete(module, prev.completedLessons)) {
                            toast.success(`Module Unlocked: ${nextModule.title} 🔓`, {
                                description: "New lessons and materials are now available.",
                                duration: 5000
                            });
                        }
                    }
                });

                return updatedUser;
            });

        } catch (error) {
            console.error("Failed to sync lesson completion", error);
            toast.error("Network error. Progress not saved.");
        }
    };



    const addXp = async (amount: number) => {
        if (!user) return;

        let finalUpdates: Partial<User> = {};

        setUser(prev => {
            if (!prev) return prev;

            const newXp = (prev.xp || 0) + amount;
            const newLevel = Math.floor(newXp / 100) + 1;

            if (newLevel > (prev.level || 1)) {
                toast.success(`LEVEL UP! You are now Level ${newLevel} 🚀`, {
                    description: "Keep going to unlock new perks!",
                    duration: 5000
                });
            } else {
                toast.success(`+${amount} XP Gained! ⚡️`);
            }

            const updatedUser = { ...prev, xp: newXp, level: newLevel };
            finalUpdates = { xp: newXp, level: newLevel };

            // Update Local
            localStorage.setItem("user", JSON.stringify(updatedUser));

            return updatedUser;
        });

        // Sync with Backend
        if (finalUpdates.xp !== undefined) {
            await updateProfile(finalUpdates);
        }
    };

    const updateProfile = async (updates: Partial<User>) => {
        if (!user) return;

        setUser(prev => {
            if (!prev) return prev;
            const updatedUser = { ...prev, ...updates };

            // Update Local
            localStorage.setItem("user", JSON.stringify(updatedUser));

            return updatedUser;
        });

        // Sync with SQL Backend
        try {
            await fetch('/api/auth/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    ...updates
                })
            });
        } catch (error) {
            console.warn("Failed to sync profile update to SQL backend", error);
        }
    };

    const requestCertificate = async () => {
        if (!user) return;

        const updatedUser = { ...user, certificateStatus: 'pending' as const };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Sync with API
        try {
            await fetch('/api/certificate/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }),
            });
        } catch (error) {
            console.warn('Failed to sync certificate request to API', error);
        }

        alert("Certificate requested! Please wait for admin approval.");
    };

    const approveCertificate = async (email: string) => {
        // Sync with API
        try {
            await fetch(`/api/admin/certificate/${encodeURIComponent(email)}/approve`, {
                method: 'POST',
            });
        } catch (error) {
            console.warn('Failed to sync certificate approval to API', error);
        }

        if (user && user.email === email) {
            const updatedUser = { ...user, certificateStatus: 'approved' as const, certificateIssueDate: new Date().toISOString() };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        }
    };

    const rejectCertificate = async (email: string) => {
        // Sync with API
        try {
            await fetch(`/api/admin/certificate/${encodeURIComponent(email)}/reject`, {
                method: 'POST',
            });
        } catch (error) {
            console.error('Failed to sync certificate rejection to API', error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            login,
            signup,
            logout,
            completePurchase,
            getAllUsers,
            updateUserStatus,
            deleteUser,
            markLessonComplete,
            verifyEmail,
            resendVerificationCode,
            generateAccessCode,
            redeemCode,
            getAllAccessCodes,
            revokeAccessCode,
            loginWithGoogle,
            addXp,
            updateProfile,
            // Certificate System
            requestCertificate,
            approveCertificate,
            rejectCertificate
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
