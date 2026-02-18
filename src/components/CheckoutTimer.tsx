import React from 'react';
import { Timer } from 'lucide-react';
import GlassSurface from './GlassSurface';

interface CheckoutTimerProps {
    timeLeft: {
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    };
    isExpired: boolean;
}

const CheckoutTimer: React.FC<CheckoutTimerProps> = ({ timeLeft, isExpired }) => {
    if (isExpired) return null;

    return (
        <div className="flex justify-center mb-8">
            <GlassSurface
                borderRadius={9999}
                borderWidth={0.5}
                opacity={0.3}
                backgroundOpacity={0.2}
                blur={20}
                className="overflow-hidden shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)]"
            >
                <div className="px-8 py-4 flex items-center gap-8">
                    {/* Left: Label */}
                    <div className="flex items-center gap-3 border-r border-white/10 pr-8">
                        <div className="p-2.5 bg-purple-500/20 rounded-full animate-pulse">
                            <Timer className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-[0.2em]">Limited Offer</span>
                            <span className="text-sm font-medium text-white/90">
                                Price increases to <span className="text-purple-300 font-bold">₹15k</span>
                            </span>
                        </div>
                    </div>

                    {/* Right: Countdown */}
                    <div className="flex gap-3 text-center">
                        {timeLeft.days > 0 && (
                            <div className="flex flex-col items-center min-w-[45px]">
                                <span className="text-2xl font-bold font-mono leading-none bg-gradient-to-b from-white to-purple-200 bg-clip-text text-transparent">
                                    {timeLeft.days}
                                </span>
                                <span className="text-[9px] font-bold text-purple-300/70 uppercase tracking-wider mt-1">Days</span>
                            </div>
                        )}
                        <div className="flex flex-col items-center min-w-[45px]">
                            <span className="text-2xl font-bold font-mono leading-none bg-gradient-to-b from-white to-purple-200 bg-clip-text text-transparent">
                                {timeLeft.hours.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[9px] font-bold text-purple-300/70 uppercase tracking-wider mt-1">Hrs</span>
                        </div>
                        <div className="text-purple-500/50 font-mono text-xl -mt-1">:</div>
                        <div className="flex flex-col items-center min-w-[45px]">
                            <span className="text-2xl font-bold font-mono leading-none bg-gradient-to-b from-white to-purple-200 bg-clip-text text-transparent">
                                {timeLeft.minutes.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[9px] font-bold text-purple-300/70 uppercase tracking-wider mt-1">Mins</span>
                        </div>
                        <div className="text-purple-500/50 font-mono text-xl -mt-1">:</div>
                        <div className="flex flex-col items-center min-w-[45px]">
                            <span className="text-2xl font-bold font-mono leading-none bg-gradient-to-b from-white to-purple-200 bg-clip-text text-transparent">
                                {timeLeft.seconds.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[9px] font-bold text-purple-300/70 uppercase tracking-wider mt-1">Secs</span>
                        </div>
                    </div>
                </div>
            </GlassSurface>
        </div>
    );
};

export default CheckoutTimer;
