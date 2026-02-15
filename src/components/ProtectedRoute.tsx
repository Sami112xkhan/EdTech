
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

    // Force check against latest DB state
    const usersDb = JSON.parse(localStorage.getItem('users_db') || '[]');
    const freshUser = usersDb.find((u: any) => u.email === user?.email) || user;
    const currentStatus = freshUser?.status || 'active';

    if (currentStatus === 'inactive' && location.pathname !== '/suspended') {
        return <Navigate to="/suspended" replace />;
    }

    if (currentStatus === 'active' && location.pathname === '/suspended') {
        return <Navigate to="/dashboard" replace />;
    }

    if (requirePayment) {
        const hasActiveTrial = user?.trialExpiresAt && user.trialExpiresAt !== 'EXPIRED' && new Date(user.trialExpiresAt) > new Date();

        if (!user?.isPaid && !hasActiveTrial) {
            return <Navigate to="/checkout" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
