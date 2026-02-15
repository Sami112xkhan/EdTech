import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

const TrialTimer: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!user || user.isPaid || !user.trialExpiresAt || user.trialExpiresAt === 'EXPIRED') {
            setIsVisible(false);
            return;
        }

        const updateTimer = () => {
            const now = new Date();
            const expiry = new Date(user.trialExpiresAt!);
            const diff = expiry.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft("00:00");
                setIsVisible(true);
                // AuthContext handles the actual expiry state update
                // We just redirect if we are on a protected page
                if (!window.location.pathname.includes('/checkout')) {
                    navigate('/checkout');
                }
                return;
            }

            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            setIsVisible(true);
        };

        updateTimer(); // Initial call
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [user, navigate]);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-orange-600/90 backdrop-blur-md text-white py-2 px-4 flex items-center justify-center gap-2 z-50 animate-in slide-in-from-bottom-5">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="font-bold text-sm">Free Trial Active: {timeLeft}</span>
            <span className="text-xs opacity-80">(Upgrade to Lifetime Access to remove limit)</span>
        </div>
    );
};

export default TrialTimer;
