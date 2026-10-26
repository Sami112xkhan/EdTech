import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

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
    const { sessionId } = useAuth();

    const fetchFeedback = async () => {
        try {
            const response = await fetch('/api/feedback', { headers: { Authorization: `Bearer ${sessionId}` } });
            if (response.ok) {
                const data = await response.json();
                setFeedback(data);
            }
        } catch (error) {
            console.error('Failed to fetch feedback:', error);
        }
    };

    // Load from SQL on mount
    useEffect(() => {
        fetchFeedback();
        // Poll every 30 seconds for new feedback in admin panel
        const interval = setInterval(fetchFeedback, 5000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const addFeedback = async (userId: string, userName: string, content: string, type: 'feedback' | 'access_request' = 'feedback') => {
        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
                body: JSON.stringify({ userId, userName, content, type }),
            });
            if (response.ok) {
                const newItem = await response.json();
                setFeedback(prev => [newItem, ...prev]);
            }
        } catch (error) {
            console.error('Failed to add feedback:', error);
        }
    };

    const updateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
        try {
            const response = await fetch(`/api/feedback/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
                body: JSON.stringify({ status }),
            });
            if (response.ok) {
                const updatedItem = await response.json();
                setFeedback(prev => prev.map(item => item.id === id ? updatedItem : item));
            }
        } catch (error) {
            console.error('Failed to update feedback status:', error);
        }
    };

    const replyToFeedback = async (id: string, reply: string) => {
        try {
            const response = await fetch(`/api/feedback/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
                body: JSON.stringify({ reply }),
            });
            if (response.ok) {
                const updatedItem = await response.json();
                setFeedback(prev => prev.map(item => item.id === id ? updatedItem : item));
            }
        } catch (error) {
            console.error('Failed to reply to feedback:', error);
        }
    };

    const deleteFeedback = async (id: string) => {
        try {
            const response = await fetch(`/api/feedback/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${sessionId}` },
            });
            if (response.ok) {
                setFeedback(prev => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete feedback:', error);
        }
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
