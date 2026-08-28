
import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, ...props }, ref) => {
        return (
            <div className="space-y-1">
                <label className="text-[13px] font-medium text-gray-600">{label}</label>
                <input
                    ref={ref}
                    className={`w-full px-4 py-2.5 rounded-xl bg-white border border-black/[0.08] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 focus:border-emerald-300 transition-all text-[15px] shadow-sm ${className}`}
                    {...props}
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";

export default Input;
