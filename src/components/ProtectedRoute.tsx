
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
    requirePayment?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requirePayment = false }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requirePayment && !user?.isPaid) {
        return <Navigate to="/checkout" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
