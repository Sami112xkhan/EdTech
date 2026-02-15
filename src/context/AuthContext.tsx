
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
    // Trial System
    generateAccessCode: (type: '3days' | '5mins') => string;
    redeemCode: (code: string) => { success: boolean; message: string };
    getAllAccessCodes: () => import("../types").AccessCode[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        if (!user || user.isPaid || !user.trialExpiresAt || user.trialExpiresAt === 'EXPIRED') return;

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

        return () => clearInterval(interval);
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

        const codesDb = JSON.parse(localStorage.getItem("codes_db") || '[]');
        const codeIndex = codesDb.findIndex((c: any) => c.code === code.toUpperCase() && !c.isUsed);

        if (codeIndex === -1) {
            return { success: false, message: "Invalid or already used code" };
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

            // Update last login
            const updatedUser = { ...existingUser, lastLogin: new Date().toISOString() };
            const updatedDb = usersDb.map((u: User) => u.email === existingUser.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));

            setUser(updatedUser);
            setIsAuthenticated(true);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        } else {
            alert("User not found. Please sign up.");
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
            completedLessons: [] // Initialize empty
        };

        const newDb = [...usersDb, newUser];

        localStorage.setItem("users_db", JSON.stringify(newDb));

        // Real Email Sending via EmailJS
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        console.log("Attempting to send verification email:", {
            serviceId: serviceId ? 'Present' : 'Missing',
            templateId: templateId ? 'Present' : 'Missing',
            publicKey: publicKey ? 'Present' : 'Missing'
        });

        if (serviceId && templateId && publicKey) {
            try {
                const response = await emailjs.send(serviceId, templateId, {
                    to_email: userData.email,
                    to_name: userData.name,
                    code: code,
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

    const resendVerificationCode = (email: string) => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const userIndex = usersDb.findIndex((u: User) => u.email === email);

        if (userIndex === -1) return;

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const updatedUser = { ...usersDb[userIndex], verificationCode: newCode };

        usersDb[userIndex] = updatedUser;
        usersDb[userIndex] = updatedUser;
        localStorage.setItem("users_db", JSON.stringify(usersDb));

        // Real Email Sending via EmailJS
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (serviceId && templateId && publicKey) {
            emailjs.send(serviceId, templateId, {
                to_email: email,
                code: newCode,
            }, publicKey).then(
                (response) => {
                    console.log('SUCCESS!', response.status, response.text);
                    alert(`New verification code sent to ${email}`);
                },
                (error) => {
                    console.log('FAILED...', error);
                    alert('Failed to send email.');
                },
            );
        } else {
            console.warn("EmailJS keys missing in .env");
            alert(`[DEV MODE] New verification code: ${newCode}`);
        }
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("user");
    };

    const completePurchase = () => {
        if (user) {
            const updatedUser = { ...user, isPaid: true };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
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
            getAllAccessCodes
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
