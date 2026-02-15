import React, { createContext, useContext, useState, useEffect } from 'react';

export type FeedbackStatus = 'pending' | 'implemented' | 'ignored';

export interface FeedbackItem {
    id: string;
    userId: string;
    userName: string;
    content: string;
    type: 'feedback' | 'access_request';
    status: FeedbackStatus;
    createdAt: string;
    reply?: string;
}

interface FeedbackContextType {
    feedback: FeedbackItem[];
    addFeedback: (userId: string, userName: string, content: string, type?: 'feedback' | 'access_request') => void;
    updateFeedbackStatus: (id: string, status: FeedbackStatus) => void;
    replyToFeedback: (id: string, reply: string) => void;
    deleteFeedback: (id: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        const storedFeedback = localStorage.getItem('edtech_feedback');
        if (storedFeedback) {
            setFeedback(JSON.parse(storedFeedback));
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        localStorage.setItem('edtech_feedback', JSON.stringify(feedback));
    }, [feedback]);

    const addFeedback = (userId: string, userName: string, content: string, type: 'feedback' | 'access_request' = 'feedback') => {
        const newFeedback: FeedbackItem = {
            id: Date.now().toString(),
            userId,
            userName,
            content,
            type,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        setFeedback(prev => [newFeedback, ...prev]);
    };

    const updateFeedbackStatus = (id: string, status: FeedbackStatus) => {
        setFeedback(prev => prev.map(item =>
            item.id === id ? { ...item, status } : item
        ));
    };

    const replyToFeedback = (id: string, reply: string) => {
        setFeedback(prev => prev.map(item =>
            item.id === id ? { ...item, reply } : item
        ));
    };

    const deleteFeedback = (id: string) => {
        setFeedback(prev => prev.filter(item => item.id !== id));
    };

    return (
        <FeedbackContext.Provider value={{ feedback, addFeedback, updateFeedbackStatus, replyToFeedback, deleteFeedback }}>
            {children}
        </FeedbackContext.Provider>
    );
};

export const useFeedback = () => {
    const context = useContext(FeedbackContext);
    if (context === undefined) {
        throw new Error('useFeedback must be used within a FeedbackProvider');
    }
    return context;
};
