
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "sonner";

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
import Feedback from "./pages/Feedback";
import AIAssistantPage from "./pages/AIAssistantPage";
import VerifyEmail from "./pages/VerifyEmail";
import Suspended from "./pages/Suspended";
import PlaygroundPage from "./pages/PlaygroundPage";
import { FeedbackProvider } from "./context/FeedbackContext";

import { Analytics } from "@vercel/analytics/react";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ThemeProvider>
                    <FeedbackProvider>
                        <Routes>
                            <Route element={<RootLayout />}>
                                {/* Public Routes */}
                                <Route path="/" element={<Landing />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<Signup />} />
                                <Route path="/verify" element={<VerifyEmail />} />
                                <Route path="/suspended" element={<Suspended />} />

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
                                            <Route path="/playground" element={<PlaygroundPage />} />
                                            <Route path="/settings" element={<Settings />} />
                                            <Route path="/feedback" element={<Feedback />} />
                                            {/* AI Assistant Page */}
                                            <Route path="/ai-assistant" element={<AIAssistantPage />} />
                                        </Route>
                                    </Route>
                                </Route>
                            </Route>
                        </Routes>
                        <Analytics />
                        <Toaster position="top-right" expand={true} richColors theme="dark" toastOptions={{
                            style: {
                                background: 'rgba(20, 20, 20, 0.8)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '1.2rem',
                                fontSize: '0.8rem',
                                fontWeight: '600'
                            }
                        }} />
                    </FeedbackProvider>
                </ThemeProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
