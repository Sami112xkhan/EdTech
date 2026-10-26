
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { User, GeneratedAccessCodeType } from "../types";
import emailjs from '@emailjs/browser';
import { toast } from "sonner";
import { curriculum } from "../data/curriculum";
import { cybersecurityCurriculum } from "../data/cybersecurityCurriculum";
import { dataScienceCurriculum } from "../data/dataScienceCurriculum";
import { cloudComputingCurriculum } from "../data/cloudComputingCurriculum";
import { isPhaseComplete } from "../utils/progress";
import { pushNotification, soundXpGain, soundLevelUp, soundStreakMilestone, soundLessonComplete, soundAchievement, soundEnrollment } from "../utils/notifications";

interface AuthContextType {
    user: User | null;
    sessionId: string | null;
    isAuthenticated: boolean;
    login: (userData: User) => Promise<boolean>;
    signup: (userData: User) => Promise<{ emailSent: boolean; emailError?: string }>;
    logout: () => void;
    completePurchase: (courseId: string) => Promise<void>;
    getAllUsers: () => Promise<any[]>;
    updateUserStatus: (email: string, status: 'active' | 'inactive') => Promise<void>;
    deleteUser: (email: string) => Promise<void>;
    markLessonComplete: (lessonId: string) => void;
    verifyEmail: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
    resendVerificationCode: (email: string) => Promise<boolean>;
    loginWithGoogle: (credential: string) => Promise<void>;
    // Trial System
    generateAccessCode: (type: GeneratedAccessCodeType) => Promise<string>;
    redeemCode: (code: string, courseId?: string) => Promise<{ success: boolean; message: string }>;
    getAllAccessCodes: () => Promise<any[]>;
    revokeAccessCode: (code: string) => Promise<void>;
    deleteAccessCode: (code: string) => Promise<void>;
    addXp: (amount: number) => void;
    updateProfile: (updates: Partial<User>) => Promise<void>;
    // Certificate System
    requestCertificate: (courseId?: string) => Promise<void>;
    approveCertificate: (email: string, courseId?: string) => Promise<void>;
    rejectCertificate: (email: string, courseId?: string) => Promise<void>;
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
            } else {
                // A cached profile is not an authentication session.
                setUser(null);
                setIsAuthenticated(false);
                setSessionId(null);
                localStorage.removeItem('user');
                localStorage.removeItem('sessionId');
            }
        };

        validateSession();

        const storedUser = localStorage.getItem("user");
    }, []);

    // Initialize databases if empty
    useEffect(() => {
        const storedCodes = localStorage.getItem("codes_db");
        if (!storedCodes) {
            localStorage.setItem("codes_db", JSON.stringify([]));
        }
    }, []);

    const generateAccessCode = async (type: GeneratedAccessCodeType): Promise<string> => {
        try {
            const response = await fetch('/api/admin/codes/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') },
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

    const redeemCode = async (code: string, courseId: string = 'fullstack'): Promise<{ success: boolean; message: string }> => {
        if (!user) return { success: false, message: "Please login first" };

        const normalizedCode = code.toUpperCase().trim();

        // Admin-generated codes — check via API
        try {
            const response = await fetch('/api/codes/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') },
                body: JSON.stringify({ code: normalizedCode, email: user.email, courseId }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                const updatedUser = data.user as User;
                setUser(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
                window.dispatchEvent(new Event('devmastery:access-changed'));

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
            const response = await fetch('/api/admin/codes', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') } });
            if (response.ok) return await response.json();
            return [];
        } catch (error) {
            console.error('Failed to fetch codes:', error);
            return [];
        }
    };

    const revokeAccessCode = async (code: string): Promise<void> => {
        try {
            await fetch(`/api/admin/codes/${code}/revoke`, { method: 'POST', headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') } });
        } catch (error) {
            console.error('Failed to revoke code:', error);
        }
    };

    const deleteAccessCode = async (code: string): Promise<void> => {
        try {
            await fetch(`/api/admin/codes/${code}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') } });
        } catch (error) {
            console.error('Failed to delete code:', error);
        }
    };

    const login = async (userData: User): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: userData.username || userData.email,
                    email: userData.email,
                    username: userData.username,
                    password: userData.password,
                }),
            });
            const data = await response.json();

            if (response.ok) {
                setUser(data.user);
                setIsAuthenticated(true);
                setSessionId(data.sessionId);
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("sessionId", data.sessionId);
                toast.success(`Welcome back, ${data.user.name}!`);
                return true;
            } else {
                toast.error(data.error || "Login failed");
                return false;
            }
        } catch (error) {
            console.error("Login failed:", error);
            toast.error("Login failed. Please check your connection.");
            return false;
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
                purchasedCourses: [],
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
                        setIsAuthenticated(true);
                        localStorage.setItem('user', JSON.stringify(finalUser));
                    }
                } else {
                    console.warn("Backend sync returned status:", response.status, "Falling back to temp user.");
                    setUser(tempUser);
                    setIsAuthenticated(true);
                    localStorage.setItem("user", JSON.stringify(tempUser));
                }
            } catch (syncError) {
                console.warn("Failed to sync with SQL backend - continuing in temp mode.", syncError);
                setUser(tempUser);
                setIsAuthenticated(true);
                localStorage.setItem("user", JSON.stringify(tempUser));
            }

        } catch (error: any) {
            console.error("Critical Google Login Error:", error);
            alert(`Google Login Failure: ${error.message || 'Unknown Error'}`);
        }
    };

    const signup = async (userData: User): Promise<{ emailSent: boolean; emailError?: string }> => {
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

            if (!response.ok) {
                throw new Error(data.error || "Signup failed");
            }

            // Do not report success until EmailJS has accepted the send request.
            // The account and code are already saved, so the user can retry from Verify Email.
            const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
            const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
            const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

            if (!serviceId || !templateId || !publicKey) {
                console.error("EmailJS is not configured for verification emails.");
                return {
                    emailSent: false,
                    emailError: "Your account was created, but verification email is not configured. Try Resend or contact support."
                };
            }

            try {
                await emailjs.send(serviceId, templateId, {
                    to_email: userData.email,
                    to_name: userData.name,
                    email: userData.email,
                    passcode: data.verificationCode,
                    time: new Date(Date.now() + 15 * 60000).toLocaleTimeString(),
                    verify_url: `${window.location.origin}/verify?email=${encodeURIComponent(userData.email)}&code=${data.verificationCode}`
                }, publicKey);
                return { emailSent: true };
            } catch (emailError) {
                console.error("EmailJS failed to accept the verification email:", emailError);
                return {
                    emailSent: false,
                    emailError: "Your account was created, but the email service could not send the verification message. Try Resend."
                };
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

    const resendVerificationCode = async (email: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to resend");
                return false;
            }

            const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
            const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
            const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

            if (!serviceId || !templateId || !publicKey) {
                toast.error("Verification email is not configured for this site.");
                return false;
            }

            try {
                await emailjs.send(serviceId, templateId, {
                    to_email: email,
                    email,
                    passcode: data.verificationCode,
                    time: new Date(Date.now() + 15 * 60000).toLocaleTimeString(),
                    verify_url: `${window.location.origin}/verify?email=${encodeURIComponent(email)}&code=${data.verificationCode}`
                }, publicKey);
                toast.success("Email service accepted the message. Check your inbox and spam folder.");
                return true;
            } catch (emailError) {
                console.error("EmailJS failed to accept the verification email:", emailError);
                toast.error("The email service could not send the message. Your current code is still valid; try again later.");
                return false;
            }
        } catch (error) {
            console.error("Resend verification request failed:", error);
            toast.error("Could not request a verification email. Please try again.");
            return false;
        }
    };

    const logout = async () => {
        if (sessionId) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${sessionId}` },
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

    const completePurchase = async (courseId: string) => {
        if (user) {
            const currentCourses = user.purchasedCourses || [];

            // Determine which courses to grant locally (mirrors server logic)
            let coursesToGrant: string[] = [];
            if (courseId === 'fullstack') {
                coursesToGrant = ['fullstack', 'ai'];
            } else if (courseId === 'ai_upgrade') {
                coursesToGrant = ['ai'];
            } else {
                coursesToGrant = [courseId];
            }

            const newCourses = coursesToGrant.filter(c => !currentCourses.includes(c));

            const updatedUser = {
                ...user,
                purchasedCourses: [...currentCourses, ...newCourses],
                trialExpiresAt: undefined,
                trialCourseId: undefined,
            };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
            window.dispatchEvent(new Event('devmastery:access-changed'));

            soundEnrollment();
            pushNotification('🎓 Enrollment Complete!', `Welcome to the ${courseId} course. Start learning now!`, 'enrollment');

        }
    };

    const getAllUsers = async (): Promise<any[]> => {
        try {
            const response = await fetch('/api/admin/users', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') } });
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
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') },
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
                headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') },
            });
        } catch (error) {
            console.error('Failed to delete user via API', error);
        }
    };

    const markLessonComplete = async (lessonId: string) => {
        if (!user) return;

        // Skip if already completed
        if (user.completedLessons.includes(lessonId)) {
            toast.info("Lesson already marked as complete!");
            return;
        }

        // 1. Update Local State Immediately (works offline)
        const updatedLessons = [...user.completedLessons, lessonId];
        const updatedUser = { ...user, completedLessons: updatedLessons };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        toast.success("Lesson Completed!", {
            description: "Progress saved locally."
        });

        // 2. Sync with SQL Backend (non-blocking, best-effort)
        try {
            const response = await fetch('/api/progress/lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, lessonId })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.lessons) {
                    // Use server's lesson list as source of truth if available
                    const syncedUser = { ...updatedUser, completedLessons: data.lessons };
                    setUser(syncedUser);
                    localStorage.setItem("user", JSON.stringify(syncedUser));
                }
            }
        } catch (e) {
            // Backend unavailable — local progress already saved, that's fine
        }

        // 3. Check for Module Unlock using static curriculum data
        try {
            const allCurriculums = [
                { slug: 'fullstack', modules: curriculum },
                { slug: 'cyber', modules: cybersecurityCurriculum },
                { slug: 'datascience', modules: dataScienceCurriculum },
                { slug: 'cloudcomputing', modules: cloudComputingCurriculum },
            ];
            allCurriculums.forEach(({ modules }) => {
                modules.forEach((mod, index) => {
                    const nextMod = modules[index + 1];
                    if (nextMod && isPhaseComplete(mod, updatedLessons)) {
                        if (!isPhaseComplete(mod, user.completedLessons)) {
                            toast.success(`Module Unlocked: ${nextMod.title} 🔓`, {
                                description: "New lessons and materials are now available.",
                                duration: 5000
                            });
                        }
                    }
                });
            });
        } catch (e) {
            // Module unlock toast is non-critical
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
                toast.success(`LEVEL UP! You are now Level ${newLevel}`, {
                    description: "Keep going to unlock new perks!",
                    duration: 5000
                });
                soundLevelUp();
                pushNotification('⬆️ Level Up!', `You are now Level ${newLevel}. Keep going!`, 'level-up');
            } else {
                toast.success(`+${amount} XP Gained!`);
                soundXpGain();
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
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
                body: JSON.stringify({
                    ...updates
                })
            });
        } catch (error) {
            console.warn("Failed to sync profile update to SQL backend", error);
        }
    };

    const requestCertificate = async (courseId: string = 'fullstack') => {
        if (!user) return;

        const certifiedCourses = { ...(user.certifiedCourses || {}), [courseId]: { status: 'pending' as const } };
        const updatedUser = { ...user, certificateStatus: 'pending' as const, certifiedCourses };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Sync with API
        try {
            await fetch('/api/certificate/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
                body: JSON.stringify({ courseId }),
            });
        } catch (error) {
            console.warn('Failed to sync certificate request to API', error);
        }

        alert("Certificate requested! Please wait for admin approval.");
    };

    const approveCertificate = async (email: string, courseId: string = 'fullstack') => {
        // Sync with API
        try {
            await fetch(`/api/admin/certificate/${encodeURIComponent(email)}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') },
                body: JSON.stringify({ courseId }),
            });
        } catch (error) {
            console.warn('Failed to sync certificate approval to API', error);
        }

        if (user && user.email === email) {
            const certifiedCourses = { ...(user.certifiedCourses || {}), [courseId]: { status: 'approved' as const, issueDate: new Date().toISOString() } };
            const updatedUser = { ...user, certificateStatus: 'approved' as const, certificateIssueDate: new Date().toISOString(), certifiedCourses };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
            soundAchievement();
            pushNotification('🏆 Certificate Approved!', `Your ${courseId} certificate is ready to download.`, 'certificate-approved');
        }
    };

    const rejectCertificate = async (email: string, courseId: string = 'fullstack') => {
        // Sync with API
        try {
            await fetch(`/api/admin/certificate/${encodeURIComponent(email)}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') },
                body: JSON.stringify({ courseId }),
            });
        } catch (error) {
            console.error('Failed to sync certificate rejection to API', error);
        }
    };

    const location = useLocation();

    const checkTrialExpiry = useCallback(() => {
        // Admin users never have trial restrictions
        if (user && user.role === 'admin') {
            // Clear any stale trial data for admin
            if (user.trialExpiresAt) {
                const clearedUser = { ...user, trialExpiresAt: undefined };
                setUser(clearedUser);
                localStorage.setItem("user", JSON.stringify(clearedUser));
            }
            return false;
        }
        if (user && user.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED') {
            const now = new Date();
            const expiry = new Date(user.trialExpiresAt);
            if (now > expiry) {
                // Predictive local update: If trial expired, we should proactively 
                // remove trial-granted courses if we're not sure which ones they are.
                // For now, we'll mark as EXPIRED and the ProtectedRoute will handle the rest.
                const expiredUser = { ...user, trialExpiresAt: 'EXPIRED' as const };
                setUser(expiredUser);
                localStorage.setItem("user", JSON.stringify(expiredUser));
                window.dispatchEvent(new Event('devmastery:access-changed'));

                // Real-time DB Update
                updateProfile({ trialExpiresAt: 'EXPIRED' as const });

                return true;
            }
        }
        return false;
    }, [user, updateProfile]);

    // Check expiry on every navigation for instant feedback
    useEffect(() => {
        checkTrialExpiry();
    }, [location.pathname, checkTrialExpiry]);

    // Periodic check for trial expiry (every 10 seconds)
    // Unified Session & Status Sync Loop (Every 10 seconds)
    useEffect(() => {
        if (!isAuthenticated || !sessionId) return;

        const syncInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/auth/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.user) {
                        // Update local state from the authenticated server session.
                        const incomingUser = data.user;
                        setUser(incomingUser);
                        localStorage.setItem('user', JSON.stringify(incomingUser));
                    }
                } else if (response.status === 401 || response.status === 403) {
                    console.warn("Session invalidated or account suspended. Logging out.");
                    logout();
                }
            } catch (error) {
                console.warn("Session sync heartbeat failed", error);
            }

            // Also check locally within the interval for redundancy
            checkTrialExpiry();
        }, 10000);

        return () => clearInterval(syncInterval);
    }, [isAuthenticated, sessionId, user?.purchasedCourses, user?.trialExpiresAt, checkTrialExpiry, logout]);

    return (
        <AuthContext.Provider value={{
            user,
            sessionId,
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
            deleteAccessCode,
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
