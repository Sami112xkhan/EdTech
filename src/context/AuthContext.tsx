
import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types"; // Will create types next

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
            // Update last login
            const updatedUser = { ...existingUser, lastLogin: new Date().toISOString() };
            const updatedDb = usersDb.map((u: User) => u.email === existingUser.email ? updatedUser : u);
            localStorage.setItem("users_db", JSON.stringify(updatedDb));

            setUser(updatedUser);
            setIsAuthenticated(true);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        } else {
            // Auto-signup for demo simplicity if not found? Or force signup?
            // Let's assume login only logs in existing. But previous logic was auto-set.
            // We'll keep previous behavior but add to DB if not exists (implicit signup on login for demo)
            const newUser: User = {
                ...userData,
                isPaid: false,
                role: 'user',
                status: 'active',
                lastLogin: new Date().toISOString(),
                completedLessons: [] // Initialize empty
            };
            const newDb = [...usersDb, newUser];
            localStorage.setItem("users_db", JSON.stringify(newDb));

            setUser(newUser);
            setIsAuthenticated(true);
            localStorage.setItem("user", JSON.stringify(newUser));
        }
    };

    const signup = (userData: User) => {
        const usersDb = JSON.parse(localStorage.getItem("users_db") || '[]');
        const existingUser = usersDb.find((u: User) => u.email === userData.email);

        if (existingUser) {
            alert("User already exists! Please login.");
            return;
        }

        const newUser: User = {
            ...userData,
            isPaid: false,
            role: 'user',
            status: 'active',
            lastLogin: new Date().toISOString(),
            completedLessons: [] // Initialize empty
        };

        const newDb = [...usersDb, newUser];
        localStorage.setItem("users_db", JSON.stringify(newDb));

        setUser(newUser);
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify(newUser));
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
        <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout, completePurchase, getAllUsers, updateUserStatus, deleteUser, markLessonComplete }}>
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
