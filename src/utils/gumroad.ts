
import { useState } from 'react';

// Verification Logic for Gumroad License Keys
export const verifyGumroadLicense = async (licenseKey: string) => {
    try {
        // NOTE: In a production environment, this call should optionally be proxied through your backend 
        // to keep your access token hidden, or you can use the "Increment use count" feature if no token checks are needed.
        // However, Gumroad's verify endpoint usually requires the product permalink.

        const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'product_permalink': 'mobtax', // From your URL: devmastery1.gumroad.com/l/mobtax
                'license_key': licenseKey
            })
        });

        const data = await response.json();

        if (data.success && !data.purchase.refunded && !data.purchase.chargebacked) {
            return {
                valid: true,
                email: data.purchase.email,
                name: data.purchase.name || 'Student'
            };
        }

        return { valid: false, message: 'Invalid or refunded license key' };

    } catch (error) {
        console.error("Gumroad Verification Error:", error);
        return { valid: false, message: 'Failed to verify license. Please check your network.' };
    }
};
