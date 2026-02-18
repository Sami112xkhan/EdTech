import { useState, useEffect } from 'react';

const DEADLINE_KEY = 'checkout_discount_deadline';
// 1.5 days in milliseconds
const DURATION = 1.5 * 24 * 60 * 60 * 1000; 

export const useDiscountTimer = () => {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        total: number;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
    
    const [isExpired, setIsExpired] = useState(false);
    const [deadline, setDeadline] = useState<Date | null>(null);

    useEffect(() => {
        // Initialize deadline from localStorage or create new one
        let storedDeadline = localStorage.getItem(DEADLINE_KEY);
        let targetDate: number;

        if (storedDeadline) {
            targetDate = parseInt(storedDeadline, 10);
            
            // Optional: If the stored date is way in the past (e.g. > 7 days), 
            // maybe we want to reset it? For now, we'll keep it strict: once expired, always expired.
        } else {
            targetDate = Date.now() + DURATION;
            localStorage.setItem(DEADLINE_KEY, targetDate.toString());
        }

        setDeadline(new Date(targetDate));

        const updateTimer = () => {
            const now = Date.now();
            const diff = targetDate - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setIsExpired(false);
            setTimeLeft({ days, hours, minutes, seconds, total: diff });
        };

        // Initial call
        updateTimer();

        // Interval
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, []);

    return { timeLeft, isExpired, deadline };
};
