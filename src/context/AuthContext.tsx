
import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types"; // Will create types next
import emailjs from '@emailjs/browser';
import { toast } from "sonner";
import { curriculum } from "../data/curriculum";
import { isPhaseComplete } from "../utils/progress";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (userData: User) => void;
    signup: (userData: User) => void;
    logout: () => void;
    completePurchase: () => void;
    getAllUsers: () => Promise<any[]>;
    updateUserStatus: (email: string, status: 'active' | 'inactive') => Promise<void>;
    deleteUser: (email: string) => Promise<void>;
    markLessonComplete: (lessonId: string) => void;
    verifyEmail: (email: string, code: string) => { success: boolean; message: string };
    resendVerificationCode: (email: string) => void;
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
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsAuthenticated(true);

            // Check trial expiry on load
            if (parsedUser.trialExpiresAt && !parsedUser.isPaid) {
                const now = new Date();
                const expiry = new Date(parsedUser.trialExpiresAt);
                if (now > expiry) {
                    const expiredUser = { ...parsedUser, trialExpiresAt: 'EXPIRED' };
                    setUser(expiredUser);
                    localStorage.setItem("user", JSON.stringify(expiredUser));

                    // Update DB as well
                    const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
                    const updatedDb = usersDb.map((u: User) => u.email === parsedUser.email ? expiredUser : u);
                    localStorage.setItem("users_db", JSON.stringify(updatedDb));
                }
            }
        }
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

            // Local DB fallback
            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedDb = usersDb.map((u: User) => u.email === user.email ? { ...u, lastSeen: now } : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));
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

                const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
                const updatedDb = usersDb.map((u: User) => u.email === user.email ? expiredUser : u);
                localStorage.setItem("users_db", JSON.stringify(updatedDb));

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
        const storedUsers = localStorage.getItem("users_db");
        if (!storedUsers) {
            localStorage.setItem("users_db", JSON.stringify([]));
        }

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

        // 1. Static Lifetime Code
        if (normalizedCode === 'LIFETIME100') {
            const updatedUser = { ...user, isPaid: true, trialExpiresAt: undefined }; // Clear trial if any
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedUserDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedUserDb));

            return { success: true, message: "Lifetime Access Granted! Welcome to the family." };
        }

        // 2. Static Trial Code
        if (normalizedCode === 'TRIAL5') {
            // Check if specifically this code was used
            if (user.usedCodes?.includes('TRIAL5')) {
                return { success: false, message: "This trial code has already been used." };
            }

            // Legacy check: If trial expired and no usedCodes tracked yet, assume TRIAL5 was the one used
            if (user.trialExpiresAt === 'EXPIRED' && (!user.usedCodes || user.usedCodes.length === 0)) {
                return { success: false, message: "Trial already used and expired." };
            }

            if (user.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED') {
                return { success: false, message: "Trial already active." };
            }

            const now = new Date();
            const duration = 5 * 60 * 1000; // 5 minutes
            const trialExpiresAt = new Date(now.getTime() + duration).toISOString();

            const updatedUser = {
                ...user,
                trialExpiresAt,
                usedCodes: [...(user.usedCodes || []), 'TRIAL5']
            };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedUserDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedUserDb));

            return { success: true, message: "5-Minute Trial Activated! Timer started." };
        }

        // 3. Static Trial Code (3 Minutes)
        if (normalizedCode === 'TRIAL3') {
            if (user.usedCodes?.includes('TRIAL3')) {
                return { success: false, message: "This trial code has already been used." };
            }

            if (user.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED') {
                return { success: false, message: "Trial already active." };
            }

            const now = new Date();
            const duration = 3 * 60 * 1000; // 3 minutes
            const trialExpiresAt = new Date(now.getTime() + duration).toISOString();

            const updatedUser = {
                ...user,
                trialExpiresAt,
                usedCodes: [...(user.usedCodes || []), 'TRIAL3']
            };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedUserDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedUserDb));

            return { success: true, message: "3-Minute Trial Activated! Timer started." };
        }

        // 4. Admin-generated codes — check via API
        try {
            const response = await fetch('/api/codes/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: normalizedCode, email: user.email }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                // Update local user state with trial expiry
                const updatedUser = { ...user, trialExpiresAt: data.trialExpiresAt };
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

    const login = (userData: User) => {
        // Admin Check
        if (userData.username === 'admin' && (userData as any).password === 'admin@12345') {
            const adminUser: User = {
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

        // Regular User Logic
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const existingUser = usersDb.find((u: User) => u.email === userData.email || u.username === userData.username);

        if (existingUser) {
            if (existingUser.status === 'inactive') {
                alert("Account is inactive. Contact admin.");
                return;
            }

            // Check verification status
            if (existingUser.isVerified === false) {
                // If not verified, generate new code and alert
                const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                const updatedUser = { ...existingUser, verificationCode: newCode };
                const updatedDb = usersDb.map((u: User) => u.email === existingUser.email ? updatedUser : u);
                localStorage.setItem("users_db", JSON.stringify(updatedDb));

                alert(`Account not verified! A new verification code has been sent to your email (Mock): ${newCode}`);

                // We should redirect to verify page, but we can't easily do that from here without navigate
                // For now, we'll throw an error that the UI can catch to redirect
                throw new Error("NOT_VERIFIED:" + existingUser.email);
            }

            // Gamification Logic
            const today = new Date().toISOString().split('T')[0];
            const lastLoginDate = existingUser.lastLoginDate;
            let newStreak = existingUser.streak || 0;
            let newXp = existingUser.xp || 0;
            let streakMessage = '';

            if (lastLoginDate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (lastLoginDate === yesterdayStr) {
                    newStreak++;
                    newXp += 50; // Daily bonus
                    streakMessage = `Daily Streak: ${newStreak} 🔥 (+50 XP)`;
                } else {
                    newStreak = 1; // Reset or start
                    newXp += 50; // First login bonus
                    streakMessage = `Streak Started! 🔥 (+50 XP)`;
                }
            }

            // Calculate Level
            const newLevel = Math.floor(newXp / 100) + 1;

            // Update last login and gamification stats
            const updatedUser: User = {
                ...existingUser,
                lastLogin: new Date().toISOString(),
                lastLoginDate: today,
                streak: newStreak,
                xp: newXp,
                level: newLevel
            };

            const updatedDb = usersDb.map((u: User) => u.email === existingUser.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));

            setUser(updatedUser);
            setIsAuthenticated(true);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            if (streakMessage) alert(streakMessage);
        } else {
            alert("User not found. Please sign up.");
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
            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const existingUser = usersDb.find((u: User) => u.email === email);
            const today = new Date().toISOString().split('T')[0];

            let activeUser: User;

            if (existingUser) {
                // Login existing user - CAUTION: Sync name/picture from Google to avoid "maaz" vs "Sami" conflict
                let newStreak = existingUser.streak || 0;
                let newXp = existingUser.xp || 0;
                let streakMessage = '';

                if (existingUser.lastLoginDate !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (existingUser.lastLoginDate === yesterdayStr) {
                        newStreak++;
                        newXp += 50;
                        streakMessage = `Daily Streak: ${newStreak} 🔥 (+50 XP)`;
                    } else {
                        newStreak = 1;
                        newXp += 50;
                        streakMessage = `Streak Started! 🔥 (+50 XP)`;
                    }
                }
                const newLevel = Math.floor(newXp / 100) + 1;

                activeUser = {
                    ...existingUser,
                    name: name || existingUser.name, // Priority: Google Identity
                    photoURL: picture || existingUser.photoURL,
                    lastLogin: new Date().toISOString(),
                    isVerified: true,
                    lastLoginDate: today,
                    streak: newStreak,
                    xp: newXp,
                    level: newLevel
                };
                const updatedDb = usersDb.map((u: User) => u.email === email ? activeUser : u);
                localStorage.setItem("users_db", JSON.stringify(updatedDb));
                if (streakMessage) alert(streakMessage);
            } else {
                // Auto-Signup new user
                activeUser = {
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
                    lastLoginDate: today,
                    xp: 50,
                    level: 1
                };
                localStorage.setItem("users_db", JSON.stringify([...usersDb, activeUser]));
                alert("Welcome! You earned 50 XP for joining! 🔥");
            }

            // Set local state immediately for instant login
            setUser(activeUser);
            setIsAuthenticated(true);
            localStorage.setItem("user", JSON.stringify(activeUser));

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
                        const backendUser = data.user;

                        setUser(prev => {
                            if (!prev) return backendUser;

                            // Merge completed lessons to avoid progress loss
                            const mergedLessons = Array.from(new Set([
                                ...(backendUser.completedLessons || []),
                                ...(prev.completedLessons || [])
                            ]));

                            const finalUser: User = {
                                ...prev,
                                role: backendUser.role || prev.role,
                                isPaid: backendUser.isPaid !== undefined ? backendUser.isPaid : prev.isPaid,
                                status: backendUser.status || prev.status,
                                name: backendUser.name || prev.name,
                                photoURL: backendUser.picture || prev.photoURL,
                                username: backendUser.username || prev.username,
                                streak: backendUser.streak !== undefined ? backendUser.streak : prev.streak,
                                xp: backendUser.xp !== undefined ? backendUser.xp : prev.xp,
                                level: backendUser.level !== undefined ? backendUser.level : prev.level,
                                completedLessons: mergedLessons
                            };

                            localStorage.setItem('user', JSON.stringify(finalUser));

                            // Sync back to users_db for consistency
                            const currentDb = JSON.parse(localStorage.getItem("users_db") || '[]');
                            const updatedDb = currentDb.map((u: User) => u.email === email ? finalUser : u);
                            localStorage.setItem("users_db", JSON.stringify(updatedDb));

                            return finalUser;
                        });
                    }
                } else {
                    console.warn("Backend sync returned status:", response.status);
                }
            } catch (syncError) {
                console.warn("Failed to sync with SQL backend - continuing in local mode.", syncError);
            }

        } catch (error: any) {
            console.error("Critical Google Login Error:", error);
            alert(`Google Login Failure: ${error.message || 'Unknown Error'}`);
        }
    };

    const signup = async (userData: User) => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');

        // Check if user already exists
        if (usersDb.some((u: User) => u.email === userData.email)) {
            alert("User already exists with this email.");
            return;
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser: User = {
            ...userData,
            isPaid: false,
            role: 'user',
            status: 'active',
            isVerified: false,
            verificationCode: code,
            lastLogin: new Date().toISOString(),
            completedLessons: [], // Initialize empty
            // Gamification Init
            streak: 0,
            xp: 0,
            level: 1,
            lastLoginDate: '' // Not logged in yet
        };

        const newDb = [...usersDb, newUser];

        localStorage.setItem("users_db", JSON.stringify(newDb));

        // Real Email Sending via EmailJS
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        console.log("Attempting to send verification email:", {
            to: userData.email,
            serviceId: serviceId ? 'Present' : 'Missing',
            templateId: templateId ? 'Present' : 'Missing',
            publicKey: publicKey ? 'Present' : 'Missing'
        });

        if (serviceId && templateId && publicKey) {
            try {
                const response = await emailjs.send(serviceId, templateId, {
                    to_email: userData.email,
                    to_name: userData.name,
                    email: userData.email,
                    passcode: code, // Matches user's template {{passcode}}
                    time: new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Matches {{time}}
                    verify_url: `${window.location.origin}/verify?email=${encodeURIComponent(userData.email)}&code=${code}`
                }, publicKey);

                console.log('EMAILJS SUCCESS!', response.status, response.text);
            } catch (error) {
                console.error('EMAILJS FAILED...', error);
                alert('Failed to send verification email. Please check your internet connection or try again later.');
                // throw error; // Optional: propagate error to caller
            }
        } else {
            // Fallback for dev without keys
            console.warn("EmailJS keys missing in .env");
            alert(`[DEV MODE] Verification code: ${code}`);
        }

        // DO NOT LOGIN YET
        // Redirect logic will be handled in Signup.tsx
    };

    const verifyEmail = (email: string, code: string) => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const userIndex = usersDb.findIndex((u: User) => u.email === email);

        if (userIndex === -1) {
            return { success: false, message: "User not found" };
        }

        const user = usersDb[userIndex];

        if (user.isVerified) {
            return { success: true, message: "Already verified" };
        }

        if (user.verificationCode === code) {
            // Success!
            const updatedUser = { ...user, isVerified: true, verificationCode: undefined };
            usersDb[userIndex] = updatedUser;
            localStorage.setItem("users_db", JSON.stringify(usersDb));

            // Log them in
            setUser(updatedUser);
            setIsAuthenticated(true);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            return { success: true, message: "Email verified successfully!" };
        } else {
            return { success: false, message: "Invalid verification code" };
        }
    };

    const resendVerificationCode = async (email: string) => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const userIndex = usersDb.findIndex((u: User) => u.email === email);
        if (userIndex === -1) return;

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const updatedUser = { ...usersDb[userIndex], verificationCode: newCode };
        usersDb[userIndex] = updatedUser;
        localStorage.setItem("users_db", JSON.stringify(usersDb));

        // Real Email Sending via EmailJS
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (serviceId && templateId && publicKey) {
            try {
                await emailjs.send(serviceId, templateId, {
                    to_email: email,
                    email: email,
                    passcode: newCode, // Matches user's template {{passcode}}
                    time: new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Matches {{time}}
                    verify_url: `${window.location.origin}/verify?email=${encodeURIComponent(email)}&code=${newCode}`
                }, publicKey);

                console.log('RESEND SUCCESS!');
                alert(`New verification code sent to ${email}`);
            } catch (error) {
                console.error('RESEND FAILED...', error);
                alert('Failed to send verification email. Please try again.');
            }
        } else {
            console.warn("EmailJS keys missing in .env");
            alert(`[DEV MODE] New verification code: ${newCode}`);
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

            // Update DB
            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));

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
            console.warn('Failed to fetch users from API, falling back to localStorage', error);
        }
        // Fallback to localStorage
        return JSON.parse(localStorage.getItem("users_db") || '[]');
    };

    const updateUserStatus = async (email: string, newStatus: 'active' | 'inactive'): Promise<void> => {
        try {
            await fetch(`/api/admin/users/${encodeURIComponent(email)}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (error) {
            console.warn('Failed to update user status via API', error);
        }
        // Also update localStorage for consistency
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => u.email === email ? { ...u, status: newStatus } : u);
        localStorage.setItem("users_db", JSON.stringify(updatedDb));
    };

    const deleteUser = async (email: string): Promise<void> => {
        try {
            await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
                method: 'DELETE',
            });
        } catch (error) {
            console.warn('Failed to delete user via API', error);
        }
        // Also update localStorage
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.filter((u: User) => u.email !== email);
        localStorage.setItem("users_db", JSON.stringify(updatedDb));
    };

    const markLessonComplete = async (lessonId: string) => {
        if (!user) return;

        let wasAlreadyComplete = false;
        setUser(prev => {
            if (!prev) return prev;
            if (prev.completedLessons.includes(lessonId)) {
                wasAlreadyComplete = true;
                return prev;
            }

            const updatedLessons = [...prev.completedLessons, lessonId];
            const updatedUser = { ...prev, completedLessons: updatedLessons };

            // Update Local Storage & DB
            localStorage.setItem("user", JSON.stringify(updatedUser));
            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedDb = usersDb.map((u: User) => u.email === prev.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));

            // Visual Feedback
            toast.success("Lesson Completed! 🔥", {
                description: "Your progress has been saved to the cloud."
            });

            // Check if any phases were just completed to show unlock message
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

        if (wasAlreadyComplete) {
            toast.info("Lesson already marked as complete!");
            return;
        }

        // Sync with SQL Backend
        try {
            await fetch('/api/progress/lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, lessonId })
            });
        } catch (error) {
            console.warn("Failed to sync lesson completion to SQL backend", error);
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
            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedDb = usersDb.map((u: User) => u.email === prev.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));

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
            const currentDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedDb = currentDb.map((u: User) => u.email === prev.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));

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

        // Also update localStorage DB
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
        localStorage.setItem("users_db", JSON.stringify(updatedDb));

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

        // Also update localStorage
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => {
            if (u.email === email) {
                return { ...u, certificateStatus: 'approved' as const, certificateIssueDate: new Date().toISOString() };
            }
            return u;
        });
        localStorage.setItem("users_db", JSON.stringify(updatedDb));

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
            console.warn('Failed to sync certificate rejection to API', error);
        }

        // Also update localStorage
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => {
            if (u.email === email) {
                return { ...u, certificateStatus: 'eligible' as const };
            }
            return u;
        });
        localStorage.setItem("users_db", JSON.stringify(updatedDb));
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
