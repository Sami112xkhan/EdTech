import { useState, useEffect } from 'react';



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
        let isMounted = true;
        let interval: NodeJS.Timeout;

        const fetchDeadline = async () => {
            try {
                const res = await fetch("/api/settings");
                if (!res.ok) throw new Error("Failed to fetch settings");
                const data = await res.json();

                if (isMounted && data.discountDeadline) {
                    const targetDate = new Date(data.discountDeadline).getTime();
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

                    updateTimer(); // Initial call
                    interval = setInterval(updateTimer, 1000);
                }
            } catch (err) {
                console.error("Timer sync failed:", err);
                // Fallback to local 5 hours if API fails, just to show something? 
                // Or maybe just do nothing and let it stay 00:00:00 until synced.
                // Better to fail safe than show wrong time.
            }
        };

        fetchDeadline();

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    return { timeLeft, isExpired, deadline };
};
