
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark-gamer' | 'rich';

type ThemeContextType = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
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
    blue: '217, 91%, 60%',
    green: '142, 71%, 45%',
    orange: '25, 95%',
    red: '0, 84%, 60%',
    teal: '173, 80%, 40%',
};

// Calibration for background animations to match visual accent colors
// Veil base hue is ~30deg, Prism base hue is ~202deg
export const BACKGROUND_CALIBRATION: Record<string, { veil: number; prism: number }> = {
    blue: { veil: 187, prism: 0.26 },
    green: { veil: 112, prism: -1.05 },
    orange: { veil: -5, prism: -3.09 },
    red: { veil: 0, prism: -2.0 },
    teal: { veil: 160, prism: -0.5 },
};

export const ACCENT_RGB: Record<string, [number, number, number]> = {
    blue: [0.239, 0.529, 0.961],
    green: [0.133, 0.773, 0.369],
    orange: [0.976, 0.463, 0.051],
    red: [0.863, 0.22, 0.22],
    teal: [0.0, 0.667, 0.624],
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const loadPref = <T,>(key: string, fallback: T): T => {
        try {
            const val = localStorage.getItem(`settings_${key}`);
            return val !== null ? JSON.parse(val) : fallback;
        } catch { return fallback; }
    };

    const [fontSize, setFontSizeState] = useState(() => loadPref('fontSize', 'medium'));
    const [accentColor, setAccentColorState] = useState(() => loadPref('accentColor', 'blue'));
    const [codeFont, setCodeFontState] = useState(() => loadPref('codeFont', 'fira'));
    const [frostedMode, setFrostedModeState] = useState(() => loadPref('frostedMode', false));
    const [theme, setThemeState] = useState<Theme>(() => loadPref('theme', 'dark-gamer'));

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

    const setTheme = (value: Theme) => {
        setThemeState(value);
        localStorage.setItem('settings_theme', JSON.stringify(value));
    };

    // ─── Effects to Apply Styles ───

    // Apply theme data attribute
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Apply Font Size
    useEffect(() => {
        const sizeMap: Record<string, string> = { small: '14px', medium: '16px', large: '18px' };
        document.documentElement.style.fontSize = sizeMap[fontSize] || '16px';
    }, [fontSize]);

    // Apply Accent Color — in rich theme, always use green to match the landing page aesthetic
    useEffect(() => {
        const effectiveAccent = theme === 'rich' ? 'green' : accentColor;
        const color = ACCENT_COLORS[effectiveAccent] || ACCENT_COLORS.blue;
        document.documentElement.style.setProperty('--accent-h', color.split(',')[0].trim());

        const parts = color.split(',');
        if (parts.length === 3) {
            document.documentElement.style.setProperty('--color-primary', `hsl(${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()})`);
        }
    }, [accentColor, theme]);

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
            theme, setTheme,
            fontSize, setFontSize,
            accentColor, setAccentColor,
            codeFont, setCodeFont,
            frostedMode, setFrostedMode
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
