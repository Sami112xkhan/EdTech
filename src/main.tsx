import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from '@capacitor/core';

const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// We want the app to be independent and point to the live server by default
// But if we are explicitly running a local dev server AND want to hit a local backend, 
// we can skip this. However, the user wants independence so we'll default to production
// unless a flag or specific local condition is met.
const API_BASE_URL = 'https://devmastery.space';

// Intercept fetch to point to production API
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

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
    console.error("Missing Google Client ID in .env");
}

createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={googleClientId || ""}>
        <App />
    </GoogleOAuthProvider>
);