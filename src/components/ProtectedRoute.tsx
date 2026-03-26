
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
    requirePayment?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requirePayment = false }) => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const currentStatus = user?.status || 'active';

    if (currentStatus === 'inactive' && location.pathname !== '/suspended') {
        return <Navigate to="/suspended" replace />;
    }

    if (currentStatus === 'active' && location.pathname === '/suspended') {
        return <Navigate to="/dashboard" replace />;
    }

    if (requirePayment && user?.role !== 'admin') {
        const now = new Date();

        // Strict Enforcement: If user HAS a trialExpiresAt and it is EXPIRED, 
        // they must be redirected, unless they have made a permanent purchase 
        // (which now clears trialExpiresAt in AuthContext).
        const isTrialExpired = user?.trialExpiresAt === 'EXPIRED' ||
            (user?.trialExpiresAt && new Date(user.trialExpiresAt) <= now);

        if (isTrialExpired) {
            return <Navigate to="/checkout" replace />;
        }

        const hasActiveTrial = user?.trialExpiresAt &&
            user.trialExpiresAt !== 'EXPIRED' &&
            new Date(user.trialExpiresAt) > now;

        if (user?.purchasedCourses.length === 0 && !hasActiveTrial) {
            return <Navigate to="/checkout" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
