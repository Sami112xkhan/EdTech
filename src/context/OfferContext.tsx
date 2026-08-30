import React, { createContext, useContext, useState, useEffect } from 'react';

interface OfferContextType {
    isOfferActive: boolean;
    toggleOffer: (isActive: boolean) => Promise<void>;
}

const OfferContext = createContext<OfferContextType | undefined>(undefined);

export const OfferProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOfferActive, setIsOfferActive] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/settings/offer');
                const data = await response.json();
                setIsOfferActive(data.isActive);
            } catch (e) {
                console.error("Failed to fetch offer state", e);
            }
        };
        fetchSettings();
    }, []);

    const toggleOffer = async (isActive: boolean) => {
        try {
            const response = await fetch('/api/admin/settings/offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('sessionId') || '') },
                body: JSON.stringify({ isActive })
            });
            if (!response.ok) throw new Error('Failed to update offer');
            setIsOfferActive(isActive);
        } catch (e) {
            console.error("Failed to toggle offer", e);
            throw e; // Rethrow so UI can handle (e.g. show toast)
        }
    };

    return (
        <OfferContext.Provider value={{ isOfferActive, toggleOffer }}>
            {children}
        </OfferContext.Provider>
    );
};

export const useOffer = () => {
    const context = useContext(OfferContext);
    if (!context) {
        throw new Error('useOffer must be used within an OfferProvider');
    }
    return context;
};
