import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from '@capacitor/core';

const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isNative = Capacitor.isNativePlatform();

// API Routing Logic:
// 1. If on Native (Phone), always use production for independence.
// 2. If on Web and NOT localhost (Live site), use production.
// 3. If on Web and Localhost (Dev), use local backend (handled by vite proxy).
const API_BASE_URL = 'https://devmastery.space';

if (isNative || !isLocalDev) {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        let url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');

        if (url.startsWith('/api/')) {
            if (typeof args[0] === 'string') {
                args[0] = API_BASE_URL + args[0];
            } else if (args[0] instanceof Request) {
                args[0] = new Request(API_BASE_URL + url, args[0]);
            }
        }
        return originalFetch.apply(window, args);
    };
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
    console.error("Missing Google Client ID in .env");
}

createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={googleClientId || ""}>
        <App />
    </GoogleOAuthProvider>
);