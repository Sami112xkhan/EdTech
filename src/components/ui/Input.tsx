
import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, ...props }, ref) => {
        return (
            <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{label}</label>
                <input
                    ref={ref}
                    className={`w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all ${className}`}
                    {...props}
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
        );
    }
);

Input.displayName = "Input";

export default Input;
