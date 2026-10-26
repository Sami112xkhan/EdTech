
export interface User {
    id: string;
    name: string;
    username: string;
    email: string;
    purchasedCourses: string[];
    role: 'user' | 'admin';
    status: 'active' | 'inactive';
    lastLogin?: string;
    completedLessons: string[];
    password?: string;
    unlockedBy?: string;
    isVerified?: boolean;
    verificationCode?: string;
    trialExpiresAt?: string; // ISO string
    trialCourseId?: string;
    photoURL?: string; // For Google Auth
    // Gamification
    streak?: number;
    lastLoginDate?: string; // YYYY-MM-DD
    xp?: number;
    level?: number;
    // Certificate
    certificateStatus?: 'locked' | 'eligible' | 'pending' | 'approved';
    certificateIssueDate?: string;
    certifiedCourses?: Record<string, { status: 'pending' | 'approved'; issueDate?: string }>;
    lastSeen?: string; // ISO string
    usedCodes?: string[]; // Track static codes used

    // Preferences
    emailNotifs?: boolean;
    pushNotifs?: boolean;
    courseUpdates?: boolean;
    soundEffects?: boolean;
    profileVisibility?: string;
    showProgress?: boolean;
    showStreak?: boolean;
}

export type AccessCodeType = '3days' | '5mins' | 'lifetime';
// New codes are limited to previews and permanent, single-use access.
// `3days` remains in AccessCodeType so existing codes can still be displayed and redeemed.
export type GeneratedAccessCodeType = Extract<AccessCodeType, '5mins' | 'lifetime'>;

export interface AccessCode {
    code: string;
    type: AccessCodeType;
    createdAt: string;
    isUsed: boolean;
    usedBy?: string; // User email
    isRevoked?: boolean;
}
