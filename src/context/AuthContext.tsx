
import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types"; // Will create types next
import emailjs from '@emailjs/browser';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (userData: User) => void;
    signup: (userData: User) => void;
    logout: () => void;
    completePurchase: () => void;
    getAllUsers: () => User[];
    updateUserStatus: (email: string, status: 'active' | 'inactive') => User[];
    deleteUser: (email: string) => User[];
    markLessonComplete: (lessonId: string) => void;
    verifyEmail: (email: string, code: string) => { success: boolean; message: string };
    resendVerificationCode: (email: string) => void;
    loginWithGoogle: (credential: string) => Promise<void>;
    // Trial System
    generateAccessCode: (type: '3days' | '5mins') => string;
    redeemCode: (code: string) => { success: boolean; message: string };
    getAllAccessCodes: () => import("../types").AccessCode[];
    revokeAccessCode: (code: string) => import("../types").AccessCode[];
    addXp: (amount: number) => void;
    // Certificate System
    requestCertificate: () => void;
    approveCertificate: (email: string) => void;
    rejectCertificate: (email: string) => void;
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
        const heartbeatInterval = setInterval(() => {
            const now = new Date().toISOString();
            const updatedUser = { ...user, lastSeen: now };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            // Allow this to silently update DB
            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedDb = usersDb.map((u: User) => u.email === user.email ? { ...u, lastSeen: now } : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));
        }, 60000);

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
        }, 60000); // Every 1 minute

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

    const generateAccessCode = (type: '3days' | '5mins') => {
        const codesDb = JSON.parse(localStorage.getItem("codes_db") || '[]');
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars 0,O,1,I
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const newCode: import("../types").AccessCode = {
            code,
            type,
            createdAt: new Date().toISOString(),
            isUsed: false
        };

        localStorage.setItem("codes_db", JSON.stringify([...codesDb, newCode]));
        return code;
    };

    const redeemCode = (code: string) => {
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
        } const codesDb = JSON.parse(localStorage.getItem("codes_db") || '[]');
        const codeIndex = codesDb.findIndex((c: any) => c.code === normalizedCode && !c.isUsed && !c.isRevoked);

        if (codeIndex === -1) {
            return { success: false, message: "Invalid, used, or revoked code" };
        }

        const accessCode = codesDb[codeIndex];

        // Calculate expiry
        const now = new Date();
        const duration = accessCode.type === '3days' ? (3 * 24 * 60 * 60 * 1000) : (5 * 60 * 1000);
        const trialExpiresAt = new Date(now.getTime() + duration).toISOString();

        // Update User
        const updatedUser = { ...user, trialExpiresAt };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update User DB
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedUserDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
        localStorage.setItem("users_db", JSON.stringify(updatedUserDb));

        // Update Codes DB
        accessCode.isUsed = true;
        accessCode.usedBy = user.email;
        localStorage.setItem("codes_db", JSON.stringify(codesDb));

        return { success: true, message: `Access granted for ${accessCode.type === '3days' ? '3 days' : '5 minutes'}` };
    };

    const getAllAccessCodes = () => {
        return JSON.parse(localStorage.getItem("codes_db") || '[]');
    };

    const revokeAccessCode = (code: string) => {
        const codesDb = JSON.parse(localStorage.getItem("codes_db") || '[]');
        const updatedDb = codesDb.map((c: any) =>
            c.code === code ? { ...c, isRevoked: true } : c
        );
        localStorage.setItem("codes_db", JSON.stringify(updatedDb));
        return updatedDb;
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
            // Decode the JWT token
            const base64Url = credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);
            const { email, name, picture } = payload;

            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const existingUser = usersDb.find((u: User) => u.email === email);

            if (existingUser) {
                // Gamification Logic (Duplicate for Google Login to ensure consistency)
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
                        newXp += 50;
                        streakMessage = `Daily Streak: ${newStreak} 🔥 (+50 XP)`;
                    } else {
                        newStreak = 1;
                        newXp += 50;
                        streakMessage = `Streak Started! 🔥 (+50 XP)`;
                    }
                }
                const newLevel = Math.floor(newXp / 100) + 1;

                // Login existing user
                const updatedUser = {
                    ...existingUser,
                    lastLogin: new Date().toISOString(),
                    // Update verification status just in case (Google is verified)
                    isVerified: true,
                    lastLoginDate: today,
                    streak: newStreak,
                    xp: newXp,
                    level: newLevel
                };
                const updatedDb = usersDb.map((u: User) => u.email === email ? updatedUser : u);
                localStorage.setItem("users_db", JSON.stringify(updatedDb));

                setUser(updatedUser);
                setIsAuthenticated(true);
                localStorage.setItem("user", JSON.stringify(updatedUser));
                if (streakMessage) alert(streakMessage);
            } else {
                // Auto-Signup new user
                const today = new Date().toISOString().split('T')[0];
                const newUser: User = {
                    name: name,
                    username: email.split('@')[0], // Generate username from email
                    email: email,
                    isPaid: false,
                    role: 'user',
                    status: 'active',
                    isVerified: true, // Google accounts are verified
                    verificationCode: undefined,
                    lastLogin: new Date().toISOString(),
                    completedLessons: [],
                    photoURL: picture,
                    // Gamification Init
                    streak: 1,
                    lastLoginDate: today,
                    xp: 50, // Welcome bonus
                    level: 1
                };

                const newDb = [...usersDb, newUser];
                localStorage.setItem("users_db", JSON.stringify(newDb));

                setUser(newUser);
                setIsAuthenticated(true);
                localStorage.setItem("user", JSON.stringify(newUser));
                alert("Welcome! You earned 50 XP for joining! 🔥");
            }

            // --- HOOK INTO BACKEND AFTER SUCCESSFUL GOOGLE AUTH ---
            try {
                const response = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ credential }),
                });
                const data = await response.json();
                if (data.sessionId) {
                    setSessionId(data.sessionId);
                    localStorage.setItem('sessionId', data.sessionId);
                }
            } catch (e) {
                console.error("Failed to sync with SQL backend", e);
                // We don't block the user if the analytics backend is down
            }
        } catch (error) {
            console.error("Google Login Error:", error);
            alert("Failed to login with Google.");
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

    const completePurchase = () => {
        if (user) {
            const updatedUser = { ...user, isPaid: true };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser)); // Update session

            // Update DB
            const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
            const updatedDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));
        }
    };

    const getAllUsers = () => {
        return JSON.parse(localStorage.getItem("users_db") || '[]');
    };

    const updateUserStatus = (email: string, newStatus: 'active' | 'inactive') => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => u.email === email ? { ...u, status: newStatus } : u);
        localStorage.setItem("users_db", JSON.stringify(updatedDb));
        return updatedDb;
    };

    const deleteUser = (email: string) => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.filter((u: User) => u.email !== email);
        localStorage.setItem("users_db", JSON.stringify(updatedDb));
        return updatedDb;
    };

    const markLessonComplete = (lessonId: string) => {
        if (!user) return;

        if (user.completedLessons.includes(lessonId)) return;

        const updatedUser = { ...user, completedLessons: [...user.completedLessons, lessonId] };

        // Update Local State
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update DB
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
        localStorage.setItem("users_db", JSON.stringify(updatedDb));
    };



    const addXp = (amount: number) => {
        if (!user) return;

        const newXp = (user.xp || 0) + amount;
        const newLevel = Math.floor(newXp / 100) + 1;

        const updatedUser = { ...user, xp: newXp, level: newLevel };

        // Update Local
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update DB
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
        localStorage.setItem("users_db", JSON.stringify(updatedDb));
    };

    const requestCertificate = () => {
        if (!user) return;

        const updatedUser = { ...user, certificateStatus: 'pending' as const };

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => u.email === user.email ? updatedUser : u);
        localStorage.setItem("users_db", JSON.stringify(updatedDb));

        alert("Certificate requested! Please wait for admin approval.");
    };

    const approveCertificate = (email: string) => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => {
            if (u.email === email) {
                return { ...u, certificateStatus: 'approved' as const, certificateIssueDate: new Date().toISOString() };
            }
            return u;
        });
        localStorage.setItem("users_db", JSON.stringify(updatedDb));

        // If current user is the one being approved (unlikely as admin does this, but good for consistency)
        if (user && user.email === email) {
            const updatedUser = { ...user, certificateStatus: 'approved' as const, certificateIssueDate: new Date().toISOString() };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        }
    };

    const rejectCertificate = (email: string) => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const updatedDb = usersDb.map((u: User) => {
            if (u.email === email) {
                return { ...u, certificateStatus: 'eligible' as const }; // Reset to eligible so they can request again
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
