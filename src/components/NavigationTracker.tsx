import React, { useEffect, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavigationTracker = memo(() => {
    const location = useLocation();
    const { user, sessionId } = useAuth();

    useEffect(() => {
        if (user?.id) {
            // Log navigation event
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
                body: JSON.stringify({
                    type: 'NAVIGATE',
                    path: location.pathname,
                    description: `Navigated to ${location.pathname}`,
                })
            }).catch(err => console.error("Tracking error:", err));
        }
    }, [location.pathname, user?.id, sessionId]);

    return null; // This component doesn't render anything
});

NavigationTracker.displayName = 'NavigationTracker';

export const trackAction = async (userId: string, type: 'CLICK' | 'ACTION', description: string, metadata?: any) => {
    try {
        await fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('sessionId') || ''}` },
            body: JSON.stringify({
                type,
                description,
                path: window.location.pathname,
                metadata
            })
        });
    } catch (err) {
        console.error("Manual tracking error:", err);
    }
};

export default NavigationTracker;
