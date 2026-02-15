
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
        }
    }, []);


    // Initialize mock users if empty
    useEffect(() => {
        const storedUsers = localStorage.getItem("users_db");
        if (!storedUsers) {
            localStorage.setItem("users_db", JSON.stringify([]));
        }
    }, []);

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

    const signup = (userData: User) => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const existingUser = usersDb.find((u: User) => u.email === userData.email);

        if (existingUser) {
            alert("User already exists! Please login.");
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

        if (serviceId && templateId && publicKey) {
            emailjs.send(serviceId, templateId, {
                to_email: userData.email,
                to_name: userData.name,
                code: code,
            }, publicKey).then(
                (response) => {
                    console.log('SUCCESS!', response.status, response.text);
                    // alert(`Verification code sent to ${userData.email}`);
                },
                (error) => {
                    console.log('FAILED...', error);
                    alert('Failed to send email. Please try again or check console if you are a developer.');
                },
            );
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
        <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout, completePurchase, getAllUsers, updateUserStatus, deleteUser, markLessonComplete, verifyEmail, resendVerificationCode }}>
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
