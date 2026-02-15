
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import RootLayout from "./layouts/RootLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Checkout from "./pages/Checkout";
import Dashboard from "./pages/Dashboard";
import CurriculumPage from "./pages/CurriculumPage";
import AdminDashboard from "./pages/AdminDashboard";
import CoursePlayer from "./pages/CoursePlayer";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route element={<RootLayout />}>
                        {/* Public Routes */}
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        {/* Protected Routes (Auth Required) */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/checkout" element={<Checkout />} />
                            <Route path="/admin" element={<AdminDashboard />} />

                            {/* Payment Required Routes */}
                            <Route element={<ProtectedRoute requirePayment />}>
                                <Route element={<DashboardLayout />}>
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/curriculum" element={<CurriculumPage />} />
                                    <Route path="/learn/:moduleId/:lessonId" element={<CoursePlayer />} />
                                    <Route path="/projects" element={<Projects />} />
                                    <Route path="/settings" element={<Settings />} />
                                    {/* AI Assistant will be a modal, but could have a page if needed */}
                                    <Route path="/ai-assistant" element={<Dashboard />} />
                                </Route>
                            </Route>
                        </Route>
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
