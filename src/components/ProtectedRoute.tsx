
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

        const hasPurchased = user?.purchasedCourses && user.purchasedCourses.length > 0;

        // If user has purchased courses, they always get access regardless of trial
        if (hasPurchased) {
            return <Outlet />;
        }

        const isTrialExpired = user?.trialExpiresAt === 'EXPIRED' ||
            (user?.trialExpiresAt && new Date(user.trialExpiresAt) <= now);

        if (isTrialExpired) {
            return <Navigate to="/checkout" replace />;
        }

        const hasActiveTrial = user?.trialExpiresAt &&
            user.trialExpiresAt !== 'EXPIRED' &&
            new Date(user.trialExpiresAt) > now;

        if (!hasActiveTrial) {
            return <Navigate to="/checkout" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
