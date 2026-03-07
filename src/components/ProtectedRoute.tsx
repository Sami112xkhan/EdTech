
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

    if (requirePayment) {
        const now = new Date();
        const hasActiveTrial = user?.trialExpiresAt &&
            user.trialExpiresAt !== 'EXPIRED' &&
            new Date(user.trialExpiresAt) > now;

        // Strict Enforcement: If trial ended, redirect to checkout
        // This handles cases where trial courses are still in local cached purchasedCourses
        const isTrialExpired = user?.trialExpiresAt === 'EXPIRED' || (user?.trialExpiresAt && new Date(user.trialExpiresAt) <= now);

        if (isTrialExpired && user?.purchasedCourses.length === 0) {
            return <Navigate to="/checkout" replace />;
        }

        if (user?.purchasedCourses.length === 0 && !hasActiveTrial) {
            return <Navigate to="/checkout" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
