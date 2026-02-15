
export interface User {
    name: string;
    username: string;
    email: string;
    isPaid: boolean;
    role: 'user' | 'admin';
    status: 'active' | 'inactive';
    lastLogin?: string;
    completedLessons: string[];
    password?: string;
    unlockedBy?: string;
    isVerified?: boolean;
    verificationCode?: string;
    trialExpiresAt?: string; // ISO string
    photoURL?: string; // For Google Auth
    // Gamification
    streak?: number;
    lastLoginDate?: string; // YYYY-MM-DD
    xp?: number;
    level?: number;
}

export interface AccessCode {
    code: string;
    type: '3days' | '5mins';
    createdAt: string;
    isUsed: boolean;
    usedBy?: string; // User email
    isRevoked?: boolean;
}
