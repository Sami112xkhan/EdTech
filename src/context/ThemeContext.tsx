
import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeContextType = {
    fontSize: string;
    setFontSize: (size: string) => void;
    accentColor: string;
    setAccentColor: (color: string) => void;
    codeFont: string;
    setCodeFont: (font: string) => void;
    frostedMode: boolean;
    setFrostedMode: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};

export const ACCENT_COLORS: Record<string, string> = {
    purple: '262, 80%, 52%',
    blue: '217, 91%, 60%',
    green: '142, 71%, 45%',
    orange: '25, 95%, 53%',
    pink: '330, 81%, 60%',
};

// Calibration for background animations to match visual accent colors
// Veil base hue is ~30deg, Prism base hue is ~202deg
export const BACKGROUND_CALIBRATION: Record<string, { veil: number; prism: number }> = {
    purple: { veil: 232, prism: 1.05 },
    blue: { veil: 187, prism: 0.26 },
    green: { veil: 112, prism: -1.05 },
    orange: { veil: -5, prism: -3.09 },
    pink: { veil: -60, prism: 2.23 },
};

export const ACCENT_RGB: Record<string, [number, number, number]> = {
    purple: [0.635, 0.455, 0.957], // 162/255, 116/255, 244/255 approx
    blue: [0.239, 0.529, 0.961],   // 61/255, 135/255, 245/255
    green: [0.133, 0.773, 0.369],  // 34/255, 197/255, 94/255
    orange: [0.976, 0.463, 0.051], // 249/255, 118/255, 13/255
    pink: [0.925, 0.29, 0.631],    // 236/255, 74/255, 161/255
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // ... loadPref ...
    const loadPref = <T,>(key: string, fallback: T): T => {
        try {
            const val = localStorage.getItem(`settings_${key}`);
            return val !== null ? JSON.parse(val) : fallback;
        } catch { return fallback; }
    };

    const [fontSize, setFontSizeState] = useState(() => loadPref('fontSize', 'medium'));
    const [accentColor, setAccentColorState] = useState(() => loadPref('accentColor', 'purple'));
    const [codeFont, setCodeFontState] = useState(() => loadPref('codeFont', 'fira'));
    const [frostedMode, setFrostedModeState] = useState(() => loadPref('frostedMode', false));

    // ... wrappers ...
    const setFontSize = (value: string) => {
        setFontSizeState(value);
        localStorage.setItem('settings_fontSize', JSON.stringify(value));
    };

    const setAccentColor = (value: string) => {
        setAccentColorState(value);
        localStorage.setItem('settings_accentColor', JSON.stringify(value));
    };

    const setCodeFont = (value: string) => {
        setCodeFontState(value);
        localStorage.setItem('settings_codeFont', JSON.stringify(value));
    };

    const setFrostedMode = (value: boolean) => {
        setFrostedModeState(value);
        localStorage.setItem('settings_frostedMode', JSON.stringify(value));
    };

    // ─── Effects to Apply Styles ───

    // Apply Font Size
    useEffect(() => {
        const sizeMap: Record<string, string> = { small: '14px', medium: '16px', large: '18px' };
        document.documentElement.style.fontSize = sizeMap[fontSize] || '16px';
    }, [fontSize]);

    // Apply Accent Color
    useEffect(() => {
        const color = ACCENT_COLORS[accentColor] || ACCENT_COLORS.purple;
        document.documentElement.style.setProperty('--accent-h', color.split(',')[0].trim());

        const parts = color.split(',');
        if (parts.length === 3) {
            document.documentElement.style.setProperty('--color-primary', `hsl(${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()})`);
        }
    }, [accentColor]);

    // Apply Code Font
    useEffect(() => {
        const fontMap: Record<string, string> = {
            fira: "'Fira Code', monospace",
            jetbrains: "'JetBrains Mono', monospace",
            cascadia: "'Cascadia Code', monospace",
            mono: "ui-monospace, SFMono-Regular, monospace",
        };
        document.documentElement.style.setProperty('--code-font', fontMap[codeFont] || fontMap.fira);
    }, [codeFont]);

    return (
        <ThemeContext.Provider value={{
            fontSize, setFontSize,
            accentColor, setAccentColor,
            codeFont, setCodeFont,
            frostedMode, setFrostedMode
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
