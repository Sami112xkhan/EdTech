import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
    const originalFetch = window.fetch;
    const API_BASE_URL = 'https://devmastery.space';
    window.fetch = async (...args) => {
        if (typeof args[0] === 'string' && args[0].startsWith('/api/')) {
            args[0] = API_BASE_URL + args[0];
        } else if (args[0] instanceof Request && args[0].url.startsWith('/api/')) {
            args[0] = new Request(API_BASE_URL + args[0].url, args[0]);
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