import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

interface ThemeContextType {
    darkMode: boolean;
    toggleDarkMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
          
        } else {
            document.documentElement.classList.remove('dark');
           
        }
    }, [darkMode]);


    const toggleDarkMode = useCallback(() => {
        setDarkMode(prev => !prev);
    }, []);


    const value = useMemo(() => ({
        darkMode,
        toggleDarkMode
    }), [darkMode, toggleDarkMode]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {

    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};