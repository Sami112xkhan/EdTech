
export interface User {
    name: string;
    username: string;
    email: string;
    isPaid: boolean;
    role: 'user' | 'admin';
    status: 'active' | 'inactive';
    lastLogin?: string;
    completedLessons: string[];
    unlockedBy?: string;
}
